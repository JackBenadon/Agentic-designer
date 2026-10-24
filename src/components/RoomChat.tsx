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

type Field = "roomType" | "dimensions" | "photos" | "budget" | "style" | "keep" | "avoid" | "constraints";
type Step = { field: Field; ask: string; chips: string[]; placeholder: string; multi?: boolean; optional?: boolean };

const STEPS: Step[] = [
  {
    field: "roomType",
    ask: "Hi, I'm your Roomwise design agent. Which room are we refreshing?",
    chips: ["Living room", "Bedroom", "Home office", "Dining room", "Kids' room"],
    placeholder: "Or type another room",
  },
  {
    field: "dimensions",
    ask: "Roughly how big is it? Skip this if you're not sure.",
    chips: ["Under 120 sq ft", "120–200 sq ft", "Over 200 sq ft"],
    placeholder: "e.g. 12 × 14 ft",
    optional: true,
  },
  {
    field: "photos",
    ask: "Can you share a photo or two? A wide shot from the doorway works best.",
    chips: [],
    placeholder: "",
    optional: true,
  },
  {
    field: "budget",
    ask: "What's your total budget?",
    chips: ["$800", "$1,500", "$3,000"],
    placeholder: "e.g. 2000, or 1800 EUR",
  },
  {
    field: "style",
    ask: "What style and colours feel like you? Pick any, or describe it.",
    chips: ["Warm minimal", "Scandinavian", "Mid-century", "Japandi", "Solid colours"],
    placeholder: "e.g. cream and deep red",
    multi: true,
    optional: true,
  },
  {
    field: "keep",
    ask: "Is there anything you're keeping?",
    chips: ["My sofa", "My rug", "My bed", "My desk"],
    placeholder: "Something else you're keeping",
    multi: true,
    optional: true,
  },
  {
    field: "avoid",
    ask: "Anything to avoid?",
    chips: ["Scratchy natural-fiber rugs", "Glass tables", "Dark colours"],
    placeholder: "Something else to avoid",
    multi: true,
    optional: true,
  },
  {
    field: "constraints",
    ask: "Last one: any constraints, and where should things be delivered?",
    chips: ["Pets", "Children", "Accessibility needs", "Rental: no drilling"],
    placeholder: "Delivery city or ZIP",
    multi: true,
    optional: true,
  },
];

const REVIEW_ASK = "Here's your brief. Change anything that's off, then confirm and I'll get to work.";

// Each stage runs for one tick and completes on the next; content for a stage appears once it completes.
const STAGES = [
  "Reviewing your brief and constraints",
  "Finding products with Exa",
  "Asking a Terac reviewer for feedback",
  "Updating your recommendations",
];
const LAST_TICK = STAGES.length * 2 - 1;
const doneAt = (i: number) => i * 2 + 1;

function apply(b: Brief, field: Field, chips: string[], text: string): Brief {
  if (field === "budget") {
    const n = Number((text || chips[0] || "").replace(/[^\d.]/g, ""));
    const cur = text.match(/\b(usd|eur|gbp|cad|aud)\b/i)?.[1].toUpperCase();
    return { ...b, budget: n, currency: cur ?? b.currency };
  }
  if (field === "constraints") return { ...b, constraints: chips, delivery: text };
  return { ...b, [field]: [...chips, text].filter(Boolean).join(", ") };
}

type Msg = { from: "agent" | "user"; text: string };
const sum = (items: Item[]) => items.reduce((s, i) => s + i.price, 0);

