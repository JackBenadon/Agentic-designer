import { roomBriefSchema, type RoomBrief, type RoomPlan } from "./schemas.js";
import { z } from "zod";

export const intakeDraftSchema = z.object({
  room_type: z.string().trim().min(1).optional(),
  photo_urls: z.array(z.string().url()).default([]),
  photo_processing_consent: z.boolean().default(false),
  dimensions: z.string().trim().min(1).nullable().default(null),
  budget: z.number().positive().optional(),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default("USD"),
  style_preferences: z.array(z.string().trim().min(1)).default([]),
  preferred_colors: z.array(z.string().trim().min(1)).default([]),
  items_to_keep: z.array(z.string().trim().min(1)).default([]),
  items_to_avoid: z.array(z.string().trim().min(1)).default([]),
  constraints: z.array(z.string().trim().min(1)).default([]),
  delivery_postal_code: z.string().trim().min(1).optional(),
  customer_id: z.string().trim().min(1),
  confirmed: z.boolean().default(false),
});

export type IntakeDraft = z.infer<typeof intakeDraftSchema>;

export function missingIntakeFields(draft: IntakeDraft): string[] {
  const missing: string[] = [];

  if (!draft.room_type) missing.push("room type");
  if (draft.budget === undefined) missing.push("budget");
  if (draft.photo_urls.length > 0 && !draft.photo_processing_consent) {
    missing.push("photo processing consent");
  }

  return missing;
}

export function nextIntakeQuestion(draft: IntakeDraft): string | null {
  const missing = missingIntakeFields(draft);
  if (missing.includes("room type")) return "What room would you like to refresh?";
  if (missing.includes("photo processing consent")) {
    return "May we use this photo to create your room plan?";
  }
  if (missing.includes("budget")) {
    return "What is your total budget, and which currency should I use?";
  }
  if (draft.style_preferences.length === 0) {
    return "What style or overall feeling do you like? You can also skip this.";
  }
  return null;
}

export function summarizeBrief(draft: IntakeDraft): string {
  return [
    `Room: ${draft.room_type ?? "not specified"}`,
    `Budget: ${draft.budget === undefined ? "not specified" : `${draft.currency} ${draft.budget}`}`,
    `Style: ${draft.style_preferences.join(", ") || "not specified"}`,
    `Colors: ${draft.preferred_colors.join(", ") || "not specified"}`,
    `Keep: ${draft.items_to_keep.join(", ") || "nothing specified"}`,
    `Avoid: ${draft.items_to_avoid.join(", ") || "nothing specified"}`,
    `Constraints: ${draft.constraints.join(", ") || "none specified"}`,
    `Dimensions: ${draft.dimensions ?? "unknown"}`,
  ].join("\n");
}

/** Converts a confirmed draft into the strict brief accepted by the planner. */
export function finalizeIntake(input: unknown): RoomBrief {
  const draft = intakeDraftSchema.parse(input);
  const missing = missingIntakeFields(draft);

  if (missing.length > 0) {
    throw new Error(`Missing intake information: ${missing.join(", ")}`);
  }
  if (!draft.confirmed) {
    throw new Error("The room brief must be confirmed before planning.");
  }

  const { confirmed: _confirmed, ...brief } = draft;
  return roomBriefSchema.parse(brief);
}

/** Returns customer-facing warnings; dimensions remain unknown unless supplied. */
export function findSafetyIssues(plan: RoomPlan): string[] {
  const text = JSON.stringify(plan).toLowerCase();
  const issues: string[] = [];

  if (/block(s|ing)? (an? )?(exit|door|walkway)|cover(s|ing)? (a )?vent/.test(text)) {
    issues.push("Check that the proposed layout does not obstruct exits, doors, walkways, or vents.");
  }
  if (text.includes("exact measurement") || text.includes("measured from photo")) {
    issues.push("Exact room measurements must come from the customer, not be inferred from a photo.");
  }

  return issues;
}
