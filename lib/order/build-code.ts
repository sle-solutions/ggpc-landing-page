import { CORE_SLOTS, RETAILER_IDS, SLOTS } from "./types"
import type { Build, BuildPart, Candidate, QuoteRequest, RetailerId, SlotCode } from "./types"

// Build code v1: "1." + base64url(utf8(JSON.stringify([name, parts]))), no padding.
// parts = [slot, ...candidates][] where a candidate is `${RetailerId}:${retailerSku}` (split on the FIRST ":").
// The extension encodes it; this file decodes it. No prices, titles or affiliate params ever travel in the code.
export const MAX_CODE_LENGTH = 4000
const MAX_NAME = 60
const MAX_CORE = 8
const MAX_EXTRAS = 6
const MAX_CANDIDATES = 3

export type DecodeResult = { ok: true; build: Build } | { ok: false; reason: "bad_code" | "new_version" }
const bad = { ok: false, reason: "bad_code" } as const

export function decodeBuildCode(code: string): DecodeResult {
  if (typeof code !== "string" || code.length === 0 || code.length > MAX_CODE_LENGTH) return bad
  const dot = code.indexOf(".")
  if (dot < 1) return bad
  const version = code.slice(0, dot)
  if (!/^\d+$/.test(version)) return bad
  if (version !== "1") return { ok: false, reason: "new_version" }
  const body = code.slice(dot + 1)
  if (!body || !/^[A-Za-z0-9_-]+$/.test(body) || body.length % 4 === 1) return bad
  let payload: unknown
  try {
    payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.from(body, "base64url")))
  } catch { return bad }
  if (!Array.isArray(payload) || payload.length !== 2) return bad
  const [name, rawParts] = payload as [unknown, unknown]
  if (typeof name !== "string" || name.length > MAX_NAME) return bad
  if (!Array.isArray(rawParts) || rawParts.length === 0) return bad

  const parts: BuildPart[] = []
  const seen = new Set<SlotCode>()
  let core = 0
  let extras = 0
  for (const entry of rawParts) {
    if (!Array.isArray(entry) || entry.length < 1) return bad
    const [slot, ...rawCandidates] = entry as unknown[]
    if (typeof slot !== "string" || !(SLOTS as readonly string[]).includes(slot)) return bad
    const slotCode = slot as SlotCode
    if (slotCode === "EXTRA") { if (++extras > MAX_EXTRAS) return bad } else {
      if (seen.has(slotCode)) return bad
      seen.add(slotCode)
      if (++core > MAX_CORE) return bad
    }
    if (rawCandidates.length > MAX_CANDIDATES) return bad
    if (rawCandidates.length === 0 && slotCode !== "CPU_COOLER") return bad
    const candidates: Candidate[] = []
    for (const raw of rawCandidates) {
      const candidate = parseCandidate(raw)
      if (!candidate) return bad
      if (candidates.some(c => c.retailer === candidate.retailer && c.retailerSku === candidate.retailerSku)) return bad
      candidates.push(candidate)
    }
    parts.push({ slot: slotCode, candidates })
  }
  return { ok: true, build: { name, parts } }
}

function parseCandidate(raw: unknown): Candidate | null {
  if (typeof raw !== "string") return null
  const colon = raw.indexOf(":")
  if (colon < 1) return null
  const retailer = raw.slice(0, colon)
  const retailerSku = raw.slice(colon + 1)
  if (!(RETAILER_IDS as readonly string[]).includes(retailer)) return null
  if (retailerSku.length < 1 || retailerSku.length > 128 || /\s/.test(retailerSku)) return null
  return { retailer: retailer as RetailerId, retailerSku }
}

// Used by the web builder and tests (the extension has its own encoder for the same format).
export function encodeBuildCode(name: string, parts: Array<[SlotCode, ...string[]]>): string {
  return "1." + Buffer.from(JSON.stringify([name.trim().slice(0, MAX_NAME), parts]), "utf8").toString("base64url")
}

export function toQuoteRequest(build: Build): QuoteRequest {
  return { parts: build.parts.map(p => ({ slot: p.slot, candidates: p.candidates.map(c => ({ retailer: c.retailer, retailerSku: c.retailerSku })) })) }
}

export function isCoreSlot(slot: string): boolean { return (CORE_SLOTS as readonly string[]).includes(slot) }
