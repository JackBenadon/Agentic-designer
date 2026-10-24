"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { demoBrief } from "@/data/demo";
import { money, saveBrief } from "@/lib/brief";
import { Badge, btnPrimary, btnSecondary } from "@/components/ui";

export default function DemoPage() {
  const router = useRouter();
  const rows = [
    ["Room", `${demoBrief.roomType}, ${demoBrief.dimensions}`],
    ["Budget", money(demoBrief.budget)],
    ["Style", demoBrief.style],
    ["Keep", demoBrief.keep],
    ["Avoid", demoBrief.avoid],
  ];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
      <Badge tone="sample">Demo account · sample data</Badge>
      <h1 className="mt-3 font-serif text-4xl">Try the demo room</h1>
      <p className="mt-2 text-ink/70">
        You&apos;re signed in as the demo account. No sign-up or real payment is needed. Everything below is
        sample content.
      </p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-white sm:flex">
        {/* eslint-disable-next-line @next/next/no-img-element -- local mock SVG */}
        <img src="/demo/room.svg" alt="Sample room illustration" className="w-full object-cover sm:w-64" />
        <dl className="grid flex-1 gap-3 p-5 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[5rem_1fr] gap-2">
              <dt className="text-ink/60">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          className={btnPrimary}
          onClick={() => {
            saveBrief(demoBrief);
            router.push("/processing");
          }}
        >
          Run the demo plan
        </button>
        <Link href="/intake#demo" className={btnSecondary}>
          Walk through the chat with these answers
        </Link>
      </div>
    </main>
  );
}
