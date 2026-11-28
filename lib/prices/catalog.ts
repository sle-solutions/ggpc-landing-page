import { cleanTitle } from "@/lib/order/format"
import { apiBase } from "@/lib/order/quote"
import { RETAILER_IDS, type RetailerId } from "@/lib/order/types"

// Live price pages (/price, /price/<chip>-uae). Reads the public price API only:
// GET /api/components (current listings) and GET /api/components/:id/prices (attributed history).
// Every number shown comes from those responses. Nothing here invents or seeds prices.

export const PRICE_CATEGORIES = ["GPU", "CPU"] as const
export type PriceCategory = (typeof PRICE_CATEGORIES)[number]

// Same limit the order quote uses: older listings are stale and never shown as a current price.
export const MAX_OFFER_AGE_MS = 7 * 24 * 60 * 60 * 1000
export const REVALIDATE_SECONDS = 3600
const PAGE_SIZE = 200
const MAX_PAGES = 10
const HISTORY_DAYS = 90
const HISTORY_COMPONENTS = 10
const DUBAI_OFFSET_MS = 4 * 60 * 60 * 1000

export interface Offer {
  componentId: string
  name: string
  variant: string
  retailer: RetailerId
  price: number
  inStock: boolean
  url: string
  lastChecked: string
}

export interface Chip {
  slug: string
  key: string
  category: PriceCategory
  name: string
  brand: string
  // Median in-stock price, used to drop bad listings and history points.
  mid: number | null
  offers: Offer[]
}

export interface ChipSummary { slug: string; category: PriceCategory; name: string; brand: string; cheapest: Offer; cards: number; stores: number }

export interface DailyLow { day: string; price: number }
export interface History { days: DailyLow[]; first: string | null; low: DailyLow | null }

export type Verdict =
  | { kind: "new"; since: string | null }
  | { kind: "at_low"; since: string }
  | { kind: "above_low"; since: string; low: DailyLow; above: number }

// ---------- pure helpers (tested in tests/price-pages.test.tsx) ----------

const WORDS: Record<string, string> = { rtx: "RTX", gtx: "GTX", rx: "RX", arc: "Arc", ti: "Ti", super: "Super", xt: "XT", xtx: "XTX", gre: "GRE", ryzen: "Ryzen", core: "Core", ultra: "Ultra", threadripper: "Threadripper", pro: "Pro", athlon: "Athlon", pentium: "Pentium", celeron: "Celeron", xeon: "Xeon" }

export function chipName(slug: string): string {
  const tokens = slug.split("-").filter(Boolean)
  const parts = tokens.map(t => WORDS[t] ?? (/^i\d$/.test(t) ? t : /\d/.test(t) ? t.toUpperCase() : t.charAt(0).toUpperCase() + t.slice(1)))
  // Intel names its Core i-series with a hyphen: Core i5-12400F.
  const i = parts.findIndex(p => /^i\d$/.test(p))
  if (parts[0] === "Core" && i === 1 && parts[2]) return ["Core", `${parts[1]}-${parts[2]}`, ...parts.slice(3)].join(" ")
  return parts.join(" ")
}

export function chipBrand(category: PriceCategory, slug: string): string {
  const first = slug.split("-")[0]
  if (category === "GPU") return first === "rx" ? "AMD Radeon" : first === "arc" ? "Intel" : "NVIDIA GeForce"
  return first === "ryzen" || first === "athlon" || first === "threadripper" ? "AMD" : "Intel"
}

export function chipPath(slug: string): string { return `/price/${slug}-uae` }
export function slugFromParam(param: string): string | null {
  const m = /^([a-z0-9]+(?:-[a-z0-9]+)*)-uae$/.exec(param)
  return m ? m[1] : null
}

interface ApiPrice { price?: unknown; inStock?: unknown; url?: unknown; lastChecked?: unknown; store?: { name?: unknown } }
interface ApiComponent { id?: unknown; name?: unknown; category?: unknown; modelKey?: unknown; prices?: unknown }

function cleanName(name: string): string {
  const s = cleanTitle(name)
  return s.length > 110 ? `${s.slice(0, 107).trimEnd()}...` : s
}

