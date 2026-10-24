"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DELIVERY_ESTIMATE, concept, demoBrief, initialPlan, reviewer, revisedPlan, type Item } from "@/data/demo";
import { type Brief, loadBrief, money, saveBrief } from "@/lib/brief";
import { Badge, BudgetMeter, ItemCard, btnOnSurface, btnPrimary } from "@/components/ui";

const emptyBrief: Brief = {
  photos: [],
  roomType: "",
  dimensions: "",
  budget: 0,
  currency: "USD",
  style: "",
  colors: "",
  keep: "",
  avoid: "",
  constraints: [],
  delivery: "",
};

const INTRO =
  "Hi, I’m your Roomwise design agent. Tell me about the room you want to refresh.";

// Each stage runs for one tick and completes on the next; content for a stage appears once it completes.
const STAGES = [
  "Reviewing your brief and constraints",
  "Finding products with Exa",
  "Asking a Terac reviewer for feedback",
  "Updating your recommendations",
];
const LAST_TICK = STAGES.length * 2 - 1;
const doneAt = (i: number) => i * 2 + 1;

type Msg = { from: "agent" | "user"; text: string; images?: string[] };
type ApiPlan = {
  status: string;
  room_brief: { budget: number; currency: string };
  design_concept: string;
  items: Array<{
    name: string;
    retailer: string;
    url: string;
    image_url: string | null;
    price: number | null;
    currency: string;
    dimensions: string | null;
    reason_selected: string;
    availability_confidence: string;
  }>;
  estimated_subtotal: number | null;
  delivery_estimate: number | null;
  estimated_total: number | null;
  terac_review: { requested: boolean; completed: boolean; feedback_summary: string; changes_made: string[] };
  assumptions: string[];
  unresolved_questions: string[];
};
const sum = (items: Item[]) => items.reduce((s, i) => s + i.price, 0);

// Shrink a photo to at most 1024px as JPEG: small enough to send to the vision model and keep in session storage.
async function downscale(file: File): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return null; // e.g. HEIC in browsers that can't decode it
  }
}

