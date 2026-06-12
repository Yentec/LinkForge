# ADR 0006 — Refresh token reuse detection via chain revocation

**Status:** accepted • **Date:** 2026-06

## Context

ADR 0002 introduced single-use opaque refresh tokens with rotation: presenting a
token revokes it and issues a new pair. This closes the window where a stolen
token remains valid indefinitely, but leaves a gap: if an attacker steals a
refresh token before the legitimate user rotates it, both parties hold a valid
token and the system cannot detect the compromise.

## Decision

Add a `chainId` (UUID) column to `RefreshToken`. All tokens issued from a single
login share the same `chainId`; rotation preserves it. On `/auth/refresh`, if
the presented token is found but already revoked (`revokedAt IS NOT NULL`), treat
it as a replay attack:

1. Revoke every token in the chain (`UPDATE ... WHERE chainId = ? AND revokedAt IS NULL`).
2. Log a `warn` with `userId` and `chainId` for audit.
3. Return 401.

The user must log in again to obtain a new chain.

## Consequences

- **Legitimate users are protected**: a replayed token triggers full session
  invalidation, limiting the blast radius of a stolen token.
- **Possible false positive**: a client that retries a `/auth/refresh` request
  after a network failure (the server responded but the client never received
  the new token) will be logged out. This is an accepted trade-off; the
  alternative is to keep a compromised session alive.
- **Single atomic query**: chain revocation uses `updateMany`, not a loop —
  one round-trip regardless of chain length.
- **No user-facing notification**: out of scope for this iteration.
