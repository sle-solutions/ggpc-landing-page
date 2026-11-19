/**
 * Low level recognisers for the identifiers that show up in retailer titles and
 * spec sheets: CPU models, GPU chipsets, motherboard chipsets, sockets, memory
 * types and board sizes. Shared by categorize.ts, specs.ts and identity.ts.
 */
import { CHIPSET_PATTERN, lookupCpu } from './knowledge';
import type { BoardFormFactor, MemoryType, RamSpecs, Socket } from './types';
import { lower } from './text';

// ---------------------------------------------------------------------------
// Sockets
// ---------------------------------------------------------------------------

const LGA_MAP: Record<string, Socket> = {
  '1851': 'LGA1851',
  '1700': 'LGA1700',
  '1200': 'LGA1200',
  '1151': 'LGA1151',
};

/** First CPU socket mentioned in the text (for a CPU or a motherboard). */
export function parseSocket(input: string | undefined): Socket | undefined {
  const t = lower(input);
  if (!t) return undefined;
  const found: Array<{ i: number; s: Socket }> = [];
  const push = (re: RegExp, s: Socket) => {
    const m = re.exec(t);
    if (m) found.push({ i: m.index, s });
  };
  push(/(?<![a-z0-9])am5(?![a-z0-9])|lga\s*-?\s*1718/, 'AM5');
  push(/(?<![a-z0-9])am4(?![a-z0-9])/, 'AM4');
  push(/(?:fc)?lga\s*-?\s*1851|socket\s*1851|intel\s*1851/, 'LGA1851');
  push(/(?:fc)?lga\s*-?\s*1700|socket\s*1700|intel\s*1700/, 'LGA1700');
  push(/(?:fc)?lga\s*-?\s*1200|socket\s*1200/, 'LGA1200');
  push(/(?:fc)?lga\s*-?\s*1151|socket\s*1151/, 'LGA1151');
  push(/(?<![a-z0-9])strx4(?![a-z0-9])/, 'sTRX4');
  push(/(?<![a-z0-9])str5(?![a-z0-9])/, 'sTR5');
  push(/(?<![a-z0-9])tr4(?![a-z0-9])/, 'TR4');
  if (found.length === 0) return undefined;
  return found.sort((a, b) => a.i - b.i)[0].s;
}

/**
 * Every socket in a cooler support list, e.g.
 * "Intel LGA1851/1700/1200/115X, AMD AM5/AM4". LGA115x counts as LGA1151.
 */
export function parseSockets(input: string | undefined): Socket[] {
  const t = lower(input);
  const out: Socket[] = [];
  const add = (s: Socket) => {
    if (!out.includes(s)) out.push(s);
  };
  if (!t) return out;
  const lgaChain = /lga\s*-?\s*((?:\d{3,4}x*|115x)(?:\s*(?:\/|,|&|and|\||\s)\s*(?:lga\s*-?\s*)?(?:\d{3,4}x*|115x)(?![0-9]))*)/g;
  let m: RegExpExecArray | null;
  while ((m = lgaChain.exec(t))) {
    for (const num of m[1].split(/[^0-9x]+/)) {
      if (!num) continue;
      if (LGA_MAP[num]) add(LGA_MAP[num]);
      else if (/^115/.test(num)) add('LGA1151');
    }
  }
  const intelBare = /intel[^a-z0-9]{1,3}(?:socket\s*)?(1851|1700|1200)/g;
  while ((m = intelBare.exec(t))) add(LGA_MAP[m[1]]);
  const amdChain = /(?<![a-z0-9])am([45])((?:\s*(?:\/|,|&|and|\s)\s*(?:am)?[45](?![0-9]))*)/g;
  while ((m = amdChain.exec(t))) {
    add(m[1] === '5' ? 'AM5' : 'AM4');
    for (const d of m[2].match(/[45]/g) ?? []) add(d === '5' ? 'AM5' : 'AM4');
  }
  if (/(?<![a-z0-9])strx4(?![a-z0-9])/.test(t)) add('sTRX4');
  if (/(?<![a-z0-9])str5(?![a-z0-9])/.test(t)) add('sTR5');
  if (/(?<![a-z0-9])tr4(?![a-z0-9])/.test(t)) add('TR4');
  return out;
}

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

