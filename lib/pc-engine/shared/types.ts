/**
 * Typed, normalised view of a PC part. Produced by `normalizePart()` in
 * `specs.ts` from a retailer listing/detail or a DB component, and consumed by
 * `checkBuild()` in `compatibility.ts` and the matcher in `identity.ts`.
 */
import type { PartCategory } from '../retailers/types';

export type { PartCategory };

export const PART_CATEGORIES: readonly PartCategory[] = [
  'CPU',
  'CPU_COOLER',
  'GPU',
  'MOTHERBOARD',
  'RAM',
  'STORAGE',
  'CASE',
  'POWER_SUPPLY',
  'MONITOR',
  'OS',
  'OTHER',
];

export function isPartCategory(value: unknown): value is PartCategory {
  return typeof value === 'string' && (PART_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Anything with a title can be categorised, normalised or matched. Both
 * `RetailerListing` and `RetailerProductDetail` satisfy this shape, and so does a
 * DB `Component` mapped as { title: name, brand: manufacturer, model, specs, category }.
 */
export interface ProductInput {
  title: string;
  brand?: string;
  mpn?: string;
  model?: string;
  /** Raw retailer label -> value pairs, or the DB `specs` JSON. */
  specs?: Record<string, unknown>;
  breadcrumbs?: string[];
  /** Category hint (a parser's guess or a DB category). Old 'PSU' is accepted. */
  category?: PartCategory | string;
}

/** Socket names. Matches the Prisma `CPUSocket` enum plus a few older/HEDT ones. */
export type Socket = 'AM4' | 'AM5' | 'LGA1700' | 'LGA1851' | 'LGA1200' | 'LGA1151' | 'TR4' | 'sTRX4' | 'sTR5';

/** Matches the Prisma `RAMType` enum. */
export type MemoryType = 'DDR3' | 'DDR4' | 'DDR5';

/** Motherboard sizes, biggest first. Map to Prisma with `toPrismaFormFactor()`. */
export type BoardFormFactor = 'E-ATX' | 'ATX' | 'mATX' | 'ITX';

export const BOARD_SIZE_ORDER: readonly BoardFormFactor[] = ['E-ATX', 'ATX', 'mATX', 'ITX'];

/** Matches the Prisma `PSUEfficiency` enum plus plain 80 PLUS ("STANDARD"). */
export type PsuEfficiency = 'STANDARD' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'TITANIUM';

export interface CpuSpecs {
  vendor?: 'AMD' | 'Intel';
  /** Canonical family + model, e.g. "Ryzen 7 7800X3D", "Core i7-14700K", "Core Ultra 7 265K". */
  family?: string;
  /** Model number with suffix, e.g. "7800X3D", "14700K", "265K". */
  model?: string;
  /** Tier, e.g. "Ryzen 7", "Core i7", "Core Ultra 7". */
  tier?: string;
  /** Ryzen series (5000, 7000, 9000) or Intel Core generation (12, 13, 14) or 200 for Core Ultra 200S. */
  generation?: number;
  cores?: number;
  threads?: number;
  socket?: Socket;
  /** AMD TDP / Intel Processor Base Power, watts. */
  tdpW?: number;
  integratedGraphics?: boolean;
  /** True when the retail box includes a cooler. */
  boxedCooler?: boolean;
  packaging?: 'box' | 'tray';
  /** True for laptop chips (H/HS/HX/U suffix); these are not desktop parts. */
  mobile?: boolean;
  baseClockGhz?: number;
  boostClockGhz?: number;
}

export interface GpuSpecs {
  chipVendor?: 'NVIDIA' | 'AMD' | 'Intel';
  /** e.g. "RTX 4070", "RTX 4070 Ti Super", "RX 7800 XT", "Arc B580". */
  chipset?: string;
  vramGb?: number;
  memoryType?: string;
  lengthMm?: number;
  /** Where the length came from. 'dimensions' is a generic product size and may include packaging. */
  lengthSource?: 'spec' | 'dimensions' | 'title';
  /** Total graphics / typical board power in watts. */
  boardPowerW?: number;
  boardPowerSource?: 'spec' | 'knowledge';
  /** Vendor recommended PSU size in watts. */
  recommendedPsuW?: number;
  /** e.g. ['12VHPWR'], ['8-pin', '8-pin'], ['12V-2x6']. */
  powerConnectors?: string[];
  /** True when the card uses the 16-pin 12VHPWR / 12V-2x6 plug. */
  uses16Pin?: boolean;
  /** Card maker line, e.g. "AERO", "ROG Strix", "Ventus 2X". */
  productLine?: string;
  factoryOc?: boolean;
}

export interface MotherboardSpecs {
  socket?: Socket;
  /** e.g. "B650", "X670E", "Z790". */
  chipset?: string;
  formFactor?: BoardFormFactor;
  memoryType?: MemoryType;
  memorySlots?: number;
  memorySlotsInferred?: boolean;
  m2Slots?: number;
  wifi?: boolean;
  maxMemoryGb?: number;
  /** Back connect ("BTF", "Project Zero") boards need a matching case. */
  backConnect?: boolean;
}

export interface RamSpecs {
  memoryType?: MemoryType;
  totalGb?: number;
  /** Sticks in one kit, e.g. 2 for "2x16GB". */
  modules?: number;
  moduleGb?: number;
  speedMts?: number;
  casLatency?: number;
  formFactor?: 'DIMM' | 'SODIMM';
  rgb?: boolean;
  series?: string;
}

export interface StorageSpecs {
  kind?: 'NVMe SSD' | 'SATA SSD' | 'HDD';
  pcieGen?: 3 | 4 | 5;
  capacityGb?: number;
  formFactor?: 'M.2 2280' | 'M.2 2242' | 'M.2 2230' | 'M.2' | '2.5"' | '3.5"';
  heatsink?: boolean;
  rpm?: number;
  /** Product line, e.g. "990 Pro", "SN850X". */
  line?: string;
}

export interface PsuSpecs {
  wattage?: number;
  efficiency?: PsuEfficiency;
  modularity?: 'full' | 'semi' | 'non';
  /** "3.0" or "3.1" when the unit is ATX 3.x. */
  atxVersion?: '2' | '3.0' | '3.1';
  /** Native 16-pin 12VHPWR / 12V-2x6 cable included. */
  native16Pin?: boolean;
  formFactor?: 'ATX' | 'SFX' | 'SFX-L';
}

export interface CaseSpecs {
  supportedFormFactors?: BoardFormFactor[];
  /** True when the list was inferred from "Mid Tower" etc. rather than stated. */
  formFactorsInferred?: boolean;
  maxGpuLengthMm?: number;
  maxCoolerHeightMm?: number;
  maxRadiatorMm?: number;
  supportsBackConnect?: boolean;
  tower?: 'full' | 'mid' | 'mini' | 'sff';
}

export interface CoolerSpecs {
  type?: 'air' | 'aio';
  radiatorMm?: number;
  sockets?: Socket[];
  heightMm?: number;
  tdpRatingW?: number;
}

export interface MonitorSpecs {
  sizeInches?: number;
  refreshHz?: number;
  resolution?: string;
}

export type EmptySpecs = Record<string, never>;

interface PartBase<C extends PartCategory, S> {
  category: C;
  /** Original title. */
  title: string;
  /** Short human name, e.g. "Ryzen 7 7800X3D" or "Gigabyte RTX 4070 AERO OC". */
  displayName: string;
  /** Canonical brand (card maker for GPUs). */
  brand?: string;
  mpn?: string;
  /** How many of this item are in the build (e.g. two identical RAM kits). Defaults to 1. */
  quantity?: number;
  specs: S;
  /** Spec fields filled from the title or the knowledge tables rather than the spec sheet. */
  inferred: string[];
}

export type CpuPart = PartBase<'CPU', CpuSpecs>;
export type GpuPart = PartBase<'GPU', GpuSpecs>;
export type MotherboardPart = PartBase<'MOTHERBOARD', MotherboardSpecs>;
export type RamPart = PartBase<'RAM', RamSpecs>;
export type StoragePart = PartBase<'STORAGE', StorageSpecs>;
export type PsuPart = PartBase<'POWER_SUPPLY', PsuSpecs>;
export type CasePart = PartBase<'CASE', CaseSpecs>;
export type CoolerPart = PartBase<'CPU_COOLER', CoolerSpecs>;
export type MonitorPart = PartBase<'MONITOR', MonitorSpecs>;
export type OtherPart = PartBase<'OS' | 'OTHER', EmptySpecs>;

export type NormalizedPart =
  | CpuPart
  | GpuPart
  | MotherboardPart
  | RamPart
  | StoragePart
  | PsuPart
  | CasePart
  | CoolerPart
  | MonitorPart
  | OtherPart;

export type PartOf<C extends PartCategory> = Extract<NormalizedPart, { category: C }>;

/** Map our form factor to the Prisma `MotherboardFormFactor` enum. */
export function toPrismaFormFactor(ff: BoardFormFactor): 'E_ATX' | 'ATX' | 'MICRO_ATX' | 'MINI_ITX' {
  switch (ff) {
    case 'E-ATX':
      return 'E_ATX';
    case 'ATX':
      return 'ATX';
    case 'mATX':
      return 'MICRO_ATX';
    case 'ITX':
      return 'MINI_ITX';
  }
}
