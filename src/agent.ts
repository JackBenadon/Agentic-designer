import { Agent, OpenAIProvider, run, tool } from "@openai/agents";
import { z } from "zod";
import { config } from "./config.js";
import { searchProducts } from "./exa.js";
import { roomPlanSchema, type RoomPlan } from "./schemas.js";
import { finalizeIntake } from "./intake.js";

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

function createRoomwiseAgent() {
  return new Agent({
    name: "Roomwise coordinator",
    model,
    modelSettings: { maxTokens: 1800 },
    instructions: `You are the Roomwise coordinator. Create a practical, shoppable decorating plan from a structured room brief.

Call search_products exactly once with 2–4 distinct product categories and a concise summary of the style and hard constraints. Build a balanced plan from only the returned products; do not recommend multiple alternatives from the same category. Treat each product's retailer URL, listedPrice, evidence, and sourceCheckedAt as sourced facts. Do not infer a price, dimensions, stock, image, or retailer when the search result omits it. Keep omitted fields null and availability unconfirmed. Only compute the subtotal from returned listedPrice values. Set delivery and total to null when delivery is unknown, and mention that uncertainty. Never assume that prices are accurate, products are deliverable, or products satisfy pet, child, accessibility, or rental constraints unless the returned evidence explicitly says so. Do not describe an unverified claim as fact. Respect budget, items to keep, items to avoid, accessibility, safety, and delivery constraints. Never infer exact room measurements from an image.

Terac access is currently unavailable. Do not claim that a human reviewer was consulted. Return status "needs_customer_input" if material brief information is missing; otherwise return status "draft" until Terac review is configured.

Return valid JSON matching this shape:
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
    tools: [createSearchProductsTool()],
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
  const result = await run(createRoomwiseAgent(), JSON.stringify(validatedBrief), { maxTurns: 3 });

  if (!result.finalOutput) {
    throw new Error("The Roomwise agent returned no plan.");
  }

  return roomPlanSchema.parse(parseJsonOutput(result.finalOutput));
}
