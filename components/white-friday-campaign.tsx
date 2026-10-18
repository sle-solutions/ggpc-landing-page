"use client"

import { useEffect, useState } from "react"
import { WHITE_FRIDAY, isWhiteFridayActive } from "@/lib/campaign/white-friday"

const MAX_TIMER = 2_147_000_000

function useCampaignActive(forcePreview: boolean) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const update = () => {
      const now = Date.now()
      setActive(forcePreview || isWhiteFridayActive(now))
      clearTimeout(timer)
      if (forcePreview || now >= WHITE_FRIDAY.endsAt) return
      const nextBoundary = now < WHITE_FRIDAY.startsAt ? WHITE_FRIDAY.startsAt : WHITE_FRIDAY.endsAt
      timer = setTimeout(update, Math.min(nextBoundary - now + 25, MAX_TIMER))
    }
    update()
    document.addEventListener("visibilitychange", update)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("visibilitychange", update)
    }
  }, [forcePreview])

  return active
}

export function WhiteFridayBanner({ forcePreview = false }: { forcePreview?: boolean }) {
  const active = useCampaignActive(forcePreview)
  if (!active) return null
  return (
    <aside className="white-friday-banner" aria-label="White Friday campaign">
      <div className="page-width white-friday-inner">
        <p><strong>WHITE FRIDAY · 22 to 29 NOV</strong><span>Live price drops. Existing fees. Check the price, check the fit.</span></p>
        <a className="btn btn-primary" href="/builder">Check a build</a>
      </div>
    </aside>
  )
}

export function WhiteFridayBuilderPromo({ forcePreview = false }: { forcePreview?: boolean }) {
  const active = useCampaignActive(forcePreview)
  if (!active) return null
  return (
    <aside className="white-friday-builder frame" aria-label="White Friday build check">
      <div>
        <p className="white-friday-kicker">WHITE FRIDAY · 22 to 29 NOV</p>
        <p>Live price drops. Existing fees. Pick a budget to check current UAE prices and part fit. Want a second opinion? Get a WhatsApp quote from a live build.</p>
      </div>
      <a className="btn btn-ghost" href="#loadout-result">Check this budget</a>
    </aside>
  )
}
