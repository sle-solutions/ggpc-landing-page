"use client"

import { useRef, useState, type PointerEvent } from "react"
import { ArrowUpRight, Bell, Layers2, ScanLine } from "lucide-react"
import { CHROME_STORE_URL } from "@/lib/extension"
import { Sprite } from "@/components/pixel"

import { DeskRig } from "@/components/desk-rig"

const moves = [
  { label: "Compare", icon: ScanLine, part: "gpu", answer: "Same GPU, different store? Match the exact model before you compare prices.", link: "See a comparison", href: "#compare-capture" },
  { label: "Check fit", icon: Layers2, part: "cpu", answer: "Picking a CPU? Its socket and BIOS support need to match your motherboard.", link: "Check your parts", href: "/guides/pc-part-compatibility" },
  { label: "Track", icon: Bell, part: "ssd", answer: "Waiting on an SSD? Set a target price in Chrome and get an alert when a price check finds it.", link: "Get the extension", href: CHROME_STORE_URL },
] as const

export function Loadout() {
  const [mode, setMode] = useState(0)
  const stage = useRef<HTMLDivElement>(null)
  const move = moves[mode]
  function glance(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return
    const rect = event.currentTarget.getBoundingClientRect()
    stage.current?.style.setProperty("--look", ((event.clientX - rect.left) / rect.width * 4 - 2).toFixed(1) + "px")
  }
  return (
    <section className="rig-console" aria-label="Try the GG PC tools">
      <div className="rig-stage" ref={stage} onPointerMove={glance} onPointerLeave={() => stage.current?.style.removeProperty("--look")} aria-hidden="true">
        <div className="rig-shadow" />
        <div className="rig-pose" key={move.label}><DeskRig mode={mode} /></div>
        <div className="rig-thought"><Sprite key={move.part} name={move.part} scale={3} eager /></div>
      </div>
      <div className="rig-moves" role="group" aria-label="Choose a tool">
        {moves.map((item, index) => (
          <button key={item.label} type="button" aria-pressed={index === mode} onClick={() => setMode(index)}>
            <item.icon size={16} aria-hidden="true" />{item.label}
          </button>
        ))}
      </div>
      <div className="rig-answer" aria-live="polite" aria-atomic="true">
        <p>{move.answer}</p>
        <a href={move.href} target={mode === 2 ? "_blank" : undefined} rel={mode === 2 ? "noopener noreferrer" : undefined}>{move.link}<ArrowUpRight size={16} aria-hidden="true" /></a>
      </div>
    </section>
  )
}
