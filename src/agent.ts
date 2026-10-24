import { Agent, OpenAIProvider, run, tool, type MCPServer } from "@openai/agents";
import { z } from "zod";
import { config } from "./config";
import { searchProducts } from "./exa";
import { roomPlanSchema, type RoomPlan } from "./schemas";
import { finalizeIntake } from "./intake";
import { createTeracServer } from "./terac";

function createSearchProductsTool() {
  let callCount = 0;

  return tool({
    name: "search_products",
    description:
      "Research one product per category from direct retailer pages. Submit 2–4 categories in this single call.",
    parameters: z.object({
      categories: z.array(z.string().min(1)).min(2).max(4),
      styleAndConstraints: z.string().min(1),
      budget: z.number().optional(),
      currency: z.string().optional(),
    }),
    execute: async (input) => {
      if (callCount >= 1) {
        return JSON.stringify({ error: "Product search limit reached. Use the results already returned." });
      }

      callCount += 1;
      return JSON.stringify(await searchProducts(input));
    },
  });
}

const provider = new OpenAIProvider({
  apiKey: config.groqApiKey,
  baseURL: "https://api.groq.com/openai/v1",
  useResponses: false,
});

const model = await provider.getModel(config.model);

function createTeracTools(server: MCPServer) {
  const requestReview = tool({
    name: "request_terac_review",
    description: "Request Terac feasibility for one human to review an anonymized room plan. This does not launch recruitment.",
    parameters: z.object({
      planSummary: z.string().min(1).max(4000),
      reviewQuestions: z.array(z.string().min(1)).min(1).max(4),
      budget: z.number().positive(),
      currency: z.string().length(3),
    }),
    execute: async ({ planSummary, reviewQuestions, budget, currency }) => {
      await server.callTool("terac_get_context", {});
      const result = await server.callTool("terac_request_feasibility", {
        taskDescription: `Review this anonymized room decorating plan and answer the focused questions. Budget: ${currency.toUpperCase()} ${budget}. Plan: ${planSummary}. Questions: ${reviewQuestions.join(" | ")}`,
        panelDescription:
          "One adult with practical home decorating experience. Their feedback is opinion, not professional certification.",
        submissionCount: 1,
        timelineHours: 48,
      });
      return JSON.stringify(result);
    },
  });

  const checkReview = tool({
    name: "check_terac_review_status",
    description: "Retrieve the status of an existing Terac feasibility request.",
    parameters: z.object({ requestId: z.string().min(1) }),
    execute: async ({ requestId }) => {
      await server.callTool("terac_get_context", {});
      return JSON.stringify(await server.callTool("terac_get_feasibility_request", { requestId }));
    },
  });

  return [requestReview, checkReview];
}

function createRoomwiseAgent(teracServer: MCPServer | null) {
  const teracInstructions = teracServer
    ? `After building the sourced draft, call request_terac_review exactly once with an anonymized summary and focused questions about style fit, practicality, assumptions, and budget tradeoffs. Never include customer identity or photo URLs. This requests feasibility only; it does not recruit a reviewer or produce feedback. If confirmed, use status "awaiting_review", requested true, completed false, and state that no reviewer feedback exists yet. Include the request ID when returned.`
    : `Terac is not connected. Do not claim that a human reviewer was consulted. Set terac_review.requested and completed to false.`;

  return new Agent({
    name: "Roomwise coordinator",
    model,
    modelSettings: { maxTokens: 2600 },
    instructions: `You are the Roomwise coordinator. Create a practical, shoppable decorating plan from a structured room brief.

Call search_products exactly once with 2–4 distinct product categories and a concise summary of the style and hard constraints. Build a balanced plan from only the returned products; do not recommend multiple alternatives from the same category. Treat each product's retailer URL, listedPrice, evidence, and sourceCheckedAt as sourced facts. Do not infer a price, dimensions, stock, image, or retailer when the search result omits it. Keep omitted fields null and availability unconfirmed. Only compute the subtotal from returned listedPrice values. Set delivery and total to null when delivery is unknown, and mention that uncertainty. Never assume that prices are accurate, products are deliverable, or products satisfy pet, child, accessibility, or rental constraints unless the returned evidence explicitly says so. Do not describe an unverified claim as fact. Respect budget, items to keep, items to avoid, accessibility, safety, and delivery constraints. Never infer exact room measurements from an image. If photo_observations is present, it is an image model's approximate description of the customer's room photo: use it for style, colour, and existing-furniture context, but treat it as unverified and never as measurements. Never pass it to Terac.

${teracInstructions}

Return status "needs_customer_input" if material brief information is missing. Otherwise return "awaiting_review" only after Terac confirms a feasibility request; return "draft" when no request was confirmed.

Keep all prose concise so the complete response fits comfortably within the output limit. Return valid JSON matching this shape:
{
  "status": "draft | awaiting_review | revised | delivered | needs_customer_input",
  "room_brief": {},
  "design_concept": "",
  "items": [{"name":"","retailer":"","url":"","image_url":null,"price":null,"currency":"USD","dimensions":null,"reason_selected":"","source_checked_at":"","availability_confidence":"confirmed | unconfirmed | unavailable"}],
  "estimated_subtotal": null,
  "delivery_estimate": null,
  "estimated_total": null,
  "terac_review": {"requested": false,"completed": false,"feedback_summary":"","changes_made":[]},
  "assumptions": [],
  "unresolved_questions": []
}`,
    tools: [createSearchProductsTool(), ...(teracServer ? createTeracTools(teracServer) : [])],
  });
}

function parseJsonOutput(output: unknown): unknown {
  if (typeof output !== "string") return output;

  const trimmed = output.trim();
  const withoutFence = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;

  return JSON.parse(withoutFence);
}

export async function createRoomPlan(roomBrief: unknown): Promise<RoomPlan> {
  const validatedBrief = finalizeIntake(roomBrief);
  const teracServer = createTeracServer();
  const connectedServers: MCPServer[] = [];

  if (teracServer) {
    try {
      await teracServer.connect();
      connectedServers.push(teracServer);
    } catch (error) {
      console.warn("Terac MCP connection unavailable; continuing without human review.", error);
    }
  }

  try {
    const result = await run(createRoomwiseAgent(connectedServers[0] ?? null), JSON.stringify(validatedBrief), { maxTurns: 6 });

    if (!result.finalOutput) {
      throw new Error("The Roomwise agent returned no plan.");
    }

    const output = parseJsonOutput(result.finalOutput);
    if (!output || typeof output !== "object" || Array.isArray(output)) {
      throw new Error("The Roomwise agent returned an invalid plan.");
    }

    // The validated server-side brief is authoritative. Do not rely on the model
    // to repeat private/session fields such as customer_id in its JSON output.
    return roomPlanSchema.parse({ ...output, room_brief: validatedBrief });
  } finally {
    await teracServer?.close().catch(() => undefined);
  }
}
