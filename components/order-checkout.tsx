"use client"

import { useRef, useState } from "react"
import type { FormEvent } from "react"
import { formatAed } from "@/lib/order/format"
import { buildWhatsAppQuoteUrl, configuredWhatsAppNumber } from "@/lib/order/whatsapp"
import { WhatsAppMark } from "@/components/retailer-brand"

export interface OrderPanelProps {
  code: string
  buildName: string
  lane: "A" | "B"
  lines: Array<{ label: string; fils: number }> // base lines from the server quote, before add-ons and any OG discount
  addOns: Array<{ id: string; name: string; priceFils: number }>
  enabled: boolean // Stripe and the sheet are configured
  blockedReason: string | null // set when this lane cannot be ordered right now
  perkCopy: string
  holdCopy: string
}

const ERRORS: Record<string, string> = {
  lane_unavailable: "Some prices changed while you were here. Reload the page to see the latest.",
  below_floor: "This order is below our minimum build fee. Please message us on Discord.",
  not_live: "We cannot check prices right now. Try again later.",
  api_down: "We cannot check prices right now. Try again in a minute.",
  sheet_unavailable: "We could not confirm checkout. Retry with the same details, or contact us before starting another order.",
  checkout_unavailable: "Checkout is unavailable right now. Ask us for a quote instead.",
}

export function OrderPanel({ code, buildName, lane, lines, addOns, enabled, blockedReason, perkCopy, holdCopy }: OrderPanelProps) {
  const [chosen, setChosen] = useState<string[]>([])
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle")
  const [error, setError] = useState("")
  const inFlight = useRef(false)
  const intent = useRef<{ selection: string; id: string } | null>(null)
  const addOnsFils = enabled ? addOns.filter(a => chosen.includes(a.id)).reduce((s, a) => s + a.priceFils, 0) : 0
  const total = lines.reduce((s, l) => s + l.fils, 0) + addOnsFils
  const canPay = enabled && !blockedReason
  const whatsappUrl = buildWhatsAppQuoteUrl({ number: configuredWhatsAppNumber(), buildName, code, lane, totalFils: blockedReason ? null : total, addOnNames: enabled && !blockedReason ? addOns.filter(a => chosen.includes(a.id)).map(a => a.name) : [] })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inFlight.current || !canPay) return
    const email = event.currentTarget.elements.namedItem("email") as HTMLInputElement
    if (!email.checkValidity()) { email.reportValidity(); return }
    const selection = JSON.stringify({ code, lane, chosen: chosen.slice().sort(), email: email.value.trim().toLowerCase() })
    if (!intent.current || intent.current.selection !== selection) intent.current = { selection, id: crypto.randomUUID() }
    inFlight.current = true
    setStatus("loading")
    setError("")
    try {
      const response = await fetch("/api/order/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, lane, addOnIds: chosen, email: email.value.trim(), intent: intent.current.id }) })
      const result = (await response.json()) as { url?: string; error?: string }
      if (!response.ok || !result.url) throw new Error(result.error ?? "checkout_failed")
      window.location.assign(result.url)
    } catch (cause) {
      setStatus("error")
      setError(ERRORS[cause instanceof Error ? cause.message : ""] ?? "We could not confirm checkout. Retry with the same details, or contact us before starting another order.")
      inFlight.current = false
    }
  }

  return (
    <aside className="order-panel frame" aria-labelledby="order-total-title">
      <h2 id="order-total-title" className="order-h2">{enabled ? "Order total" : "Build estimate"}</h2>
      {blockedReason ? <p className="order-note" role="note">{blockedReason}</p> : (
        <dl className="order-totals">
          {lines.map(l => <div key={l.label}><dt>{l.label}</dt><dd>{formatAed(l.fils)}</dd></div>)}
          {enabled && addOns.filter(a => chosen.includes(a.id)).map(a => <div key={a.id}><dt>{a.name}</dt><dd>{formatAed(a.priceFils)}</dd></div>)}
          <div className="order-total-row"><dt>Total</dt><dd>{formatAed(total)}</dd></div>
        </dl>
      )}
      {enabled && !blockedReason && addOns.length > 0 && (
        <fieldset className="order-addons">
          <legend>Add-ons</legend>
          {addOns.map(a => (
            <label key={a.id}><input type="checkbox" checked={chosen.includes(a.id)} onChange={e => setChosen(cur => e.target.checked ? [...cur, a.id] : cur.filter(x => x !== a.id))} /> <span>{a.name} <strong>{formatAed(a.priceFils)}</strong></span></label>
          ))}
        </fieldset>
      )}
      {!blockedReason && <p className="order-hint">{enabled ? holdCopy : "We will confirm the parts, availability and service quote with you before you decide."}</p>}
      <p className="order-perk">{perkCopy} <span>{enabled ? "Applied at checkout if your email is one of the first 100 waitlist signups and the perk is unused." : "Already on the waitlist? Mention it when asking for a quote so we can check your existing member benefit."}</span></p>
      {!enabled && status !== "idle" && <p className={status === "error" ? "form-error" : "order-note"} role={status === "error" ? "alert" : "status"}>{status === "loading" ? "Your earlier checkout request is still being checked. Wait for its result before starting another order." : error}</p>}
      {whatsappUrl && (
        <div className="order-whatsapp">
          {!enabled && <p>Send us this parts plan to request a quote.</p>}
          <a className="btn btn-whatsapp" href={whatsappUrl} target="_blank" rel="noopener noreferrer"><WhatsAppMark />Get a quote on WhatsApp</a>
        </div>
      )}
      {!enabled && !whatsappUrl && <p className="order-note" role="status">Quotes are unavailable right now. You can <a href="/builder">adjust your parts plan in the builder</a> and try again later.</p>}
      {enabled && <form onSubmit={submit} className="order-form" aria-busy={status === "loading"}>
        <label htmlFor="order-email">Email address</label>
        <input id="order-email" type="email" name="email" autoComplete="email" inputMode="email" placeholder="you@example.com" required maxLength={254} disabled={status === "loading" || !canPay} />
        <button type="submit" className="btn btn-primary" disabled={!canPay || status === "loading"}>
          {status === "loading" && <span className="loading-pips" aria-hidden="true"><span /><span /><span /></span>}
          <span>{blockedReason ? "Not available" : status === "loading" ? "Opening checkout..." : "Go to checkout"}</span>
        </button>
        {status === "error" && <p className="form-error" role="alert">{error}</p>}
        <p className="form-note">You pay on Stripe. GG PC never sees your card number. <a href="/terms">Terms</a> <a href="/privacy">Privacy</a></p>
      </form>}
    </aside>
  )
}
