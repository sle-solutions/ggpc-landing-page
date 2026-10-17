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

export function filsToAed(fils: number): number { return Number((fils / 100).toFixed(2)) }
