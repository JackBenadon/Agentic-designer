import { NextResponse } from "next/server";

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

function fallbackBrief(message: string, current: Record<string, unknown>) {
  const next = { ...current };
  const room = message.match(/\b(living room|bedroom|home office|office|dining room|nursery|kids?'? room|guest room|kitchen)\b/i)?.[1];
  const amount = message.match(/(?:\$|usd\s*)?([0-9]{2,6}(?:,[0-9]{3})?)(?:\s*(usd|eur|gbp|cad|aud))?/i);
  if (!next.roomType && room) next.roomType = room;
  if (!next.budget && amount) next.budget = Number(amount[1].replace(",", ""));
  if (amount?.[2]) next.currency = amount[2].toUpperCase();

  const constraints = new Set(Array.isArray(next.constraints) ? next.constraints.filter((item): item is string => typeof item === "string") : []);
  if (/\brent(?:al|ing|er)\b/i.test(message)) constraints.add("rental-friendly");
  if (/\b(no drilling|can(?:not|'t) drill)\b/i.test(message)) constraints.add("no drilling");
  if (/\b(dog|cat|pet)s?\b/i.test(message)) constraints.add("pets");
  if (/\b(child|children|kid|kids|toddler)s?\b/i.test(message)) constraints.add("children");
  if (/\b(accessib|wheelchair|mobility)\w*/i.test(message)) constraints.add("accessibility needs");
  next.constraints = [...constraints];

  if (/\b(nothing|avoid)\b.*\bdelicate\b/i.test(message)) {
    next.avoid = [typeof next.avoid === "string" ? next.avoid : "", "delicate items"].filter(Boolean).join(", ");
  }
  return next;
}

const asksToBuild = (message: string) => /\b(build|create|start|make)\b.*\bplan\b/i.test(message);

function fallbackReply(brief: Record<string, unknown>) {
  if (!brief.roomType) return "What room would you like to refresh? Tell me as much or as little as you like.";
  if (!brief.budget) return "What budget should I work within? You can include the currency too.";
  if (!brief.style && !brief.colors) return "What kind of atmosphere, style, or colours would feel right to you?";
  return "I have enough to begin. Add any details you want, or say “build my plan” when you’re ready.";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
    const currentBrief = body.brief && typeof body.brief === "object" ? body.brief as Record<string, unknown> : {};
    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];

    if (!message) return NextResponse.json({ error: "A message is required." }, { status: 400 });

    if (!process.env.GROQ_API_KEY) {
      const ready = Boolean(currentBrief.roomType) && Number(currentBrief.budget) > 0;
      const build = ready && asksToBuild(message);
      return NextResponse.json({
        reply: build ? "I have what I need. I’ll build the plan now." : fallbackReply(currentBrief),
        brief: currentBrief,
        ready,
        build,
      });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
            content: `You are Roomwise, a warm, conversational home decorating agent. Understand details in any order instead of following a questionnaire. Acknowledge what matters, update the structured brief, and ask at most one useful follow-up only when it would materially change the plan. Never demand optional details, never infer exact dimensions from a photo, and never invent products, prices, or reviews.

A plan needs a roomType and positive budget. Style, colours, dimensions, items to keep or avoid, constraints, and delivery area are optional. When enough is known, naturally say the customer can add more or say “build my plan”. Set build=true only when the customer explicitly asks to build/start/create the plan and the required fields are present.

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

    const data = await response.json();
    if (!response.ok) {
      const brief = fallbackBrief(message, currentBrief);
      const ready = Boolean(brief.roomType) && Number(brief.budget) > 0;
      const build = ready && asksToBuild(message);
      return NextResponse.json({
        reply: build ? "I have what I need. I’ll build the plan now." : fallbackReply(brief),
        brief,
        ready,
        build,
      });
    }
    const messageOutput = data.choices?.[0]?.message;
    const argumentsText = messageOutput?.tool_calls?.[0]?.function?.arguments;
    if (typeof argumentsText !== "string") {
      const brief = fallbackBrief(message, currentBrief);
      const ready = Boolean(brief.roomType) && Number(brief.budget) > 0;
      const build = ready && asksToBuild(message);
      return NextResponse.json({ reply: build ? "I have what I need. I’ll build the plan now." : fallbackReply(brief), brief, ready, build });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(argumentsText) as Record<string, unknown>;
    } catch {
      const brief = fallbackBrief(message, currentBrief);
      const ready = Boolean(brief.roomType) && Number(brief.budget) > 0;
      const build = ready && asksToBuild(message);
      return NextResponse.json({ reply: build ? "I have what I need. I’ll build the plan now." : fallbackReply(brief), brief, ready, build });
    }
    const brief = cleanBrief(parsed.brief, currentBrief);
    const ready = Boolean(brief.roomType) && Number(brief.budget) > 0;
    const build = ready && parsed.build === true;
    const reply = typeof parsed.reply === "string" && parsed.reply.trim() ? parsed.reply.trim() : fallbackReply(brief);

    return NextResponse.json({ reply, brief, ready, build });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Chat failed." }, { status: 500 });
  }
}
