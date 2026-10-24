import { NextResponse } from "next/server";
import { fallbackTurn } from "@/lib/chatFallback";
import { describeRoom } from "@/lib/vision";

const briefKeys = [
  "roomType",
  "dimensions",
  "budget",
  "currency",
  "style",
  "colors",
  "keep",
  "avoid",
  "constraints",
  "delivery",
] as const;

function cleanBrief(value: unknown, current: Record<string, unknown>) {
  const incoming = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const next: Record<string, unknown> = { ...current };
  for (const key of briefKeys) {
    const candidate = incoming[key];
    if (key === "budget" && typeof candidate === "number" && candidate >= 0) next[key] = candidate;
    else if (key === "constraints" && Array.isArray(candidate)) next[key] = candidate.filter((item) => typeof item === "string");
    else if (typeof candidate === "string") next[key] = candidate.slice(0, 500);
  }
  return next;
}

const asksToBuild = (message: string) => /\b(build|create|start|make)\b.*\bplan\b/i.test(message);

function lastAgentText(history: unknown[]) {
  const last = [...history].reverse().find((e) => e && typeof e === "object" && (e as Record<string, unknown>).from === "agent");
  return last ? String((last as Record<string, unknown>).text ?? "") : "";
}

// Used when no LLM is configured or the LLM call fails.
// Agent photo prompts all mention the "+" button, so its presence in history means we already asked.
const promptedForPhoto = (history: unknown[]) =>
  history.some((e) => e && typeof e === "object" && (e as Record<string, unknown>).from === "agent" && String((e as Record<string, unknown>).text).includes("+"));

