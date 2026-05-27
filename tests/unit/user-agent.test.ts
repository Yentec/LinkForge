import { describe, expect, it } from 'vitest';
import { parseUserAgent } from '@/shared/utils/user-agent';

describe('parseUserAgent', () => {
  it('detects desktop Chrome', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
    expect(parseUserAgent(ua)).toEqual({ deviceType: 'desktop', browser: 'Chrome' });
  });

  it('detects mobile Safari on iPhone', () => {
    const ua =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
    expect(parseUserAgent(ua)).toEqual({ deviceType: 'mobile', browser: 'Safari' });
  });

  it('detects tablet (iPad)', () => {
    const ua = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
    expect(parseUserAgent(ua).deviceType).toBe('tablet');
  });

  it('detects Edge over Chrome', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 Edg/120.0';
    expect(parseUserAgent(ua).browser).toBe('Edge');
  });

  it('detects bots', () => {
    expect(parseUserAgent('Googlebot/2.1 (+http://www.google.com/bot.html)').deviceType).toBe(
      'bot',
    );
    expect(parseUserAgent('curl/8.4.0').deviceType).toBe('bot');
  });

  it('handles empty user agent', () => {
    expect(parseUserAgent('')).toEqual({ deviceType: 'desktop', browser: null });
  });
});
