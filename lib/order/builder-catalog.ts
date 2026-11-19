import { productEligibility } from "../pc-engine/shared/eligibility"
import { isRetailerSku, isUaeRetailerProductUrl } from "../pc-engine/shared/retailer-sku"
import { ORDER } from "./config"
import { cleanTitle } from "./format"
import type { LoadoutPart } from "./loadouts"
import { apiBase } from "./quote"
import { CORE_SLOTS, RETAILER_IDS } from "./types"

export type CoreSlot = typeof CORE_SLOTS[number]
export type CatalogPage = { parts: LoadoutPart[]; more: boolean; generatedAt: string }
type Listing = {
  store: { name: LoadoutPart["retailer"] }; retailerSku: string; title: string
  price: number | string | null; url: string; inStock: boolean | null; lastSeenAt: string
}
type Component = { id: string; category: string; listings: Listing[] }

export function catalogPart(component: Component, slot: CoreSlot, now: number): LoadoutPart | null {
  if (component.category !== slot) return null
  const offers = component.listings.filter(l => {
    const retailer = l.store.name
    const age = now - Date.parse(l.lastSeenAt)
    if (!RETAILER_IDS.includes(retailer) || !isRetailerSku(l.retailerSku) || !isUaeRetailerProductUrl(retailer, l.url)) return false
    const path = decodeURIComponent(new URL(l.url).pathname).toLowerCase()
    const sku = l.retailerSku.toLowerCase()
    if (retailer === "amazon_ae" && path.match(/\/(?:dp|gp\/product)\/([^/]+)/)?.[1] !== sku) return false
    if (retailer === "noon" && !path.replace(/\/$/, "").endsWith("/" + sku + "/p")) return false
    const price = Number(l.price)
    return l.inStock !== false && age >= 0 && age <= ORDER.maxPriceAgeSeconds * 1000 &&
      price > 0 && Number.isSafeInteger(Math.round(price * 100)) && productEligibility({ title: l.title }).category === slot
  }).sort((a, b) => Number(a.price) - Number(b.price))
  const l = offers[0]
  if (!l) return null
  return { slot, componentId: component.id, title: l.title, name: cleanTitle(l.title), price: Number(l.price),
    retailer: l.store.name, retailerSku: l.retailerSku, ageSeconds: (now - Date.parse(l.lastSeenAt)) / 1000,
    url: l.url.split(/[?#]/)[0], alternates: [] }
}

async function catalogJson(path: string) {
  const response = await fetch(apiBase() + path, { cache: "no-store", signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error("Catalog unavailable")
  return response.json()
}

export async function searchParts(slot: CoreSlot, search: string, offset: number): Promise<CatalogPage> {
  if (!CORE_SLOTS.includes(slot) || typeof search !== "string" || search.length > 100 ||
      !Number.isSafeInteger(offset) || offset < 0 || offset > 100000) throw new Error("Invalid part search")
  const params = new URLSearchParams({ category: slot, search: search.trim(), offset: String(offset),
    limit: "8", inStock: "true", sortBy: "price" })
  const page = await catalogJson("/components?" + params)
  const now = Date.now()
  const parts = await Promise.all(page.data.map(async (row: { id: string; category: string; name: string }) => {
    if (!/^[a-zA-Z0-9-]{1,100}$/.test(row.id) || row.category !== slot) return null
    const detail = await catalogJson("/components/" + row.id)
    return detail.id === row.id ? catalogPart(detail, slot, now) : null
  }))
  return { parts: parts.filter((part): part is LoadoutPart => part !== null), more: page.pagination.hasMore === true, generatedAt: new Date(now).toISOString() }
}
