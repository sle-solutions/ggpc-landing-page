"use client"

import { useEffect, useState } from "react"
import { InstallButton } from "@/components/install-button"

// Phone-only install bar; hidden while the hero or final actions are visible.
export function StickyCta() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const hero = document.getElementById("install")
    const closing = document.getElementById("get-started")
    if (!hero || !closing || !("IntersectionObserver" in window)) return
    const state = { heroVisible: true, heroAbove: false, closingVisible: false }
    const update = () => setShow(!state.heroVisible && state.heroAbove && !state.closingVisible)
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.target === hero) { state.heroVisible = entry.isIntersecting; state.heroAbove = entry.boundingClientRect.top < 0 }
        else state.closingVisible = entry.isIntersecting
      }
      update()
    })
    observer.observe(hero)
    observer.observe(closing)
    return () => observer.disconnect()
  }, [])

  return (
    <div className={`sticky-cta${show ? " is-visible" : ""}`} aria-hidden={!show} inert={!show}>
      <p><strong>GG PC</strong><br />UAE only · AED</p>
      <InstallButton />
    </div>
  )
}
