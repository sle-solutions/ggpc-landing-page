"use client"

import { useRef, useState } from "react"
import type { FormEvent } from "react"
import { Glyph } from "@/components/pixel"
import { assembly, budgets, goals, useBuildBrief } from "./build-brief"
import type { BuildBrief } from "./build-brief"

const formNames: Record<string, string> = { signup: "Hero", "closing-signup": "Closing" }
const notPicked = "Not picked"

// Field names and values here are what lands in the Web3Forms email and the waitlist sheet.
export function signupDetails(id: string, email: string, brief: BuildBrief) {
  const params = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search)
  const picks = [brief.goal, brief.budget, brief.path].filter(Boolean).length
  return {
    email,
    form: formNames[id] ?? id,
    class: brief.goal ? goals[brief.goal].role : notPicked,
    use_case: brief.goal ? goals[brief.goal].label : notPicked,
    budget: brief.budget ? budgets[brief.budget] : notPicked,
    build_preference: brief.path ? assembly[brief.path] : notPicked,
    picks_made: `${picks}/3`,
    brief_complete: picks === 3 ? "Yes" : "No",
    page: typeof window === "undefined" ? "" : window.location.origin + window.location.pathname,
    referrer: typeof document === "undefined" ? "" : document.referrer,
    utm_source: params.get("utm_source") ?? "",
    utm_medium: params.get("utm_medium") ?? "",
    utm_campaign: params.get("utm_campaign") ?? "",
  }
}

export function WaitlistForm({ id, dark = false, buttonLabel = "Join the waitlist", note = "Early access news and launch updates. Unsubscribe anytime." }: { id: string; dark?: boolean; buttonLabel?: string; note?: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [error, setError] = useState("")
  const inFlight = useRef(false)
  const { brief } = useBuildBrief()
  const briefReady = Boolean(brief.goal && brief.budget && brief.path)
  const [savedBrief, setSavedBrief] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current) return
    const form = event.currentTarget
    const emailInput = form.elements.namedItem("email") as HTMLInputElement
    if (!emailInput.checkValidity()) { emailInput.reportValidity(); return }
    inFlight.current = true
    setStatus("loading")
    setError("")
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 15000)
    try {
      const data = new FormData(form)
      const signup = signupDetails(id, emailInput.value.trim(), brief)
      for (const [key, value] of Object.entries(signup)) data.set(key, value)
      data.set("access_key", "2bb892bf-772b-4881-8bd5-8c0ed44423c6")
      data.set("subject", "New GGPC Waitlist Signup")
      data.set("from_name", "GGPC Landing Page")
      // The sheet copy is best effort: Web3Forms decides success, and a repeat signup just updates the row.
      void fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...signup, botcheck: data.get("botcheck") ? "1" : "" }), keepalive: true }).catch(() => undefined)
      const response = await fetch("https://api.web3forms.com/submit", { method: "POST", body: data, signal: controller.signal })
      const result = await response.json()
      if (!response.ok || result.success !== true) throw new Error("submission")
      setStatus("success")
      setSavedBrief(briefReady)
      form.reset()
    } catch (cause) {
      setStatus("error")
      setError(cause instanceof DOMException && cause.name === "AbortError" ? "That took too long. Please try again." : "We could not save your email. Please try again.")
    } finally {
      window.clearTimeout(timeout)
      inFlight.current = false
    }
  }

  return (
    <div id={id} className={`waitlist${dark ? " waitlist-dark" : ""}`}>
      {status === "success" ? (
        <div className="signup-success" role="status" aria-live="polite" tabIndex={-1}>
          <span className="success-icon"><Glyph name="trophy" size={32} /></span>
          <div><strong>You&apos;re on the list.</strong><p>{savedBrief ? "Quest complete. Your build brief is saved with your signup." : "We'll email you early access news and launch updates."}</p></div>
        </div>
      ) : (
        <form onSubmit={submit} aria-label="Join the GG PC waitlist" aria-busy={status === "loading"}>
          {briefReady && <p className="signup-brief"><Glyph name="check" size={16} /> Build brief attached: {goals[brief.goal!].label} <span aria-hidden="true">·</span> {budgets[brief.budget!]}</p>}
          <label htmlFor={`${id}-email`}>Email address</label>
          <div className="signup-fields">
            <input id={`${id}-email`} type="email" name="email" autoComplete="email" inputMode="email" placeholder="you@example.com" required maxLength={254} aria-describedby={`${id}-note${status === "error" ? ` ${id}-error` : ""}`} disabled={status === "loading"} />
            <input type="checkbox" name="botcheck" className="honeypot" tabIndex={-1} aria-hidden="true" />
            <button type="submit" className="btn btn-primary" disabled={status === "loading"}>
              {status === "loading" && <span className="loading-pips" aria-hidden="true"><span /><span /><span /></span>}
              <span>{status === "loading" ? "Joining..." : buttonLabel}</span>
            </button>
          </div>
          {status === "error" && <p id={`${id}-error`} className="form-error" role="alert">{error}</p>}
          <p id={`${id}-note`} className="form-note">{note} <a href="/privacy">Privacy</a></p>
        </form>
      )}
    </div>
  )
}
