import assert from "node:assert/strict";
import test from "node:test";
import { createDemoPlan, demoRoomBrief } from "./demo.js";
import { roomBriefSchema } from "./schemas.js";

test("demo plan is within budget and clearly identifies simulated evidence", () => {
  const plan = createDemoPlan();

  assert.equal(plan.status, "revised");
  assert.ok(plan.estimated_total !== null);
  assert.ok(plan.estimated_total <= plan.room_brief.budget);
  assert.ok(plan.items.every((item) => item.retailer.includes("simulated")));
  assert.ok(plan.assumptions.some((assumption) => assumption.includes("sample data")));
});

test("demo review visibly changes a recommendation", () => {
  const plan = createDemoPlan();

  assert.equal(plan.terac_review.completed, true);
  assert.ok(plan.terac_review.changes_made.some((change) => change.includes("jute rug")));
  assert.ok(plan.items.some((item) => item.name.includes("Washable low-pile")));
});

test("room photos require processing consent", () => {
  assert.throws(() =>
    roomBriefSchema.parse({
      ...demoRoomBrief,
      photo_urls: ["https://example.com/private-room.jpg"],
      photo_processing_consent: false,
    }),
  );
});
