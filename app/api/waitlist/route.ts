import { NextResponse } from "next/server"

// Mirrors each waitlist signup into the "GG PC Waitlist" Google Sheet via its Apps Script web app
// (scripts/waitlist-sheet.gs). Web3Forms still gets the signup from the browser for email alerts.
// Apps Script cold starts can take 10s+, and the browser fires this with keepalive, so give it room.
export const maxDuration = 60

const FIELDS = ["form", "class", "use_case", "budget", "build_preference", "picks_made", "brief_complete", "page", "referrer", "utm_source", "utm_medium", "utm_campaign"] as const

export async function POST(request: Request) {
  const url = process.env.WAITLIST_SHEET_URL
  const secret = process.env.WAITLIST_SHEET_SECRET
  if (!url || !secret) {
    console.error("Waitlist sheet is not configured: set WAITLIST_SHEET_URL and WAITLIST_SHEET_SECRET")
    return NextResponse.json({ ok: false }, { status: 503 })
  }

  let input: Record<string, unknown>
  try { input = await request.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : ""
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || input.botcheck) return NextResponse.json({ ok: false }, { status: 400 })

  const row: Record<string, string> = { email, source: "Landing page" }
  for (const key of FIELDS) if (typeof input[key] === "string") row[key] = (input[key] as string).slice(0, 500)

  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...row, secret }), signal: AbortSignal.timeout(55000) })
    const result = await response.json()
    if (!response.ok || result.ok !== true) throw new Error(result.error ?? `HTTP ${response.status}`)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Waitlist sheet write failed:", error)
    return NextResponse.json({ ok: false }, { status: 502 })
  }
}
