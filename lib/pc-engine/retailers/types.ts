/**
 * Shared contract for retailer parsers.
 *
 * Parsers are pure functions over an HTML string. They must not touch `document`,
 * `window`, `DOMParser` or `chrome.*`, because the same code runs in three places:
 * the MV3 service worker (no DOM), the content script, and Node (server + jest).
 */

export type RetailerId = 'amazon_ae' | 'noon' | 'microless' | 'pcdubai' | 'newegg_ae' | 'gear_up' | 'gcc_gamers';

/** Normalised category names, matching the Prisma `ComponentCategory` enum. */
export type PartCategory =
  | 'CPU'
  | 'CPU_COOLER'
  | 'GPU'
  | 'MOTHERBOARD'
  | 'RAM'
  | 'STORAGE'
  | 'CASE'
  | 'POWER_SUPPLY'
  | 'MONITOR'
  | 'OS'
  | 'OTHER';

/** One product as it appears in a retailer's search or category listing. */
export interface RetailerListing {
  retailer: RetailerId;
  /** Retailer's own stable id: Amazon ASIN, noon SKU, Microless product id, ... */
  retailerSku: string;
  title: string;
  /** Absolute, canonical product URL with tracking parameters removed. */
  url: string;
  /** Current selling price in AED, or null when the listing shows no price. */
  price: number | null;
  /** Strikethrough / list price in AED when the listing shows one. */
  wasPrice?: number | null;
  currency: 'AED';
  /** null when the listing does not say. */
  inStock: boolean | null;
  imageUrl?: string;
  brand?: string;
  rating?: number;
  reviewCount?: number;
  seller?: string;
  /** True for sponsored / ad placements. */
  sponsored?: boolean;
}

/** Everything we can read from a single product page. */
export interface RetailerProductDetail extends RetailerListing {
  /** Manufacturer part number when the page exposes one. */
  mpn?: string;
  model?: string;
  /** Raw spec label -> value pairs, exactly as the page shows them. */
  specs: Record<string, string>;
  /** Breadcrumb trail, outermost first. */
  breadcrumbs?: string[];
  /** Best guess at the PC part category, from breadcrumbs, specs and title. */
  category?: PartCategory;
}

export interface RetailerParser {
  id: RetailerId;
  name: string;
  /** Hostname suffixes this parser owns, e.g. ['amazon.ae']. */
  hosts: string[];
  /** Build the search URL for a free-text query (1-based page). */
  searchUrl(query: string, page?: number): string;
  /** True when the URL is a product detail page on this retailer. */
  isProductUrl(url: string): boolean;
  /** Parse a search / listing page. Returns [] when nothing is found. */
  parseSearch(html: string, pageUrl: string): RetailerListing[];
  /** Parse a product page. Returns null when the HTML is not a product page. */
  parseProduct(html: string, pageUrl: string): RetailerProductDetail | null;
}

/**
 * Thrown by a parser when the HTML is a bot challenge, captcha or block page
 * rather than real content, so callers can back off instead of caching "no results".
 */
export class RetailerBlockedError extends Error {
  constructor(public readonly retailer: RetailerId, message = 'Retailer returned a challenge page') {
    super(message);
    this.name = 'RetailerBlockedError';
  }
}
