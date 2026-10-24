"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge, btnPrimary } from "@/components/ui";

// No live integrations yet: every step runs against seeded data and is labeled as simulated.
const STEPS = [
  "Reviewing your brief and constraints",
  "Finding products with Exa",
  "Asking a Terac reviewer for feedback",
  "Updating your recommendations",
];

export default function ProcessingPage() {
  const [done, setDone] = useState(0);

  useEffect(() => {
    if (done >= STEPS.length) return;
    const t = setTimeout(() => setDone((d) => d + 1), 1400);
    return () => clearTimeout(t);
  }, [done]);

  const finished = done >= STEPS.length;

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-5 py-14">
      <Badge tone="sample">Demo mode · seeded results</Badge>
      <h1 className="mt-3 font-serif text-3xl">{finished ? "Your plan is ready" : "Building your room plan…"}</h1>
      <p className="mt-2 text-ink/70">
        Exa and Terac aren&apos;t connected in this demo, so each step uses sample data and is marked as simulated.
      </p>

      <ol className="mt-8 grid gap-3" aria-live="polite">
        {STEPS.map((label, i) => {
          const state = i < done ? "done" : i === done ? "active" : "pending";
          return (
            <li key={label} className={`flex items-center gap-4 rounded-2xl border border-line bg-white px-4 py-4 ${state === "pending" ? "opacity-50" : ""}`}>
              <span
                aria-hidden
                className={`grid size-7 shrink-0 place-items-center rounded-full text-sm ${
                  state === "done" ? "bg-sage text-white" : state === "active" ? "animate-pulse bg-terracotta/20" : "bg-line"
                }`}
              >
                {state === "done" ? "✓" : ""}
              </span>
              <span className="flex-1">{label}</span>
              <span className="text-xs text-ink/60">{state === "done" ? "Simulated · done" : state === "active" ? "Simulated…" : ""}</span>
            </li>
          );
        })}
      </ol>

      {finished && (
        <Link href="/plan" className={`${btnPrimary} mt-8`}>
          See my room plan
        </Link>
      )}
    </main>
  );
}