/** All DDR generations named in the text, ignoring GDDR6 / LPDDR5. */
export function parseMemoryTypes(input: string | undefined): MemoryType[] {
  const t = lower(input);
  const out: MemoryType[] = [];
  const re = /(?<![a-wyz])ddr\s*-?\s*([345])(?![0-9])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const type = `DDR${m[1]}` as MemoryType;
    if (!out.includes(type)) out.push(type);
  }
  return out;
}

/** The single DDR generation named in the text, or undefined when none or several. */
export function parseMemoryType(input: string | undefined): MemoryType | undefined {
  const types = parseMemoryTypes(input);
  return types.length === 1 ? types[0] : undefined;
}

// ---------------------------------------------------------------------------
// Motherboard chipsets and sizes
// ---------------------------------------------------------------------------

const CHIPSET_RE = new RegExp(`(?<![a-z0-9])(${CHIPSET_PATTERN})(m|i)?(?![a-z0-9])`, 'i');

/** "MAG B650M MORTAR" -> { chipset: 'B650', sizeHint: 'mATX' } */
export function parseChipset(input: string | undefined): { chipset: string; sizeHint?: BoardFormFactor } | undefined {
  const t = lower(input);
  const m = CHIPSET_RE.exec(t);
  if (!m) return undefined;
  const chipset = m[1].toUpperCase();
  const suffix = (m[2] ?? '').toLowerCase();
  let sizeHint: BoardFormFactor | undefined = suffix === 'm' ? 'mATX' : suffix === 'i' ? 'ITX' : undefined;
  if (!sizeHint) {
    // ASUS style "Z790-I", "B650E-I", MSI "B650I"
    const after = t.slice(m.index + m[0].length);
    if (/^-i(?![a-z0-9])/.test(after)) sizeHint = 'ITX';
  }
  return { chipset, sizeHint };
}

const FF_RE = /(?<![a-z0-9])(e-?atx|eatx|extended[\s-]?atx|ssi[\s-]?eeb|micro[\s-]?atx|m-?atx|µ-?atx|u-?atx|mini[\s-]?itx|mini[\s-]?dtx|itx|atx)(?![a-z0-9])/g;

function ffFromToken(token: string): BoardFormFactor | undefined {
  const t = token.replace(/\s|-/g, '');
  if (/^(eatx|extendedatx|ssieeb)$/.test(t)) return 'E-ATX';
  if (/^(microatx|matx|µatx|uatx)$/.test(t)) return 'mATX';
  if (/^(miniitx|minidtx|itx)$/.test(t)) return 'ITX';
  if (t === 'atx') return 'ATX';
  return undefined;
}

/** All board sizes named in the text, in order of appearance. */
export function parseFormFactors(input: string | undefined): BoardFormFactor[] {
  // DB enums: MICRO_ATX, MINI_ITX, E_ATX
  const t = lower(input).replace(/(?<![a-z0-9])e_atx/g, 'e-atx').replace(/_/g, ' ');
  const out: BoardFormFactor[] = [];
  let m: RegExpExecArray | null;
  FF_RE.lastIndex = 0;
  while ((m = FF_RE.exec(t))) {
    const ff = ffFromToken(m[1]);
    if (ff && !out.includes(ff)) out.push(ff);
  }
  return out;
}

/** The first board size named in the text. */
export function parseFormFactor(input: string | undefined): BoardFormFactor | undefined {
  return parseFormFactors(input)[0];
}

// ---------------------------------------------------------------------------
// CPUs
// ---------------------------------------------------------------------------

export interface CpuModelMatch {
  vendor: 'AMD' | 'Intel';
  /** "Ryzen 7", "Core i7", "Core Ultra 7" */
  tier?: string;
  /** "7800X3D", "14700K", "265K" */
  model: string;
  /** "Ryzen 7 7800X3D", "Core i7-14700K", "Core Ultra 7 265K" */
  family: string;
  generation?: number;
  mobile: boolean;
  /** Index in the text where the model was found. */
  index: number;
}

const MOBILE_AMD = /^(hs|hx|h|u)$/i;
const MOBILE_INTEL = /^(h|hx|hk|u|p|y|v)$/i;

