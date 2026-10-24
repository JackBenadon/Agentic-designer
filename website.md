# Website brief: Roomwise

## Product

Roomwise is a home decorating service delivered through a conversational website. A customer shares a room photo, budget, style preferences, and constraints. AI agents create a shoppable design plan, use Exa to find furniture and decor, and ask a Terac reviewer to critique the proposed design. Whop collects payment for the plan.

For the hackathon demo, present Terac feedback as a reviewer’s perspective. Do not claim the reviewer is a certified interior designer unless the task specifically recruits and verifies one.

## Main goals

- Make it easy to submit a room and explain what the customer wants.
- Show the agent’s work: room brief, product research, reviewer feedback, and revised recommendations.
- Deliver a useful shopping plan with prices, retailer links, and a budget total.
- Support a seeded demo account so judges can try the full flow without creating an account or paying real money.

## Primary user flow

1. User opens the landing page and selects **Start my room plan**.
2. User signs in to the demo account or continues in demo mode.
3. Chatbot asks for:
   - A room photo (one or more images).
   - Room type and approximate dimensions, if known.
   - Total budget and currency.
   - Style preferences, colors, and items to keep or avoid.
   - Constraints such as pets, children, accessibility, rental restrictions, or delivery location.
4. User reviews and confirms the brief before processing.
5. The app shows progress as agents research products and request a Terac review.
6. The user sees the design concept, item cards, itemized budget, reviewer notes, and the agent’s revised plan.
7. User pays for or unlocks the plan using Whop. In demo mode, use a clearly labeled simulated checkout or a Whop test flow.
8. User can save, print, or share the final plan.

## Pages and screens

### Landing page

- Explain the service in one sentence: “A room refresh, researched and reviewed for your budget.”
- Primary CTA: **Start my room plan**.
- Secondary CTA: **Explore the demo room**.
- Show an example room plan with product links and a clear budget total.

### Chat intake

- Conversational layout with visible progress and a persistent summary of collected details.
- Accept image upload and show a thumbnail with remove/replace controls.
- Ask one or two questions at a time; allow users to skip unknown room dimensions.
- Let the user edit the generated brief before submitting it.
- Include a note that the photo is used to create the room plan and should not contain sensitive personal information.

### Processing view

Show honest, understandable status steps:

- Reviewing your brief and constraints.
- Finding products with Exa.
- Asking a Terac reviewer for feedback.
- Updating your recommendations.

Only show a step as complete when the corresponding action succeeded. If a live integration is unavailable, label the step as demo or simulated.

### Room plan results

- Short design concept and explanation of how it matches the brief.
- Product cards with image, name, retailer, observed price, source link, and why it was selected.
- Budget breakdown: item subtotal, delivery estimate if known, and remaining budget.
- Terac feedback summary, clearly attributed as reviewer feedback.
- Revised recommendations that show how the feedback changed the plan.
- Confidence or availability notes when product details could not be confirmed.
- Actions: **Refine this plan**, **Save plan**, and **Unlock full plan**.

### Demo account

Provide a visible **Try the demo** entry point with seeded data, for example:

- Room: small living room.
- Budget: $1,500.
- Style: warm, minimal, solid colors.
- Constraints: keep the existing sofa; avoid scratchy natural-fiber rugs.

Seed an example room photo only if the team has rights to use it. Otherwise use a locally created mock room image or let the user skip the photo in demo mode. Make it obvious which data and results are sample content.

## Visual direction

- Warm, calm home-design feel with generous whitespace and readable typography.
- Use neutral backgrounds and restrained terracotta, rust, or muted green accents.
- Prioritize clear product photos, readable prices, and a simple budget summary.
- Make mobile photo upload and chat comfortable to use.
- Avoid implying that product prices or stock are guaranteed; display source and retrieval time when available.

## Demo requirements

- One-click path into the seeded demo.
- Complete flow from room brief to reviewed, shoppable plan.
- Show a visible before/after or recommendation change caused by Terac feedback.
- Checkout must be in test/simulation mode unless a real Whop test environment is configured.
- Provide fallback seeded Exa results and reviewer feedback if integrations are unavailable, with clear demo labels.

## Success criteria

- A first-time user can understand the service and complete the demo without help.
- The final recommendations respect budget and stated constraints.
- Each product recommendation links to its source and shows when its price was found.
- The UI distinguishes agent-generated recommendations, Terac feedback, and sample/demo data.
