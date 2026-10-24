export type Brief = {
  photos: string[]; // data URLs or local /demo paths
  roomType: string;
  dimensions: string;
  budget: number;
  currency: string;
  style: string;
  colors: string;
  keep: string;
  avoid: string;
  constraints: string[];
  delivery: string;
  roomNotes?: string; // image model's approximate read of the photos
};

const KEY = "roomwise:brief";

export function loadBrief(): Brief | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Brief) : null;
  } catch {
    return null;
  }
}

export function saveBrief(brief: Brief) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(brief));
  } catch {
    // ponytail: large photos can blow the ~5MB quota; we retry without them rather than add IndexedDB.
    sessionStorage.setItem(KEY, JSON.stringify({ ...brief, photos: [] }));
  }
}

export const money = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
