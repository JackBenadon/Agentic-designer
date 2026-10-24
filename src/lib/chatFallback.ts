// Rule-based stand-in for the chat agent when no LLM is configured (or the LLM call fails).
// ponytail: keyword matching, not understanding; set GROQ_API_KEY for real conversation.

import { demoBrief } from "../data/demo";
import { money } from "./brief";

type Brief = Record<string, unknown>;

const ROOM =
  /\b(living ?room|lounge|bedroom|home office|office|study|dining room|kitchen|bathroom|nursery|kids?'? ?room|guest room|studio|den|hallway|entryway)\b/i;
const STYLE =
  /\b(warm|minimal(?:ist)?|cozy|cosy|modern|contemporary|scandi(?:navian)?|mid-?century|boho|japandi|industrial|coastal|rustic|traditional|calm|bright|colou?rful|eclectic|vintage)\b/gi;
const COLOR =
  /\b(white|cream|beige|ivory|grey|gray|black|green|sage|olive|blue|navy|red|pink|terracotta|rust|orange|yellow|mustard|brown|neutral)s?\b/gi;
const DIMENSIONS = /(\d+(?:\.\d+)?)\s*(ft|feet|foot|m|')?\s*(?:x|×|by)\s*(\d+(?:\.\d+)?)\s*(ft|feet|foot|m|')?/i;
const GREETING = /^(hi|hello|hey|hiya|yo|good (?:morning|afternoon|evening))\b[\s!.,]*$/i;
const UNSURE = /\b(don'?t know|dunno|not sure|no idea|unsure|idk|help|choose|decide|you pick|whatever|anything)\b/i;
const DEMO = /\b(demo|sample)\b/i;
const PHOTO = /\b(photos?|pictures?|pics?|images?)\b/i;
const CURRENCY: Record<string, string> = { $: "USD", usd: "USD", dollar: "USD", eur: "EUR", euro: "EUR", gbp: "GBP", pound: "GBP", cad: "CAD", aud: "AUD" };

function parseBudget(message: string, expecting: boolean) {
  const m = message.replace(DIMENSIONS, "");
  const hit =
    m.match(/\$\s?(\d[\d,.]*)\s*(k)?/i) ??
    m.match(/(\d[\d,.]*)\s*(k|usd|eur|gbp|cad|aud|dollars?|euros?|pounds?)\b/i) ??
    m.match(/budget\D{0,20}?(\d[\d,.]*)\s*(k)?/i) ??
    // Right after asking for a budget, a message with exactly one number ("not sure, maybe 1200?") is the answer.
    (expecting ? m.match(/^\D*?(\d[\d,.]*)\s*(k)?\b\D*$/i) : null);
  if (!hit) return null;
  const unit = hit[2]?.toLowerCase().replace(/s$/, "") ?? "";
  const amount = Number(hit[1].replace(/,/g, "")) * (unit === "k" ? 1000 : 1);
  const currency = CURRENCY[unit] ?? (m.includes("$") ? "USD" : undefined);
  return amount > 0 ? { amount, currency } : null;
}

const phrase = (re: RegExp, message: string) =>
  message.match(re)?.[1]?.trim().replace(/\s+/g, " ");

function extract(message: string, current: Brief) {
  const next: Brief = { ...current };
  const learned: string[] = [];

  const room = message.match(ROOM)?.[1];
  if (room && room.toLowerCase() !== String(current.roomType ?? "").toLowerCase()) {
    next.roomType = room.toLowerCase();
    learned.push(`A ${next.roomType}, lovely.`);
  }

  const dims = message.match(DIMENSIONS);
  if (dims) {
    next.dimensions = dims[0].trim();
    learned.push("Thanks for the measurements.");
  }

  const budget = parseBudget(message, Boolean(next.roomType) && !(Number(current.budget) > 0));
  if (budget) {
    next.budget = budget.amount;
    if (budget.currency) next.currency = budget.currency;
    learned.push(`${money(budget.amount, String(next.currency || "USD"))} it is.`);
  }

  const styles = [...new Set(message.match(STYLE)?.map((s) => s.toLowerCase()))];
  if (styles.length) {
    next.style = styles.join(", ");
    learned.push(`${styles.join(" and ").replace(/^./, (c) => c.toUpperCase())} sounds great.`);
  }
  const colors = [...new Set(message.match(COLOR)?.map((s) => s.toLowerCase().replace(/s$/, "")))];
  if (colors.length) {
    next.colors = colors.join(", ");
    if (!styles.length) learned.push(`I like ${colors.join(" and ")}.`);
  }

  const keep = phrase(/\bkeep(?:ing)?\s+(?:my|the|our)?\s*([a-z][a-z\s-]{1,30}?)(?=[,.;!]|\band\b|$)/i, message);
  if (keep) {
    next.keep = keep;
    learned.push(`I'll plan around your ${keep}.`);
  }
  const avoid = phrase(/\b(?:avoid|hate|no more|don'?t want|nothing)\s+(?:any\s+)?([a-z][a-z\s-]{1,30}?)(?=[,.;!]|\band\b|$)/i, message);
  if (avoid && !UNSURE.test(avoid)) {
    next.avoid = avoid;
    learned.push(`No ${avoid}, noted.`);
  }

  const constraints = new Set(Array.isArray(current.constraints) ? current.constraints.filter((c): c is string => typeof c === "string") : []);
  const before = constraints.size;
  if (/\brent(?:al|ing|er)?\b/i.test(message)) constraints.add("rental-friendly");
  if (/\b(no drilling|can(?:not|'t) drill)\b/i.test(message)) constraints.add("no drilling");
  if (/\b(dog|cat|pet|puppy|kitten)s?\b/i.test(message)) constraints.add("pets");
  if (/\b(child|children|kid|kids|toddler|baby)s?\b/i.test(message)) constraints.add("children");
  if (/\b(accessib|wheelchair|mobility)\w*/i.test(message)) constraints.add("accessibility needs");
  next.constraints = [...constraints];
  if (constraints.size > before) learned.push(`I'll keep ${[...constraints].slice(before).join(" and ")} in mind.`);

  return { next, learned };
}

// First variant that isn't what the agent just said, so it never repeats itself verbatim.
const pick = (options: string[], last: string) => options.find((o) => !last.includes(o)) ?? options[0];

function question(brief: Brief, message: string, understood: boolean, last: string) {
  const greeting = GREETING.test(message);
  // "Help me with my bedroom" is an answer, not uncertainty.
  const unsure = UNSURE.test(message) && !understood;

  if (/\b(build|create|start|make)\b.*\bplan\b/i.test(message)) {
    if (!brief.roomType) return "Happy to! I just need to know which room it's for first.";
    if (!(Number(brief.budget) > 0)) return "Happy to! I just need a rough budget first. How much would you like to spend?";
  }

  if (!brief.roomType) {
    if (greeting)
      return pick(
        [
          "Hi! Nice to meet you. Which room have you been wanting to change? A living room, a bedroom, a home office…?",
          "Hello again! Whenever you're ready, just tell me which room you'd like to work on.",
        ],
        last,
      );
    if (unsure)
      return pick(
        [
          "No problem, let's figure it out together. Which room do you spend the most time in, or which one bugs you most when you walk in? Living rooms and bedrooms are the usual places to start.",
          "Happy to help you choose. If one room feels cluttered, dark, or just not you, that's a great candidate. Or say “use the demo room” and I'll show you a sample plan first.",
        ],
        last,
      );
    return pick(
      [
        understood
          ? "Which room is this for?"
          : "Sorry, I didn't quite catch which room you mean. Is it a living room, bedroom, home office, or something else?",
        "Tell me the room in your own words, something like “my small bedroom” works.",
      ],
      last,
    );
  }

  if (!(Number(brief.budget) > 0)) {
    if (unsure)
      return pick(
        [
          "That's fine. Refreshing a room with a few key pieces often lands around $500 to $1,500, and new furniture usually means $2,000 or more. Give me a rough number and I'll stay under it.",
          "Even a ballpark helps, like “under $1,000”. I'll treat it as a hard ceiling.",
        ],
        last,
      );
    return pick(
      ["What budget should I stay within? A rough number is fine.", "Roughly how much would you like to spend in total?"],
      last,
    );
  }

  if (!brief.style && !brief.colors) {
    if (unsure)
      return pick(
        [
          "Let's not worry about style. I'll keep it calm and easy to live with. Anything you're keeping, or want to avoid? Or say “build my plan” whenever you're ready.",
          "No need to decide now. I can go warm and neutral, which suits most rooms. Say “build my plan” to see it.",
        ],
        last,
      );
    return pick(
      [
        "How do you want it to feel? Cosy, bright, minimal, colourful? Any colours you love?",
        "Any style or colours you're drawn to? If not, I can keep it calm and neutral.",
      ],
      last,
    );
  }

  return pick(
    [
      "That's enough for me to start. Is there anything you're keeping or want to avoid? Otherwise just say “build my plan”.",
      "I can build this whenever you like. Add anything else, like pets, a rental, or a piece you love, or say “build my plan”.",
    ],
    last,
  );
}

// The agent can't see photo contents in this demo, so it only ever confirms that a photo is attached.
const isUpload = (message: string) => /\battached\b/i.test(message) && PHOTO.test(message);

// `justAttached`: photos came with this message (possibly alongside typed text).
type Photos = { count: number; prompted: boolean; seen?: string | null; justAttached?: boolean };
const uploaded = (message: string, photos: Photos) => Boolean(photos.justAttached) || isUpload(message);

function photoNote(message: string, roomKnown: boolean, photos: Photos) {
  // `seen` is the vision model's description of the photo just attached, when one is available.
  if (photos.seen && uploaded(message, photos)) return `Here's my read of your photo: ${photos.seen} Does that look right?`;
  if (photos.count > 0 && uploaded(message, photos))
    return `Thanks, I've saved ${photos.count === 1 ? "your photo" : `your ${photos.count} photos`} with your brief.`;
  if (PHOTO.test(message) && photos.count === 0 && !photos.justAttached)
    return photos.prompted
      ? "No rush, the + button is right there whenever you're ready."
      : "Yes, please! Tap the + button next to the message box to add it.";
  if (roomKnown && photos.count === 0 && !photos.prompted)
    return "If you have a photo of the room, tap the + button to add it. It's optional.";
  return "";
}

export function fallbackTurn(message: string, current: Brief, lastAgent = "", photos: Photos = { count: 0, prompted: false }) {
  if (DEMO.test(message)) {
    return {
      brief: { ...demoBrief } as Brief,
      reply: `Done! I've loaded the sample room: a small living room, ${money(demoBrief.budget)}, warm and minimal, keeping the existing sofa. Change anything you like, or say “build my plan” to see it come together.`,
    };
  }
  // An upload notice ("I've attached 1 room photo.") carries no brief details; its number isn't a budget.
  const { next, learned } = extract(isUpload(message) ? "" : message, current);
  const note = photoNote(message, Boolean(next.roomType), photos);
  const guessedRoom = photos.seen && uploaded(message, photos) && !next.roomType ? photos.seen.match(ROOM)?.[1] : undefined;
  if (guessedRoom) return { brief: next, reply: `${note} It looks like a ${guessedRoom.toLowerCase()}; is that the room we're refreshing?` };
  const reply = [learned.slice(0, 3).join(" "), note, question(next, message, learned.length > 0 || note !== "", lastAgent)]
    .filter(Boolean)
    .join(" ");
  return { brief: next, reply };
}
