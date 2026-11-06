import { encodeBuildCode } from "./build-code"
import { ORDER } from "./config"
import { laneAServiceFils } from "./pricing"
import { apiBase } from "./quote"
import { RETAILER_IDS } from "./types"
import type { RetailerId, SlotCode } from "./types"

// The web builder: four auto-picked loadouts from GET /api/prices/loadouts (extension/server/services/loadouts.ts).
// Budgets are all-in for "Have it built": parts + sourcing fee + build fee + buyer protection.
// Entry is AED 3,750, not 3,500: on 2026-10-17 the cheapest complete build that passes the fit check was about AED 2,850 of parts (about AED 3,620 all-in).
export const LOADOUT_TIERS = [
  { id: "starter", name: "Starter", budgetAed: 3750 },
  { id: "mid", name: "Mid", budgetAed: 5000 },
  { id: "high", name: "High", budgetAed: 7500 },
  { id: "top", name: "Top", budgetAed: 11000 },
] as const
export type TierId = (typeof LOADOUT_TIERS)[number]["id"]
export const DEFAULT_TIER: TierId = "mid"

export interface LoadoutPart {
  slot: SlotCode
  componentId: string
  name: string
  title: string
  retailer: RetailerId
  retailerSku: string
  price: number
  url: string
  ageSeconds: number
  alternates: Array<{ retailer: RetailerId; retailerSku: string }>
}
export interface Loadout { budget: number; partsTotal: number; gpu: string; cpu: string; fit: "ok" | "warning"; notes: string[]; parts: LoadoutPart[] }
export type LoadoutResult = Loadout | { budget: number; error: "nothing_fits" }
export type LoadoutsResult = { generatedAt: string; loadouts: LoadoutResult[] } | { error: "api_down" | "not_live" }

// Largest parts total whose all-in price (parts + service lines) stays within the budget.
export function partsCapAed(budgetAed: number): number {
  const fixed = (ORDER.buildFeeFils + ORDER.protectionFeeFils) / 100
  return Math.floor((budgetAed - fixed) / (1 + ORDER.sourcingFeeRate))
}

export function allInFils(partsTotalAed: number): { partsFils: number; sourcingFils: number; buildFils: number; protectionFils: number; totalFils: number } {
  const partsFils = Math.round(partsTotalAed * 100)
  const s = laneAServiceFils(partsFils)
  return { partsFils, ...s, totalFils: partsFils + s.sourcingFils + s.buildFils + s.protectionFils }
}

// Server-side only. The API owns its cache; do not add Next stale-while-revalidate
// responses that can survive an idle period or an upstream policy correction.
export async function fetchLoadouts(): Promise<LoadoutsResult> {
  const budgets = LOADOUT_TIERS.map(t => partsCapAed(t.budgetAed)).join(",")
  try {
    const response = await fetch(`${apiBase()}/prices/loadouts?budgets=${budgets}`, { cache: "no-store", signal: AbortSignal.timeout(15000) })
    if (response.status === 404) return { error: "not_live" }
    if (!response.ok) return { error: "api_down" }
    const data = (await response.json()) as { generatedAt?: unknown; loadouts?: unknown }
    if (typeof data.generatedAt !== "string" || !Number.isFinite(Date.parse(data.generatedAt)) || !Array.isArray(data.loadouts) || data.loadouts.length !== LOADOUT_TIERS.length) return { error: "api_down" }
    if (!data.loadouts.every(isLoadoutResult)) return { error: "api_down" }
    return { generatedAt: data.generatedAt, loadouts: data.loadouts }
  } catch {
    return { error: "api_down" }
  }
}

function isLoadoutResult(x: unknown): x is LoadoutResult {
  const l = x as Loadout
  if (!l || typeof l.budget !== "number") return false
  if ((x as { error?: unknown }).error === "nothing_fits") return true
  return typeof l.partsTotal === "number" && Array.isArray(l.parts) && l.parts.every(p =>
    p && typeof p.slot === "string" && typeof p.price === "number" && Number.isFinite(p.ageSeconds) && p.ageSeconds >= 0 && (RETAILER_IDS as readonly string[]).includes(p.retailer) && typeof p.retailerSku === "string" && Array.isArray(p.alternates))
}

// ageSeconds was measured when the API generated its cached response. Account
// for elapsed time at render without rewriting that response's provenance.
export function loadoutAgeSeconds(ageSeconds: number, generatedAt: string, now = Date.now()): number | null {
  const generated = Date.parse(generatedAt)
  if (!Number.isFinite(ageSeconds) || ageSeconds < 0 || !Number.isFinite(generated) || !Number.isFinite(now)) return null
  const age = ageSeconds + Math.max(0, (now - generated) / 1000)
  return Number.isFinite(age) ? age : null
}

// Build code for /build/<code>: the picked listing first, then up to two other stores for the same part.
// A loadout without a cooler means the CPU's boxed cooler is used, which the order page shows as skipped.
export function loadoutCode(name: string, loadout: Loadout): string {
  const parts: Array<[SlotCode, ...string[]]> = loadout.parts.map(p => [p.slot, `${p.retailer}:${p.retailerSku}`, ...p.alternates.slice(0, 2).map(a => `${a.retailer}:${a.retailerSku}`)])
  if (!loadout.parts.some(p => p.slot === "CPU_COOLER")) parts.splice(1, 0, ["CPU_COOLER"])
  return encodeBuildCode(name, parts)
}
