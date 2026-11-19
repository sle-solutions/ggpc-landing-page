/**
 * Turn a raw retailer listing (title + spec label/value pairs) or a DB
 * component into a typed `NormalizedPart`.
 *
 * Order of trust for every field: the spec sheet, then the title, then the
 * knowledge tables. Fields filled from the title or knowledge are listed in
 * `part.inferred` so the UI can show "estimated".
 */
import { detectBrand, isChipMaker } from './brands';
import { brandFromMpn, extractMpns } from './mpn';
import { categorize } from './categorize';
import { lookupChipset, lookupCpu, lookupGpu } from './knowledge';
import { detectFactoryOc, detectGpuLine, detectRamSeries, detectStorageLine, displayCase, modelSegment } from './lines';
import {
  cpuHasIntegratedGraphics,
  decodeRamMpn,
  RAM_MPN_IN_TITLE,
  parseChipset,
  parseCpuModel,
  parseFormFactor,
  parseFormFactors,
  parseGpuChipset,
  parseMemoryType,
  parseMemoryTypes,
  parseSocket,
  parseSockets,
  socketForCpu,
} from './parsers';
import {
  SpecIndex,
  cleanText,
  lower,
  parseCapacityGb,
  parseInteger,
  parseLengthMm,
  parseNumber,
  parseWatts,
  uniq,
} from './text';
import {
  BOARD_SIZE_ORDER,
  isPartCategory,
  type BoardFormFactor,
  type CaseSpecs,
  type CoolerSpecs,
  type CpuSpecs,
  type GpuSpecs,
  type MemoryType,
  type MonitorSpecs,
  type MotherboardSpecs,
  type NormalizedPart,
  type PartCategory,
  type ProductInput,
  type PsuEfficiency,
  type PsuSpecs,
  type RamSpecs,
  type StorageSpecs,
} from './types';

interface Ctx {
  title: string;
  /** Lowercased title. */
  t: string;
  specs: SpecIndex;
  brand?: string;
  mpn?: string;
  model?: string;
  inferred: string[];
}

const MPN_LABELS = [
  'Manufacturer Part Number', 'Mfr Part Number', 'MPN', 'Part Number', 'Part No', 'partNumber',
  'Item model number', 'Model Number', 'Model No', 'Model Name', 'Model',
];

/** Resolve the category: explicit option, then the input's category, then the categoriser. */
function resolveCategory(input: ProductInput, forced?: PartCategory): PartCategory {
  if (forced) return forced;
  const hint = input.category === 'PSU' ? 'POWER_SUPPLY' : input.category;
  if (isPartCategory(hint)) return hint;
  return categorize(input);
}

export interface NormalizeOptions {
  /** Skip categorisation and parse as this category. */
  category?: PartCategory;
  quantity?: number;
}

/**
 * Normalise any product into a typed part. Pure: no DOM, no network.
 *
 * @example normalizePart({ title: 'AMD Ryzen 7 7800X3D 8-Core Desktop Processor' })
 *   -> { category: 'CPU', specs: { socket: 'AM5', tdpW: 120, cores: 8, ... } }
 */
export function normalizePart(input: ProductInput, options: NormalizeOptions = {}): NormalizedPart {
  const category = resolveCategory(input, options.category);
  const specs = new SpecIndex(input.specs);
  const title = cleanText(input.title);
  const brandField = input.brand ?? specs.get(['Brand', 'Manufacturer', 'manufacturer', 'Brand Name']);
  const mpns = extractMpns({ title, mpn: input.mpn, model: input.model, specs: input.specs });
  const mpnRaw = input.mpn ?? mpns[0]?.raw ?? specs.get(MPN_LABELS);
  const mpn = mpnRaw ? cleanText(mpnRaw) : undefined;
  const detected = detectBrand(title, brandField, category === 'CPU');
  const fromMpn = brandFromMpn(mpn);
  const ctx: Ctx = {
    title,
    t: lower(title),
    specs,
    // A GPU listing that only says "NVIDIA GeForce ..." plus a "GV-..." code is a Gigabyte card.
    brand: (!detected || (isChipMaker(detected) && category !== 'CPU')) && fromMpn && !isChipMaker(fromMpn) ? fromMpn : detected ?? fromMpn,
    mpn,
    model: input.model ? cleanText(input.model) : undefined,
    inferred: [],
  };
  const quantity = options.quantity;
  const base = { title, brand: ctx.brand, mpn: ctx.mpn, inferred: ctx.inferred, ...(quantity ? { quantity } : {}) };

  switch (category) {
    case 'CPU': {
      const s = parseCpu(ctx);
      return { ...base, category, specs: s, brand: s.vendor ?? ctx.brand, displayName: s.family ?? shortName(ctx) };
    }
    case 'GPU': {
      const s = parseGpu(ctx);
      const maker = ctx.brand && !isChipMaker(ctx.brand) ? ctx.brand : s.chipVendor === 'NVIDIA' && s.productLine === 'Founders Edition' ? 'NVIDIA' : ctx.brand;
      const name = [maker, s.chipset, s.productLine, s.factoryOc ? 'OC' : undefined].filter(Boolean).join(' ');
      return { ...base, category, specs: s, brand: maker, displayName: s.chipset ? name : shortName(ctx) };
    }
    case 'MOTHERBOARD':
      return { ...base, category, specs: parseMotherboard(ctx), displayName: shortName(ctx) };
    case 'RAM': {
      const s = parseRam(ctx);
      const kit = s.modules && s.moduleGb ? `${s.totalGb ?? s.modules * s.moduleGb}GB (${s.modules}x${s.moduleGb}GB)` : s.totalGb ? `${s.totalGb}GB` : undefined;
      const name = [ctx.brand, s.series, s.memoryType, kit, s.speedMts ? `${s.speedMts}` : undefined].filter(Boolean).join(' ');
      return { ...base, category, specs: s, displayName: s.memoryType || kit ? name : shortName(ctx) };
    }
    case 'STORAGE': {
      const s = parseStorage(ctx);
      const cap = s.capacityGb ? formatCapacity(s.capacityGb) : undefined;
      const name = [ctx.brand, s.line, cap].filter(Boolean).join(' ');
      return { ...base, category, specs: s, displayName: s.line ? name : shortName(ctx) };
    }
    case 'POWER_SUPPLY':
      return { ...base, category, specs: parsePsu(ctx), displayName: shortName(ctx) };
    case 'CASE':
      return { ...base, category, specs: parseCase(ctx), displayName: shortName(ctx) };
    case 'CPU_COOLER':
      return { ...base, category, specs: parseCooler(ctx), displayName: shortName(ctx) };
    case 'MONITOR':
      return { ...base, category, specs: parseMonitor(ctx), displayName: shortName(ctx) };
    default:
      return { ...base, category, specs: {}, displayName: shortName(ctx) };
  }
}

