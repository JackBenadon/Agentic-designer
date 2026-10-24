"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DELIVERY_ESTIMATE, concept, demoBrief, initialPlan, reviewer, revisedPlan } from "@/data/demo";
import { type Brief, loadBrief, money } from "@/lib/brief";
import { Badge, ItemCard, btnPrimary, btnSecondary, seenOn } from "@/components/ui";

const sum = (items: { price: number }[]) => items.reduce((s, i) => s + i.price, 0);

export default function PlanPage() {
  const [brief, setBrief] = useState<Brief>(demoBrief);
  const [unlocked, setUnlocked] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- reading sessionStorage after hydration */
    setBrief(loadBrief() ?? demoBrief);
    try {
      setUnlocked(sessionStorage.getItem("roomwise:unlocked") === "1");
    } catch {}
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // The seeded plan was written for the demo brief; say so plainly when the user's answers differ.
  const tailored = (["roomType", "style", "keep", "avoid"] as const).every((k) => brief[k] === demoBrief[k]);
  const subtotal = sum(revisedPlan);
  const total = subtotal + DELIVERY_ESTIMATE;
  const remaining = brief.budget - total;
  const originalTotal = sum(initialPlan) + DELIVERY_ESTIMATE;
  const changed = new Set(reviewer.notes.map((n) => n.about));
  const notes = revisedPlan.filter((i) => i.note);

  function save() {
    try {
      localStorage.setItem("roomwise:saved", JSON.stringify({ brief, items: revisedPlan, savedAt: new Date().toISOString() }));
      setStatus("Plan saved in this browser.");
    } catch {
      setStatus("Couldn't save in this browser.");
    }
  }

  async function share() {
    const data = { title: "My Roomwise plan", text: concept.title, url: location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else {
        await navigator.clipboard.writeText(location.href);
        setStatus("Link copied.");
      }
    } catch {}
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
      <div className="flex flex-wrap gap-2">
        <Badge tone="sample">Sample results · Exa and Terac not connected</Badge>
        <Badge tone="agent">Agent-generated plan</Badge>
        {unlocked && <Badge tone="reviewer">Unlocked (test purchase)</Badge>}
      </div>

      {!tailored && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This demo always returns the seeded small-living-room plan. It isn&apos;t tailored to your answers yet. Your
          budget below is still compared honestly against this plan.
        </p>
      )}

      <section className="mt-6 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl">{concept.title}</h1>
          <p className="mt-3 max-w-2xl text-ink/80">{concept.body}</p>
          {tailored && (
            <ul className="mt-4 grid gap-1 text-sm text-ink/80">
              <li>✓ Planned around your {demoBrief.keep.toLowerCase()}</li>
              <li>✓ No {demoBrief.avoid.toLowerCase()}</li>
              <li>✓ {demoBrief.style}, in {demoBrief.colors.toLowerCase()}</li>
            </ul>
          )}
        </div>

        <aside className="rounded-2xl border border-line bg-white p-5 lg:row-span-2">
          <h2 className="font-medium">Budget</h2>
          <dl className="mt-3 grid gap-2 text-sm tabular-nums">
            <Row k={`Items (${revisedPlan.length})`} v={money(subtotal)} />
            <Row k="Delivery (estimate)" v={money(DELIVERY_ESTIMATE)} />
            <Row k="Plan total" v={money(total)} strong />
            <Row k="Your budget" v={money(brief.budget, brief.currency)} />
            <div className={`flex justify-between rounded-lg px-3 py-2 font-semibold ${remaining >= 0 ? "bg-sage/15 text-[#3f4b37]" : "bg-red-50 text-red-800"}`}>
              <dt>{remaining >= 0 ? "Remaining" : "Over budget"}</dt>
              <dd>{money(Math.abs(remaining))}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-ink/60">
            Before review this plan was {money(originalTotal)}. Prices were recorded {seenOn} and may have changed.
            {brief.currency !== "USD" && " Sample prices are in USD; currency conversion comes with live results."}
          </p>

          <div className="mt-5 grid gap-2 print:hidden">
            {unlocked ? (
              <>
                <button className={btnPrimary} onClick={() => window.print()}>
                  Print plan
                </button>
                <button className={btnSecondary} onClick={share}>
                  Share plan
                </button>
              </>
            ) : (
              <Link href="/checkout" className={btnPrimary}>
                Unlock full plan
              </Link>
            )}
            <button className={btnSecondary} onClick={save}>
              Save plan
            </button>
            <Link href="/intake#review" className={btnSecondary}>
              Refine this plan
            </Link>
            <p className="min-h-4 text-center text-xs text-sage" role="status">
              {status}
            </p>
          </div>
        </aside>

        <section aria-labelledby="review" className="rounded-2xl border border-sage/30 bg-sage/5 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="review" className="font-serif text-2xl">
              Reviewer feedback
            </h2>
            <Badge tone="reviewer">{reviewer.label}</Badge>
            <Badge tone="sample">Sample feedback</Badge>
          </div>
          <p className="mt-2 text-xs text-ink/60">
            A reviewer&apos;s perspective from a person recruited through Terac, not a certified interior designer.
          </p>
          <blockquote className="mt-4 border-l-4 border-sage pl-4 italic text-ink/80">{reviewer.summary}</blockquote>

          <h3 className="mt-6 font-medium">How the feedback changed the plan</h3>
          <ul className="mt-3 grid gap-4">
            {reviewer.notes.map((n) => {
              const before = initialPlan.find((i) => i.id === n.about)!;
              const after = revisedPlan.find((i) => i.id === n.about)!;
              const delta = after.price - before.price;
              return (
                <li key={n.about} className="rounded-xl bg-white p-4 ring-1 ring-line">
                  <p className="text-sm">
                    <span className="font-medium text-[#3f4b37]">Reviewer: </span>
                    {n.text}
                  </p>
                  <div className="mt-3 grid items-center gap-2 text-sm sm:grid-cols-[1fr_auto_1fr]">
                    <span className="rounded-lg bg-cream px-3 py-2 text-ink/60 line-through decoration-ink/30">
                      {before.name} · {money(before.price)}
                    </span>
                    <span aria-hidden className="text-center text-ink/40">→</span>
                    <span className="rounded-lg bg-sage/15 px-3 py-2">
                      {after.name} · {money(after.price)}
                      {delta !== 0 && (
                        <span className="ml-1 text-xs text-ink/60">
                          ({delta > 0 ? "+" : "−"}
                          {money(Math.abs(delta))})
                        </span>
                      )}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-serif text-2xl">Revised shopping list</h2>
          <Badge tone="agent">Agent recommendations</Badge>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {revisedPlan.map((item) => (
            <ItemCard key={item.id} item={item} change={changed.has(item.id) ? "Changed after review" : undefined} />
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-line bg-white p-5 text-sm">
        <h2 className="font-medium">Availability and confidence</h2>
        <ul className="mt-2 grid gap-1 text-ink/70">
          {notes.map((i) => (
            <li key={i.id}>
              <span className="font-medium text-ink">{i.name}:</span> {i.note}
            </li>
          ))}
          <li>Prices and stock aren&apos;t guaranteed. Check the retailer before you buy. Source links open retailer searches for these sample items.</li>
        </ul>
      </section>
    </main>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "border-t border-line pt-2 font-semibold" : ""}`}>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