export default function RoomChat() {
  const [brief, setBrief] = useState<Brief>(emptyBrief);
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "agent", text: INTRO }]);
  const [phase, setPhase] = useState<"ask" | "run">("ask");
  const [draft, setDraft] = useState("");
  // Photos picked with + but not sent yet; they go out with the next message.
  const [pending, setPending] = useState<string[]>([]);
  const [tick, setTick] = useState(0);
  const [status, setStatus] = useState("");
  const [apiPlan, setApiPlan] = useState<ApiPlan | null>(null);
  const [apiError, setApiError] = useState("");
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [typing, setTyping] = useState(false);

  // #demo comes from the demo page; #review from "Refine this plan" on /plan.
  useEffect(() => {
    const saved = loadBrief();
    if (location.hash === "#review" && saved) {
      setBrief(saved);
      setMsgs([{ from: "agent", text: "Welcome back. Tell me naturally what you’d like to change, or say “build my plan” when it feels right." }]);
    } else if (location.hash === "#demo") {
      setBrief(demoBrief);
      setMsgs([
        { from: "agent", text: INTRO },
        { from: "user", text: "Use the demo room" },
        { from: "agent", text: "I’ve loaded the sample living room. Ask for changes, add context, or say “build my plan” when you’re ready." },
      ]);
    }
  }, []);

  useEffect(() => {
    if (phase !== "run" || tick >= LAST_TICK) return;
    const t = setTimeout(() => setTick((n) => n + 1), 1300);
    return () => clearTimeout(t);
  }, [phase, tick]);

  // Follow the conversation, but don't yank the page on first load.
  const end = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    mounted.current = true;
  }, [msgs.length, tick, phase]);

  async function sendMessage(text: string) {
    const images = pending;
    const typed = text.trim();
    if ((!typed && !images.length) || typing) return;
    // Photos sent without text still need words for the agent and the conversation history.
    const message = typed || `I've attached ${images.length} room photo${images.length === 1 ? "" : "s"}.`;
    const photos = [...brief.photos, ...images];

    // Image data goes to the server once, with this message; history only notes that photos were attached.
    const history = msgs.map((m) =>
      m.images?.length ? { from: m.from, text: [m.text, `[attached ${m.images.length} room photo(s)]`].filter(Boolean).join(" ") } : m,
    );
    setDraft("");
    setPending([]);
    setBrief((current) => ({ ...current, photos }));
    setMsgs((current) => [...current, { from: "user", text: typed, images }]);
    setTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history,
          brief: { ...brief, photos: photos.length > 0 ? `[${photos.length} photo(s) attached]` : [] },
          photoCount: photos.length,
          images,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "I couldn’t understand that response.");

      const nextBrief: Brief = { ...brief, ...data.brief, photos };
      setBrief(nextBrief);
      if (typeof data.reply === "string") setMsgs((current) => [...current, { from: "agent", text: data.reply }]);
      if (data.build === true) await confirm(nextBrief);
    } catch (error) {
      setMsgs((current) => [
        ...current,
        { from: "agent", text: error instanceof Error ? error.message : "Something went wrong. Please try saying that another way." },
      ]);
    } finally {
      setTyping(false);
    }
  }

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    const images = [...files].filter((file) => file.type.startsWith("image/"));
    const urls = (await Promise.all(images.map(downscale))).filter((url): url is string => url !== null);
    setPending((current) => [...current, ...urls]);
  }

  async function confirm(planBrief = brief) {
    saveBrief(planBrief);
    setTick(0);
    setApiPlan(null);
    setApiError("");
    setLoadingPlan(true);
    setPhase("run");
    setMsgs((m) => [...m, { from: "user", text: "Looks good. Build my plan." }]);

    const payload = {
      room_type: planBrief.roomType,
      // Browser data URLs are deliberately not sent to the planner as public URLs.
      photo_urls: planBrief.photos.filter((photo) => /^https?:\/\//.test(photo)),
      photo_processing_consent: planBrief.photos.length > 0,
      dimensions: planBrief.dimensions || null,
      budget: planBrief.budget,
      currency: planBrief.currency,
      style_preferences: planBrief.style.split(",").map((v) => v.trim()).filter(Boolean),
      preferred_colors: planBrief.colors.split(",").map((v) => v.trim()).filter(Boolean),
      items_to_keep: planBrief.keep.split(",").map((v) => v.trim()).filter(Boolean),
      items_to_avoid: planBrief.avoid.split(",").map((v) => v.trim()).filter(Boolean),
      constraints: planBrief.constraints,
      delivery_postal_code: planBrief.delivery || undefined,
      photo_observations: planBrief.roomNotes || undefined,
      customer_id: "browser-session",
      confirmed: true,
    };

    try {
      const response = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The planner could not create a plan.");
      setApiPlan(result as ApiPlan);
    } catch (error) {
      setApiError(error instanceof Error ? error.message : "The planner could not create a plan.");
    } finally {
      setLoadingPlan(false);
    }
  }

  function refine() {
    setPhase("ask");
    setStatus("");
    setMsgs((m) => [
      ...m,
      { from: "user", text: "Refine this plan" },
      { from: "agent", text: "Of course. Tell me what isn’t working in your own words, and I’ll update the brief." },
    ]);
  }

  function save() {
    try {
      localStorage.setItem("roomwise:saved", JSON.stringify({ brief, items: revisedPlan, savedAt: new Date().toISOString() }));
      setStatus("Plan saved in this browser.");
    } catch {
      setStatus("Couldn't save in this browser.");
    }
  }

  const tailored = (["roomType", "style", "keep", "avoid"] as const).every((k) => brief[k] === demoBrief[k]);

  return (
    <section id="chat" className="mx-auto flex max-w-6xl scroll-mt-4 flex-col gap-6 px-5 pb-20 pt-6 lg:h-[calc(100svh-5rem)] lg:gap-5 lg:py-4">
      <div className="flex max-w-4xl flex-col gap-6">
        <div>
          <p className="text-balance text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Room plans, reviewed by a real person.
          </p>
          <h1 className="mt-3 max-w-[30ch] text-balance font-serif text-4xl leading-[1.05] sm:text-5xl lg:text-[2.75rem]">
            A room refresh, researched and reviewed for your budget.
          </h1>
        </div>
      </div>

      <div
        className="flex h-[32rem] min-h-0 min-w-0 flex-col gap-4 overflow-hidden rounded-3xl bg-page/40 p-4 lg:h-auto lg:flex-1"
        aria-label="Chat with your design agent"
      >
        <ol className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1" aria-live="polite">
          {msgs.map((m, i) => (
            <li key={i} className="flex flex-col">
              <Bubble from={m.from}>
                {m.images?.length ? (
                  <span className={`flex flex-wrap justify-end gap-2 ${m.text ? "mb-2" : ""}`}>
                    {m.images.map((src, j) => (
                      // eslint-disable-next-line @next/next/no-img-element -- local user-selected data URL
                      <img key={j} src={src} alt={`Room photo ${j + 1}`} className="h-24 w-32 rounded-xl object-cover" />
                    ))}
                  </span>
                ) : null}
                {m.text}
              </Bubble>
            </li>
          ))}
        </ol>

        {typing && <AgentBlock><span className="animate-pulse">Thinking…</span></AgentBlock>}

        {phase === "ask" && (
          <form
            className="grid gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage(draft);
            }}
          >
            {pending.length > 0 && (
              <ul className="flex items-center gap-2 overflow-x-auto pb-1 pl-16 pt-1.5" aria-label="Photos to send with your next message">
                {pending.map((photo, index) => (
                  <li key={index} className="relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element -- local user-selected data URL */}
                    <img src={photo} alt={`Attached room photo ${index + 1}`} className="h-14 w-20 rounded-lg object-cover" />
                    <button
                      type="button"
                      aria-label={`Remove photo ${index + 1}`}
                      className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-ink text-xs leading-none text-page"
                      onClick={() => setPending((current) => current.filter((_, j) => j !== index))}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center gap-3">
              <label
                title="Add room photos"
                className={`grid size-13 shrink-0 cursor-pointer place-items-center rounded-full bg-primary text-white shadow-sm transition-colors hover:bg-primary/90 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${typing ? "pointer-events-none opacity-50" : ""}`}
              >
                <svg aria-hidden viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span className="sr-only">Add room photos</span>
                <input
                  className="sr-only"
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={typing}
                  onChange={(event) => {
                    void addPhotos(event.target.files);
                    event.target.value = "";
                  }}
                />
              </label>
              <input
                className="w-full rounded-full bg-page px-5 py-3 text-base ring-1 ring-ink/15 outline-none focus:ring-2 focus:ring-primary"
                aria-label="Message your design agent"
                placeholder={pending.length ? "Add a message, or press Enter to send" : "Tell me about your room…"}
                value={draft}
                disabled={typing}
                onChange={(event) => setDraft(event.target.value)}
              />
            </div>
            <div className="flex justify-end px-2 text-xs text-ink/65">
              <span>Press Enter to send</span>
            </div>
            <p className="px-2 text-xs text-ink/60">
              Adding a photo gives permission to use it for this plan. Avoid faces, documents, and addresses.
            </p>
          </form>
        )}

        {phase === "run" && loadingPlan && (
          <AgentBlock wide>
            <p>Building your plan from the confirmed brief…</p>
            <p className="mt-2 text-sm text-ink/70">Searching products and checking the available review workflow.</p>
          </AgentBlock>
        )}

        {phase === "run" && apiError && !loadingPlan && (
          <AgentBlock wide>
            <p className="font-medium">I couldn&apos;t build the plan.</p>
            <p className="mt-1 text-sm text-ink/75">{apiError}</p>
            <button className={`${btnPrimary} mt-4`} onClick={() => void confirm()}>Try again</button>
          </AgentBlock>
        )}

        {phase === "run" && apiPlan && !loadingPlan && <LivePlan plan={apiPlan} />}

        {phase === "run" && !apiPlan && !loadingPlan && !apiError && (
          <>
            <AgentBlock>
              <p>
                Exa, Terac and Whop aren&apos;t connected in this demo, so I&apos;m working from sample results.
                {!tailored && " This sample plan was written for a small living room, so it isn't tailored to your answers yet."}
              </p>
              <div className="mt-2">
                <Badge tone="sample">Sample results</Badge>
              </div>
            </AgentBlock>

            {STAGES.map((label, i) =>
              tick < i * 2 ? null : (
                <div key={label} className="flex flex-col gap-4">
                  <StageRow label={label} done={tick >= doneAt(i)} />
                  {tick >= doneAt(i) && i === 1 && (
                    <AgentBlock wide>
                      <p>
                        First draft: {initialPlan.length} pieces for {money(sum(initialPlan) + DELIVERY_ESTIMATE)} including
                        delivery.
                      </p>
                      <CardStrip items={initialPlan} />
                    </AgentBlock>
                  )}
                  {tick >= doneAt(i) && i === 2 && <ReviewerBlock />}
                  {tick >= doneAt(i) && i === 3 && <RevisionBlock />}
                </div>
              ),
            )}

            {tick >= LAST_TICK && (
              <div className="mt-4 rounded-3xl bg-surface p-6 sm:p-8">
                <Badge tone="agent">Your plan</Badge>
                <h2 className="mt-3 font-serif text-2xl sm:text-3xl">{concept.title}</h2>
                <p className="mt-2 text-ink/80">{concept.body}</p>
                <div className="mt-8">
                  <BudgetMeter total={sum(revisedPlan) + DELIVERY_ESTIMATE} budget={brief.budget} currency={brief.currency} />
                </div>
                {brief.currency !== "USD" && (
                  <p className="mt-3 text-xs text-ink/75">Sample prices are in USD; currency conversion comes with live results.</p>
                )}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link href="/checkout" className={btnPrimary}>
                    Unlock full plan
                  </Link>
                  <button className={btnOnSurface} onClick={save}>
                    Save plan
                  </button>
                  <button className={btnOnSurface} onClick={refine}>
                    Refine this plan
                  </button>
                </div>
                <p className="mt-4 flex flex-wrap justify-between gap-2 text-sm" role="status">
                  <span>{status}</span>
                  <Link href="/plan" className="font-medium text-primary hover:underline">
                    Open the shareable plan page →
                  </Link>
                </p>
              </div>
            )}
          </>
        )}
        <div ref={end} />
      </div>
    </section>
  );
}

function LivePlan({ plan }: { plan: ApiPlan }) {
  const moneyValue = (value: number | null) => value === null ? "Unconfirmed" : money(value, plan.room_brief.currency);
  return (
    <div className="grid gap-5 rounded-3xl bg-surface p-6 sm:p-8">
      <div>
        <Badge tone="agent">Backend plan · {plan.status}</Badge>
        <h2 className="mt-3 font-serif text-2xl sm:text-3xl">Your researched room plan</h2>
        <p className="mt-2 text-ink/80">{plan.design_concept}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {plan.items.map((item) => (
          <article key={`${item.name}-${item.url}`} className="rounded-2xl bg-page p-4">
            <h3 className="font-medium">{item.name}</h3>
            <p className="mt-1 text-sm text-ink/70">{item.retailer} · {moneyValue(item.price)}</p>
            <p className="mt-2 text-sm text-ink/80">{item.reason_selected}</p>
            <a className="mt-3 inline-block text-sm font-medium text-primary hover:underline" href={item.url} target="_blank" rel="noreferrer">
              View source →
            </a>
          </article>
        ))}
      </div>
      <div className="border-t border-ink/15 pt-4 text-sm">
        <p>Items: {moneyValue(plan.estimated_subtotal)} · Delivery: {moneyValue(plan.delivery_estimate)} · <strong>Total: {moneyValue(plan.estimated_total)}</strong></p>
        {plan.terac_review.requested && (
          <p className="mt-2">
            {plan.terac_review.completed ? "Reviewer feedback" : "Terac review status"}: {plan.terac_review.feedback_summary}
          </p>
        )}
        {plan.assumptions.length > 0 && <p className="mt-2 text-ink/70">Note: {plan.assumptions[0]}</p>}
      </div>
    </div>
  );
}

function Bubble({ from, children }: { from: "agent" | "user"; children: React.ReactNode }) {
  return from === "agent" ? (
    <div className="max-w-[88%] self-start rounded-3xl rounded-tl-md bg-surface px-5 py-3.5 leading-relaxed">{children}</div>
  ) : (
    <div className="max-w-[80%] self-end rounded-3xl rounded-tr-md bg-primary px-5 py-3.5 text-white">{children}</div>
  );
}

function AgentBlock({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`self-start rounded-3xl rounded-tl-md bg-surface px-5 py-4 leading-relaxed ${wide ? "w-full" : "max-w-[88%]"}`}>
      {children}
    </div>
  );
}

function StageRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-3 self-start rounded-full bg-surface/60 py-2 pl-2 pr-4 text-sm">
      <span
        aria-hidden
        className={`grid size-6 place-items-center rounded-full text-xs ${done ? "bg-success" : "animate-pulse bg-primary/25"}`}
      >
        {done ? "✓" : ""}
      </span>
      <span>{done ? label : `${label}…`}</span>
      <span className="text-xs text-ink/75">Simulated{done ? " · done" : ""}</span>
    </div>
  );
}

