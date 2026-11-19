import { Sprite } from "./pixel"
import type { CoreSlot } from "@/lib/order/builder-catalog"

const slotSprites = { CPU: "cpu", CPU_COOLER: "cooler", MOTHERBOARD: "motherboard", RAM: "ram", STORAGE: "ssd", GPU: "gpu", POWER_SUPPLY: "psu", CASE: "rig" } as const

export function PartSprite({ slot }: { slot: CoreSlot }) {
  return <span className="studio-icon"><Sprite name={slotSprites[slot]} scale={2} /></span>
}
