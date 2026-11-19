/**
 * Small knowledge tables used to fill gaps when a retailer listing leaves a
 * spec out. Every figure is a widely documented vendor number. When we were
 * not sure of a value we left it out on purpose: the compatibility checker
 * reports "couldn't verify" instead of guessing.
 */
import type { MemoryType, Socket } from './types';

// ---------------------------------------------------------------------------
// Motherboard chipsets -> socket + supported memory
// ---------------------------------------------------------------------------
// Sources:
//  - AMD AM5 chipsets (A620, B650/B650E, X670/X670E, B840, B850, X870/X870E):
//    https://www.amd.com/en/products/processors/chipsets/am5.html (DDR5 only on AM5).
//  - AMD AM4 chipsets (A320, B350, X370, B450, X470, A520, B550, X570):
//    https://www.amd.com/en/products/processors/chipsets/am4.html (DDR4).
//  - Intel 600/700 series (H610, B660, H670, Z690, B760, H770, Z790), LGA1700:
//    Intel ARK chipset pages. The platform supports DDR4 *or* DDR5; each board
//    is wired for one of them, so we never infer memory type from these.
//  - Intel 800 series (H810, B860, Z890), LGA1851: Intel ARK, DDR5 only.
//  - Intel 400/500 series (H410, B460, H470, Z490, H510, B560, H570, Z590), LGA1200: Intel ARK, DDR4.
//  - Intel 300 series (H310, B360, B365, H370, Z370, Z390), LGA1151: Intel ARK, DDR4.

export interface ChipsetInfo {
  socket: Socket;
  /** Memory types the platform can use. One entry means every board uses it. */
  memory: MemoryType[];
  vendor: 'AMD' | 'Intel';
  /** Platform series: AMD 300/400/500/600/800, Intel 300/400/500/600/700/800. */
  series: number;
}

const amd = (socket: Socket, series: number, memory: MemoryType[]): ChipsetInfo => ({ socket, series, memory, vendor: 'AMD' });
const intel = (socket: Socket, series: number, memory: MemoryType[]): ChipsetInfo => ({ socket, series, memory, vendor: 'Intel' });

export const CHIPSETS: Record<string, ChipsetInfo> = {
  // AM5
  A620: amd('AM5', 600, ['DDR5']),
  A620A: amd('AM5', 600, ['DDR5']),
  B650: amd('AM5', 600, ['DDR5']),
  B650E: amd('AM5', 600, ['DDR5']),
  X670: amd('AM5', 600, ['DDR5']),
  X670E: amd('AM5', 600, ['DDR5']),
  B840: amd('AM5', 800, ['DDR5']),
  B850: amd('AM5', 800, ['DDR5']),
  X870: amd('AM5', 800, ['DDR5']),
  X870E: amd('AM5', 800, ['DDR5']),
  // AM4
  A320: amd('AM4', 300, ['DDR4']),
  B350: amd('AM4', 300, ['DDR4']),
  X370: amd('AM4', 300, ['DDR4']),
  B450: amd('AM4', 400, ['DDR4']),
  X470: amd('AM4', 400, ['DDR4']),
  A520: amd('AM4', 500, ['DDR4']),
  B550: amd('AM4', 500, ['DDR4']),
  X570: amd('AM4', 500, ['DDR4']),
  X570S: amd('AM4', 500, ['DDR4']),
  // LGA1851
  H810: intel('LGA1851', 800, ['DDR5']),
  B860: intel('LGA1851', 800, ['DDR5']),
  Z890: intel('LGA1851', 800, ['DDR5']),
  // LGA1700
  H610: intel('LGA1700', 600, ['DDR4', 'DDR5']),
  B660: intel('LGA1700', 600, ['DDR4', 'DDR5']),
  H670: intel('LGA1700', 600, ['DDR4', 'DDR5']),
  Z690: intel('LGA1700', 600, ['DDR4', 'DDR5']),
  B760: intel('LGA1700', 700, ['DDR4', 'DDR5']),
  H770: intel('LGA1700', 700, ['DDR4', 'DDR5']),
  Z790: intel('LGA1700', 700, ['DDR4', 'DDR5']),
  // LGA1200
  H410: intel('LGA1200', 400, ['DDR4']),
  B460: intel('LGA1200', 400, ['DDR4']),
  H470: intel('LGA1200', 400, ['DDR4']),
  Z490: intel('LGA1200', 400, ['DDR4']),
  H510: intel('LGA1200', 500, ['DDR4']),
  B560: intel('LGA1200', 500, ['DDR4']),
  H570: intel('LGA1200', 500, ['DDR4']),
  Z590: intel('LGA1200', 500, ['DDR4']),
  // LGA1151 (300 series)
  H310: intel('LGA1151', 300, ['DDR4']),
  B360: intel('LGA1151', 300, ['DDR4']),
  B365: intel('LGA1151', 300, ['DDR4']),
  H370: intel('LGA1151', 300, ['DDR4']),
  Z370: intel('LGA1151', 300, ['DDR4']),
  Z390: intel('LGA1151', 300, ['DDR4']),
};

