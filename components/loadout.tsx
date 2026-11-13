import { Sprite } from "@/components/pixel"
import type { SpriteName } from "@/lib/pixel-art"

// Slot borders show the part's price tier in the example build, not a quality rating.
export const tiers = {
  low: { name: "Amber", range: "under AED 700" },
  mid: { name: "Orange", range: "AED 700 to 2,000" },
  high: { name: "Red", range: "over AED 2,000" },
} as const
type Tier = keyof typeof tiers
type Slot = { label: string; item: string; sprite: SpriteName; scale: number; tier: Tier; selected?: boolean }

const left: Slot[] = [
  { label: "CPU", item: "Ryzen 7 7700X", sprite: "cpu", scale: 3, tier: "mid" },
  { label: "Memory", item: "32GB DDR5 6000", sprite: "ram", scale: 2, tier: "low" },
  { label: "Storage", item: "2TB NVMe SSD", sprite: "ssd", scale: 2, tier: "low" },
]
const right: Slot[] = [
  { label: "GPU", item: "RTX 4070 Ti SUPER", sprite: "gpu", scale: 2, tier: "high", selected: true },
  { label: "Board", item: "B650 motherboard", sprite: "motherboard", scale: 2, tier: "mid" },
  { label: "Power", item: "850W Gold PSU", sprite: "psu", scale: 2, tier: "low" },
]

function SlotList({ slots, side }: { slots: Slot[]; side: string }) {
  return (
    <ul className={`slots slots-${side}`}>
      {slots.map(slot => (
        <li key={slot.label} className={`slot tier-${slot.tier}${slot.selected ? " is-selected" : ""}`}>
          <span className="slot-tile"><Sprite name={slot.sprite} scale={slot.scale} eager /></span>
          <span className="slot-label">{slot.label}</span>
          <span className="sr-only">: {slot.item}, {tiers[slot.tier].name.toLowerCase()} price tier{slot.selected ? ", selected" : ""}</span>
        </li>
      ))}
    </ul>
  )
}

export function Loadout() {
  return (
    <figure className="loadout" aria-labelledby="loadout-caption">
      <div className="loadout-stage frame">
        <p className="stage-bar"><span>Loadout</span><span className="stage-fit">Plan your parts</span></p>
        <div className="stage-body">
          <SlotList slots={left} side="left" />
          <div className="doll">
            <div className="doll-inner">
              <Sprite name="spotlight" className="doll-light" eager />
              <Sprite name="rig" scale={6} className="doll-rig" eager />
            </div>
          </div>
          <SlotList slots={right} side="right" />
        </div>
        <dl className="stage-stats">
          <div><dt>Build plan</dt><dd>Your picks</dd></div>
          <div><dt>Before buying</dt><dd>Check fit</dd></div>
        </dl>
        <ul className="tier-key" aria-label="Slot border colours show price tiers">
          {(Object.keys(tiers) as Tier[]).map(tier => <li key={tier} className={`tier-${tier}`}><span className="tier-swatch" aria-hidden="true" />{tiers[tier].range}</li>)}
        </ul>
      </div>
      <div className="tooltip frame" role="group" aria-label="How to inspect a graphics card">
        <p className="tip-name">Inspect your part.</p>
        <p className="tip-type">Graphics card planning checklist</p>
        <dl className="tip-stats">
          <div><dt>Model</dt><dd>Match exactly</dd></div>
          <div><dt>Size</dt><dd>Check clearance</dd></div>
          <div><dt>Connectors</dt><dd>Check the PSU</dd></div>
          <div><dt>Memory</dt><dd>Fit your games</dd></div>
        </dl>
        <p className="tip-fit">Check the exact model, power supply and case clearance before buying.</p>
        <div className="tip-vendors"><p className="tip-heading">Your next move</p><p>Compare the same model across supported UAE stores. Check the observation time and confirm price and stock with the retailer.</p></div>
        <p className="tip-flavor">Your parts list. Your call.</p>
      </div>
      <figcaption id="loadout-caption" className="loadout-note">Illustration of a parts plan, not an extension screenshot, live offer or compatibility result.</figcaption>
    </figure>
  )
}
