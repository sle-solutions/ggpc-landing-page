"use client"

import { useRef, useState, type PointerEvent } from "react"
import { ArrowUpRight, Bell, Layers2, ScanLine } from "lucide-react"
import { CHROME_STORE_URL } from "@/lib/extension"
import { Sprite } from "@/components/pixel"

const moves = [
  { label: "Compare", icon: ScanLine, part: "gpu", answer: "Same GPU, different store? Match the exact model before you compare prices.", link: "See a comparison", href: "#compare-capture" },
  { label: "Check fit", icon: Layers2, part: "cpu", answer: "Picking a CPU? Its socket and BIOS support need to match your motherboard.", link: "Check your parts", href: "/guides/pc-part-compatibility" },
  { label: "Track", icon: Bell, part: "ssd", answer: "Waiting on an SSD? Set a target price in Chrome and get an alert when a price check finds it.", link: "Get the extension", href: CHROME_STORE_URL },
] as const

// A small desk PC with a face on its monitor. Its pose changes with the selected tool.
function DeskRig({ mode }: { mode: number }) {
  return (
    <svg className="desk-rig" viewBox="0 0 100 80" aria-hidden="true" shapeRendering="crispEdges">
      <g fill="#160c10">
        <path d="M42 18V8h3v10h-3zm-3-11h9v6h-9zM12 24h5v-5h5v-3h51v3h7v5h5v37h-5v5H18v-4h-6z" />
        <path d="M6 43h9v5H9v11H4V46h2zm77-6h6v6h5v-8h5v13H87v-5h-4zM24 64h8v8h-3v3H17v-5h7zm38 0h8v6h8v5H63v-3h-1z" />
      </g>
      <path fill="#a69a9b" d="M17 25h5v-5h48v3H23v4h-6z"/>
      <path fill="#e6d9ce" d="M17 27h5v-4h48v3h4v30h-4v5H21v-4h-4z"/>
      <path fill="#a49a92" d="M21 57h49v4H21zm53-31h5v31h-5z"/>
      <path fill="#4e3742" d="M79 28h3v28h-3zM30 63h32v2H30z"/>
      <path fill="#210f1a" d="M22 28h46v2h3v18h-3v3H22v-3h-2V31h2z"/>
      <g className="rig-gaze" fill="#ff7463">
        {mode === 0 && <path d="M29 34h9v9h-9zm23 0h9v9h-9z"/>}
        {mode === 1 && <path d="M28 38h3v-3h6v3h3v3h-4v-3h-4v3h-4zm22 0h3v-3h6v3h3v3h-4v-3h-4v3h-4z"/>}
        {mode === 2 && <path d="M28 36h12v4H28zm24-2h8v9h-8z"/>}
      </g>
      <path fill="#9c6a70" d="M24 54h22v2H24z"/><path fill="#d10a32" d="M62 53h5v3h-5z"/>
      <path fill="#ffb800" d="M41 7h5v4h-5z"/>
    </svg>
  )
}

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
