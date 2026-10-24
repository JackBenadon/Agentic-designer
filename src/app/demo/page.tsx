import Link from "next/link";
import { demoBrief } from "@/data/demo";
import { money } from "@/lib/brief";
import { Badge, btnPrimary } from "@/components/ui";

export default function DemoPage() {
  const rows = [
    ["Room", `${demoBrief.roomType}, ${demoBrief.dimensions}`],
    ["Budget", money(demoBrief.budget)],
    ["Style", demoBrief.style],
    ["Keep", demoBrief.keep],
    ["Avoid", demoBrief.avoid],
  ];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-14">
      <Badge tone="sample">Demo account · sample data</Badge>
      <h1 className="mt-4 font-serif text-4xl">Try the demo room</h1>
      <p className="mt-3 text-ink/80">
        You&apos;re signed in as the demo account. No sign-up or real payment is needed.
      </p>

      <div className="mt-10 overflow-hidden rounded-3xl bg-surface sm:flex">
        {/* eslint-disable-next-line @next/next/no-img-element -- local mock SVG */}
        <img src="/demo/room.svg" alt="Sample room illustration" className="w-full object-cover sm:w-64" />
        <dl className="grid flex-1 gap-3 p-6 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[5rem_1fr] gap-2">
              <dt className="text-ink/75">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Full page load so the chat reads the hash on mount. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/#demo" className={`${btnPrimary} mt-10`}>
        Open the demo room in the chat
      </a>
      <p className="mt-4 text-sm text-ink/75">
        Or <Link href="/" className="text-primary hover:underline">start with your own room</Link>.
      </p>
    </main>
  );
}
