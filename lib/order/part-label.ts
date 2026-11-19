import { normalizePart } from "../pc-engine/shared/specs"
import { cleanTitle } from "./format"
import type { LoadoutPart } from "./loadouts"

/** Keep the listing and SKU intact. Only the short label belongs in a parts row. */
export function partLabel(part: LoadoutPart): string {
  const title = cleanTitle(part.title)
  const normalized = part.slot === "EXTRA" ? null : normalizePart({ title }, { category: part.slot })
  const name = cleanTitle(normalized?.displayName || part.name).replace(/^(\S+)\s+\1\b/i, "$1")
  if (name && name.toLowerCase() !== normalized?.brand?.toLowerCase() && name.length < 62 && !name.endsWith("...")) return name
  const lead = title.split(/\s[|–—]\s|,\s|\s+-\s+/)[0] || title
  return lead.length > 60 ? lead.slice(0, 59).replace(/\s+\S*$/, "") + "…" : lead
}