function CardStrip({ items, changed }: { items: Item[]; changed?: Set<string> }) {
  return (
    <ul className="-mx-5 mt-4 flex snap-x gap-4 overflow-x-auto px-5 pb-2">
      {items.map((item) => (
        <li key={item.id} className="w-56 shrink-0 snap-start">
          <ItemCard item={item} compact change={changed?.has(item.id) ? "Changed after review" : undefined} />
        </li>
      ))}
    </ul>
  );
}

function ReviewerBlock() {
  return (
    <div className="self-start rounded-3xl rounded-tl-md bg-success/60 px-5 py-4 leading-relaxed">
      <p className="text-xs font-semibold uppercase tracking-[0.15em]">{reviewer.label} · feedback</p>
      <p className="mt-2 font-serif text-lg">&ldquo;{reviewer.summary}&rdquo;</p>
      <ul className="mt-3 grid list-disc gap-2 pl-5 text-sm">
        {reviewer.notes.map((n) => (
          <li key={n.about}>{n.text}</li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-ink/75">
        A reviewer&apos;s perspective from a person recruited through Terac, not a certified interior designer.
      </p>
    </div>
  );
}

function RevisionBlock() {
  const changed = new Set(reviewer.notes.map((n) => n.about));
  const before = sum(initialPlan);
  const after = sum(revisedPlan);
  return (
    <AgentBlock wide>
      <p>
        I&apos;ve revised the plan from the reviewer&apos;s notes. It&apos;s now {money(before - after)} cheaper.
      </p>
      <ul className="mt-4 grid gap-2 text-sm">
        {reviewer.notes.map((n) => {
          const a = initialPlan.find((i) => i.id === n.about)!;
          const b = revisedPlan.find((i) => i.id === n.about)!;
          return (
            <li key={n.about} className="grid items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
              <span className="rounded-xl bg-page/60 px-3 py-2 text-ink/75 line-through decoration-ink/40">
                {a.name} · {money(a.price)}
              </span>
              <span aria-hidden className="hidden text-center sm:block">
                →
              </span>
              <span className="rounded-xl bg-success px-3 py-2">
                {b.name} · {money(b.price)}
              </span>
            </li>
          );
        })}
      </ul>
      <CardStrip items={revisedPlan} changed={changed} />
    </AgentBlock>
  );
}
