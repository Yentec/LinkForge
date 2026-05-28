# ADR 0003 — Zod as the single source of truth, OpenAPI derived

**Status:** accepted • **Date:** 2026-05

## Context

The team needs request validation, static types, and OpenAPI documentation
without keeping three definitions in sync.

## Decision

Zod 4 schemas are the only source. Controllers call `schema.parse()` directly.
The OpenAPI document is generated from the same schemas via the native
`z.toJSONSchema()` (Zod 4). Services and repositories stay framework-agnostic.

## Alternatives considered

`fastify-type-provider-zod` provides tighter integration (auto-validation,
auto-serialization, auto-OpenAPI) but would require attaching schemas to every
route and adopting Fastify's `withTypeProvider` pattern across the codebase.
Deferred: the current approach yields the same outputs with less coupling.

## Consequences

- Zero duplication between validation and documentation.
- Response shapes are not validated against a schema. The tradeoff: simpler code, faster iteration, at the cost of catching response drift only via tests.