function shortName(ctx: Ctx): string {
  const seg = modelSegment(ctx.title);
  if (seg && seg.split(' ').length >= 1 && seg.length >= 2) {
    return [ctx.brand, displayCase(seg)].filter(Boolean).join(' ');
  }
  return ctx.title.length > 60 ? `${ctx.title.slice(0, 57)}...` : ctx.title;
}

export function formatCapacity(gb: number): string {
  return gb >= 1000 && gb % 1000 === 0 ? `${gb / 1000}TB` : gb >= 1000 ? `${(gb / 1000).toFixed(1)}TB` : `${gb}GB`;
}

const mark = (ctx: Ctx, field: string) => {
  if (!ctx.inferred.includes(field)) ctx.inferred.push(field);
};

// ---------------------------------------------------------------------------
// CPU
// ---------------------------------------------------------------------------

const WORD_CORES: Record<string, number> = { dual: 2, quad: 4, hexa: 6, octa: 8, deca: 10, dodeca: 12 };

function parseCpu(ctx: Ctx): CpuSpecs {
  const { specs, t } = ctx;
  const s: CpuSpecs = {};
  const modelText = [ctx.brand, ctx.title, ctx.model, specs.get(['CPU Model', 'Processor', 'Processor Model', 'Model Name', 'Processor Type', 'Processor Name'])]
    .filter(Boolean)
    .join(' | ');
  const m = parseCpuModel(ctx.title) ?? parseCpuModel(modelText);
  if (m) {
    s.vendor = m.vendor;
    s.family = m.family;
    s.model = m.model;
    s.tier = m.tier;
    s.generation = m.generation;
    if (m.mobile) s.mobile = true;
  } else if (ctx.brand === 'AMD' || ctx.brand === 'Intel') {
    s.vendor = ctx.brand;
  }
  const info = lookupCpu(s.model);

  // Cores / threads
  s.cores = parseInteger(specs.get(['Number of Cores', 'CPU Cores', 'Cores', '# of CPU Cores', 'Total Cores', 'Core Count', 'Number of CPU Cores'], [/^(?:numberof)?(?:cpu)?cores?$/]));
  if (!s.cores) {
    const c = /(?<![a-z0-9])(\d{1,2})[\s-]*cores?(?![a-z])/.exec(t) ?? undefined;
    const w = /(?<![a-z])(dual|quad|hexa|octa|deca|dodeca)[\s-]*core/.exec(t);
    s.cores = c ? parseInt(c[1], 10) : w ? WORD_CORES[w[1]] : undefined;
    if (s.cores) mark(ctx, 'cores');
  }
  if (!s.cores && info) {
    s.cores = info.cores;
    mark(ctx, 'cores');
  }
  s.threads = parseInteger(specs.get(['Number of Threads', 'Threads', '# of Threads', 'Total Threads', 'Thread Count']));
  if (!s.threads) {
    const th = /(\d{1,2})[\s-]*threads?/.exec(t);
    s.threads = th ? parseInt(th[1], 10) : info?.threads;
    if (s.threads) mark(ctx, 'threads');
  }

  // Socket: the model naming rule is definitive, then spec sheet, then title.
  const ruleSocket = m ? socketForCpu(m) : undefined;
  const specSocket = parseSocket(specs.get(['CPU Socket', 'Socket', 'Processor Socket', 'Socket Type', 'Compatible Socket', 'Package']));
  s.socket = ruleSocket ?? specSocket ?? parseSocket(ctx.title);
  if (!specSocket && s.socket) mark(ctx, 'socket');

  // TDP
  s.tdpW = parseWatts(specs.get(['TDP', 'Default TDP', 'Thermal Design Power', 'Processor Base Power', 'Base Power', 'Wattage', 'Power Consumption'], [/tdp/]), 10, 400);
  // Same typo guard as GPUs: a seller TDP wildly off the vendor figure is dropped. The range is
  // wide because Intel lists base power (125 W) and turbo power (253 W) for the same chip.
  if (s.tdpW && info?.tdpW && (s.tdpW < info.tdpW * 0.4 || s.tdpW > info.tdpW * 2.5)) s.tdpW = undefined;
  if (!s.tdpW) {
    const tt = /(\d{2,3})\s*w(?:att)?s?\s*tdp|tdp\s*(?:of\s*)?:?\s*(\d{2,3})\s*w/.exec(t);
    if (tt) {
      s.tdpW = parseInt(tt[1] ?? tt[2], 10);
      mark(ctx, 'tdpW');
    } else if (info) {
      s.tdpW = info.tdpW;
      mark(ctx, 'tdpW');
    }
  }

  // Integrated graphics
  const gfx = specs.get(['Graphics Model', 'Integrated Graphics', 'Processor Graphics', 'Graphics', 'Graphics Coprocessor', 'Integrated GPU', 'Graphics Card Description']);
  if (gfx && /discrete|not\s+included|(?<![a-z])none(?![a-z])|^no$|n\/a|required/i.test(gfx)) s.integratedGraphics = false;
  else if (gfx && /radeon|uhd|iris|intel\s+graphics|^yes$|integrated|graphics/i.test(gfx)) s.integratedGraphics = true;
  else if (m) {
    s.integratedGraphics = cpuHasIntegratedGraphics(m);
    if (s.integratedGraphics !== undefined) mark(ctx, 'integratedGraphics');
  }

  // Packaging and cooler
  const mpn = (ctx.mpn ?? '').toUpperCase();
  if (/(?<![a-z])(?:tray|oem|mpk)(?![a-z])/.test(t) || /^100-0\d{8}(?:[-\s]?TRAY)?$/.test(mpn) || /^CM\d{8,}/.test(mpn)) s.packaging = 'tray';
  else if (/(?<![a-z])(?:box|boxed|pib|retail)(?![a-z])/.test(t) || /^100-1\d{8}(?:BOX|WOF|MPK)?$/.test(mpn) || /^BX\d/.test(mpn)) s.packaging = 'box';
  if (/without\s+(?:a\s+)?(?:cooler|fan|heatsink)|no\s+cooler|cooler\s+not\s+included|(?<![a-z])wof(?![a-z])/.test(t) || /WOF$/.test(mpn)) s.boxedCooler = false;
  else if (/with\s+(?:[a-z0-9]+\s+){0,3}cooler|wraith|cooler\s+included|laminar/.test(t)) s.boxedCooler = true;
  else if (s.packaging === 'tray') s.boxedCooler = false;
  else if (info?.cooler !== undefined) {
    s.boxedCooler = info.cooler;
    mark(ctx, 'boxedCooler');
  } else if (m?.vendor === 'Intel' && m.tier?.startsWith('Core i') && (m.generation ?? 0) >= 12 && !/K/.test(m.model)) {
    // Intel boxed 12th-14th gen non-K chips ship with a Laminar cooler (Intel ARK "Thermal Solution").
    s.boxedCooler = true;
    mark(ctx, 'boxedCooler');
  } else if (m?.vendor === 'Intel' && /K/.test(m.model)) {
    s.boxedCooler = false;
    mark(ctx, 'boxedCooler');
  }

  const base = parseNumber(specs.get(['Base Clock', 'CPU Speed', 'Processor Speed', 'Base Clock Speed', 'Base Frequency', 'baseClock']));
  if (base && base < 10) s.baseClockGhz = base;
  const boost = parseNumber(specs.get(['Max Boost Clock', 'Boost Clock', 'Max Turbo Frequency', 'Boost Clock Speed', 'Maximum Turbo Frequency', 'boostClock']))
    ?? parseNumber(/up\s+to\s+(\d(?:\.\d+)?)\s*ghz/.exec(t)?.[1]);
  if (boost && boost < 10) s.boostClockGhz = boost;
  return s;
}

