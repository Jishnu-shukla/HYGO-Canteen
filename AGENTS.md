<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Canteen App

## Stack & Conventions

- Next.js 16.3.6 (App Router) + React 19 + TypeScript (strict mode)
- Tailwind CSS v4 — use `@import "tailwindcss"` in CSS (NOT `@tailwind base/components/utilities`)
- ESLint 9 with flat config (`eslint.config.mjs`)
- Path alias: `@/*` → project root (`./*`)

## Commands

- `npm run dev` / `npm run build` / `npm run lint`
- No test framework configured — do not add test commands

## API Backend

Every fetch goes through `API_BASE_URL` from `data/apiBaseUrl.ts`, which reads
`NEXT_PUBLIC_API_BASE_URL` from `.env` (the value includes the `/api` prefix).
Point the app at another backend by changing that one variable — no code edits.
When the variable is unset the module falls back to the dev tunnel, so local dev
works without an env file.

- `NEXT_PUBLIC_` is required: the `data/*/api.ts` modules are imported by client
  components, so the value is inlined into the browser bundle at build time.
- Deployment: set `NEXT_PUBLIC_API_BASE_URL` in the host's environment (see
  `.env.example`). It is read at build time, so rebuild after changing it.

## Gotchas

- `deleteInventoryItemApi` uses HTTP PUT (not DELETE) — matches backend expectation
- `reactStrictMode: false` in `next.config.ts`
- Config lives in `.env` (gitignored); `.env.example` documents the variables
- `data/Inventory/dummyData.ts` has mock/fallback data for development
