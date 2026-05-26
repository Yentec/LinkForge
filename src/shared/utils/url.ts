import { isIP } from 'node:net';

const BLOCKED_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

/**
 * Rejects targets that point to the local machine or private network ranges,
 * to avoid the shortener being used as an SSRF pivot. Only http(s) is allowed.
 */
export function isSafePublicUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host)) return false;
  if (host.endsWith('.localhost') || host.endsWith('.internal')) return false;

  if (isIP(host) && isPrivateIp(host)) return false;

  return true;
}

function isPrivateIp(ip: string): boolean {
  // IPv6 private/link-local/unique-local.
  if (ip.includes(':')) {
    return ip.startsWith('fe80') || ip.startsWith('fc') || ip.startsWith('fd');
  }

  const parts = ip.split('.').map(Number);
  const [a, b] = parts as [number, number, number, number];
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  return false;
}
