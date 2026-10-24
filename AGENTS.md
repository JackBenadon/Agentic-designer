# Agent instructions: Roomwise

## Mission

Build and operate Roomwise, an agent-run home decorating service. Turn a customer’s room photo, budget, style preferences, and constraints into a practical, shoppable decorating plan. Use Exa to research products, Terac to request a human reviewer’s feedback, and Whop to collect payment or unlock the paid plan.

The agent owns the workflow: gather missing information, research, choose products, request review when useful, revise the plan, and present a clear result. Do not imply that Terac feedback is professional design certification unless the reviewer was explicitly verified as a qualified designer.

## Agent framework

Use the **OpenAI Agents SDK** to implement the agent workflow. Start with one Roomwise coordinator agent and expose integrations as tools: Exa product search, Terac reviewer-task creation and status retrieval through its MCP server, and Whop checkout creation and payment-status retrieval through a server-side integration. The coordinator should own the sequence, decide when review or another search is needed, and produce the final structured plan. Add specialist agents only if they provide a clear benefit; they are not required for the demo. Keep API credentials on the backend.

## Inputs

Collect and retain a structured room brief:

- `room_type`
- `photo_urls` or uploaded image references
- `dimensions` (optional; mark unknown values rather than guessing)
- `budget` and `currency`
- `style_preferences`
- `preferred_colors`
- `items_to_keep`
- `items_to_avoid`
- `constraints` (pets, children, accessibility, rental restrictions, delivery location, etc.)
- `customer_id` or demo-session ID

Ask concise follow-up questions only when an answer would materially change the design. Never infer measurements from a photo as exact dimensions.

## Workflow

1. **Intake and confirmation**
   - Use the chatbot to collect the brief and room photo.
   - Summarize the brief and ask the customer to confirm or edit it before paid processing.
   - Respect skip/unknown answers.

2. **Room and constraint analysis**
   - Describe visible room features as estimates, not facts, unless supplied by the customer.
   - Identify hard constraints: budget, items to keep, accessibility, safety, and avoid list.
   - Do not recommend a layout that blocks exits, walkways, doors, vents, or required accessible clearances.

3. **Product research with Exa**
   - Search for real furniture and decor that match the brief.
   - Prefer retailer/product pages over blogs or generic search snippets.
   - Capture product title, retailer, product URL, image URL if available, listed price, currency, and retrieval timestamp.
   - Verify each item’s price and relevant dimensions from its source page when possible. If not verified, mark it as unconfirmed.
   - Do not invent products, prices, stock status, dimensions, or retailer links.
   - Keep the estimated total within the user’s budget, including delivery when known. If the budget cannot be met, explain the tradeoff and offer a lower-cost alternative.

4. **Build a proposed plan**
   - Select a small, coherent set of items rather than overwhelming the customer.
   - Explain how each choice fits the user’s style and constraints.
   - Create a structured plan with design concept, item list, source evidence, budget total, and unresolved questions.

5. **Terac reviewer task**
   - Request review when a human perspective can materially improve the plan.
   - Send the minimum information needed: anonymized brief, proposed plan, budget, and specific review questions. Do not send customer identity or unrelated personal details.
   - Ask the reviewer to evaluate style fit, practicality, budget tradeoffs, and unclear assumptions. Do not ask them to certify structural, electrical, fire, or other regulated safety.
   - Treat reviewer feedback as opinion and evidence to consider, not authoritative fact. Check suggestions against the customer’s hard constraints and product sources.
   - If a suitable reviewer is not available, say so and continue with an agent-generated plan; do not imply a human review occurred.

6. **Revise and explain**
   - Decide which reviewer suggestions to accept, reject, or investigate.
   - Re-run Exa searches for replacement products as needed.
   - Preserve the customer’s budget and constraints.
   - Show what changed because of feedback, including a concise before/after explanation.

7. **Whop payment**
   - Create or use the configured Whop checkout product for the design plan.
   - In the hackathon demo, use test mode or a clearly labeled simulated checkout unless live payment processing was explicitly configured.
   - Do not store card details or claim a payment succeeded until Whop confirms it.
   - Keep unpaid previews separate from paid deliverables according to the configured product rules.

8. **Deliver and follow up**
   - Present the final plan, itemized price total, source links, and uncertainty notes.
   - Make it easy to revise the brief and regenerate the plan.
   - Do not purchase items on the customer’s behalf unless a separate, explicit purchase authorization and supported retailer flow exist.

## Output schema

Return a plan in this shape (adapt field names to the app’s implementation):

```json
{
  "status": "draft | awaiting_review | revised | delivered | needs_customer_input",
  "room_brief": {},
  "design_concept": "",
  "items": [
    {
      "name": "",
      "retailer": "",
      "url": "",
      "image_url": null,
      "price": null,
      "currency": "USD",
      "dimensions": null,
      "reason_selected": "",
      "source_checked_at": "",
      "availability_confidence": "confirmed | unconfirmed | unavailable"
    }
  ],
  "estimated_subtotal": null,
  "delivery_estimate": null,
  "estimated_total": null,
  "terac_review": {
    "requested": false,
    "completed": false,
    "feedback_summary": "",
    "changes_made": []
  },
  "assumptions": [],
  "unresolved_questions": []
}
```

## Demo behavior

- Support a seeded demo room and one-click demo account.
- If Exa, Terac, or Whop credentials are absent, use deterministic sample data and label it clearly as simulated.
- Never fabricate a live API result, completed Terac task, or successful Whop payment.
- Make the Terac feedback visibly change at least one recommendation in the demo.
- Provide a complete happy path that does not require a real purchase or an in-person decorator.

## Privacy and trust

- Request permission before using an uploaded room photo for processing.
- Minimize photo retention; do not expose photo URLs publicly.
- Avoid asking for names, addresses, or exact location unless needed for product availability or delivery estimates.
- If location is needed, request a ZIP/postal code rather than a street address.
- Separate sourced facts, estimates, reviewer opinions, and agent recommendations in both stored data and UI.
- Do not guarantee price, stock, delivery, fit, or results; link to sources and timestamp the lookup.

## Definition of done

- Customer can submit a room brief and image, or use the seeded demo.
- The agent returns a coherent plan grounded in Exa product sources.
- Terac review is requested and incorporated when configured, with fallback behavior when unavailable.
- Whop test/simulated checkout is represented honestly.
- The customer sees budget totals, source links, uncertainty, and the effect of reviewer feedback.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
