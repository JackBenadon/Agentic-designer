import Link from "next/link";
import type { Item, Kind } from "@/data/demo";
import { RETRIEVED_AT } from "@/data/demo";
import { money } from "@/lib/brief";

const navLinks = [
  ["/demo", "Try the demo"],
];

export function Header() {
  return (
    <header className="bg-surface print:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-5">
        <Link href="/" className="font-serif text-3xl tracking-tight sm:text-4xl">
          Roomwise
        </Link>
        <nav aria-label="Main" className="flex items-center gap-6 lg:gap-8">
          <ul className="hidden items-center gap-6 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-ink/75 md:flex lg:gap-8">
            {navLinks.map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="hover:text-primary">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/#chat" className={`${btnPrimary} px-4 py-2 text-xs`}>
            Start my room plan
          </Link>
        </nav>
      </div>
    </header>
  );
}

const badgeTones = {
  sample: "border-dashed border-ink/40 bg-page text-ink",
  agent: "border-primary/30 bg-primary/10 text-primary",
  reviewer: "border-transparent bg-success text-ink",
  muted: "border-ink/15 bg-page text-ink/75",
};

export function Badge({ tone, children }: { tone: keyof typeof badgeTones; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeTones[tone]}`}>
      {children}
    </span>
  );
}

export const btn =
  "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition-colors disabled:opacity-50";
export const btnPrimary = `${btn} bg-primary text-white hover:bg-primary/90`;
export const btnSecondary = `${btn} bg-surface text-ink hover:bg-surface/70`;
// Secondary button for use on a surface-coloured panel.
export const btnOnSurface = `${btn} bg-page text-ink hover:bg-page/70`;

// Illustrated stand-ins for product photos: we have no rights to retailer imagery in the demo.
// Shape colours depict the products themselves, so they stay literal.
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
    <svg
      viewBox="0 0 200 150"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`Illustration: ${item.name}`}
      className="block h-full w-full"
    >
      <rect width="200" height="150" fill="var(--color-surface)" />
      {shapes[item.kind]}
    </svg>
  );
}

export const seenOn = new Date(RETRIEVED_AT).toLocaleDateString("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

// `image` takes any node (an <img>, next/image, or the illustration); it is cropped to fill a 4:3 frame.
export function ItemCard({
  item,
  change,
  compact,
  image,
}: {
  item: Item;
  change?: string;
  compact?: boolean;
  image?: React.ReactNode;
}) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl bg-page ring-1 ring-ink/10">
      <div className="relative aspect-[4/3] overflow-hidden">
        <div className="h-full [&>*]:h-full [&>*]:w-full [&>*]:object-cover">{image ?? <ProductArt item={item} />}</div>
        {change && (
          <span className="absolute left-3 top-3 rounded-full bg-success px-2.5 py-0.5 text-xs font-semibold text-ink">
            {change}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-3 font-semibold leading-snug">
          <h3>{item.name}</h3>
          <span className="shrink-0 tabular-nums">{money(item.price)}</span>
        </div>
        <p className="text-xs text-ink/75">
          {item.retailer} · Price seen {seenOn}
        </p>
        {!compact && <p className="text-sm text-ink/75">{item.why}</p>}
        {item.note && !compact && <p className="rounded-lg bg-surface px-3 py-2 text-xs">⚠ {item.note}</p>}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto pt-2 text-xs font-medium text-primary hover:underline"
        >
          View source ↗
        </a>
      </div>
    </article>
  );
}

export function BudgetMeter({ total, budget, currency }: { total: number; budget: number; currency: string }) {
  const remaining = budget - total;
  const pct = Math.min(100, Math.round((total / budget) * 100)) || 0;
  return (
    <div>
      <p className="font-serif text-5xl tabular-nums sm:text-6xl">
        {money(total)} <span className="text-2xl text-ink/75 sm:text-3xl">of {money(budget, currency)}</span>
      </p>
      <div
        className="mt-4 h-2 rounded-full bg-ink/10"
        role="progressbar"
        aria-label="Share of budget used"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full rounded-full ${remaining >= 0 ? "bg-primary" : "bg-ink"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span
          className={`rounded-full px-3 py-1 font-semibold ${remaining >= 0 ? "bg-success text-ink" : "bg-primary/10 text-primary"}`}
        >
          {money(Math.abs(remaining), currency)} {remaining >= 0 ? "under budget" : "over budget"}
        </span>
        <span className="text-ink/75">incl. est. delivery</span>
      </p>
    </div>
  );
}
