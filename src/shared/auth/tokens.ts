import { createHash, randomBytes } from 'node:crypto';

// High-entropy opaque token (refresh tokens, API keys).
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

// Fast hash is appropriate here: inputs are high-entropy random tokens, not low-entropy
// passwords. We only need a one-way, constant-length value to store and look up.
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
