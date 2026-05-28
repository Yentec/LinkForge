# ADR 0004 — In-house user-agent classifier (no ua-parser-js)

**Status:** accepted • **Date:** 2026-05

## Context

`ua-parser-js` v2+ moved to a dual AGPLv3 / commercial license. Using it in an
MIT-licensed project would either contaminate the license or require paid
commercial terms.

## Decision

A ~40-line classifier in `src/shared/utils/user-agent.ts` returns the device
bucket (`mobile|tablet|desktop|bot`) and browser family (`Chrome|Firefox|...`).
That is the granularity analytics needs.

## Consequences

- Zero runtime dependency on a contested library.
- Less accurate than full UA parsing. Acceptable; we never expose raw UA strings to end users, only aggregates.