// ---------------------------------------------------------------------------
// GPU
// ---------------------------------------------------------------------------

const VRAM_SIZES = new Set([2, 3, 4, 6, 8, 10, 11, 12, 16, 20, 24, 32, 48]);

function parseConnectors(text: string): string[] {
  const t = lower(text);
  const out: string[] = [];
  if (/12v[\s-]?2x6/.test(t)) out.push('12V-2x6');
  else if (/12vhpwr|16[\s-]?pin/.test(t)) out.push('12VHPWR');
  let rest = t.replace(/12v[\s-]?2x6|12vhpwr|16[\s-]?pin/g, ' ');
  const plus = /(?<![0-9])([68])\s*\+\s*([68])(?:\s*\+\s*([68]))?[\s-]*pin/.exec(rest);
  if (plus) {
    for (const d of [plus[1], plus[2], plus[3]]) if (d) out.push(`${d}-pin`);
    rest = rest.replace(plus[0], ' ');
  }
  const counted = /(?<![0-9])([1-4])\s*x\s*([68])[\s-]*pin/g;
  let m: RegExpExecArray | null;
  while ((m = counted.exec(rest))) for (let i = 0; i < parseInt(m[1], 10); i++) out.push(`${m[2]}-pin`);
  rest = rest.replace(counted, ' ');
  const single = /(?<![0-9+x])\s?([68])[\s-]*pin(?!\s*\+)/g;
  while ((m = single.exec(rest))) {
    if (!/(?:triple|dual|twin|three|two)\s*$/.test(rest.slice(Math.max(0, m.index - 8), m.index))) out.push(`${m[1]}-pin`);
  }
  if (/(?:dual|twin|two)\s*8[\s-]*pin/.test(rest)) out.push('8-pin', '8-pin');
  if (/(?:triple|three)\s*8[\s-]*pin/.test(rest)) out.push('8-pin', '8-pin', '8-pin');
  return out;
}

function parseGpu(ctx: Ctx): GpuSpecs {
  const { specs, t } = ctx;
  const s: GpuSpecs = {};
  const chipSpec = specs.get(['Graphics Coprocessor', 'GPU', 'Chipset', 'Graphics Chipset', 'Graphics Processor', 'GPU Model', 'Graphics Card Model', 'GPU Series', 'Graphics Processing Unit']);
  const chip = parseGpuChipset(ctx.title) ?? parseGpuChipset(chipSpec) ?? parseGpuChipset(ctx.model);
  if (chip) {
    s.chipVendor = chip.vendor;
    s.chipset = chip.chipset;
  }

  // VRAM
  const vramSpec = specs.get(['Graphics Card Ram Size', 'Graphics RAM Size', 'Graphic Memory', 'Graphics Memory', 'Graphics Memory Size', 'Video Memory', 'Memory Size', 'VRAM', 'Standard Memory', 'Memory', 'vram', 'Graphics Card Memory']);
  const vram = parseCapacityGb(vramSpec, true);
  if (vram && vram >= 1 && vram <= 48) s.vramGb = Math.round(vram);
  if (!s.vramGb) {
    const gb = /(?<![a-z0-9])(\d{1,2})\s*gb(?![a-z0-9])/.exec(t) ?? /(?<![a-z0-9-])(\d{1,2})g(?:d)?(?![a-z0-9])/.exec(t) ?? /-(\d{1,2})gd/.exec(t);
    const v = gb ? parseInt(gb[1], 10) : undefined;
    if (v && VRAM_SIZES.has(v)) {
      s.vramGb = v;
      mark(ctx, 'vramGb');
    }
  }

  const memSpec = specs.get(['Graphics RAM Type', 'Memory Type', 'Video Memory Type', 'Graphics Memory Type', 'Memory Interface Type']);
  const mem = /(?<![a-z])(g(?:ddr|drr)\d(?:x)?|hbm\d?e?)(?![a-z0-9])/i.exec(`${memSpec ?? ''} ${t}`);
  if (mem) s.memoryType = mem[1].toUpperCase().replace('GDRR', 'GDDR');

  // Length
  const lenSpec = specs.get(['Card Length', 'Graphics Card Length', 'Length', 'Max Length', 'Product Length', 'Board Length', 'Item Length', 'Card Dimensions (L x W x H)'], [/cardlength|^length/]);
  const len = parseLengthMm(lenSpec, 'max');
  if (len && len >= 100 && len <= 450) {
    s.lengthMm = len;
    s.lengthSource = 'spec';
  } else {
    const titleLen = /(\d{3})\s*mm\s*(?:long|length)|length[:\s]*(\d{3})\s*mm/.exec(t);
    const dims = specs.get(['Product Dimensions', 'Item Dimensions', 'Item dimensions L x W x H', 'Dimensions', 'Card Dimensions'], [/^(?:product|item)dimensions/], /package|packing|shipping|box/);
    const dimLen = parseLengthMm(dims, 'max');
    if (titleLen) {
      s.lengthMm = parseInt(titleLen[1] ?? titleLen[2], 10);
      s.lengthSource = 'title';
      mark(ctx, 'lengthMm');
    } else if (dimLen && dimLen >= 150 && dimLen <= 400) {
      s.lengthMm = dimLen;
      s.lengthSource = 'dimensions';
      mark(ctx, 'lengthMm');
    }
  }

  // Power
  const power = parseWatts(specs.get(['Total Graphics Power', 'Graphics Card Power', 'Board Power', 'Typical Board Power', 'Total Board Power', 'TGP', 'TBP', 'TDP', 'Power Consumption', 'Max Power Consumption', 'Power Draw', 'Wattage']), 30, 700);
  const info = lookupGpu(s.chipset);
  // Marketplace sellers type specs by hand ("TDP: 65 W" on an RX 9070 XT). When the reference
  // board power is known, a seller value far below it (or far above even a factory overclock)
  // is treated as a typo and the vendor figure wins.
  const plausible = (w: number) => !info || (w >= info.boardPowerW * 0.6 && w <= info.boardPowerW * 1.6);
  if (power && plausible(power)) {
    s.boardPowerW = power;
    s.boardPowerSource = 'spec';
  } else if (info) {
    s.boardPowerW = info.boardPowerW;
    s.boardPowerSource = 'knowledge';
    mark(ctx, 'boardPowerW');
  }
  const rec = parseWatts(specs.get(['Recommended PSU', 'Recommended Power Supply', 'Required System Power', 'Minimum System Power Requirement', 'System Power Requirement', 'Recommended System Power', 'Suggested PSU', 'PSU Requirement', 'Minimum PSU'], [/recommendedpsu|systempower|psurequire/]), 200, 2000);
  const recTitle = /(\d{3,4})\s*w\s*(?:psu|power\s+supply)\s*(?:recommended|required)|recommended\s+(?:psu|power\s+supply)[:\s]*(\d{3,4})/.exec(t);
  if (rec) s.recommendedPsuW = rec;
  else if (recTitle) {
    s.recommendedPsuW = parseInt(recTitle[1] ?? recTitle[2], 10);
    mark(ctx, 'recommendedPsuW');
  } else if (info?.recommendedPsuW) {
    s.recommendedPsuW = info.recommendedPsuW;
    mark(ctx, 'recommendedPsuW');
  }

  const connSpec = specs.get(['Power Connectors', 'Power Connector', 'Power Input', 'Supplementary Power Connectors', 'Power Connection', 'External Power', 'Power Supply Connector', 'Power Connectors Required'], [/powerconnect/]);
  const connectors = parseConnectors(connSpec ?? '');
  const titleConnectors = connectors.length ? [] : parseConnectors(t);
  s.powerConnectors = connectors.length ? connectors : titleConnectors.length ? titleConnectors : undefined;
  if (s.powerConnectors) s.uses16Pin = s.powerConnectors.some((c) => c === '12VHPWR' || c === '12V-2x6');

  const brand = ctx.brand && !isChipMaker(ctx.brand) ? ctx.brand : ctx.brand === 'NVIDIA' ? 'NVIDIA' : undefined;
  s.productLine = detectGpuLine(brand, ctx.title);
  s.factoryOc = detectFactoryOc(ctx.title, ctx.mpn);
  return s;
}

