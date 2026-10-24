import Link from "next/link";
import { DELIVERY_ESTIMATE, demoBrief, revisedPlan } from "@/data/demo";
import { Badge, BudgetMeter, ItemCard } from "@/components/ui";
import RoomChat from "@/components/RoomChat";

export default function Home() {
  const total = revisedPlan.reduce((s, i) => s + i.price, 0) + DELIVERY_ESTIMATE;

  return (
    <main className="flex-1">
      <RoomChat />

      <section id="example" className="scroll-mt-4 bg-surface py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-end">
            <div>
              <Badge tone="sample">Sample plan</Badge>
              <h2 className="mt-4 font-serif text-3xl sm:text-4xl">Example: a small living room</h2>
              <p className="mt-3 max-w-md leading-relaxed text-ink/80">
                Warm, minimal, solid colours. Keeps the existing sofa and avoids scratchy natural-fiber rugs.
              </p>
            </div>
            <BudgetMeter total={total} budget={demoBrief.budget} currency={demoBrief.currency} />
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {revisedPlan.slice(0, 4).map((item) => (
              <ItemCard key={item.id} item={item} compact />
            ))}
          </div>
          <Link href="/demo" className="mt-10 inline-block font-medium text-primary hover:underline">
            Open the demo room in the chat →
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm text-ink/75 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-serif text-lg text-ink">Roomwise</span>
        <span>Hackathon demo. Sample data, no real payments.</span>
      </footer>
    </main>
  );
}
