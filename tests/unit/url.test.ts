import { describe, expect, it } from 'vitest';
import { isSafePublicUrl } from '@/shared/utils/url';

describe('isSafePublicUrl', () => {
  it('accepts public http(s) URLs', () => {
    expect(isSafePublicUrl('https://example.com/path?q=1')).toBe(true);
    expect(isSafePublicUrl('http://example.org')).toBe(true);
  });

  it('rejects non-http protocols', () => {
    expect(isSafePublicUrl('ftp://example.com')).toBe(false);
    expect(isSafePublicUrl('javascript:alert(1)')).toBe(false);
    expect(isSafePublicUrl('file:///etc/passwd')).toBe(false);
  });

  it('rejects localhost and private ranges', () => {
    expect(isSafePublicUrl('http://localhost')).toBe(false);
    expect(isSafePublicUrl('http://127.0.0.1')).toBe(false);
    expect(isSafePublicUrl('http://10.0.0.5')).toBe(false);
    expect(isSafePublicUrl('http://192.168.1.1')).toBe(false);
    expect(isSafePublicUrl('http://172.16.0.1')).toBe(false);
    expect(isSafePublicUrl('http://169.254.0.1')).toBe(false);
  });

  it('rejects malformed input', () => {
    expect(isSafePublicUrl('not a url')).toBe(false);
    expect(isSafePublicUrl('')).toBe(false);
  });
});
