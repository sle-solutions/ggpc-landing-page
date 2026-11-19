"use client"

import { useEffect } from "react"

export function LandingMotion() {
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.setAttribute("data-arrived", "")
        observer.unobserve(entry.target)
      }
    }, { threshold: 0.2 })
    document.querySelectorAll("#main-content [data-arrival]").forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])
  return null
}