export function offerFrom(component: ApiComponent, price: ApiPrice, now: number): Offer | null {
  const retailer = price.store?.name
  if (typeof retailer !== "string" || !(RETAILER_IDS as readonly string[]).includes(retailer)) return null
  const amount = typeof price.price === "number" ? price.price : Number(price.price)
  if (!Number.isFinite(amount) || amount <= 0) return null
  if (typeof price.url !== "string" || !price.url.startsWith("https://")) return null
  if (typeof price.lastChecked !== "string") return null
  const checked = Date.parse(price.lastChecked)
  if (!Number.isFinite(checked) || checked > now + 5 * 60_000 || now - checked > MAX_OFFER_AGE_MS) return null
  if (typeof component.id !== "string" || typeof component.name !== "string" || typeof component.modelKey !== "string") return null
  return {
    componentId: component.id,
    name: cleanName(component.name),
    variant: component.modelKey.split(":").slice(2).join(" "),
    retailer: retailer as RetailerId,
    price: Math.round(amount * 100) / 100,
    inStock: price.inStock === true,
    url: price.url,
    lastChecked: price.lastChecked,
  }
}

export function median(values: number[]): number | null {
  if (!values.length) return null
  const v = [...values].sort((a, b) => a - b)
  const m = Math.floor(v.length / 2)
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
}

// Like the loadout picker, a price under half the chip's in-stock median is treated as a bad listing
// (wrong item, parse error, accessory), and a history point above double it as noise.
export const OUTLIER_LOW = 0.5
export const OUTLIER_HIGH = 2
export function withinBand(price: number, mid: number | null): boolean {
  return mid === null || (price >= mid * OUTLIER_LOW && price <= mid * OUTLIER_HIGH)
}

export const byBestOffer = (a: Offer, b: Offer) => Number(b.inStock) - Number(a.inStock) || a.price - b.price

// Groups listings by chip (the first two modelKey segments, e.g. gpu:rtx-5070).
// A listing without a conservative modelKey, or whose key belongs to another category, never joins a chip.
export function groupChips(category: PriceCategory, components: ApiComponent[], now: number): Chip[] {
  const prefix = category.toLowerCase()
  const chips = new Map<string, Chip>()
  for (const c of components) {
    if (c.category !== category || typeof c.modelKey !== "string") continue
    const [kind, slug] = c.modelKey.split(":")
    if (kind !== prefix || !slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) continue
    const offers = (Array.isArray(c.prices) ? c.prices : []).map(p => offerFrom(c, p as ApiPrice, now)).filter((o): o is Offer => o !== null)
    if (!offers.length) continue
    const chip = chips.get(slug) ?? { slug, key: `${kind}:${slug}`, category, name: chipName(slug), brand: chipBrand(category, slug), mid: null, offers: [] }
    chip.offers.push(...offers)
    chips.set(slug, chip)
  }
  // A page needs at least one in-stock, fresh offer to say anything about today's price.
  return [...chips.values()].map(chip => {
    const mid = median(chip.offers.filter(o => o.inStock).map(o => o.price))
    return { ...chip, mid, offers: chip.offers.filter(o => o.price >= (mid ?? 0) * OUTLIER_LOW).sort(byBestOffer) }
  }).filter(chip => chip.offers.some(o => o.inStock))
}

export function summarize(chip: Chip): ChipSummary {
  return {
    slug: chip.slug, category: chip.category, name: chip.name, brand: chip.brand,
    cheapest: chip.offers[0],
    cards: new Set(chip.offers.map(o => o.componentId)).size,
    stores: new Set(chip.offers.map(o => o.retailer)).size,
  }
}

export function cheapestPerStore(chip: Chip): Offer[] {
  const best = new Map<RetailerId, Offer>()
  for (const o of chip.offers) {
    if (!o.inStock) continue
    const cur = best.get(o.retailer)
    if (!cur || o.price < cur.price) best.set(o.retailer, o)
  }
  return [...best.values()].sort((a, b) => a.price - b.price)
}

export function dubaiDay(iso: string | number): string {
  const t = typeof iso === "number" ? iso : Date.parse(iso)
  return new Date(t + DUBAI_OFFSET_MS).toISOString().slice(0, 10)
}

