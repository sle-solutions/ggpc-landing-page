import type { QuotePart, QuoteRequest, QuoteResponse, QuoteStatus } from "./types"

const DEFAULT_API = "https://api-production-1e7d.up.railway.app/api"
export function apiBase() { return (process.env.GGPC_API_URL || DEFAULT_API).replace(/\/+$/, "") }

export type QuoteResult = QuoteResponse | { error: "api_down" | "not_live" }
const STATUSES: QuoteStatus[] = ["ok", "stale", "out_of_stock", "unpriced", "unknown"]

// Server-side only. Prices always come from the GG PC API, never from the browser.
export async function fetchQuote(req: QuoteRequest): Promise<QuoteResult> {
  try {
    const response = await fetch(`${apiBase()}/prices/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    })
    if (response.status === 404) return { error: "not_live" }
    if (!response.ok) return { error: "api_down" }
    const data = (await response.json()) as QuoteResponse
    if (!isQuoteResponse(data) || data.parts.length !== req.parts.length) return { error: "api_down" }
    return data
  } catch {
    return { error: "api_down" }
  }
}

function isQuoteResponse(data: unknown): data is QuoteResponse {
  const q = data as QuoteResponse
  return !!q && q.currency === "AED" && Array.isArray(q.parts) && q.parts.every((p: QuotePart) => p && typeof p.slot === "string" && STATUSES.includes(p.status) && Array.isArray(p.candidates))
}

export function isQuote(result: QuoteResult): result is QuoteResponse { return !("error" in result) }