/** Regex source matching any chipset name in the table (longest first). */
export const CHIPSET_PATTERN = Object.keys(CHIPSETS)
  .sort((a, b) => b.length - a.length)
  .join('|');

export function lookupChipset(name: string | undefined): ChipsetInfo | undefined {
  if (!name) return undefined;
  return CHIPSETS[name.toUpperCase()];
}

// ---------------------------------------------------------------------------
// Desktop CPUs -> cores / threads / TDP / boxed cooler
// ---------------------------------------------------------------------------
// Sources:
//  - AMD product pages, "# of CPU Cores", "# of Threads", "Default TDP" and
//    "Thermal Solution (PIB)": https://www.amd.com/en/products/specifications/processors.html
//  - Intel ARK, "Total Cores", "Total Threads", "Processor Base Power":
//    https://ark.intel.com
// Socket and integrated graphics are derived by rule in specs.ts (Ryzen
// 1000-5000 desktop = AM4, 7000/8000/9000 = AM5; Intel Core 12-14th gen =
// LGA1700, Core Ultra 200S = LGA1851; F models have no graphics).
// `cooler` is only set when AMD/Intel document it; tray/OEM packs never include one.

export interface CpuInfo {
  cores: number;
  threads: number;
  tdpW: number;
  cooler?: boolean;
}

const cpu = (cores: number, threads: number, tdpW: number, cooler?: boolean): CpuInfo => ({ cores, threads, tdpW, cooler });

