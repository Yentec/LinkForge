# Architecture

LinkForge is a single Node.js process exposing a REST API and running an in-process
BullMQ worker. State lives in two managed services: Postgres (Neon) for durable
data and Redis (Upstash) for cache, idempotency keys and the click queue.

![Architecture diagram](images/architecture.png)

## Request paths

**Authenticated API (`/v1/*`)** — JWT or API key → middleware → controller (Zod
parsing) → service (pure domain logic) → repository (Prisma) → Postgres.

**Public redirect (`GET /:code`)** — cache lookup in Redis; on miss, query Postgres
and warm the cache (TTL 5 min). The redirect is served immediately (302); the
click is enqueued and processed off the hot path by the BullMQ worker.

## Layered structure

- **Routes** declare endpoints and Zod schemas. No logic.
- **Controllers** validate input and shape HTTP responses. No business rules.
- **Services** hold domain logic. Framework-agnostic, fully unit-testable.
- **Repositories** are the only layer that imports Prisma.

Dependencies are wired by hand in `*.routes.ts`. No DI container — deliberate,
given the project size.

## Async tracking

Click tracking never blocks a redirect. `enqueueClick` is fire-and-forget: a
failure to enqueue is logged but the user still gets their 302. The worker
enriches the job (UA parsing, IP hashing, country resolution) and writes to
the `clicks` table. Failed jobs are retried with exponential backoff.

## Caching strategy

| Key pattern           | TTL   | Invalidation          |
| --------------------- | ----- | --------------------- |
| `link:<code>`         | 5 min | On link update/delete |
| `idem:<userId>:<key>` | 24 h  | TTL only              |
| `stats:<linkId>:...`  | 60 s  | TTL only              |
