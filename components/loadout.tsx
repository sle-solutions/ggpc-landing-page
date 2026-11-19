"use client"

import { useState } from "react"
import { Sprite } from "@/components/pixel"

const parts = [
  { slot: "GPU", sprite: "gpu", name: "Graphics card", tip: "Check the card length against your case clearance." },
  { slot: "CPU", sprite: "cpu", name: "Processor", tip: "Match the socket and check the board’s CPU support list." },
  { slot: "RAM", sprite: "ram", name: "Memory", tip: "Match the memory type to the board. DDR4 and DDR5 use different slots." },
  { slot: "SSD", sprite: "ssd", name: "Storage", tip: "Check which drive sizes and interfaces your board supports." },
] as const

export function Loadout() {
  const [selected, setSelected] = useState(0)
  const part = parts[selected]
  return (
    <figure className="parts-bench">
      <figcaption className="bench-bar"><span>Parts inspector</span><small>Illustration</small></figcaption>
      <div className="bench-drawing" aria-hidden="true">
        <div className="bench-case"><Sprite name="rig" scale={6} eager /></div>
        <span className="bench-leader" />
        <div className="bench-detail"><Sprite key={part.sprite} name={part.sprite} scale={6} eager /></div>
      </div>
      <div className="bench-tray" role="group" aria-label="Choose a part to inspect">
        {parts.map((item, index) => (
          <button key={item.slot} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}>
            <Sprite name={item.sprite} scale={2} eager />{item.slot}
          </button>
        ))}
      </div>
      <div className="bench-readout" aria-live="polite" aria-atomic="true">
        <strong>{part.name}</strong><p>{part.tip}</p>
      </div>
    </figure>
  )
}
