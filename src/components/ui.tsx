import Link from "next/link";
import type { Item, Kind } from "@/data/demo";
import { RETRIEVED_AT } from "@/data/demo";
import { money } from "@/lib/brief";

export function Header() {
  return (
    <header className="border-b border-line bg-cream/90 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="font-serif text-xl tracking-tight">
          Roomwise
        </Link>
        <Link href="/demo" className="text-sm font-medium text-terracotta hover:underline">
          Try the demo
        </Link>
      </div>
    </header>
  );
}

const badgeTones = {
  sample: "bg-amber-100 text-amber-900 border-amber-200",
  agent: "bg-terracotta/10 text-rust border-terracotta/25",
  reviewer: "bg-sage/15 text-[#3f4b37] border-sage/30",
  muted: "bg-white text-ink/70 border-line",
};

export function Badge({ tone, children }: { tone: keyof typeof badgeTones; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeTones[tone]}`}>
      {children}
    </span>
  );
}

export const btn =
  "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta disabled:opacity-50";
export const btnPrimary = `${btn} bg-terracotta text-white hover:bg-rust`;
export const btnSecondary = `${btn} border border-line bg-white text-ink hover:border-ink/30`;

const tint: Record<Kind, string> = {
  rug: "#efe6da",
  table: "#f1e8dc",
  lamp: "#f5ede1",
  side: "#f3e6dc",
  curtain: "#e9ece3",
  pillow: "#f4e4da",
  art: "#efe9e1",
  chair: "#f2ece4",
  ottoman: "#eef0e8",
};

// Illustrated stand-ins for product photos: we have no rights to retailer imagery in the demo.
export function ProductArt({ item }: { item: Item }) {
  const n = item.name.toLowerCase();
  const fabric = n.includes("sage") ? "#8a9a7b" : n.includes("terracotta") ? "#c0643c" : "#b5562f";
  const shapes: Record<Kind, React.ReactNode> = {
    rug: (
      <>
        <rect x="40" y="60" width="120" height="70" rx="4" fill="#d9c7ae" />
        <rect x="50" y="70" width="100" height="50" rx="2" fill="none" stroke="#c4ae90" strokeWidth="3" />
      </>
    ),
    table: (
      <>
        <ellipse cx="100" cy="80" rx="55" ry="16" fill="#b98a5e" />
        <rect x="70" y="88" width="6" height="40" fill="#9b7049" />
        <rect x="124" y="88" width="6" height="40" fill="#9b7049" />
      </>
    ),
    lamp: (
      <>
        <path d="M80 30h40l8 30H72z" fill="#efe3cf" stroke="#d8c6a8" strokeWidth="2" />
        <rect x="98" y="60" width="4" height="70" fill="#5a4a3e" />
        <ellipse cx="100" cy="132" rx="18" ry="4" fill="#5a4a3e" />
      </>
    ),
    side: (
      <>
        <ellipse cx="100" cy="60" rx="30" ry="8" fill="#a5492a" />
        <rect x="97" y="62" width="6" height="64" fill="#8a3b1f" />
        <ellipse cx="100" cy="128" rx="22" ry="5" fill="#8a3b1f" />
      </>
    ),
    curtain: (
      <>
        <rect x="45" y="22" width="110" height="4" fill="#5a4a3e" />
        <path d="M50 26h40v108c-10-4-30-4-40 0z" fill={fabric} />
        <path d="M110 26h40v108c-10-4-30-4-40 0z" fill={fabric} />
      </>
    ),
    pillow: (
      <>
        <rect x="45" y="55" width="60" height="55" rx="14" fill="#a5492a" transform="rotate(-8 75 82)" />
        <rect x="95" y="58" width="60" height="55" rx="14" fill="#b5562f" transform="rotate(6 125 85)" />
      </>
    ),
    art: (
      <>
        <rect x="60" y="25" width="80" height="110" fill="#fff" stroke="#3a2f28" strokeWidth="5" />
        <circle cx="90" cy="70" r="18" fill="#c0643c" />
        <rect x="80" y="90" width="45" height="30" fill="#8a9a7b" />
      </>
    ),
    chair: (
      <>
        <rect x="55" y="40" width="90" height="60" rx="26" fill="#ece3d4" />
        <rect x="50" y="80" width="100" height="32" rx="14" fill="#e4d8c5" />
        <rect x="62" y="110" width="5" height="20" fill="#5a4a3e" />
        <rect x="133" y="110" width="5" height="20" fill="#5a4a3e" />
      </>
    ),
    ottoman: (
      <>
        <rect x="55" y="70" width="90" height="55" rx="10" fill="#e4d8c5" />
        <rect x="52" y="62" width="96" height="14" rx="7" fill="#ece3d4" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 200 150" role="img" aria-label={`Illustration: ${item.name}`} className="h-auto w-full">
      <rect width="200" height="150" fill={tint[item.kind]} />
      {shapes[item.kind]}
    </svg>
  );
}

export const seenOn = new Date(RETRIEVED_AT).toLocaleDateString("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function ItemCard({ item, change, compact }: { item: Item; change?: string; compact?: boolean }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
      <div className="relative">
        <ProductArt item={item} />
        {change && (
          <span className="absolute left-3 top-3 rounded-full bg-sage px-2.5 py-0.5 text-xs font-semibold text-white">
            {change}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-medium leading-snug">{item.name}</h3>
          <span className="shrink-0 font-semibold tabular-nums">{money(item.price)}</span>
        </div>
        {!compact && <p className="text-sm text-ink/70">{item.why}</p>}
        {item.note && !compact && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">⚠ {item.note}</p>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2 text-xs text-ink/60">
          <span>
            {item.retailer} · price seen {seenOn} (sample)
          </span>
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-medium text-terracotta hover:underline">
            View source ↗
          </a>
        </div>
      </div>
    </article>
  );
}
