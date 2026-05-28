# ADR 0005 — Asynchronous click tracking via BullMQ

**Status:** accepted • **Date:** 2026-05

## Context

Redirection latency is user-facing. Synchronous tracking (UA parsing, geo
lookup, DB insert) would add tens of milliseconds — and any failure (DB hiccup,
geo resolver timeout) would propagate to the redirect.

## Decision

`GET /:code` resolves the link from cache (Redis) or DB, calls `enqueueClick`
fire-and-forget, then responds 302. A BullMQ worker in the same process pulls
the job, enriches it, and inserts the row. Failed jobs are retried with
exponential backoff (3 attempts).

## Consequences

- Redirect latency is bounded by cache + (rare) DB lookup.
- Clicks are eventually consistent. Analytics queries running within seconds of a burst may undercount. Acceptable for the use case.
- Requires Redis as part of the production stack.
