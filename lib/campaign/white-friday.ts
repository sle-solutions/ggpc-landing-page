export const WHITE_FRIDAY = {
  name: "White Friday",
  timezone: "Asia/Dubai",
  // 22 Nov 00:00 through 29 Nov 23:59:59 Dubai time.
  startsAt: Date.UTC(2026, 10, 21, 20, 0, 0),
  endsAt: Date.UTC(2026, 10, 29, 20, 0, 0),
} as const

export function isWhiteFridayActive(now: number): boolean {
  return now >= WHITE_FRIDAY.startsAt && now < WHITE_FRIDAY.endsAt
}

/** A server-only preview switch. Vercel production and production-mode local runs can never force it on. */
export function allowWhiteFridayPreview(env: { WHITE_FRIDAY_PREVIEW?: string; VERCEL_ENV?: string; NODE_ENV?: string }): boolean {
  if (env.WHITE_FRIDAY_PREVIEW !== "1") return false
  if (env.VERCEL_ENV !== undefined) return env.VERCEL_ENV !== "production"
  if (env.NODE_ENV === "production") return false
  return true
}
