export const RETAILER_IDS = ["amazon_ae", "noon", "microless", "gear_up", "gcc_gamers"] as const
export type RetailerId = (typeof RETAILER_IDS)[number]
export const RETAILER_NAMES: Record<RetailerId, string> = { amazon_ae: "Amazon.ae", noon: "noon", microless: "Microless", gear_up: "Gear-Up", gcc_gamers: "GCC Gamers" }

export const CORE_SLOTS = ["CPU", "CPU_COOLER", "MOTHERBOARD", "RAM", "STORAGE", "GPU", "POWER_SUPPLY", "CASE"] as const
export const SLOTS = [...CORE_SLOTS, "EXTRA"] as const
export type SlotCode = (typeof SLOTS)[number]
// A build needs these; the cooler may be skipped (some CPUs ship with one).
export const REQUIRED_SLOTS: readonly SlotCode[] = ["CPU", "MOTHERBOARD", "RAM", "STORAGE", "POWER_SUPPLY", "CASE", "GPU"]
export const SLOT_LABELS: Record<SlotCode, string> = { CPU: "CPU", CPU_COOLER: "CPU cooler", MOTHERBOARD: "Motherboard", RAM: "RAM", STORAGE: "Storage", GPU: "GPU", POWER_SUPPLY: "Power supply", CASE: "Case", EXTRA: "Extra" }

export interface Candidate { retailer: RetailerId; retailerSku: string }
export interface BuildPart { slot: SlotCode; candidates: Candidate[] }
export interface Build { name: string; parts: BuildPart[] }

export interface QuoteRequest { parts: Array<{ slot: string; candidates: Array<{ retailer: RetailerId; retailerSku: string }> }> }
export type QuoteStatus = "ok" | "stale" | "out_of_stock" | "unpriced" | "unknown"
export interface QuoteCandidate { retailer: RetailerId; retailerSku: string; status: QuoteStatus; price: number | null; inStock: boolean | null; url: string | null; title: string | null; lastSeenAt: string | null; ageSeconds: number | null }
export interface QuotePart { slot: string; status: QuoteStatus; chosen: QuoteCandidate | null; candidates: QuoteCandidate[]; componentId: string | null; category: string | null }
export interface QuoteResponse { currency: "AED"; maxAgeSeconds: 604800; generatedAt: string; parts: QuotePart[] }

export type Lane = "A" | "B"