/** Keyed by uppercase model, e.g. "7800X3D", "14700K", "265K". */
export const CPUS: Record<string, CpuInfo> = {
  // AMD Ryzen 9000 (AM5). No cooler in the box for the whole series.
  '9950X3D': cpu(16, 32, 170, false),
  '9900X3D': cpu(12, 24, 120, false),
  '9800X3D': cpu(8, 16, 120, false),
  '9950X': cpu(16, 32, 170, false),
  '9900X': cpu(12, 24, 120, false),
  '9700X': cpu(8, 16, 65, false),
  '9600X': cpu(6, 12, 65, false),
  // AMD Ryzen 8000 (AM5)
  '8700G': cpu(8, 16, 65, true),
  '8600G': cpu(6, 12, 65, true),
  '8500G': cpu(6, 12, 65, true),
  '8700F': cpu(8, 16, 65),
  '8400F': cpu(6, 12, 65),
  // AMD Ryzen 7000 (AM5)
  '7950X3D': cpu(16, 32, 120, false),
  '7950X': cpu(16, 32, 170, false),
  '7900X3D': cpu(12, 24, 120, false),
  '7900X': cpu(12, 24, 170, false),
  '7900': cpu(12, 24, 65, true),
  '7800X3D': cpu(8, 16, 120, false),
  '7700X': cpu(8, 16, 105, false),
  '7700': cpu(8, 16, 65, true),
  '7600X': cpu(6, 12, 105, false),
  '7600': cpu(6, 12, 65, true),
  '7500F': cpu(6, 12, 65),
  // AMD Ryzen 5000 (AM4)
  '5950X': cpu(16, 32, 105, false),
  '5900X': cpu(12, 24, 105, false),
  '5800X3D': cpu(8, 16, 105, false),
  '5700X3D': cpu(8, 16, 105, false),
  '5800X': cpu(8, 16, 105, false),
  '5700X': cpu(8, 16, 65, false),
  '5700G': cpu(8, 16, 65, true),
  '5600X': cpu(6, 12, 65, true),
  '5600': cpu(6, 12, 65, true),
  '5600G': cpu(6, 12, 65, true),
  '5500': cpu(6, 12, 65, true),
  // Intel Core 14th gen (LGA1700)
  '14900KS': cpu(24, 32, 150, false),
  '14900K': cpu(24, 32, 125, false),
  '14900KF': cpu(24, 32, 125, false),
  '14900': cpu(24, 32, 65),
  '14700K': cpu(20, 28, 125, false),
  '14700KF': cpu(20, 28, 125, false),
  '14700': cpu(20, 28, 65),
  '14600K': cpu(14, 20, 125, false),
  '14600KF': cpu(14, 20, 125, false),
  '14500': cpu(14, 20, 65),
  '14400': cpu(10, 16, 65),
  '14400F': cpu(10, 16, 65),
  '14100': cpu(4, 8, 60),
  '14100F': cpu(4, 8, 58),
  // Intel Core 13th gen (LGA1700)
  '13900KS': cpu(24, 32, 150, false),
  '13900K': cpu(24, 32, 125, false),
  '13900KF': cpu(24, 32, 125, false),
  '13700K': cpu(16, 24, 125, false),
  '13700KF': cpu(16, 24, 125, false),
  '13600K': cpu(14, 20, 125, false),
  '13600KF': cpu(14, 20, 125, false),
  '13500': cpu(14, 20, 65),
  '13400': cpu(10, 16, 65),
  '13400F': cpu(10, 16, 65),
  '13100F': cpu(4, 8, 58),
  // Intel Core 12th gen (LGA1700)
  '12900K': cpu(16, 24, 125, false),
  '12900KF': cpu(16, 24, 125, false),
  '12700K': cpu(12, 20, 125, false),
  '12700KF': cpu(12, 20, 125, false),
  '12600K': cpu(10, 16, 125, false),
  '12600KF': cpu(10, 16, 125, false),
  '12400': cpu(6, 12, 65),
  '12400F': cpu(6, 12, 65),
  '12100F': cpu(4, 8, 58),
  // Intel Core Ultra 200S (LGA1851)
  '285K': cpu(24, 24, 125, false),
  '285': cpu(24, 24, 65),
  '265K': cpu(20, 20, 125, false),
  '265KF': cpu(20, 20, 125, false),
  '265F': cpu(20, 20, 65),
  '265': cpu(20, 20, 65),
  '245K': cpu(14, 14, 125, false),
  '245KF': cpu(14, 14, 125, false),
  '245': cpu(14, 14, 65),
  '225': cpu(10, 10, 65),
  '225F': cpu(10, 10, 65),
};

export function lookupCpu(model: string | undefined): CpuInfo | undefined {
  if (!model) return undefined;
  return CPUS[model.toUpperCase()];
}

// ---------------------------------------------------------------------------
// GPU chipsets -> board power + vendor recommended PSU
// ---------------------------------------------------------------------------
// Sources:
//  - NVIDIA product spec pages, "Total Graphics Power (W)" and "Required System
//    Power (W)": https://www.nvidia.com/en-us/geforce/graphics-cards/
//  - AMD product spec pages, "Typical Board Power (Desktop)" and "Recommended
//    PSU": https://www.amd.com/en/products/graphics/desktops/radeon.html
//  - Intel Arc spec pages, "Total Board Power":
//    https://www.intel.com/content/www/us/en/products/details/discrete-gpus/arc.html
// Factory overclocked partner cards can draw a little more than these
// reference numbers. PSU recommendations are omitted where we were not sure.

export interface GpuInfo {
  vendor: 'NVIDIA' | 'AMD' | 'Intel';
  boardPowerW: number;
  recommendedPsuW?: number;
}