// ---------------------------------------------------------------------------
// Motherboard
// ---------------------------------------------------------------------------

function parseMotherboard(ctx: Ctx): MotherboardSpecs {
  const { specs, t } = ctx;
  const s: MotherboardSpecs = {};
  const chipSpec = specs.get(['Chipset', 'Chipset Type', 'Motherboard Chipset', 'Chipset Model']);
  const chip = parseChipset(ctx.title) ?? parseChipset(chipSpec) ?? parseChipset(ctx.model);
  const info = lookupChipset(chip?.chipset);
  if (chip) s.chipset = chip.chipset;

  const specSocket = parseSocket(specs.get(['CPU Socket', 'Socket', 'Processor Socket', 'Socket Type', 'CPU Socket Type', 'Compatible Processor Socket']));
  s.socket = info?.socket ?? specSocket ?? parseSocket(ctx.title);
  if (!specSocket && s.socket) mark(ctx, 'socket');

  const memSpec = specs.get(['Memory Type', 'Computer Memory Type', 'RAM Type', 'Memory Standard', 'Supported Memory Type', 'Memory Technology', 'Memory Support', 'ramType']);
  const titleMem = parseMemoryTypes(t);
  if (/(?<![a-z0-9])d4(?![a-z0-9])/.test(t)) titleMem.push('DDR4');
  if (/(?<![a-z0-9])d5(?![a-z0-9])/.test(t)) titleMem.push('DDR5');
  const titleOne = uniq(titleMem).length === 1 ? titleMem[0] : undefined;
  if (info && info.memory.length === 1) {
    s.memoryType = info.memory[0];
    if (!parseMemoryType(memSpec)) mark(ctx, 'memoryType');
  } else {
    s.memoryType = parseMemoryType(memSpec) ?? titleOne;
    if (!parseMemoryType(memSpec) && s.memoryType) mark(ctx, 'memoryType');
  }

  const ffSpec = parseFormFactor(specs.get(['Form Factor', 'Motherboard Form Factor', 'Board Form Factor', 'Mainboard Form Factor', 'formFactor', 'Size']));
  s.formFactor = ffSpec ?? chip?.sizeHint ?? parseFormFactor(ctx.title);
  if (!ffSpec && s.formFactor) mark(ctx, 'formFactor');

  s.memorySlots = parseInteger(specs.get(['Number of Memory Slots', 'Memory Slots', 'Number of RAM Slots', 'RAM Slots', 'DIMM Slots', 'Number of DIMM Slots', 'Memory Slots Available', 'ramSlots', 'Memory Slot']));
  if (s.memorySlots !== undefined && (s.memorySlots < 1 || s.memorySlots > 8)) s.memorySlots = undefined;
  if (!s.memorySlots) {
    const ds = /(?<![0-9])([1-8])\s*x\s*(?:ddr[45]\s*)?(?:u?dimm|memory\s+slots?|ram\s+slots?)/.exec(t);
    if (ds) {
      s.memorySlots = parseInt(ds[1], 10);
      mark(ctx, 'memorySlots');
    } else if (s.formFactor === 'ITX') {
      s.memorySlots = 2;
      s.memorySlotsInferred = true;
      mark(ctx, 'memorySlots');
    }
  }

  s.m2Slots = parseInteger(specs.get(['M.2 Slots', 'Number of M.2 Slots', 'M.2 Slot', 'm2Slots', 'M.2 Connectors', 'M.2 Sockets']));
  if (!s.m2Slots) {
    const m2 = /(?<![0-9])([1-6])\s*x\s*m\.?2/.exec(t);
    const word = /(dual|triple|quad)\s+m\.?2/.exec(t);
    if (m2 || word) {
      s.m2Slots = m2 ? parseInt(m2[1], 10) : { dual: 2, triple: 3, quad: 4 }[word![1] as 'dual' | 'triple' | 'quad'];
      mark(ctx, 'm2Slots');
    }
  }

  const wifiSpec = specs.get(['Wireless', 'Wireless Communication Technology', 'WiFi', 'Wi-Fi', 'wifi', 'WLAN', 'Wireless LAN']);
  if (wifiSpec) s.wifi = !/^(?:no|none|n\/a|not\s+supported)$/i.test(wifiSpec.trim()) && !/^false$/i.test(wifiSpec.trim());
  else if (/wi-?fi|wireless|(?<![a-z0-9])ax(?![a-z0-9])|802\.11/.test(t)) s.wifi = true;

  const maxMem = parseCapacityGb(specs.get(['Maximum Memory Supported', 'Max Memory', 'maxRam', 'Maximum Supported Memory', 'Max Memory Capacity']), true);
  if (maxMem) s.maxMemoryGb = maxMem;
  if (/(?<![a-z])btf(?![a-z])|project\s+zero|back[\s-]?connect/.test(t)) s.backConnect = true;
  return s;
}

