/**
 * Manufacturer part numbers (MPNs). These are the strongest cross-retailer
 * identifiers we have: "GV-N4070AERO OC-12GD", "100-100000910WOF",
 * "CMK32GX5M2B6000C36", "BX8071514700K", "MZ-V9P2T0BW".
 */
import { SpecIndex, cleanText } from './text';

export type MpnSource = 'field' | 'spec' | 'title';

export interface MpnCandidate {
  /** As shown on the page. */
  raw: string;
  /** Uppercase, separators and regional suffixes removed. Use this for equality. */
  normalized: string;
  source: MpnSource;
}

/** Vendor part number shapes we trust when they appear inside a title. */
const TITLE_PATTERNS: RegExp[] = [
  /GV-[NR][A-Z0-9]+(?:\s?OC)?-\d{1,2}G[DL]?(?:\s*REV\s*\d\.\d)?/i, // Gigabyte GPUs
  /(?:ROG-STRIX|ROG-ASTRAL|TUF|DUAL|PRIME|PROART)-[A-Z]*\d+[A-Z0-9]*(?:-[A-Z0-9]+){1,4}/i, // ASUS GPUs
  /100-\d{9}[A-Z]{0,4}/, // AMD CPUs
  /BX\d{7,}[A-Z0-9]*/, // Intel boxed CPUs
  /CM\d{12,}/, // Intel tray CPUs
  /CM[A-Z]{1,3}\d{1,3}GX[345]M\d[A-Z]\d{4}[CZ]\d{2}[A-Z]?/, // Corsair RAM
  /KVR\d{2}[NS]\d{2}[SD]\d(?:K\d)?\/\d{1,3}/, // Kingston ValueRAM
  /CP\d?K?\d{1,2}G\d{2}C\d{2}[A-Z0-9]*/, // Crucial Pro RAM
  /C[PCW]-\d{7}(?:-[A-Z]{2})?/, // Corsair PSU / case / cooler
  /F[345]-\d{4}[A-Z0-9]+GX\d(?:-[A-Z0-9]+)?/i, // G.Skill DDR5
  /F[345]-\d{4}C\d{2}[SDQ]-\d+G[A-Z]*/i, // G.Skill DDR4
  /KF[345]\d{2}C\d{2}[A-Z0-9]*[-/]\d+/i, // Kingston FURY RAM
  /S[A-Z0-9]{3,8}\/\d+G/, // Kingston SSD (SNV2S/1000G)
  /MZ-[A-Z0-9]{5,}(?:\/[A-Z]{2})?/, // Samsung SSD
  /WDS\d{3}[A-Z0-9]{4,}/, // WD SSD
  /WD\d{2,3}[A-Z]{4}/, // WD HDD
  /ST\d{3,5}[A-Z]{2}\d{3}[A-Z]?/, // Seagate HDD
  /ZP\d{3,4}G[A-Z]\d{4,}/, // Seagate FireCuda
  /CT\d{3,4}[A-Z][A-Z0-9]{4,}/, // Crucial SSD / RAM
  /RL-[A-Z0-9]+-[A-Z0-9]+/, // NZXT AIO
  /ACFRE\d{5}A/, // Arctic
  /R-[A-Z0-9]{4,}-[A-Z0-9]{2,}(?:-[A-Z]{1,3})?/, // DeepCool
];

/** Normalise for equality: uppercase, strip regional suffix, drop separators. */
export function normalizeMpn(raw: string): string {
  return cleanText(raw)
    .toUpperCase()
    .replace(/[-/](?:WW|EU|UK|US|AM|ME|NA|AP|IN|GB|AE|EMEA|INTL|GL)$/, '')
    .replace(/[^A-Z0-9]/g, '');
}

