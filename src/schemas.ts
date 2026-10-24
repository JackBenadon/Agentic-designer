import { z } from "zod";

const stringList = z.array(z.string().trim().min(1)).default([]);

export const roomBriefSchema = z
  .object({
    room_type: z.string().trim().min(1),
    photo_urls: z.array(z.string().url()).default([]),
    photo_processing_consent: z.boolean().default(false),
    dimensions: z.string().trim().min(1).nullable().default(null),
    budget: z.number().positive(),
    currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default("USD"),
    style_preferences: stringList,
    preferred_colors: stringList,
    items_to_keep: stringList,
    items_to_avoid: stringList,
    constraints: stringList,
    delivery_postal_code: z.string().trim().min(1).optional(),
    photo_observations: z.string().trim().max(1500).optional(),
    customer_id: z.string().trim().min(1),
  })
  .superRefine((brief, context) => {
    if (brief.photo_urls.length > 0 && !brief.photo_processing_consent) {
      context.addIssue({
        code: "custom",
        path: ["photo_processing_consent"],
        message: "Photo processing consent is required when room photos are supplied.",
      });
    }
  });

export type RoomBrief = z.infer<typeof roomBriefSchema>;

const planItemSchema = z.object({
  name: z.string(),
  retailer: z.string(),
  url: z.string(),
  image_url: z.string().nullable(),
  price: z.number().nonnegative().nullable(),
  currency: z.string().length(3),
  dimensions: z.string().nullable(),
  reason_selected: z.string(),
  source_checked_at: z.string(),
  availability_confidence: z.enum(["confirmed", "unconfirmed", "unavailable"]),
});

export const roomPlanSchema = z.object({
  status: z.enum(["draft", "awaiting_review", "revised", "delivered", "needs_customer_input"]),
  room_brief: roomBriefSchema,
  design_concept: z.string(),
  items: z.array(planItemSchema),
  estimated_subtotal: z.number().nonnegative().nullable(),
  delivery_estimate: z.number().nonnegative().nullable(),
  estimated_total: z.number().nonnegative().nullable(),
  terac_review: z.object({
    requested: z.boolean(),
    completed: z.boolean(),
    feedback_summary: z.string(),
    changes_made: z.array(z.string()),
  }),
  assumptions: z.array(z.string()),
  unresolved_questions: z.array(z.string()),
});

export type RoomPlan = z.infer<typeof roomPlanSchema>;
