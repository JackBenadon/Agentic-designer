import { roomBriefSchema, roomPlanSchema, type RoomBrief, type RoomPlan } from "./schemas";

export const demoRoomBrief: RoomBrief = roomBriefSchema.parse({
  room_type: "small living room",
  photo_urls: [],
  photo_processing_consent: false,
  dimensions: null,
  budget: 1500,
  currency: "USD",
  style_preferences: ["warm minimal", "solid colors"],
  preferred_colors: ["cream", "terracotta", "muted green"],
  items_to_keep: ["existing sofa"],
  items_to_avoid: ["scratchy natural-fiber rugs"],
  constraints: ["rental-friendly changes only"],
  customer_id: "demo-session",
});

/** A deterministic happy path. Every commercial detail is explicitly simulated. */
export function createDemoPlan(): RoomPlan {
  const checkedAt = "2026-01-01T00:00:00.000Z";
  const simulatedSource = "https://example.com/roomwise-simulated-product";

  return roomPlanSchema.parse({
    status: "revised",
    room_brief: demoRoomBrief,
    design_concept:
      "Warm minimal layers around the existing sofa, using washable textiles, rounded forms, and rental-friendly lighting.",
    items: [
      {
        name: "Washable low-pile area rug (simulated)",
        retailer: "Demo retailer — simulated",
        url: `${simulatedSource}/rug`,
        image_url: null,
        price: 249,
        currency: "USD",
        dimensions: "5 ft x 7 ft (simulated)",
        reason_selected:
          "Replaces the initial natural-fiber rug idea after demo reviewer feedback; the smooth, washable surface respects the avoid list.",
        source_checked_at: checkedAt,
        availability_confidence: "unconfirmed",
      },
      {
        name: "Rounded oak-look coffee table (simulated)",
        retailer: "Demo retailer — simulated",
        url: `${simulatedSource}/coffee-table`,
        image_url: null,
        price: 179,
        currency: "USD",
        dimensions: "36 x 20 x 16 in (simulated)",
        reason_selected: "Adds warm wood tone and softer corners without replacing the sofa.",
        source_checked_at: checkedAt,
        availability_confidence: "unconfirmed",
      },
      {
        name: "Plug-in linen floor lamp (simulated)",
        retailer: "Demo retailer — simulated",
        url: `${simulatedSource}/floor-lamp`,
        image_url: null,
        price: 129,
        currency: "USD",
        dimensions: "62 in high (simulated)",
        reason_selected: "Adds warm ambient light without permanent electrical changes.",
        source_checked_at: checkedAt,
        availability_confidence: "unconfirmed",
      },
      {
        name: "Solid-color pillow covers, set of four (simulated)",
        retailer: "Demo retailer — simulated",
        url: `${simulatedSource}/pillows`,
        image_url: null,
        price: 78,
        currency: "USD",
        dimensions: "20 x 20 in each (simulated)",
        reason_selected: "Introduces terracotta and muted green while keeping the palette calm.",
        source_checked_at: checkedAt,
        availability_confidence: "unconfirmed",
      },
    ],
    estimated_subtotal: 635,
    delivery_estimate: null,
    estimated_total: 635,
    terac_review: {
      requested: true,
      completed: true,
      feedback_summary:
        "Simulated demo feedback suggested replacing the initially proposed jute rug because it conflicted with the customer's texture constraint.",
      changes_made: [
        "Replaced the initial jute rug concept with a washable low-pile rug.",
        "Reserved more of the budget for delivery and later refinements.",
      ],
    },
    assumptions: [
      "This is deterministic sample data, not a live Exa search or completed Terac task.",
      "All products, prices, dimensions, links, and the reviewer response are simulated.",
      "No exact room dimensions were inferred from a photo.",
      "Delivery cost is unknown and is not included in the total.",
    ],
    unresolved_questions: [
      "Confirm room dimensions and walkway clearances before ordering similarly sized products.",
    ],
  });
}