// ---------------------------------------------------------------------------
// RAM
// ---------------------------------------------------------------------------

function parseRam(ctx: Ctx): RamSpecs {
  const { specs, t } = ctx;
  const s: RamSpecs = {};
  const typeSpec = specs.get(['Computer Memory Type', 'Memory Type', 'RAM Type', 'Type', 'Memory Technology', 'Memory Standard', 'type']);
  s.memoryType = parseMemoryType(typeSpec) ?? parseMemoryType(t);
  if (!parseMemoryType(typeSpec) && s.memoryType) mark(ctx, 'memoryType');

  const ffSpec = lower(specs.get(['Form Factor', 'Memory Form Factor', 'Module Type', 'formFactor']));
  if (/so-?dimm|laptop|notebook/.test(ffSpec) || /so-?dimm|(?:laptop|notebook)\s+(?:memory|ram)/.test(t)) s.formFactor = 'SODIMM';
  else if (/u?dimm|desktop/.test(ffSpec) || /(?<![a-z])u?dimm(?![a-z])|desktop\s+(?:memory|ram)/.test(t)) s.formFactor = 'DIMM';

  // Kit layout
  let m = /(\d{1,3})\s*gb\s*\(\s*(\d)\s*x\s*(\d{1,3})\s*gb\s*\)/.exec(t);
  if (m) {
    s.totalGb = parseInt(m[1], 10);
    s.modules = parseInt(m[2], 10);
    s.moduleGb = parseInt(m[3], 10);
  } else if ((m = /(?<![0-9])(\d)\s*x\s*(\d{1,3})\s*gb/.exec(t))) {
    s.modules = parseInt(m[1], 10);
    s.moduleGb = parseInt(m[2], 10);
  } else if ((m = /(\d{1,3})\s*gb\s*x\s*(\d)(?![0-9])/.exec(t))) {
    s.moduleGb = parseInt(m[1], 10);
    s.modules = parseInt(m[2], 10);
  }
  if (!s.modules) {
    const kit = /kit\s+of\s+(\d)|(?<![0-9])(\d)\s*(?:-\s*)?(?:pcs|pieces?|sticks?|modules?)(?![a-z])/.exec(t);
    const modSpec = specs.get(['Number of Modules', 'Modules', 'Kit Configuration', 'Memory Configuration', 'Number of Pieces', 'Number of Sticks', 'modules']);
    const modFromSpec = modSpec ? /(\d)\s*x\s*(\d{1,3})\s*gb/i.exec(modSpec) : null;
    if (modFromSpec) {
      s.modules = parseInt(modFromSpec[1], 10);
      s.moduleGb = parseInt(modFromSpec[2], 10);
    } else if (parseInteger(modSpec)) s.modules = parseInteger(modSpec);
    else if (kit) s.modules = parseInt(kit[1] ?? kit[2], 10);
    else if (/dual[\s-]?channel/.test(t) && /(?<![a-z])kit(?![a-z])/.test(t)) {
      s.modules = 2; // a "dual channel kit" is two sticks
      mark(ctx, 'modules');
    } else if (/single\s+(?:memory\s+)?module|single\s+(?:desktop\s+|laptop\s+)?memory|\(\s*1\s*x\s*\d+\s*gb\s*\)/.test(t)) {
      s.modules = 1;
      mark(ctx, 'modules');
    }
  }
  const totalSpec = parseCapacityGb(specs.get(['Memory Storage Capacity', 'Computer Memory Size', 'RAM Size', 'Capacity', 'Total Capacity', 'Memory Size', 'Memory Capacity', 'RAM Memory Installed Size', 'capacity']), true);
  if (!s.totalGb && totalSpec && totalSpec >= 2) s.totalGb = Math.round(totalSpec);
  if (!s.totalGb) {
    const first = /(?<![0-9x])(\d{1,3})\s*gb(?![a-z0-9])/.exec(t.replace(/\(\s*\d\s*x\s*\d+\s*gb\s*\)|\d\s*x\s*\d+\s*gb/g, ' '));
    if (first) s.totalGb = parseInt(first[1], 10);
    else if (s.modules && s.moduleGb) s.totalGb = s.modules * s.moduleGb;
  }
  if (s.totalGb && s.modules && !s.moduleGb && s.totalGb % s.modules === 0) s.moduleGb = s.totalGb / s.modules;
  if (s.totalGb && s.moduleGb && !s.modules && s.totalGb % s.moduleGb === 0) s.modules = s.totalGb / s.moduleGb;

  // Speed
  const speedSpec = specs.get(['Memory Speed', 'Speed', 'Memory Clock Speed', 'Data Transfer Rate', 'Memory Frequency', 'Frequency', 'speed', 'Tested Speed']);
  const sp = parseNumber(speedSpec);
  if (sp && sp >= 1333 && sp <= 12000) s.speedMts = Math.round(sp);
  if (!s.speedMts) {
    const ts = /(\d{4,5})\s*(?:mhz|mt\/?s)/.exec(t) ?? /ddr[345][\s-](\d{4,5})(?![0-9])/.exec(t);
    const pc = /pc[345][\s-](\d{5})/.exec(t);
    if (ts) s.speedMts = parseInt(ts[1], 10);
    else if (pc) s.speedMts = Math.round(parseInt(pc[1], 10) / 8 / 100) * 100;
  }

  // CAS latency
  const casSpec = specs.get(['CAS Latency', 'Latency', 'CL', 'Timing', 'Memory Timing', 'latency']);
  const cs = casSpec ? /(?:cl|c)?\s*(\d{1,2})/i.exec(casSpec) : null;
  if (cs) s.casLatency = parseInt(cs[1], 10);
  if (!s.casLatency) {
    const tc = /(?<![a-z0-9])(?:cl|cas|c)[\s-]?(\d{2})(?![0-9])/.exec(t);
    if (tc) s.casLatency = parseInt(tc[1], 10);
  }

  // Fill gaps from the part number
  const dec = decodeRamMpn(ctx.mpn);
  const decTitle = Object.keys(dec).length ? {} : decodeRamMpn(RAM_MPN_IN_TITLE.exec(ctx.title)?.[1]);
  for (const [k, v] of Object.entries({ ...decTitle, ...dec })) {
    const key = k as keyof RamSpecs;
    if (s[key] === undefined && v !== undefined) {
      (s as Record<string, unknown>)[key] = v;
      mark(ctx, key);
    }
  }

  s.rgb = /(?<![a-z])a?rgb(?![a-z])/.test(t) ? true : undefined;
  s.series = detectRamSeries(ctx.title);
  return s;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function parseStorage(ctx: Ctx): StorageSpecs {
  const { specs, t } = ctx;
  const s: StorageSpecs = {};
  const capSpec = parseCapacityGb(specs.get(['Capacity', 'Storage Capacity', 'Hard Disk Size', 'Digital Storage Capacity', 'Memory Storage Capacity', 'Hard Drive Size', 'SSD Capacity', 'capacity_storage', 'capacity', 'Hard Disk Capacity']));
  if (capSpec && capSpec >= 60) s.capacityGb = Math.round(capSpec);
  if (!s.capacityGb) {
    const re = /(?<![0-9.])(\d+(?:\.\d+)?)\s*(tb|gb)(?![a-z0-9/])(?!\s*(?:cache|dram|sdram|lpddr))/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t))) {
      const before = t.slice(Math.max(0, m.index - 12), m.index);
      if (/cache|dram|buffer/.test(before)) continue;
      const gb = parseFloat(m[1]) * (m[2] === 'tb' ? 1000 : 1);
      if (gb >= 60) {
        s.capacityGb = Math.round(gb);
        mark(ctx, 'capacityGb');
        break;
      }
    }
  }

  const ifaceText = lower([
    specs.get(['Hard Disk Interface', 'Interface', 'Hardware Interface', 'Connectivity Technology', 'Hard Disk Description', 'Type', 'type', 'Bus Type', 'interface']),
    t,
  ].filter(Boolean).join(' | '));
  const isSsd = /ssd|solid\s*state|m2_nvme|nvme/.test(ifaceText);
  if (/nvme|m2_nvme|pcie|pci\s*express/.test(ifaceText)) s.kind = 'NVMe SSD';
  else if (isSsd && /sata|2\.5\s*(?:"|inch|-inch|in\b)|m2_sata/.test(ifaceText)) s.kind = 'SATA SSD';
  else if (!isSsd && /(?<![a-z])hdd(?![a-z])|hard\s+(?:disk\s+)?drive|\d{4,5}\s*rpm|mechanical/.test(ifaceText)) s.kind = 'HDD';
  else if (/(?<![a-z])ssd(?![a-z])/.test(ifaceText) && /^ssd$/i.test(specs.get(['type', 'Type']) ?? '')) s.kind = 'SATA SSD';

  const gen = /pcie\s*(?:gen\s*)?([345])(?:\.0)?(?![0-9])|gen\s*([345])(?:\s*x4)?(?![0-9])|pci\s*express\s*([345])\.0/.exec(ifaceText);
  if (gen && s.kind === 'NVMe SSD') s.pcieGen = parseInt(gen[1] ?? gen[2] ?? gen[3], 10) as 3 | 4 | 5;

  const ffText = lower([specs.get(['Form Factor', 'formFactor', 'Hard Disk Form Factor', 'Size']), t].filter(Boolean).join(' | '));
  if (/2280/.test(ffText)) s.formFactor = 'M.2 2280';
  else if (/2242/.test(ffText)) s.formFactor = 'M.2 2242';
  else if (/2230/.test(ffText)) s.formFactor = 'M.2 2230';
  else if (/m\.?2(?![0-9])/.test(ffText)) s.formFactor = 'M.2';
  else if (/2\.5\s*(?:"|''|inch|-inch|in\b)/.test(ffText)) s.formFactor = '2.5"';
  else if (/3\.5\s*(?:"|''|inch|-inch|in\b)/.test(ffText)) s.formFactor = '3.5"';
  else if (s.kind === 'NVMe SSD') {
    s.formFactor = 'M.2';
    mark(ctx, 'formFactor');
  }
  if (/without\s+heat\s*sink|no\s+heat\s*sink/.test(t)) s.heatsink = false;
  else if (/heat\s*sink/.test(t)) s.heatsink = true;
  const rpm = /(\d{4,5})\s*rpm/.exec(ifaceText);
  if (rpm) s.rpm = parseInt(rpm[1], 10);
  s.line = detectStorageLine(ctx.title);
  return s;
}

// ---------------------------------------------------------------------------
// Power supply
// ---------------------------------------------------------------------------

const EFFICIENCY: Record<string, PsuEfficiency> = {
  titanium: 'TITANIUM',
  platinum: 'PLATINUM',
  gold: 'GOLD',
  silver: 'SILVER',
  bronze: 'BRONZE',
  white: 'STANDARD',
  standard: 'STANDARD',
};

function parsePsu(ctx: Ctx): PsuSpecs {
  const { specs, t } = ctx;
  const s: PsuSpecs = {};
  const wSpec = parseWatts(specs.get(['Wattage', 'Output Wattage', 'Maximum Power', 'Max Power', 'Output Power', 'Rated Power', 'Continuous Power', 'Power Output', 'Total Power', 'wattage', 'Power']), 150, 2500);
  if (wSpec) s.wattage = wSpec;
  else {
    const re = /(?<![0-9a-z])(\d{3,4})\s*w(?:att)?s?(?![a-z0-9])/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t))) {
      const before = t.slice(Math.max(0, m.index - 20), m.index);
      const after = t.slice(m.index + m[0].length, m.index + m[0].length + 12);
      if (/12v|pcie|gpu|cable|hpwr|2x6/.test(before) || /cable|connector|gpu|12v/.test(after)) continue;
      const w = parseInt(m[1], 10);
      if (w >= 200 && w <= 2500) {
        s.wattage = w;
        mark(ctx, 'wattage');
        break;
      }
    }
    if (!s.wattage) {
      const model = /(?<![a-z0-9])(?:rm|rme|rmx|hx|hxi|sf|cx|gx-?|px-?|tx-?|a|c|ud|mwe\s*(?:gold\s*)?|v|pq|gf)(\d{3,4})(?:[a-z]{0,3})(?![0-9])/.exec(t);
      const w = model ? parseInt(model[1], 10) : 0;
      if (w >= 450 && w <= 1600 && w % 50 === 0) {
        s.wattage = w;
        mark(ctx, 'wattage');
      }
    }
  }

  const effText = lower([specs.get(['Efficiency', '80 Plus Certification', '80 PLUS Rating', 'Certification', 'Efficiency Rating', 'efficiency', 'Energy Efficiency']), t].filter(Boolean).join(' | '));
  const eff = /80\s*(?:\+|plus)\s*(titanium|platinum|gold|silver|bronze|white|standard)?|(?<![a-z])(titanium|platinum|gold|silver|bronze)(?![a-z])/.exec(effText);
  if (eff) s.efficiency = EFFICIENCY[eff[1] ?? eff[2] ?? 'standard'];

  const modText = lower([specs.get(['Modular', 'Modularity', 'Modular Design', 'Cable Management', 'Modular Type', 'modular']), t].filter(Boolean).join(' | '));
  if (/fully[\s-]?modular|full[\s-]?modular/.test(modText)) s.modularity = 'full';
  else if (/semi[\s-]?modular/.test(modText)) s.modularity = 'semi';
  else if (/non[\s-]?modular|not\s+modular/.test(modText)) s.modularity = 'non';

  const all = lower([t, specs.allText()].join(' | '));
  if (/atx\s*3\.1|atx3\.1/.test(all)) s.atxVersion = '3.1';
  else if (/atx\s*3(?:\.0)?(?![.\d])|atx3\.0/.test(all)) s.atxVersion = '3.0';
  else if (/atx\s*(?:12v\s*)?(?:v\s*)?2\.\d/.test(all)) s.atxVersion = '2';
  if (/12v[\s-]?2x6|12vhpwr|16[\s-]?pin|pcie\s*5\.[01]|pcie5/.test(all)) s.native16Pin = true;

  if (/sfx-?l(?![a-z])/.test(all)) s.formFactor = 'SFX-L';
  else if (/(?<![a-z])sfx(?![a-z])/.test(all)) s.formFactor = 'SFX';
  else if (/(?<![a-z])atx(?![a-z])/.test(all)) s.formFactor = 'ATX';
  return s;
}

// ---------------------------------------------------------------------------
// Case
// ---------------------------------------------------------------------------

/** "ATX" support implies the smaller standard sizes too (shared mounting holes). */
function expandDown(ff: BoardFormFactor): BoardFormFactor[] {
  return BOARD_SIZE_ORDER.slice(BOARD_SIZE_ORDER.indexOf(ff));
}

function parseCase(ctx: Ctx): CaseSpecs {
  const { specs, t } = ctx;
  const s: CaseSpecs = {};
  if (/full[\s-]?tower/.test(t)) s.tower = 'full';
  else if (/mid[\s-]?tower/.test(t)) s.tower = 'mid';
  else if (/mini[\s-]?tower|micro[\s-]?tower/.test(t)) s.tower = 'mini';
  else if (/sff|small\s+form\s+factor/.test(t)) s.tower = 'sff';

  const mbSpec = specs.get(['Motherboard Compatibility', 'Compatible Motherboard', 'Compatible Motherboards', 'Motherboard Support', 'Motherboard Form Factor', 'Supported Motherboards', 'Motherboard Size', 'Mainboard Support', 'Motherboard', 'Motherboard Type', 'formFactor', 'Form Factor'], [/motherboard/]);
  const fromSpec = parseFormFactors(mbSpec);
  const fromTitle = parseFormFactors(ctx.title);
  if (fromSpec.length > 1) s.supportedFormFactors = sortBySize(fromSpec);
  else if (fromSpec.length === 1) {
    // "Form Factor: ATX Mid Tower" plus a title saying "E-ATX/EEB Support": trust the larger one.
    const largest = sortBySize([...fromSpec, ...fromTitle])[0];
    s.supportedFormFactors = expandDown(largest);
    s.formFactorsInferred = true;
  } else if (fromTitle.length > 1) {
    s.supportedFormFactors = sortBySize(fromTitle);
    mark(ctx, 'supportedFormFactors');
  } else if (fromTitle.length === 1) {
    s.supportedFormFactors = expandDown(fromTitle[0]);
    s.formFactorsInferred = true;
    mark(ctx, 'supportedFormFactors');
  } else if (s.tower) {
    s.supportedFormFactors = s.tower === 'full' ? expandDown('E-ATX') : s.tower === 'mid' ? expandDown('ATX') : s.tower === 'mini' ? expandDown('mATX') : ['ITX'];
    s.formFactorsInferred = true;
    mark(ctx, 'supportedFormFactors');
  }

  const gpu = parseLengthMm(specs.get(['Max GPU Length', 'Maximum GPU Length', 'GPU Length', 'GPU Clearance', 'Graphics Card Length', 'Max Graphics Card Length', 'VGA Length', 'Maximum VGA Length', 'Max VGA Length', 'VGA Card Length', 'Graphics Card Clearance', 'Expansion Card Length', 'maxGpuLength'], [/(?:gpu|vga|graphics).*(?:length|clearance)/]), 'max');
  if (gpu && gpu >= 150 && gpu <= 600) s.maxGpuLengthMm = gpu;
  else {
    // "GPU clearance up to 380mm", "380mm GPU Clearance", "Supports 420mm GPUs".
    const tg =
      /(?:gpu|vga|graphics\s+cards?)[^,|]{0,30}?(\d{3})\s*mm/.exec(t) ??
      /(\d{3})\s*mm\s*(?:max\.?\s*)?(?:gpu|vga|graphics\s+cards?)\s*(?:clearance|length|support)/.exec(t) ??
      /supports?\s*(?:up\s+to\s*)?(\d{3})\s*mm\s*(?:long\s+)?(?:gpus?|graphics\s+cards?|vga)/.exec(t);
    if (tg && parseInt(tg[1], 10) >= 150) {
      s.maxGpuLengthMm = parseInt(tg[1], 10);
      mark(ctx, 'maxGpuLengthMm');
    }
  }
  const cooler = parseLengthMm(specs.get(['Max CPU Cooler Height', 'CPU Cooler Height', 'CPU Cooler Clearance', 'Maximum CPU Cooler Height', 'CPU Cooler Height Limit', 'CPU Cooler Support', 'maxCpuCoolerHeight'], [/cooler.*(?:height|clearance)/]), 'max');
  if (cooler && cooler >= 40 && cooler <= 250) s.maxCoolerHeightMm = cooler;
  else {
    const tc =
      /cpu\s+cooler[^,|]{0,30}?(\d{2,3})\s*mm/.exec(t) ??
      /(\d{2,3})\s*mm\s*(?:cpu\s+)?cooler\s*(?:height|clearance|support)/.exec(t);
    if (tc) {
      s.maxCoolerHeightMm = parseInt(tc[1], 10);
      mark(ctx, 'maxCoolerHeightMm');
    }
  }
  const radText = specs.get(['Radiator Support', 'Max Radiator Size', 'Radiator Size', 'Radiator Compatibility', 'Water Cooling Support', 'maxRadiatorSupport'], [/radiator/]);
  const rads = (radText ?? '').match(/(?<![0-9])(120|140|240|280|360|420|480)(?![0-9])/g);
  if (rads) s.maxRadiatorMm = Math.max(...rads.map(Number));
  else {
    const tr = t.match(/(?<![0-9])(240|280|360|420|480)\s*mm\s*(?:radiator|rad\b|aio)/g);
    if (tr) {
      s.maxRadiatorMm = Math.max(...tr.map((x) => parseInt(x, 10)));
      mark(ctx, 'maxRadiatorMm');
    }
  }
  if (/(?<![a-z])btf(?![a-z])|project\s+zero|back[\s-]?connect/.test(t)) s.supportsBackConnect = true;
  return s;
}

function sortBySize(list: BoardFormFactor[]): BoardFormFactor[] {
  return [...list].sort((a, b) => BOARD_SIZE_ORDER.indexOf(a) - BOARD_SIZE_ORDER.indexOf(b));
}

// ---------------------------------------------------------------------------
// CPU cooler
// ---------------------------------------------------------------------------

function parseCooler(ctx: Ctx): CoolerSpecs {
  const { specs, t } = ctx;
  const s: CoolerSpecs = {};
  const typeSpec = lower(specs.get(['Cooling Method', 'Cooler Type', 'Cooling Type', 'Type', 'type']));
  if (/aio|liquid|water/.test(typeSpec)) s.type = 'aio';
  else if (/air/.test(typeSpec)) s.type = 'air';
  else if (/liquid|(?<![a-z])aio(?![a-z])|all[\s-]?in[\s-]?one|water\s*cool|radiator/.test(t)) s.type = 'aio';
  else if (/air\s+cooler|tower|heat\s*pipes?|heatpipes?|heatsink/.test(t)) s.type = 'air';

  if (s.type === 'aio') {
    const rs = specs.get(['Radiator Size', 'Radiator Dimensions', 'Radiator', 'radiatorSize']);
    const fromSpec = rs ? /(?<![0-9])(120|140|240|280|360|420)(?![0-9])/.exec(rs) : null;
    if (fromSpec) s.radiatorMm = parseInt(fromSpec[1], 10);
    else {
      const sizes = (t.match(/(?<![0-9])(120|140|240|280|360|420)(?=\s*(?:mm)?(?![0-9]))/g) ?? []).map(Number);
      if (sizes.length) {
        s.radiatorMm = Math.max(...sizes);
        mark(ctx, 'radiatorMm');
      }
    }
  }

  const socketText = [
    specs.get(['Compatible Sockets', 'CPU Socket', 'Socket', 'Socket Compatibility', 'Socket Support', 'Compatible Processor Sockets', 'Supported Sockets', 'socketSupport', 'Intel Socket', 'AMD Socket', 'Compatible Devices', 'Compatibility']),
    specs.get([], [/socket/]),
  ].filter(Boolean).join(' | ');
  const fromSpec = parseSockets(socketText);
  s.sockets = fromSpec.length ? fromSpec : parseSockets(ctx.title);
  if (!fromSpec.length && s.sockets.length) mark(ctx, 'sockets');
  if (!s.sockets.length) s.sockets = undefined;

  const h = parseLengthMm(specs.get(['Height', 'Cooler Height', 'Product Height', 'Heatsink Height', 'Height (with fan)', 'Total Height', 'Overall Height', 'Item Height', 'height'], [/height/]), 'max');
  if (h && h >= 25 && h <= 200) s.heightMm = h;
  else {
    const th = /(\d{2,3})\s*mm\s*(?:height|tall)|height[:\s]*(\d{2,3})\s*mm/.exec(t);
    if (th) {
      s.heightMm = parseInt(th[1] ?? th[2], 10);
      mark(ctx, 'heightMm');
    }
  }
  const tdp = parseWatts(specs.get(['TDP', 'Max TDP', 'Thermal Design Power', 'TDP Rating', 'Cooling Capacity', 'Heat Dissipation', 'Max Cooling Capacity', 'Rated TDP']), 50, 500);
  if (tdp) s.tdpRatingW = tdp;
  else {
    const tt = /(\d{3})\s*w\s*tdp|tdp\s*(?:up\s+to\s*)?:?\s*(\d{3})\s*w/.exec(t);
    if (tt) {
      s.tdpRatingW = parseInt(tt[1] ?? tt[2], 10);
      mark(ctx, 'tdpRatingW');
    }
  }
  return s;
}

// ---------------------------------------------------------------------------
// Monitor (light: used for matching only)
// ---------------------------------------------------------------------------

function parseMonitor(ctx: Ctx): MonitorSpecs {
  const { specs, t } = ctx;
  const s: MonitorSpecs = {};
  const size = parseNumber(specs.get(['Screen Size', 'Display Size', 'Standing screen display size', 'size'])) ?? parseNumber(/(\d{2}(?:\.\d)?)\s*(?:"|''|inch|-inch|in\b)/.exec(t)?.[1]);
  if (size && size >= 10 && size <= 65) s.sizeInches = size;
  const hz = parseNumber(specs.get(['Refresh Rate', 'refreshRate', 'Maximum Refresh Rate'])) ?? parseNumber(/(\d{2,3})\s*hz/.exec(t)?.[1]);
  if (hz && hz >= 30 && hz <= 600) s.refreshHz = hz;
  const res = lower(specs.get(['Resolution', 'Display Resolution', 'Maximum Resolution', 'resolution'])) + ' ' + t;
  const rm = /(\d{3,4})\s*x\s*(\d{3,4})/.exec(res);
  if (rm) s.resolution = `${rm[1]}x${rm[2]}`;
  else if (/4k|uhd|2160p/.test(res)) s.resolution = '3840x2160';
  else if (/wqhd|qhd|1440p/.test(res)) s.resolution = '2560x1440';
  else if (/fhd|1080p|full\s*hd/.test(res)) s.resolution = '1920x1080';
  return s;
}

