"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, btnPrimary, btnSecondary } from "@/components/ui";

export default function CheckoutPage() {
  const router = useRouter();

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-14">
      <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong>Simulated checkout.</strong> Whop isn&apos;t connected, so no payment is taken and no card details are
        collected.
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-white p-6">
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl">Unlock your full plan</h1>
          <Badge tone="muted">Whop · demo</Badge>
        </div>
        <ul className="mt-4 grid gap-2 text-sm text-ink/80">
          <li>✓ Revised, reviewer-checked shopping list</li>
          <li>✓ Print and share your plan</li>
          <li>✓ One free refinement round</li>
        </ul>
        <div className="mt-6 flex items-baseline justify-between border-t border-line pt-4">
          <span>Room plan</span>
          <span className="text-2xl font-semibold">$29</span>
        </div>
        <button
          className={`${btnPrimary} mt-6 w-full`}
          onClick={() => {
            try {
              sessionStorage.setItem("roomwise:unlocked", "1");
            } catch {}
            router.push("/plan");
          }}
        >
          Complete test purchase
        </button>
        <Link href="/plan" className={`${btnSecondary} mt-3 w-full`}>
          Back to plan
        </Link>
      </div>
    </main>
  );
}
