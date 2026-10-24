"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { demoBrief } from "@/data/demo";
import { type Brief, loadBrief, money, saveBrief } from "@/lib/brief";
import { Badge, btnPrimary, btnSecondary } from "@/components/ui";

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

const STEPS = ["account", "photo", "room", "budget", "style", "constraints", "review"] as const;
type Step = (typeof STEPS)[number];

const QUESTIONS: Record<Step, string> = {
  account: "Hi! I'm the Roomwise assistant. Sign in to the demo account, or continue in demo mode?",
  photo: "Share a photo or two of the room. A wide shot from the doorway works best.",
  room: "What kind of room is it, and roughly how big? Skip the size if you're not sure.",
  budget: "What's your total budget, and in which currency?",
  style: "What style and colours do you like? Anything you're keeping, or want to avoid?",
  constraints: "Any constraints I should know about? And where should things be delivered?",
  review: "Here's your brief. Edit anything that's off, then confirm and I'll get to work.",
};

const ROOM_TYPES = ["Living room", "Bedroom", "Home office", "Dining room", "Kids' room", "Studio"];
const CONSTRAINTS = ["Pets", "Children", "Accessibility needs", "Rental: no drilling or painting"];
const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"];

const input =
  "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-base outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20";

export default function IntakePage() {
  const router = useRouter();
  const [brief, setBrief] = useState<Brief>(emptyBrief);
  const [step, setStep] = useState(0);
  const [account, setAccount] = useState("");
  const set = (patch: Partial<Brief>) => setBrief((b) => ({ ...b, ...patch }));

  // #demo comes from the demo page; #review from "Refine this plan".
  useEffect(() => {
    const saved = loadBrief();
    if (location.hash === "#review" && saved) {
      /* eslint-disable react-hooks/set-state-in-effect -- reading sessionStorage after hydration */
      setBrief(saved);
      setAccount("Refining my plan");
      setStep(STEPS.indexOf("review"));
    } else if (location.hash === "#demo") {
      setBrief(demoBrief);
      setAccount("Signed in to the demo account");
      setStep(1);
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, []);

  const current = STEPS[step];
  const next = () => setStep((s) => s + 1);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [step]);

  const answers: Record<Step, string> = {
    account,
    photo: brief.photos.length ? `${brief.photos.length} photo${brief.photos.length > 1 ? "s" : ""} added` : "Skipped the photo",
    room: [brief.roomType, brief.dimensions || "size unknown"].join(", "),
    budget: brief.budget ? `${money(brief.budget, brief.currency)} ${brief.currency}` : "",
    style: [brief.style, brief.colors && `Colours: ${brief.colors}`, brief.keep && `Keep: ${brief.keep}`, brief.avoid && `Avoid: ${brief.avoid}`]
      .filter(Boolean)
      .join(" · ") || "No strong preferences",
    constraints: [brief.constraints.join(", ") || "No special constraints", brief.delivery && `Deliver to ${brief.delivery}`]
      .filter(Boolean)
      .join(" · "),
    review: "",
  };

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-6 sm:px-5 lg:grid-cols-[1fr_20rem] lg:py-10">
      <section aria-label="Chat" className="flex min-w-0 flex-col">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-2xl">Your room brief</h1>
          <Badge tone="sample">Demo mode</Badge>
        </div>
        <Progress step={step} />

        <ol className="mt-6 flex flex-col gap-4" aria-live="polite">
          {STEPS.slice(0, step + 1).map((s, i) => (
            <li key={s} className="flex flex-col gap-3">
              <Bubble from="bot">{QUESTIONS[s]}</Bubble>
              {i < step && answers[s] && <Bubble from="user">{answers[s]}</Bubble>}
            </li>
          ))}
        </ol>

        <div ref={bottom} className="mt-5 rounded-2xl border border-line bg-white p-4 sm:p-5">
          {current === "account" && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                className={btnPrimary}
                onClick={() => {
                  setBrief(demoBrief);
                  setAccount("Signed in to the demo account");
                  next();
                }}
              >
                Sign in to demo account
              </button>
              <button
                className={btnSecondary}
                onClick={() => {
                  setAccount("Continue in demo mode");
                  next();
                }}
              >
                Continue in demo mode
              </button>
              <p className="text-xs text-ink/60 sm:self-center">The demo account pre-fills sample answers you can change.</p>
            </div>
          )}

          {current === "photo" && <PhotoStep photos={brief.photos} onChange={(photos) => set({ photos })} onNext={next} />}

          {current === "room" && (
            <StepForm onNext={next} canNext={!!brief.roomType}>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Room type">
                {ROOM_TYPES.map((t) => (
                  <Chip key={t} on={brief.roomType === t} onClick={() => set({ roomType: t })}>
                    {t}
                  </Chip>
                ))}
              </div>
              <label className="block text-sm">
                Approximate size <span className="text-ink/50">(optional)</span>
                <input className={`${input} mt-1`} placeholder="e.g. 12 ft × 14 ft" value={brief.dimensions} onChange={(e) => set({ dimensions: e.target.value })} />
              </label>
            </StepForm>
          )}

          {current === "budget" && (
            <StepForm onNext={next} canNext={brief.budget > 0}>
              <div className="flex gap-2">
                <label className="flex-1 text-sm">
                  Total budget
                  <input
                    className={`${input} mt-1`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    placeholder="1500"
                    value={brief.budget || ""}
                    onChange={(e) => set({ budget: Number(e.target.value) })}
                  />
                </label>
                <label className="w-28 text-sm">
                  Currency
                  <select className={`${input} mt-1`} value={brief.currency} onChange={(e) => set({ currency: e.target.value })}>
                    {CURRENCIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
              </div>
            </StepForm>
          )}

          {current === "style" && (
            <StepForm onNext={next} canNext>
              <TextField label="Style" placeholder="e.g. warm, minimal" value={brief.style} onChange={(style) => set({ style })} />
              <TextField label="Colours you like" placeholder="e.g. cream, terracotta" value={brief.colors} onChange={(colors) => set({ colors })} />
              <TextField label="Items to keep" placeholder="e.g. my grey sofa" value={brief.keep} onChange={(keep) => set({ keep })} />
              <TextField label="Things to avoid" placeholder="e.g. jute rugs, glass tables" value={brief.avoid} onChange={(avoid) => set({ avoid })} />
            </StepForm>
          )}

          {current === "constraints" && (
            <StepForm onNext={next} canNext>
              <ConstraintChips value={brief.constraints} onChange={(constraints) => set({ constraints })} />
              <TextField label="Delivery location" placeholder="City or ZIP / postcode" value={brief.delivery} onChange={(delivery) => set({ delivery })} />
            </StepForm>
          )}

          {current === "review" && (
            <form
              className="grid gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                saveBrief(brief);
                router.push("/processing");
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Room type" value={brief.roomType} onChange={(roomType) => set({ roomType })} required />
                <TextField label="Size" value={brief.dimensions} onChange={(dimensions) => set({ dimensions })} />
                <label className="text-sm">
                  Budget ({brief.currency})
                  <input className={`${input} mt-1`} type="number" min={1} required value={brief.budget || ""} onChange={(e) => set({ budget: Number(e.target.value) })} />
                </label>
                <TextField label="Delivery location" value={brief.delivery} onChange={(delivery) => set({ delivery })} />
                <TextField label="Style" value={brief.style} onChange={(style) => set({ style })} />
                <TextField label="Colours" value={brief.colors} onChange={(colors) => set({ colors })} />
                <TextField label="Keep" value={brief.keep} onChange={(keep) => set({ keep })} />
                <TextField label="Avoid" value={brief.avoid} onChange={(avoid) => set({ avoid })} />
              </div>
              <ConstraintChips value={brief.constraints} onChange={(constraints) => set({ constraints })} />
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button className={btnPrimary}>Confirm brief and build my plan</button>
                <button type="button" className={btnSecondary} onClick={() => setStep(1)}>
                  Start the questions again
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      <Summary brief={brief} step={step} />
    </main>
  );
}

function Progress({ step }: { step: number }) {
  const pct = Math.round((step / (STEPS.length - 1)) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs text-ink/60">
        <span>
          Step {step + 1} of {STEPS.length}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-terracotta transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Bubble({ from, children }: { from: "bot" | "user"; children: React.ReactNode }) {
  return from === "bot" ? (
    <div className="max-w-[85%] self-start rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-line">{children}</div>
  ) : (
    <div className="max-w-[85%] self-end rounded-2xl rounded-tr-sm bg-terracotta px-4 py-3 text-white">{children}</div>
  );
}

function StepForm({ children, onNext, canNext }: { children: React.ReactNode; onNext: () => void; canNext: boolean }) {
  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (canNext) onNext();
      }}
    >
      {children}
      <div>
        <button className={btnPrimary} disabled={!canNext}>
          Next
        </button>
      </div>
    </form>
  );
}

function TextField(props: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean }) {
  return (
    <label className="block text-sm">
      {props.label}
      <input
        className={`${input} mt-1`}
        value={props.value}
        placeholder={props.placeholder}
        required={props.required}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </label>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full border px-3.5 py-2 text-sm transition-colors ${on ? "border-terracotta bg-terracotta text-white" : "border-line bg-white hover:border-ink/30"}`}
    >
      {children}
    </button>
  );
}

function ConstraintChips({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Constraints">
      {CONSTRAINTS.map((c) => (
        <Chip key={c} on={value.includes(c)} onClick={() => onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c])}>
          {c}
        </Chip>
      ))}
    </div>
  );
}

function PhotoStep({ photos, onChange, onNext }: { photos: string[]; onChange: (p: string[]) => void; onNext: () => void }) {
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
    <div className="grid gap-4">
      <input ref={fileInput} type="file" accept="image/*" multiple={replacing === null} className="sr-only" aria-label="Upload room photos" onChange={(e) => onFiles(e.target.files)} />
      {photos.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {photos.map((src, i) => (
            <li key={i} className="w-32">
              {/* eslint-disable-next-line @next/next/no-img-element -- user uploads are data URLs */}
              <img src={src} alt={`Room photo ${i + 1}`} className="aspect-[4/3] w-full rounded-lg object-cover ring-1 ring-line" />
              <div className="mt-1 flex justify-between text-xs">
                <button type="button" className="text-terracotta hover:underline" onClick={() => pick(i)}>
                  Replace
                </button>
                <button type="button" className="text-ink/60 hover:underline" onClick={() => onChange(photos.filter((_, j) => j !== i))}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="button" className={photos.length ? btnSecondary : btnPrimary} onClick={() => pick(null)}>
          {photos.length ? "Add another photo" : "Upload or take a photo"}
        </button>
        {!photos.includes("/demo/room.svg") && (
          <button type="button" className={btnSecondary} onClick={() => onChange([...photos, "/demo/room.svg"])}>
            Use the sample room photo
          </button>
        )}
        <button type="button" className={photos.length ? btnPrimary : btnSecondary} onClick={onNext}>
          {photos.length ? "Next" : "Skip for now"}
        </button>
      </div>
      <p className="text-xs text-ink/60">
        Your photo is only used to create your room plan. Please make sure it doesn&apos;t show sensitive personal
        information like documents, faces, or addresses.
      </p>
    </div>
  );
}

function Summary({ brief, step }: { brief: Brief; step: number }) {
  const rows: [string, string][] = [
    ["Photos", brief.photos.length ? `${brief.photos.length} added` : ""],
    ["Room", [brief.roomType, brief.dimensions].filter(Boolean).join(", ")],
    ["Budget", brief.budget ? money(brief.budget, brief.currency) : ""],
    ["Style", [brief.style, brief.colors].filter(Boolean).join("; ")],
    ["Keep", brief.keep],
    ["Avoid", brief.avoid],
    ["Constraints", brief.constraints.join(", ")],
    ["Delivery", brief.delivery],
  ];
  return (
    <aside className="order-first lg:order-none">
      <details open className="rounded-2xl border border-line bg-white p-5 lg:sticky lg:top-6">
        <summary className="cursor-pointer font-medium">What I know so far</summary>
        <dl className="mt-4 grid gap-3 text-sm">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs uppercase tracking-wide text-ink/50">{k}</dt>
              <dd className={v ? "" : "text-ink/35"}>{v || (step > 0 ? "Not yet" : "…")}</dd>
            </div>
          ))}
        </dl>
      </details>
    </aside>
  );
}
