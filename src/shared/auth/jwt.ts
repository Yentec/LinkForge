import { SignJWT, jwtVerify } from 'jose';
import { env } from '@/config/env';

const secret = new TextEncoder().encode(env.JWT_SECRET);

export const ACCESS_TTL_SECONDS = 900; // 15 minutes
const ACCESS_TTL = '15m';

export interface AccessTokenPayload {
  userId: string;
  email: string;
}

export function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, secret);
  if (typeof payload.sub !== 'string' || typeof payload['email'] !== 'string') {
    throw new Error('Invalid token claims');
  }
  return { userId: payload.sub, email: payload['email'] };
}
