# PG Group Tracker

Production-focused Next.js application for verified student reconciliation, mobile field collection, relationship tracking, and live D1–D6 occupancy.

## Setup

1. Copy `.env.example` to `.env.local` and set the server-only `MONGODB_URI`.
2. Run `bun install` and `bun run dev`.
3. Open **Reconcile** to explicitly connect one name from `cdac.student`, one phone from `cdac.phone-number`, and a verified gender. These source collections are never edited by the app.

Useful checks: `bun test`, `bun run typecheck`, `bun run lint`, and `bun run build`.

`bun run db:compare-cdac` is a read-only comparison of local JSON fixtures with MongoDB. The import command refuses to run when raw source records already exist.
