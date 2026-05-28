# ADR 0001 — Modular monolith over microservices

**Status:** accepted • **Date:** 2026-05

## Context

A 5-day backend portfolio needs to demonstrate ownership of a non-trivial system.

## Decision

Single Node process, layered architecture, modules separated by folder
(`modules/auth`, `modules/links`, …). The BullMQ worker runs in the same process
as the HTTP server.

## Consequences

- One deploy, one log stream, one set of secrets. Tractable for one developer.
- The worker can be extracted later by importing the same modules and starting only `startClickWorker()` without `app.listen()`.
- Tradeoff: a CPU-heavy job could starve the HTTP loop. Acceptable for the expected traffic of a portfolio demo.