function amdTierFromKnowledge(model: string): string | undefined {
  // Only used when the title omits "Ryzen N". Derived from AMD naming for desktop parts.
  const n = parseInt(model.slice(0, 4), 10);
  const digit = Math.floor((n % 1000) / 100);
  if (!lookupCpu(model)) return undefined;
  if (digit >= 9) return 'Ryzen 9';
  if (digit >= 7) return 'Ryzen 7';
  if (digit >= 4) return 'Ryzen 5';
  return 'Ryzen 3';
}

/** Find a CPU model in free text. */
export function parseCpuModel(input: string | undefined): CpuModelMatch | undefined {
  const t = lower(input);
  if (!t) return undefined;

  // AMD Ryzen: "Ryzen 7 7800X3D", "Ryzen 5 PRO 5650G", "Ryzen 9 9950X3D"
  let m = /ryzen\s*([3579])\s*(?:pro\s*)?(\d{4})\s?(x3d2|x3d|xt|x|gt|ge|g|f|e|hs|hx|h|u)?(?![a-z0-9])/i.exec(t);
  if (m) {
    const suffix = (m[3] ?? '').toUpperCase();
    const model = `${m[2]}${suffix}`;
    const series = Math.floor(parseInt(m[2], 10) / 1000) * 1000;
    return {
      vendor: 'AMD',
      tier: `Ryzen ${m[1]}`,
      model,
      family: `Ryzen ${m[1]} ${model}`,
      generation: series,
      mobile: MOBILE_AMD.test(suffix),
      index: m.index,
    };
  }

  // Intel Core Ultra (Series 2 desktop): "Core Ultra 7 265K", "Core Ultra 7 Desktop Processor 265K"
  m = /(?:core\s*)?ultra\s*([3579])(?:\s+(?:desktop|processor|series\s*2|cpu)){0,3}\s*-?\s*(\d{3})([a-z]{0,2})(?![a-z0-9])/i.exec(t);
  if (m && /core|intel/.test(t)) {
    const suffix = m[3].toUpperCase();
    const model = `${m[2]}${suffix}`;
    return {
      vendor: 'Intel',
      tier: `Core Ultra ${m[1]}`,
      model,
      family: `Core Ultra ${m[1]} ${model}`,
      generation: Math.floor(parseInt(m[2], 10) / 100) * 100,
      mobile: MOBILE_INTEL.test(suffix),
      index: m.index,
    };
  }

  // Intel Core i3/i5/i7/i9: "Core i7-14700K", "i5 12400F", "Core i9 Desktop Processor 14900K"
  m = /(?<![a-z0-9])(?:core\s*)?(i[3579])(?:\s+(?:desktop|processor|cpu)){0,2}\s*-?\s*(\d{4,5})([a-z]{0,2})(?![a-z0-9])/i.exec(t);
  if (m) {
    const suffix = m[3].toUpperCase();
    const digits = m[2];
    const model = `${digits}${suffix}`;
    const generation = digits.length === 5 ? parseInt(digits.slice(0, 2), 10) : parseInt(digits.slice(0, 1), 10);
    return {
      vendor: 'Intel',
      tier: `Core ${m[1]}`,
      model,
      family: `Core ${m[1]}-${model}`,
      generation,
      mobile: MOBILE_INTEL.test(suffix),
      index: m.index,
    };
  }

  // Bare model with vendor context, only for suffixed models in the knowledge table: "AMD 7800X3D".
  // Never after "RX"/"Radeon"/"DDR5" so "RX 7600" or "DDR5 5600" are not read as CPUs.
  if (/(?<![a-z])amd(?![a-z])/.test(t)) {
    m = /(?<![a-z0-9])(?<!rx\s?)(?<!radeon\s)(?<!ddr\d[\s-]?)([1-9]\d{3})(x3d|xt|x|gt|g|f)(?![a-z0-9])/i.exec(t);
    if (m) {
      const model = `${m[1]}${(m[2] ?? '').toUpperCase()}`;
      const tier = amdTierFromKnowledge(model);
      if (tier) {
        return {
          vendor: 'AMD',
          tier,
          model,
          family: `${tier} ${model}`,
          generation: Math.floor(parseInt(m[1], 10) / 1000) * 1000,
          mobile: false,
          index: m.index,
        };
      }
    }
  }
  return undefined;
}

