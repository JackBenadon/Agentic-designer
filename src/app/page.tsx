import Link from "next/link";
import { DELIVERY_ESTIMATE, demoBrief, revisedPlan } from "@/data/demo";
import { money } from "@/lib/brief";
import { Badge, ItemCard, btnPrimary, btnSecondary } from "@/components/ui";

const steps = [
  ["Tell us about your room", "Share a photo, your budget, the style you like, and what has to stay."],
  ["Agents research products", "We search real retailers with Exa for pieces that fit your brief and budget."],
  ["A person reviews it", "A Terac reviewer critiques the plan, and the agent revises it."],
  ["Shop your plan", "Get item cards with prices, source links, and a budget total."],
];

export default function Home() {
  const subtotal = revisedPlan.reduce((s, i) => s + i.price, 0);
  const total = subtotal + DELIVERY_ESTIMATE;

  return (
    <main className="flex-1">
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-16 sm:pt-24">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-terracotta">Roomwise</p>
        <h1 className="max-w-3xl font-serif text-4xl leading-tight sm:text-6xl">
          A room refresh, researched and reviewed for your budget.
        </h1>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/intake" className={btnPrimary}>
            Start my room plan
          </Link>
          <Link href="/demo" className={btnSecondary}>
            Explore the demo room
          </Link>
        </div>
      </section>

      <section className="border-y border-line bg-white/60">
        <ol className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([title, body], i) => (
            <li key={title}>
              <span className="font-serif text-2xl text-terracotta">{i + 1}</span>
              <h2 className="mt-1 font-medium">{title}</h2>
              <p className="mt-1 text-sm text-ink/70">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex gap-2">
              <Badge tone="sample">Sample plan</Badge>
            </div>
            <h2 className="font-serif text-3xl">Example: a small living room on {money(demoBrief.budget)}</h2>
            <p className="mt-2 max-w-2xl text-ink/70">
              Warm, minimal, solid colours. Keeps the existing sofa and avoids scratchy natural-fiber rugs.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-white px-5 py-4 text-right">
            <p className="text-sm text-ink/60">Plan total incl. est. delivery</p>
            <p className="text-2xl font-semibold tabular-nums">{money(total)}</p>
            <p className="text-sm text-sage">{money(demoBrief.budget - total)} under budget</p>
          </div>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {revisedPlan.slice(0, 4).map((item) => (
            <ItemCard key={item.id} item={item} compact />
          ))}
        </div>
        <div className="mt-8">
          <Link href="/demo" className="font-medium text-terracotta hover:underline">
            See the full plan and reviewer feedback →
          </Link>
        </div>
      </section>
    </main>
  );
}
