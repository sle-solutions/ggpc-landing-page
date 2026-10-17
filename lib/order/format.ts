// Pure helpers shared by server and client components. Money is integer fils.
export function formatAed(fils: number): string {
  const aed = fils / 100
  return `AED ${aed.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(aed) ? 0 : 2, maximumFractionDigits: 2 })}`
}

export function seenAgo(ageSeconds: number | null): string {
  if (ageSeconds === null || ageSeconds < 0) return "price age unknown"
  if (ageSeconds < 3600) return `seen ${Math.max(1, Math.round(ageSeconds / 60))} min ago`
  if (ageSeconds < 172800) return `seen ${Math.round(ageSeconds / 3600)} h ago`
  return `seen ${Math.round(ageSeconds / 86400)} days ago`
}

// Store titles sometimes arrive double-encoded: UTF-8 bytes read as Latin-1 ("650â\x80\x931750") or Windows-1252
// ("Itâ€™s"). Re-decode those runs, then turn dashes into plain hyphens.
const CP1252: Array<[RegExp, string]> = [[/â€[“”]/g, "-"], [/â€[˜™]/g, "'"], [/â€œ/g, '"'], [/â„¢/g, "™"], [/Â([®°©±·])/g, "$1"]]
export function cleanTitle(title: string): string {
  let t = title.replace(/[Â-ô][\u0080-¿]{1,3}/g, run => {
    const fixed = new TextDecoder("utf-8").decode(Uint8Array.from(run, ch => ch.charCodeAt(0)))
    return fixed.includes("�") ? run : fixed
  })
  for (const [re, to] of CP1252) t = t.replace(re, to)
  return t.replace(/[–—]/g, "-").replace(/[\u0080-\u009f]/g, "").replace(/\s+/g, " ").trim()
}

export function filsToAed(fils: number): number { return Number((fils / 100).toFixed(2)) }
