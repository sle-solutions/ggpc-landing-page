/**
 * Small, dependency free text helpers shared by the categoriser, the spec
 * normaliser and the matcher. Pure functions only: this file runs in the MV3
 * service worker, the side panel and Node (jest + server).
 */

/** Spec values may come from a retailer page (strings) or from our DB JSON. */
export type RawSpecs = Record<string, unknown>;

/**
 * Normalise the unicode noise retailers put in titles: trademark symbols,
 * non breaking spaces, typographic dashes and quotes, the multiplication sign.
 */
export function cleanText(input: unknown): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/[™®©]/g, ' ') // ™ ® ©
    .replace(/[   ​]/g, ' ')
    .replace(/[‐-―−]/g, '-') // hyphen, figure dash, en/em dash, minus
    .replace(/[“”″ʺ]/g, '"')
    .replace(/[‘’′]/g, "'")
    .replace(/×/g, 'x') // ×
    .replace(/\s+/g, ' ')
    .trim();
}

/** Lowercased, cleaned text for regex work. */
export function lower(input: unknown): string {
  return cleanText(input).toLowerCase();
}

/** "Ryzen 7 7800X3D" -> "ryzen-7-7800x3d" */
export function slugify(input: string): string {
  return lower(input)
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Normalise a spec label so "CPU Socket", "cpu_socket" and "CPUSocket" compare equal. */
export function normalizeLabel(label: string): string {
  return lower(label).replace(/[^a-z0-9]/g, '');
}

/** Turn any spec value (string, number, boolean, array, nested object) into text. */
export function specValueToString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return cleanText(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(specValueToString).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${specValueToString(v)}`)
      .join(', ');
  }
  return '';
}

/** Index of normalised label -> value text, preserving the first occurrence. */
export class SpecIndex {
  private readonly entries: Array<{ label: string; key: string; value: string }> = [];

  constructor(specs?: RawSpecs | null) {
    if (!specs) return;
    for (const [label, raw] of Object.entries(specs)) {
      const value = specValueToString(raw);
      if (!value) continue;
      this.entries.push({ label, key: normalizeLabel(label), value });
    }
  }

  get size(): number {
    return this.entries.length;
  }

  /**
   * First value whose normalised label equals one of `aliases` (checked in
   * order), then the first whose label matches one of `patterns`.
   */
  get(aliases: string[], patterns: RegExp[] = [], exclude?: RegExp): string | undefined {
    for (const alias of aliases) {
      const key = normalizeLabel(alias);
      const hit = this.entries.find((e) => e.key === key && !(exclude && exclude.test(e.key)));
      if (hit) return hit.value;
    }
    for (const pattern of patterns) {
      const hit = this.entries.find((e) => pattern.test(e.key) && !(exclude && exclude.test(e.key)));
      if (hit) return hit.value;
    }
    return undefined;
  }

  /** All values concatenated, useful as a last resort text source. */
  allText(): string {
    return this.entries.map((e) => `${e.label}: ${e.value}`).join(' | ');
  }

  has(pattern: RegExp): boolean {
    return this.entries.some((e) => pattern.test(e.key));
  }
}

/** Parse "1,234.5" / "3.5" / "12" into a number. */
export function parseNumber(input: unknown): number | undefined {
  if (typeof input === 'number') return Number.isFinite(input) ? input : undefined;
  const text = cleanText(input);
  const m = text.match(/-?\d{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+(?:\.\d+)?/);
  if (!m) return undefined;
  const n = parseFloat(m[0].replace(/,/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

/** Parse a whole number only when the text clearly holds one. */
export function parseInteger(input: unknown): number | undefined {
  const n = parseNumber(input);
  return n === undefined ? undefined : Math.round(n);
}

/** "850 Watts", "850W", "850" -> 850 */
export function parseWatts(input: unknown, min = 1, max = 3000): number | undefined {
  if (typeof input === 'number') return input >= min && input <= max ? input : undefined;
  const text = lower(input);
  const m = text.match(/(\d{1,4}(?:\.\d+)?)\s*(?:w|watts?)\b/) ?? text.match(/^\s*(\d{1,4}(?:\.\d+)?)\s*$/);
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  return n >= min && n <= max ? n : undefined;
}

/**
 * Length in millimetres from "301 mm", "30.1 cm", "11.85 inches", "Up to 400mm".
 * When the text holds several lengths, `pick` chooses the max (default) or min.
 */
export function parseLengthMm(input: unknown, pick: 'max' | 'min' | 'first' = 'max'): number | undefined {
  if (typeof input === 'number') return input > 0 ? input : undefined;
  let text = lower(input);
  const values: number[] = [];
  const toMm = (n: number, unit: string) =>
    unit.startsWith('mm') || unit.startsWith('millimet') ? n : unit.startsWith('cm') || unit.startsWith('centimet') ? n * 10 : n * 25.4;
  const UNIT = '(mm|millimet(?:er|re)s?|cm|centimet(?:er|re)s?|inch(?:es)?|in\\b|")';
  // "30.1 x 13 x 5.4 cm": one unit after a dimension list applies to every number.
  const dimRe = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*[x*]\\s*(\\d+(?:\\.\\d+)?)(?:\\s*[x*]\\s*(\\d+(?:\\.\\d+)?))?\\s*${UNIT}`, 'g');
  let m: RegExpExecArray | null;
  while ((m = dimRe.exec(text))) {
    for (const v of [m[1], m[2], m[3]]) if (v) values.push(toMm(parseFloat(v), m[4]));
  }
  text = text.replace(dimRe, ' ');
  const re = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${UNIT}`, 'g');
  while ((m = re.exec(text))) values.push(toMm(parseFloat(m[1]), m[2]));
  if (values.length === 0) {
    // A bare number in a field whose label already says "mm".
    const bare = text.match(/^\s*(\d{2,3}(?:\.\d+)?)\s*$/);
    if (bare) values.push(parseFloat(bare[1]));
  }
  if (values.length === 0) return undefined;
  const v = pick === 'max' ? Math.max(...values) : pick === 'min' ? Math.min(...values) : values[0];
  return Math.round(v);
}

/**
 * Capacity in GB. Storage uses decimal units (1 TB = 1000 GB) like drive makers do.
 * "32768 MB" style RAM values are converted with 1024.
 */
export function parseCapacityGb(input: unknown, binaryMb = false): number | undefined {
  if (typeof input === 'number') return input > 0 ? input : undefined;
  const text = lower(input);
  const m = text.match(/(\d+(?:\.\d+)?)\s*(tb|gb|mb)\b/);
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  switch (m[2]) {
    case 'tb':
      return n * 1000;
    case 'gb':
      return n;
    case 'mb':
      return binaryMb ? n / 1024 : n / 1000;
    default:
      return undefined;
  }
}

/** Words used by titles as filler. Removed before token comparisons. */
export const NOISE_WORDS = new Set([
  'a', 'an', 'and', 'the', 'with', 'for', 'of', 'to', 'in', 'on', 'by', 'up', 'from', 'at', 'or', 'only',
  'new', 'latest', 'original', 'genuine', 'official', 'brand', 'version', 'edition', 'series', 'model',
  'gaming', 'gamer', 'graphics', 'graphic', 'card', 'video', 'desktop', 'processor', 'cpu', 'gpu',
  'memory', 'ram', 'kit', 'module', 'modules', 'internal', 'solid', 'state', 'drive', 'pc', 'computer',
  'compatible', 'support', 'supports', 'technology', 'performance', 'high', 'speed', 'ultra-fast',
  'fan', 'fans', 'cooler', 'cooling', 'motherboard', 'mainboard', 'power', 'supply', 'unit', 'case',
  'tower', 'mid', 'full', 'chassis', 'black', 'white', 'silver', 'pink', 'grey', 'gray', 'unlocked',
  'boxed', 'box', 'retail', 'pack', 'piece', 'pcs', 'x', 'plus+',
]);

/** Split cleaned text into lowercase alphanumeric tokens ("m.2" -> "m2", "4070ti" stays). */
export function tokenize(input: string): string[] {
  return lower(input)
    .replace(/(\d)\.(\d)/g, '$1_$2') // keep "3.0" together as "3_0"
    .replace(/m\.2/g, 'm2')
    .split(/[^a-z0-9_+]+/)
    .map((t) => t.replace(/_/g, '.'))
    .filter(Boolean);
}

/** Round up to the next common PSU size. */
export const STANDARD_PSU_SIZES = [450, 550, 650, 750, 850, 1000, 1200, 1600];

export function roundUpPsu(watts: number): number {
  for (const size of STANDARD_PSU_SIZES) if (watts <= size) return size;
  return Math.ceil(watts / 100) * 100;
}

/** Unique, defined values. */
export function uniq<T>(values: Array<T | undefined | null>): T[] {
  const out: T[] = [];
  for (const v of values) if (v !== undefined && v !== null && !out.includes(v)) out.push(v);
  return out;
}
