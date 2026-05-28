# ADR 0002 — Opaque refresh tokens, not JWT

**Status:** accepted • **Date:** 2026-05

## Context

Refresh tokens must be revocable (logout, rotation, theft response). A signed
JWT cannot be revoked without a server-side lookup, defeating the point of being
self-contained.

## Decision

Refresh tokens are 32 random bytes (base64url). Only their SHA-256 hash is
persisted, with `expiresAt` and `revokedAt`. Each `/auth/refresh` revokes the
presented token and issues a new pair (single-use rotation). Detection of reuse
would be an obvious next step (revoke the whole chain).

## Consequences

- One DB lookup per refresh. Acceptable; refreshes are infrequent.
- Stored hashes are fast to verify (SHA-256 is appropriate for high-entropy inputs; Argon2 would be overkill).
- No `JWT_REFRESH_SECRET` needed — removed from configuration.
