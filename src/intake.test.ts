import assert from "node:assert/strict";
import test from "node:test";
import { createDemoPlan } from "./demo.js";
import {
  finalizeIntake,
  findSafetyIssues,
  intakeDraftSchema,
  missingIntakeFields,
  nextIntakeQuestion,
  summarizeBrief,
} from "./intake.js";

const baseDraft = {
  customer_id: "test-session",
  room_type: "living room",
  budget: 1500,
  currency: "usd",
  style_preferences: ["warm minimal"],
  photo_urls: [],
  photo_processing_consent: false,
  dimensions: null,
  preferred_colors: [],
  items_to_keep: [],
  items_to_avoid: [],
  constraints: [],
};

test("intake asks only for material missing information", () => {
  const draft = intakeDraftSchema.parse({ customer_id: "test-session" });

  assert.deepEqual(missingIntakeFields(draft), ["room type", "budget"]);
  assert.equal(nextIntakeQuestion(draft), "What room would you like to refresh?");

  const complete = intakeDraftSchema.parse(baseDraft);
  assert.deepEqual(missingIntakeFields(complete), []);
  assert.equal(nextIntakeQuestion(complete), null);
});

test("photo consent is required when a photo is supplied", () => {
  const draft = intakeDraftSchema.parse({
    ...baseDraft,
    photo_urls: ["https://example.com/room.jpg"],
  });

  assert.deepEqual(missingIntakeFields(draft), ["photo processing consent"]);
  assert.match(nextIntakeQuestion(draft)!, /use this photo/);
});

test("unknown dimensions do not block confirmation", () => {
  const brief = finalizeIntake({ ...baseDraft, confirmed: true });

  assert.equal(brief.dimensions, null);
  assert.equal(brief.currency, "USD");
  assert.match(summarizeBrief(intakeDraftSchema.parse(baseDraft)), /Dimensions: unknown/);
});

test("planning requires confirmation", () => {
  assert.throws(() => finalizeIntake(baseDraft), /must be confirmed/);
});

test("safety warnings can be added to a plan", () => {
  const plan = createDemoPlan();
  const unsafe = {
    ...plan,
    assumptions: [...plan.assumptions, "This layout may block an exit."],
  };

  assert.ok(findSafetyIssues(unsafe).some((issue) => issue.includes("obstruct")));
});