/** Desktop socket from a parsed CPU model. Mobile chips have none. */
export function socketForCpu(cpu: CpuModelMatch): Socket | undefined {
  if (cpu.mobile) return undefined;
  if (cpu.vendor === 'AMD') {
    const series = cpu.generation ?? 0;
    if (series >= 7000 && series <= 9000) return 'AM5';
    if (series >= 1000 && series <= 5000) return 'AM4';
    return undefined;
  }
  if (cpu.tier?.startsWith('Core Ultra')) return cpu.generation === 200 ? 'LGA1851' : undefined;
  const gen = cpu.generation ?? 0;
  if (gen >= 12 && gen <= 14) return 'LGA1700';
  if (gen === 10 || gen === 11) return 'LGA1200';
  if (gen === 8 || gen === 9) return 'LGA1151';
  return undefined;
}

/** Integrated graphics by naming rule (AMD G/7000+ non-F, Intel non-F). */
export function cpuHasIntegratedGraphics(cpu: CpuModelMatch): boolean | undefined {
  const suffix = cpu.model.replace(/^\d+/, '').toUpperCase();
  if (cpu.vendor === 'Intel') return !suffix.includes('F');
  const series = cpu.generation ?? 0;
  if (series >= 7000) return !suffix.includes('F');
  if (series >= 1000) return suffix.startsWith('G');
  return undefined;
}

// ---------------------------------------------------------------------------
// GPUs
// ---------------------------------------------------------------------------

export interface GpuChipsetMatch {
  vendor: 'NVIDIA' | 'AMD' | 'Intel';
  chipset: string;
  index: number;
}

/** "GeForce RTX 4070 Ti SUPER" -> "RTX 4070 Ti Super"; "Radeon RX 7900XTX" -> "RX 7900 XTX" */
export function parseGpuChipset(input: string | undefined): GpuChipsetMatch | undefined {
  const t = lower(input);
  if (!t) return undefined;
  let m = /(?<![a-z0-9])(rtx|gtx)\s*-?\s*(\d{4})((?:\s*-?\s*(?:ti|super))*)(?![a-z0-9])/i.exec(t);
  if (m) {
    const mods = m[3].toLowerCase();
    const parts = [m[1].toUpperCase(), m[2]];
    if (/ti/.test(mods)) parts.push('Ti');
    if (/super/.test(mods)) parts.push('Super');
    return { vendor: 'NVIDIA', chipset: parts.join(' '), index: m.index };
  }
  m = /(?<![a-z0-9])(?:radeon\s*)?rx\s*-?\s*(\d{3,4})\s*(xtx|xt|gre)?(?![a-z0-9])/i.exec(t)
    ?? /(?<![a-z0-9])radeon\s+(\d{4})\s*(xtx|xt|gre)?(?![a-z0-9])/i.exec(t);
  if (m) {
    const parts = ['RX', m[1]];
    if (m[2]) parts.push(m[2].toUpperCase());
    return { vendor: 'AMD', chipset: parts.join(' '), index: m.index };
  }
  m = /(?<![a-z0-9])arc\s*-?\s*([ab])\s*-?\s*(\d{3})(?![a-z0-9])/i.exec(t);
  if (m) return { vendor: 'Intel', chipset: `Arc ${m[1].toUpperCase()}${m[2]}`, index: m.index };
  return undefined;
}

/** True for laptop GPU wording like "RTX 4060 Laptop GPU". */
export function isLaptopGpu(input: string | undefined): boolean {
  return /laptop\s+gpu|mobile\s+gpu|max-q/i.test(lower(input));
}

// ---------------------------------------------------------------------------
// RAM part numbers
// ---------------------------------------------------------------------------

/** Corsair / G.Skill / Kingston FURY part numbers as they appear inside titles. */
export const RAM_MPN_IN_TITLE = /(?<![A-Z0-9])(CM[A-Z]{1,3}\d{1,3}GX[345]M\d[A-Z]\d{4}[CZ]\d{2}[A-Z]?|C[PT](?:\d)?K?\d{1,2}G\d{2}C\d{2}[A-Z0-9]*|KVR\d{2}[NS]\d{2}[SD]\d(?:K\d)?\/\d{1,3}|F[345]-\d{4}[A-Z0-9]+GX\d[A-Z0-9-]*|F[345]-\d{4}C\d{2}[SDQ]-\d+G[A-Z]*|KF[345]\d{2}C\d{2}[A-Z0-9]*[-/]\d+)(?![A-Z0-9])/i;

