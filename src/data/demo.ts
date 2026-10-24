// Seeded sample content. Every product, price, and reviewer note here is demo data,
// standing in for Exa results and Terac feedback until the live integrations are wired up.

import type { Brief } from "@/lib/brief";

export const demoBrief: Brief = {
  photos: ["/demo/room.svg"],
  roomType: "Living room",
  dimensions: "about 12 ft × 14 ft",
  budget: 1500,
  currency: "USD",
  style: "Warm, minimal, solid colors",
  colors: "Cream, terracotta, a little green",
  keep: "Existing grey three-seat sofa",
  avoid: "Scratchy natural-fiber rugs (jute, sisal)",
  constraints: [],
  delivery: "Brooklyn, NY",
};

export type Kind = "rug" | "table" | "lamp" | "side" | "curtain" | "pillow" | "art" | "chair" | "ottoman";

export type Item = {
  id: string;
  kind: Kind;
  name: string;
  retailer: string;
  price: number;
  url: string;
  why: string;
  note?: string; // confidence / availability caveat
};

export const RETRIEVED_AT = "2026-10-20T15:30:00Z";
export const DELIVERY_ESTIMATE = 85;

const search = (base: string, q: string) => base + encodeURIComponent(q);
const ikea = (q: string) => search("https://www.ikea.com/us/en/search/?q=", q);
const target = (q: string) => search("https://www.target.com/s?searchTerm=", q);
const wayfair = (q: string) => search("https://www.wayfair.com/keyword.php?keyword=", q);

const rug5x8: Item = {
  id: "rug",
  kind: "rug",
  name: "Low-pile solid rug, oatmeal, 5×8 ft",
  retailer: "Wayfair",
  price: 189,
  url: wayfair("low pile solid oatmeal rug 5x8"),
  why: "Soft polyester low pile, no jute or sisal, per your brief. Solid colour keeps things calm.",
};

const table: Item = {
  id: "table",
  kind: "table",
  name: "Round oak-veneer coffee table, 32 in",
  retailer: "IKEA",
  price: 249,
  url: ikea("round oak coffee table"),
  why: "A round top is easier to walk around in a small room and brings in warm wood.",
};

const lamp: Item = {
  id: "lamp",
  kind: "lamp",
  name: "Floor lamp with linen drum shade",
  retailer: "Target",
  price: 129,
  url: target("floor lamp linen drum shade"),
  why: "Warm, diffuse light for the sofa corner without taking up surface space.",
};

const side: Item = {
  id: "side",
  kind: "side",
  name: "Slim metal side table, rust",
  retailer: "Target",
  price: 89,
  url: target("metal side table rust"),
  why: "Holds a drink beside the sofa you're keeping. The rust colour picks up your accent.",
  note: "The colour name varied between listings. Confirm the finish before ordering.",
};

const curtainTerracotta: Item = {
  id: "curtain",
  kind: "curtain",
  name: "Cotton-blend curtains, terracotta, pair",
  retailer: "IKEA",
  price: 79,
  url: ikea("terracotta curtains pair"),
  why: "Adds warmth and colour at the window.",
};

const pillows: Item = {
  id: "pillow",
  kind: "pillow",
  name: "Velvet throw pillows, rust, set of 2",
  retailer: "Target",
  price: 58,
  url: target("rust velvet throw pillow"),
  why: "An easy, low-cost way to tie the existing grey sofa into the warm palette.",
};

const art: Item = {
  id: "art",
  kind: "art",
  name: "Framed abstract print, 24×36 in",
  retailer: "Wayfair",
  price: 95,
  url: wayfair("framed abstract print 24x36 warm"),
  why: "One large piece over the sofa reads as calm and minimal, more so than a cluster of small frames.",
};

const chair: Item = {
  id: "chair",
  kind: "chair",
  name: "Boucle accent chair, cream",
  retailer: "Wayfair",
  price: 349,
  url: wayfair("boucle accent chair cream"),
  why: "Extra seating in a soft, warm texture.",
  note: "Stock was listed as limited when the price was recorded.",
};

export const initialPlan: Item[] = [rug5x8, table, lamp, side, curtainTerracotta, pillows, art, chair];

export const reviewer = {
  label: "Terac reviewer",
  summary:
    "The palette is right for the brief, but the plan tries to do too much for a small room. Give the sofa room to breathe and let the rug anchor it.",
  notes: [
    {
      about: "chair",
      text: "An accent chair in a 12×14 room alongside a three-seat sofa narrows the walkway to the window. A storage ottoman gives the same extra seat, tucks away, and frees up budget.",
    },
    {
      about: "rug",
      text: "At 5×8 the rug will float in front of the sofa. Go to 6×9 so at least the front sofa legs sit on it.",
    },
    {
      about: "curtain",
      text: "With rust pillows and a rust side table, terracotta curtains add a third strong warm accent. A muted green at the window balances the room and matches the brief's colours.",
    },
  ],
};

const rug6x9: Item = {
  ...rug5x8,
  name: "Low-pile solid rug, oatmeal, 6×9 ft",
  price: 259,
  url: wayfair("low pile solid oatmeal rug 6x9"),
  why: "Same soft, non-natural-fiber pile, sized up so the sofa's front legs sit on it.",
};

const curtainSage: Item = {
  ...curtainTerracotta,
  name: "Cotton-blend curtains, sage, pair",
  url: ikea("sage green curtains pair"),
  why: "Muted green balances the rust accents and brings in the green from your brief.",
};

const ottoman: Item = {
  id: "chair",
  kind: "ottoman",
  name: "Upholstered storage ottoman, cream",
  retailer: "IKEA",
  price: 119,
  url: ikea("upholstered storage ottoman"),
  why: "Extra seat and blanket storage that slides under the window, keeping the walkway clear.",
};

export const revisedPlan: Item[] = [rug6x9, table, lamp, side, curtainSage, pillows, art, ottoman];

export const concept = {
  title: "Warm minimal, built around the sofa you're keeping",
  body: "A cream and oatmeal base, rust accents to warm up the grey sofa, and soft green at the window. Pieces are solid-coloured and low-profile so the small room feels open. All soft furnishings avoid scratchy natural fibers.",
};
