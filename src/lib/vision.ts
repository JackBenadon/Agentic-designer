// Server-only: asks a Groq vision model what it can see in the customer's room photos.

const PROMPT = `You help an interior design service understand a customer's room photo.
In 2–4 short sentences, describe: the likely room type, the main furniture, colours and materials, natural light, and anything notable for a refresh (clutter, worn pieces, pet items).
These are approximate observations. Never estimate measurements or dimensions.
Do not describe people. If the image shows people, documents, screens with text, or addresses, say only "The photo includes personal details." for that part.
If it is not a photo of a room, say so in one sentence.`;

export async function describeRoom(images: string[]): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key || images.length === 0) return null;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.VISION_MODEL || "qwen/qwen3.8-27b",
        temperature: 0.2,
        max_tokens: 400,
        reasoning_format: "hidden",
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: PROMPT }, ...images.map((url) => ({ type: "image_url", image_url: { url } }))],
          },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    return typeof text === "string" && text.trim() ? text.trim().slice(0, 800) : null;
  } catch {
    return null;
  }
}