function fallbackResponse(message: string, currentBrief: Record<string, unknown>, history: unknown[], photoCount: number, seen: string | null = null, justAttached = false) {
  const turn = fallbackTurn(message, currentBrief, lastAgentText(history), { count: photoCount, prompted: promptedForPhoto(history), seen, justAttached });
  const ready = Boolean(turn.brief.roomType) && Number(turn.brief.budget) > 0;
  const build = ready && asksToBuild(message);
  return NextResponse.json({
    reply: build ? "Lovely, I have what I need. Building your plan now." : turn.reply,
    brief: turn.brief,
    ready,
    build,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
    const currentBrief = body.brief && typeof body.brief === "object" ? body.brief as Record<string, unknown> : {};
    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
    const photoCount = Number.isInteger(body.photoCount) && body.photoCount > 0 ? Math.min(body.photoCount, 20) : 0;
    // Newly attached photos only, as downscaled data URLs; capped to keep the vision request small.
    const images: string[] = Array.isArray(body.images)
      ? body.images.filter((url: unknown): url is string => typeof url === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(url) && url.length < 3_000_000).slice(0, 3)
      : [];

    if (!message) return NextResponse.json({ error: "A message is required." }, { status: 400 });

    if (!process.env.GROQ_API_KEY) return fallbackResponse(message, currentBrief, history, photoCount, null, images.length > 0);

    const seen = await describeRoom(images);
    if (seen) {
      const previous = typeof currentBrief.roomNotes === "string" ? currentBrief.roomNotes : "";
      currentBrief.roomNotes = [previous, seen].filter(Boolean).join(" ").slice(-1500);
    }
    const photoContext = seen
      ? `They just attached a photo with this message (answer what they wrote too). An image model describes it as: "${seen}". In your reply, mention one or two specific things from that description, make clear it is your read of the photo, and invite them to correct it or say what they want to change. Use it for style and colour context only where the customer hasn't said otherwise. Never estimate measurements from it.`
      : images.length > 0
        ? "They just attached a photo, but it could not be analysed. Thank them, say it is saved with the brief, and do not describe it."
        : `brief.roomNotes holds an image model's approximate description of their photos (empty means you have not seen them, so never describe them). Refer to it naturally when relevant. If they mention a photo but none is attached, tell them to tap the + button. If none is attached once you know the room, invite them once (optional) to add one with the + button.`;

    const groqRequest = () => fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.MODEL_NAME || "openai/gpt-oss-120b",
        temperature: 0.5,
        max_tokens: 500,
        tools: [
          {
            type: "function",
            function: {
              name: "respond_to_customer",
              description: "Reply conversationally and update the Roomwise brief from the customer's message.",
              parameters: {
                type: "object",
                properties: {
                  reply: { type: "string" },
                  brief: {
                    type: "object",
                    properties: {
                      roomType: { type: "string" },
                      dimensions: { type: "string" },
                      budget: { type: "number" },
                      currency: { type: "string" },
                      style: { type: "string" },
                      colors: { type: "string" },
                      keep: { type: "string" },
                      avoid: { type: "string" },
                      constraints: { type: "array", items: { type: "string" } },
                      delivery: { type: "string" },
                    },
                    required: ["roomType", "dimensions", "budget", "currency", "style", "colors", "keep", "avoid", "constraints", "delivery"],
                    additionalProperties: false,
                  },
                  ready: { type: "boolean" },
                  build: { type: "boolean" },
                },
                required: ["reply", "brief", "ready", "build"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "respond_to_customer" } },
        messages: [
          {
            role: "system",
            content: `You are Roomwise, a warm, conversational home decorating agent. Understand details in any order instead of following a questionnaire. Acknowledge what matters, update the structured brief, and ask at most one useful follow-up only when it would materially change the plan. If the customer just greets you, greet them back warmly and invite them to tell you about their room. If they are unsure (\"I don't know\", \"help me choose\"), help them decide with two or three concrete options instead of repeating your question. Never repeat your previous message word for word. Never demand optional details, never infer exact dimensions from a photo, and never invent products, prices, or reviews.

A plan needs a roomType and positive budget. Style, colours, dimensions, items to keep or avoid, constraints, and delivery area are optional. When enough is known, naturally say the customer can add more or say “build my plan”. Set build=true only when the customer explicitly asks to build/start/create the plan and the required fields are present.

The customer attaches room photos with the + button to the left of the message box. Photos attached so far: ${photoCount}. ${photoContext}

Call respond_to_customer once. Keep reply under 55 words and preserve known brief values unless the customer changes them. Current brief: ${JSON.stringify(currentBrief)}`,
          },
          ...history.flatMap((entry: unknown) => {
            if (!entry || typeof entry !== "object") return [];
            const item = entry as Record<string, unknown>;
            if ((item.from !== "agent" && item.from !== "user") || typeof item.text !== "string") return [];
            return [{ role: item.from === "agent" ? "assistant" : "user", content: item.text.slice(0, 500) }];
          }),
          { role: "user", content: message },
        ],
      }),
    });

    let response = await groqRequest();
    let data = await response.json();
    // gpt-oss on Groq intermittently emits a malformed tool call; one retry usually succeeds.
    if (!response.ok && data.error?.code === "tool_use_failed") {
      response = await groqRequest();
      data = await response.json();
    }
    if (!response.ok) {
      console.error("[chat] Groq error, using fallback:", response.status, data.error?.code ?? data.error?.message ?? "");
      return fallbackResponse(message, currentBrief, history, photoCount, seen, images.length > 0);
    }
    const messageOutput = data.choices?.[0]?.message;
    const argumentsText = messageOutput?.tool_calls?.[0]?.function?.arguments;
    if (typeof argumentsText !== "string") {
      console.error("[chat] no tool call from Groq, using fallback");
      return fallbackResponse(message, currentBrief, history, photoCount, seen, images.length > 0);
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(argumentsText) as Record<string, unknown>;
    } catch {
      return fallbackResponse(message, currentBrief, history, photoCount, seen, images.length > 0);
    }
    const brief = cleanBrief(parsed.brief, currentBrief);
    const ready = Boolean(brief.roomType) && Number(brief.budget) > 0;
    const build = ready && parsed.build === true;
    const reply = typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply.trim() : fallbackTurn(message, brief, lastAgentText(history), { count: photoCount, prompted: true }).reply;

    return NextResponse.json({ reply, brief, ready, build });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Chat failed." }, { status: 500 });
  }
}