/** Decode kit details from Corsair, G.Skill and Kingston FURY part numbers. */
export function decodeRamMpn(mpn: string | undefined): Partial<RamSpecs> {
  if (!mpn) return {};
  const p = mpn.toUpperCase().replace(/\s+/g, '');
  // Corsair: CMK32GX5M2B6000C36, CMH32GX5M2E6000C36W, CMK16GX4M2B3200C16
  let m = /^CM[A-Z]{1,3}(\d{1,3})GX([345])M(\d)[A-Z](\d{4})[CZ](\d{2})/.exec(p);
  if (m) {
    const total = parseInt(m[1], 10);
    const modules = parseInt(m[3], 10);
    return { totalGb: total, memoryType: `DDR${m[2]}` as MemoryType, modules, moduleGb: total / modules, speedMts: parseInt(m[4], 10), casLatency: parseInt(m[5], 10) };
  }
  // G.Skill: F5-6000J3038F16GX2-TZ5N, F4-3200C16D-32GVK
  m = /^F([345])-(\d{4})[A-Z]?(?:CL)?(\d{2})\d{0,4}[A-Z]?(\d{1,3})GX(\d)/.exec(p);
  if (m) {
    const each = parseInt(m[4], 10);
    const modules = parseInt(m[5], 10);
    return { memoryType: `DDR${m[1]}` as MemoryType, speedMts: parseInt(m[2], 10), casLatency: parseInt(m[3], 10), moduleGb: each, modules, totalGb: each * modules };
  }
  m = /^F([345])-(\d{4})C(\d{2})([SDQ])-(\d{1,3})G/.exec(p);
  if (m) {
    const modules = { S: 1, D: 2, Q: 4 }[m[4] as 'S' | 'D' | 'Q'];
    const total = parseInt(m[5], 10);
    return { memoryType: `DDR${m[1]}` as MemoryType, speedMts: parseInt(m[2], 10), casLatency: parseInt(m[3], 10), modules, totalGb: total, moduleGb: total / modules };
  }
  // Kingston FURY: KF560C30BBEK2-32, KF432C16BB1K2/32, KF556C40BB-16
  m = /^KF([345])(\d{2})C(\d{2})[A-Z0-9]*?(?:K(\d))?[-/](\d{1,3})$/.exec(p);
  if (m) {
    const modules = m[4] ? parseInt(m[4], 10) : 1;
    const total = parseInt(m[5], 10);
    return { memoryType: `DDR${m[1]}` as MemoryType, speedMts: parseInt(m[2], 10) * 100, casLatency: parseInt(m[3], 10), modules, totalGb: total, moduleGb: total / modules };
  }
  // Crucial: CP2K16G60C36U5B (Pro kit 2x16GB DDR5-6000 CL36), CT32G56C46S5 (single 32GB DDR5-5600 CL46)
  m = /^C[PT](?:(\d)K)?(\d{1,2})G(\d{2})C(\d{2})/.exec(p);
  if (m) {
    const modules = m[1] ? parseInt(m[1], 10) : 1;
    const each = parseInt(m[2], 10);
    return { modules, moduleGb: each, totalGb: modules * each, speedMts: parseInt(m[3], 10) * 100, casLatency: parseInt(m[4], 10) };
  }
  // Kingston ValueRAM: KVR32N22S8/16 (single), KVR32N22S8K2/32 (kit of 2); "S" after the speed means SO-DIMM
  m = /^KVR(\d{2})([NS])(\d{2})[SD]\d(?:K(\d))?\/(\d{1,3})$/.exec(p);
  if (m) {
    const modules = m[4] ? parseInt(m[4], 10) : 1;
    const total = parseInt(m[5], 10);
    return { speedMts: parseInt(m[1], 10) * 100, casLatency: parseInt(m[3], 10), modules, totalGb: total, moduleGb: total / modules, formFactor: m[2] === 'S' ? 'SODIMM' : 'DIMM' };
  }
  return {};
}

