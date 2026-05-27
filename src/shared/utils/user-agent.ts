export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'bot';

export interface ParsedUserAgent {
  deviceType: DeviceType;
  browser: string | null;
}

/**
 * Minimal, dependency-free user-agent classifier.
 * Deliberately coarse: analytics only needs device buckets and browser families,
 * not exhaustive parsing. Avoids the AGPL/commercial licensing of ua-parser-js v2+.
 */
export function parseUserAgent(ua: string): ParsedUserAgent {
  const s = ua.toLowerCase();

  if (!s) return { deviceType: 'desktop', browser: null };

  if (/bot|crawler|spider|crawling|slurp|curl|wget|headless/.test(s)) {
    return { deviceType: 'bot', browser: null };
  }

  const deviceType: DeviceType = /ipad|tablet|playbook|silk/.test(s)
    ? 'tablet'
    : /mobi|iphone|android.*mobile|phone|ipod/.test(s)
      ? 'mobile'
      : 'desktop';

  // Order matters: Edge/Opera/Chrome share tokens, so check the most specific first.
  const browser = /edg\//.test(s)
    ? 'Edge'
    : /opr\/|opera/.test(s)
      ? 'Opera'
      : /firefox|fxios/.test(s)
        ? 'Firefox'
        : /chrome|crios/.test(s)
          ? 'Chrome'
          : /safari/.test(s)
            ? 'Safari'
            : null;

  return { deviceType, browser };
}