// Cheapest in-stock observation per Dubai day across every card of the chip, plus today's live cheapest.
export function dailyLows(points: Array<{ price: number; inStock: boolean; recordedAt: string }>, today: { price: number; day: string } | null, mid: number | null = null): History {
  const map = new Map<string, number>()
  for (const p of points) {
    if (!p.inStock || !Number.isFinite(p.price) || p.price <= 0 || !withinBand(p.price, mid) || !Number.isFinite(Date.parse(p.recordedAt))) continue
    const day = dubaiDay(p.recordedAt)
    map.set(day, Math.min(map.get(day) ?? Infinity, p.price))
  }
  if (today) map.set(today.day, Math.min(map.get(today.day) ?? Infinity, today.price))
  const days = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([day, price]) => ({ day, price }))
  const low = days.reduce<DailyLow | null>((m, d) => (!m || d.price < m.price ? d : m), null)
  return { days, first: days[0]?.day ?? null, low }
}

export function daysBetween(a: string, b: string): number { return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000) }

// No buy-or-wait call until a week of history exists. "At its low" allows 1% for rounding between stores.
export function verdict(history: History, todayPrice: number, todayDay: string): Verdict {
  if (!history.first || !history.low || daysBetween(history.first, todayDay) < 7) return { kind: "new", since: history.first }
  if (todayPrice <= history.low.price * 1.01) return { kind: "at_low", since: history.first }
  return { kind: "above_low", since: history.first, low: history.low, above: Math.round(todayPrice - history.low.price) }
}

// ---------- API reads (server only) ----------

async function getJson(path: string): Promise<unknown> {
  const response = await fetch(`${apiBase()}${path}`, { next: { revalidate: REVALIDATE_SECONDS }, signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`price API ${response.status}`)
  return response.json()
}

async function fetchCategory(category: PriceCategory): Promise<ApiComponent[]> {
  const all: ApiComponent[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const data = (await getJson(`/components?category=${category}&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`)) as { data?: unknown; pagination?: { hasMore?: unknown } }
    if (!Array.isArray(data.data)) throw new Error("price API shape")
    all.push(...(data.data as ApiComponent[]))
    if (data.pagination?.hasMore !== true) break
  }
  return all
}

// Throws when the API is down, so a cached page stays up instead of being replaced by an empty one.
export async function fetchChips(category: PriceCategory): Promise<Chip[]> {
  return groupChips(category, await fetchCategory(category), Date.now())
}

export async function fetchAllChips(): Promise<Chip[]> {
  const lists = await Promise.all(PRICE_CATEGORIES.map(fetchChips))
  return lists.flat()
}

export async function fetchChip(slug: string): Promise<{ chip: Chip; siblings: ChipSummary[] } | null> {
  const all = await fetchAllChips()
  const chip = all.find(c => c.slug === slug)
  if (!chip) return null
  const siblings = all.filter(c => c.category === chip.category && c.slug !== slug).map(summarize).sort((a, b) => a.cheapest.price - b.cheapest.price)
  return { chip, siblings }
}

export async function fetchHistory(chip: Chip): Promise<History> {
  const ids = [...new Set(chip.offers.filter(o => o.inStock).map(o => o.componentId))].slice(0, HISTORY_COMPONENTS)
  const results = await Promise.allSettled(ids.map(id => getJson(`/components/${encodeURIComponent(id)}/prices?days=${HISTORY_DAYS}`)))
  const points: Array<{ price: number; inStock: boolean; recordedAt: string }> = []
  for (const r of results) {
    if (r.status !== "fulfilled") continue
    const history = (r.value as { priceHistory?: unknown }).priceHistory
    if (!Array.isArray(history)) continue
    for (const p of history as Array<{ price?: unknown; inStock?: unknown; recordedAt?: unknown; store?: { name?: unknown } }>) {
      if (typeof p.recordedAt !== "string" || typeof p.store?.name !== "string" || !(RETAILER_IDS as readonly string[]).includes(p.store.name)) continue
      points.push({ price: Number(p.price), inStock: p.inStock === true, recordedAt: p.recordedAt })
    }
  }
  const best = chip.offers[0]
  return dailyLows(points, best?.inStock ? { price: best.price, day: dubaiDay(Date.now()) } : null, chip.mid)
}
