import * as argon2 from 'argon2';

// OWASP 2026 minimum for Argon2id: 19 MiB memory, 2 iterations, 1 thread.
const options: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, options);
}

export function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}