/** Plausible part number from a free-form field (Amazon "Item model number", noon "Model Number"). */
export function looksLikeMpn(raw: string | undefined): boolean {
  if (!raw) return false;
  const text = cleanText(raw);
  if (text.split(/\s+/).length > 3 || text.length > 40) return false;
  const n = normalizeMpn(text);
  if (n.length < 6 || n.length > 30) return false;
  const digits = (n.match(/\d/g) ?? []).length;
  if (digits < 2 || !/[A-Z]/.test(n)) return false;
  // Not a bare chipset / CPU model / capacity / spec value.
  if (/^(?:RTX|GTX|RX|ARC)\d/.test(n)) return false;
  if (/^\d{3,5}[A-Z]{0,3}\d?[A-Z]?$/.test(n)) return false; // 7950X, 14700KF, 7800X3D
  if (/^(?:RYZEN|CORE|I[3579])/.test(n)) return false;
  if (/^[ABXHZ]\d{3}[A-Z]?$/.test(n)) return false;
  if (/^\d+(?:GB|TB|MB|MHZ|W)$/.test(n)) return false;
  if (/^(?:DDR|PC|LGA|AM|PCIE|GDDR)\d/.test(n)) return false;
  return true;
}

const MPN_LABELS = [
  'Manufacturer Part Number', 'Mfr Part Number', 'Mfr Part #', 'MPN', 'Part Number', 'Part No', 'partNumber',
  'Item model number', 'Model Number', 'Model No', 'Model Code', 'Product Code',
];

/**
 * All part numbers we can find for a product, strongest first.
 * Sources: the explicit `mpn` / `model` fields, spec labels, then known vendor
 * patterns inside the title (including noon's "... | CODE" suffix).
 */
export function extractMpns(input: { title: string; mpn?: string; model?: string; specs?: Record<string, unknown> }): MpnCandidate[] {
  const out: MpnCandidate[] = [];
  const add = (raw: string | undefined, source: MpnSource) => {
    if (!raw) return;
    const clean = cleanText(raw).replace(/^model\s*(?:number|no\.?)?\s*:?\s*/i, '');
    if (source !== 'title' && !looksLikeMpn(clean)) return;
    const normalized = normalizeMpn(clean);
    if (normalized.length < 6 || out.some((c) => c.normalized === normalized)) return;
    out.push({ raw: clean, normalized, source });
  };
  add(input.mpn, 'field');
  add(input.model, 'field');
  const specs = new SpecIndex(input.specs);
  for (const label of MPN_LABELS) add(specs.get([label]), 'spec');

  const title = cleanText(input.title);
  for (const re of TITLE_PATTERNS) {
    const m = new RegExp(`(?<![A-Za-z0-9-])(?:${re.source})(?![A-Za-z0-9])`, re.flags.replace('g', '')).exec(title);
    if (m) add(m[0], 'title');
  }
  // noon / Microless often end titles with "| CODE" or "(CODE)".
  const pipe = /\|\s*([A-Za-z0-9][A-Za-z0-9 ./-]{4,30})\s*$/.exec(title);
  if (pipe && looksLikeMpn(pipe[1])) add(pipe[1], 'title');
  const paren = /\(([A-Za-z0-9][A-Za-z0-9./-]{5,30})\)\s*$/.exec(title);
  if (paren && looksLikeMpn(paren[1])) add(paren[1], 'title');
  return out;
}

/** Brand implied by a part number prefix, for titles that only show the code. */
export function brandFromMpn(mpn: string | undefined): string | undefined {
  if (!mpn) return undefined;
  const p = cleanText(mpn).toUpperCase();
  if (/^GV-[NR]/.test(p)) return 'Gigabyte';
  if (/^(?:ROG-|TUF-|DUAL-|PRIME-|PROART-)/.test(p)) return 'ASUS';
  if (/^100-\d{9}/.test(p)) return 'AMD';
  if (/^(?:BX\d|CM\d{8})/.test(p)) return 'Intel';
  if (/^(?:CM[A-Z]{1,3}\d{1,3}GX|C[PCW]-\d{7})/.test(p)) return 'Corsair';
  if (/^F[345]-\d{4}/.test(p)) return 'G.Skill';
  if (/^KF[345]\d{2}C/.test(p)) return 'Kingston';
  if (/^MZ-/.test(p)) return 'Samsung';
  if (/^WD/.test(p)) return 'Western Digital';
  if (/^(?:ST\d{3,5}[A-Z]{2}|ZP\d)/.test(p)) return 'Seagate';
  if (/^CT\d/.test(p)) return 'Crucial';
  if (/^RL-/.test(p)) return 'NZXT';
  return undefined;
}
