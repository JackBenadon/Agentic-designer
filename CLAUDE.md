# Roomwise

Hackathon demo website. **The product brief is `website.md` in the repo root. Read it before building anything; it is the source of truth for the flow, screens, copy, and demo requirements.**

@AGENTS.md

## Stack
Next.js (App Router, `src/` dir) · TypeScript · Tailwind CSS · npm

## Commands
- `npm run dev` — dev server on http://localhost:3000
- `npm run lint` · `npm run build`

## Folders
- `src/app/` — pages: `demo`, `intake`, `processing`, `plan`, `checkout`; `api/` for server routes (keep API keys server-side)
- `src/components/` — UI components
- `src/lib/` — integrations and helpers (Exa, Terac, Whop)
- `src/data/` — seed/demo data
- `public/demo/` — local mock images only

## Env
Copy `.env.example` to `.env.local`. Never commit `.env.local`.
