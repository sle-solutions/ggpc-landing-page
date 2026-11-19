/** Shared catalog/build identity limit. Never trim, truncate or coerce a store SKU. */
export function isRetailerSku(raw: unknown): raw is string {
  return typeof raw === 'string' && raw.length > 0 && raw.length <= 128 && !/[\s\p{Cc}\p{Cf}\p{Cs}]/u.test(raw);
}

/** Market identity only. This does not infer the shopper's location or verify a price. */
export function isUaeRetailerProductUrl(retailer: unknown, rawUrl: unknown): boolean {
  if (typeof rawUrl !== 'string' || rawUrl.length > 8192) return false;
  try {
    const url = new URL(rawUrl);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return false;
    // Encoded separators make the browser path and the server's decoded path disagree.
    if (/%(?:2f|5c)/i.test(url.pathname)) return false;
    const pathname = decodeURIComponent(url.pathname).toLowerCase();
    const host = url.hostname.toLowerCase();
    const owned = (domain: string) => host === domain || host === `www.${domain}`;
    switch (retailer) {
      case 'amazon_ae':
        return (host === 'amazon.ae' || host.endsWith('.amazon.ae')) && /\/(?:dp|gp\/product)\/[^/]+(?:\/|$)/.test(pathname);
      case 'noon':
        return owned('noon.com') && /^\/uae-(?:en|ar)\/(?:[^/]+\/)*[^/]+\/p\/?$/.test(pathname);
      case 'microless':
        // Root/www are historical default-UAE URLs. Currency is checked separately.
        return (owned('microless.com') || host === 'uae.microless.com') && /^\/(?:ar\/)?product\/[^/]+\/?$/.test(pathname);
      case 'gear_up':
        return owned('gear-up.me') && /^\/(?:aed\/)?[^/]+\.html$/.test(pathname);
      case 'gcc_gamers':
        return owned('gccgamers.com') && /^\/ae\/product\/[^/]+\/?$/.test(pathname);
      // Retained API ingestion contracts, not additional registered extension stores.
      case 'newegg_ae':
        return owned('newegg.com') && pathname.startsWith('/global/ae-en/');
      case 'pcdubai':
        return owned('pcdubai.com');
      default:
        return false;
    }
  } catch { return false; }
}