export default function RoomChat() {
  const [brief, setBrief] = useState<Brief>(emptyBrief);
  const [step, setStep] = useState(0);
  const [answered, setAnswered] = useState<Field[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "agent", text: STEPS[0].ask }]);
  const [phase, setPhase] = useState<"ask" | "review" | "run">("ask");
  const [tick, setTick] = useState(0);
  const [status, setStatus] = useState("");

  // #demo comes from the demo page; #review from "Refine this plan" on /plan.
  useEffect(() => {
    const saved = loadBrief();
    /* eslint-disable react-hooks/set-state-in-effect -- reading the URL hash and sessionStorage after hydration */
    if (location.hash === "#review" && saved) {
      setBrief(saved);
      setPhase("review");
      setMsgs([{ from: "agent", text: "Welcome back. " + REVIEW_ASK }]);
    } else if (location.hash === "#demo") {
      setBrief(demoBrief);
      setPhase("review");
      setMsgs([
        { from: "agent", text: STEPS[0].ask },
        { from: "user", text: "Use the demo room" },
        { from: "agent", text: "I've filled everything in from the sample living room. " + REVIEW_ASK },
      ]);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
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

  function answer(text: string, next: Brief) {
    const field = STEPS[step].field;
    const n = step + 1;
    setBrief(next);
    setAnswered((a) => [...a, field]);
    setMsgs((m) => [...m, { from: "user", text }, { from: "agent", text: n < STEPS.length ? STEPS[n].ask : REVIEW_ASK }]);
    if (n < STEPS.length) setStep(n);
    else setPhase("review");
  }

  function fillDemo() {
    const next = { ...brief };
    for (const { field } of STEPS) {
      if (answered.includes(field)) continue;
      if (field === "constraints") next.delivery = demoBrief.delivery;
      if (field === "style") next.colors = demoBrief.colors;
      Object.assign(next, { [field]: demoBrief[field] });
    }
    setBrief(next);
    setPhase("review");
    setMsgs((m) => [
      ...m,
      { from: "user", text: "Use the demo room" },
      { from: "agent", text: "I've filled in the rest from the sample living room. " + REVIEW_ASK },
    ]);
  }

  function confirm() {
    saveBrief(brief);
    setTick(0);
    setPhase("run");
    setMsgs((m) => [...m, { from: "user", text: "Looks good. Build my plan." }]);
  }

  function refine() {
    setPhase("review");
    setStatus("");
    setMsgs((m) => [
      ...m,
      { from: "user", text: "Refine this plan" },
      { from: "agent", text: "Sure. Change anything below and I'll rebuild it." },
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
  const current = STEPS[step];

  return (
    <section id="chat" className="mx-auto grid max-w-6xl scroll-mt-4 gap-10 px-5 pb-20 pt-8 lg:grid-cols-[5fr_7fr] lg:gap-16 lg:pb-28 lg:pt-14">
      <div className="flex flex-col gap-10 lg:sticky lg:top-6 lg:self-start">
        <div>
          <p className="text-balance text-xs font-medium uppercase tracking-[0.2em] text-primary">
            Room plans, reviewed by a real person.
          </p>
          <h1 className="mt-5 max-w-[17ch] text-balance font-serif text-4xl leading-[1.1] sm:text-5xl lg:text-[2.75rem]">
            A room refresh, researched and reviewed for your budget.
          </h1>
        </div>
        <Summary brief={brief} />
      </div>

      <div className="flex min-w-0 flex-col gap-4" aria-label="Chat with your design agent">
        <ol className="flex flex-col gap-4" aria-live="polite">
          {msgs.map((m, i) => (
            <li key={i} className="flex flex-col">
              <Bubble from={m.from}>{m.text}</Bubble>
            </li>
          ))}
        </ol>

        {phase === "ask" && current.field === "photos" && (
          <PhotoStep
            photos={brief.photos}
            onChange={(photos) => setBrief((b) => ({ ...b, photos }))}
            onNext={() =>
              answer(brief.photos.length ? `Added ${brief.photos.length} photo${brief.photos.length > 1 ? "s" : ""}` : "Skip the photo for now", brief)
            }
            onDemo={fillDemo}
          />
        )}
        {phase === "ask" && current.field !== "photos" && (
          <StepInput
            key={current.field}
            step={current}
            onAnswer={(chips, text) => answer([...chips, text].filter(Boolean).join(", ") || "Skip", apply(brief, current.field, chips, text))}
            onDemo={fillDemo}
          />
        )}
        {phase === "review" && <ReviewForm brief={brief} onChange={setBrief} onConfirm={confirm} />}

        {phase === "run" && (
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

const input =
  "w-full rounded-full bg-page px-4 py-2.5 text-base ring-1 ring-ink/15 outline-none focus:ring-2 focus:ring-primary";

const chip = (on: boolean) =>
  `rounded-full px-4 py-2 text-sm transition-colors ${on ? "bg-primary text-white" : "bg-surface hover:bg-surface/70"}`;

function DemoChip({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-dashed border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5"
    >
      Use the demo room
    </button>
  );
}

function StepInput({ step, onAnswer, onDemo }: { step: Step; onAnswer: (chips: string[], text: string) => void; onDemo: () => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [text, setText] = useState("");
  const invalid = step.field === "budget" && text !== "" && !/\d/.test(text);
  const empty = !picked.length && !text;

  return (
    <form
      className="mt-2 grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!invalid && (step.optional || !empty)) onAnswer(picked, text.trim());
      }}
    >
      <div className="flex flex-wrap gap-2" role="group" aria-label="Suggested answers">
        {step.chips.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={step.multi ? picked.includes(c) : undefined}
            className={chip(picked.includes(c))}
            onClick={() =>
              step.multi ? setPicked((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c])) : onAnswer([c], "")
            }
          >
            {c}
          </button>
        ))}
        <DemoChip onClick={onDemo} />
      </div>
      <div className="flex gap-2">
        <input
          className={input}
          aria-label={step.placeholder}
          placeholder={step.placeholder}
          inputMode={step.field === "budget" ? "decimal" : undefined}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className={`${btnPrimary} shrink-0`} disabled={invalid || (!step.optional && empty)}>
          {empty && step.optional ? "Skip" : step.multi ? "Continue" : "Send"}
        </button>
      </div>
      {invalid && <p className="text-sm text-primary">Please include a number, e.g. 1500.</p>}
    </form>
  );
}

function PhotoStep({
  photos,
  onChange,
  onNext,
  onDemo,
}: {
  photos: string[];
  onChange: (p: string[]) => void;
  onNext: () => void;
  onDemo: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [replacing, setReplacing] = useState<number | null>(null);

  const read = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const urls = await Promise.all([...files].filter((f) => f.type.startsWith("image/")).map(read));
    if (replacing !== null) onChange(photos.map((p, i) => (i === replacing ? urls[0] ?? p : p)));
    else onChange([...photos, ...urls]);
    setReplacing(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  const pick = (index: number | null) => {
    setReplacing(index);
    fileInput.current?.click();
  };

  return (
    <div className="mt-2 grid gap-4">
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple={replacing === null}
        className="sr-only"
        aria-label="Upload room photos"
        onChange={(e) => onFiles(e.target.files)}
      />
      {photos.length > 0 && (
        <ul className="flex flex-wrap justify-end gap-3">
          {photos.map((src, i) => (
            <li key={i} className="w-32">
              {/* eslint-disable-next-line @next/next/no-img-element -- user uploads are data URLs */}
              <img src={src} alt={`Room photo ${i + 1}`} className="aspect-[4/3] w-full rounded-xl object-cover" />
              <div className="mt-1 flex justify-between text-xs">
                <button type="button" className="text-primary hover:underline" onClick={() => pick(i)}>
                  Replace
                </button>
                <button type="button" className="hover:underline" onClick={() => onChange(photos.filter((_, j) => j !== i))}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={chip(false)} onClick={() => pick(null)}>
          {photos.length ? "Add another photo" : "Upload or take a photo"}
        </button>
        {!photos.includes("/demo/room.svg") && (
          <button type="button" className={chip(false)} onClick={() => onChange([...photos, "/demo/room.svg"])}>
            Use the sample photo
          </button>
        )}
        <DemoChip onClick={onDemo} />
        <button type="button" className={`${btnPrimary} ml-auto`} onClick={onNext}>
          {photos.length ? "Continue" : "Skip"}
        </button>
      </div>
      <p className="text-xs text-ink/75">
        Your photo is only used to create your room plan. Please make sure it doesn&apos;t show sensitive personal
        information like documents, faces, or addresses.
      </p>
    </div>
  );
}

function ReviewForm({ brief, onChange, onConfirm }: { brief: Brief; onChange: (b: Brief) => void; onConfirm: () => void }) {
  const set = (patch: Partial<Brief>) => onChange({ ...brief, ...patch });
  const field = (label: string, key: "roomType" | "dimensions" | "style" | "colors" | "keep" | "avoid" | "delivery") => (
    <label className="text-sm">
      {label}
      <input className={`${input} mt-1`} value={brief[key]} required={key === "roomType"} onChange={(e) => set({ [key]: e.target.value })} />
    </label>
  );
  return (
    <form
      className="grid gap-3 rounded-3xl bg-surface/60 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onConfirm();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {field("Room", "roomType")}
        {field("Size", "dimensions")}
        <label className="text-sm">
          Budget ({brief.currency})
          <input
            className={`${input} mt-1`}
            type="number"
            min={1}
            required
            value={brief.budget || ""}
            onChange={(e) => set({ budget: Number(e.target.value) })}
          />
        </label>
        {field("Delivery", "delivery")}
        {field("Style", "style")}
        {field("Colours", "colors")}
        {field("Keep", "keep")}
        {field("Avoid", "avoid")}
      </div>
      <label className="text-sm">
        Constraints
        <input
          className={`${input} mt-1`}
          value={brief.constraints.join(", ")}
          onChange={(e) => set({ constraints: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
        />
      </label>
      <div className="pt-2">
        <button className={btnPrimary}>Confirm brief and build my plan</button>
      </div>
    </form>
  );
}

function Summary({ brief }: { brief: Brief }) {
  const rows: [string, string][] = [
    ["Room", [brief.roomType, brief.dimensions].filter(Boolean).join(", ")],
    ["Budget", brief.budget ? money(brief.budget, brief.currency) : ""],
    ["Style", [brief.style, brief.colors].filter(Boolean).join("; ")],
    ["Keep", brief.keep],
    ["Avoid", brief.avoid],
    ["Constraints", [...brief.constraints, brief.delivery && `deliver to ${brief.delivery}`].filter(Boolean).join(", ")],
  ];
  return (
    <aside aria-label="Your brief so far" className="rounded-3xl bg-surface/50 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.2em]">Your brief</h2>
        {brief.photos.length > 0 && (
          // eslint-disable-next-line @next/next/no-img-element -- data URL or local mock
          <img src={brief.photos[0]} alt="" className="h-10 w-14 rounded-lg object-cover" />
        )}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-xs text-ink/75">{k}</dt>
            <dd className={`mt-0.5 break-words ${v ? "font-medium" : "text-ink/50"}`}>{v || "—"}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