const nv = (boardPowerW: number, recommendedPsuW?: number): GpuInfo => ({ vendor: 'NVIDIA', boardPowerW, recommendedPsuW });
const rad = (boardPowerW: number, recommendedPsuW?: number): GpuInfo => ({ vendor: 'AMD', boardPowerW, recommendedPsuW });
const arc = (boardPowerW: number): GpuInfo => ({ vendor: 'Intel', boardPowerW });

/** Keyed by canonical chipset name as produced by `parseGpuChipset()`. */
export const GPUS: Record<string, GpuInfo> = {
  'RTX 5090': nv(575, 1000),
  'RTX 5080': nv(360, 850),
  'RTX 5070 Ti': nv(300, 750),
  'RTX 5070': nv(250, 650),
  'RTX 5060 Ti': nv(180),
  'RTX 5060': nv(145),
  'RTX 4090': nv(450, 850),
  'RTX 4080 Super': nv(320, 750),
  'RTX 4080': nv(320, 750),
  'RTX 4070 Ti Super': nv(285, 700),
  'RTX 4070 Ti': nv(285, 700),
  'RTX 4070 Super': nv(220, 650),
  'RTX 4070': nv(200, 650),
  'RTX 4060 Ti': nv(165, 550), // 160 W (8 GB) / 165 W (16 GB); we use the higher figure.
  'RTX 4060': nv(115, 550),
  'RTX 3090 Ti': nv(450, 850),
  'RTX 3090': nv(350, 750),
  'RTX 3080 Ti': nv(350, 750),
  'RTX 3080': nv(320, 750),
  'RTX 3070 Ti': nv(290, 750),
  'RTX 3070': nv(220, 650),
  'RTX 3060 Ti': nv(200, 600),
  'RTX 3060': nv(170, 550),
  'RX 9070 XT': rad(304),
  'RX 9070': rad(220),
  'RX 7900 XTX': rad(355, 800),
  'RX 7900 XT': rad(315, 750),
  'RX 7900 GRE': rad(260, 650),
  'RX 7800 XT': rad(263, 700),
  'RX 7700 XT': rad(245, 700),
  'RX 7600 XT': rad(190, 600),
  'RX 7600': rad(165, 550),
  'RX 6950 XT': rad(335, 850),
  'RX 6900 XT': rad(300, 850),
  'RX 6800 XT': rad(300, 750),
  'RX 6800': rad(250, 650),
  'RX 6750 XT': rad(250, 650),
  'RX 6700 XT': rad(230, 650),
  'RX 6650 XT': rad(180, 500),
  'RX 6600 XT': rad(160, 500),
  'RX 6600': rad(132, 450),
  'RX 6500 XT': rad(107, 400),
  'Arc B580': arc(190),
  'Arc A770': arc(225),
  'Arc A750': arc(225),
};

export function lookupGpu(chipset: string | undefined): GpuInfo | undefined {
  if (!chipset) return undefined;
  return GPUS[chipset];
}

/** Chipsets sold with more than one VRAM size; VRAM is part of their identity. */
export const MULTI_VRAM_CHIPSETS = new Set([
  'RTX 5060 Ti',
  'RTX 4060 Ti',
  'RTX 3060',
  'RTX 3050',
  'RTX 3080',
  'RX 9060 XT',
  'Arc A770',
]);

// ---------------------------------------------------------------------------
// Cooler mounting families
// ---------------------------------------------------------------------------
// AMD states AM5 keeps AM4 cooler mounting compatibility, and Intel states
// LGA1851 keeps the LGA1700 cooler keep-out zone and mounting holes. LGA1200
// and LGA115x share the same hole spacing. Used to soften cooler warnings.
export const COOLER_MOUNT_EQUIVALENT: Partial<Record<Socket, Socket[]>> = {
  AM5: ['AM4'],
  AM4: ['AM5'],
  LGA1851: ['LGA1700'],
  LGA1700: ['LGA1851'],
  LGA1200: ['LGA1151'],
  LGA1151: ['LGA1200'],
};
