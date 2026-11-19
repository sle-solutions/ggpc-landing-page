"use server"

import { searchParts, type CoreSlot } from "@/lib/order/builder-catalog"
import { fetchLoadouts, partsCapAed } from "@/lib/order/loadouts"

export async function findParts(slot: CoreSlot, query: string, offset: number) {
  try { return await searchParts(slot, query, offset) }
  catch { return { error: "Could not load the catalog. Try again." } as const }
}

export async function suggestBuild(budget: number) {
  const cap = partsCapAed(budget)
  if (!Number.isSafeInteger(budget) || cap < 1000 || cap > 50000) return { error: "Automatic picks support a parts budget of AED 1,000 to AED 50,000 after fees. You can still choose parts individually." } as const
  const result = await fetchLoadouts([budget])
  if ("error" in result) return { error: "Could not load price observations. Try again." } as const
  const picked = result.loadouts[0]
  if ("error" in picked) return { error: "No complete suggestion fits this budget. Choose parts individually or adjust your budget." } as const
  return { picked, generatedAt: result.generatedAt }
}
