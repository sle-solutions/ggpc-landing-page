"use client"

import { useEffect, useState } from "react"

// Phone-only join bar: appears once the hero form has scrolled away, hides while a signup form is on screen.
export function StickyCta() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const hero = document.getElementById("signup")
    const closing = document.getElementById("perks")
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
      <p><strong>First 100</strong> get OG perks</p>
      <a className="btn btn-primary" href="#closing-signup"><span>Join the waitlist</span></a>
    </div>
  )
}
