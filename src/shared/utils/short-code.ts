import { customAlphabet } from 'nanoid';

// Base62, 7 chars. ~3.5e12 combinations — ample headroom before collisions matter.
const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 7;

const nanoid = customAlphabet(ALPHABET, CODE_LENGTH);

export function generateShortCode(): string {
  return nanoid();
}
