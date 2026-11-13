import Image from "next/image"
import type { RetailerId } from "@/lib/order/types"

const RETAILER_MARKS: Record<RetailerId, { file: string; width: number; height: number }> = {
  amazon_ae: { file: "amazon.webp", width: 1000, height: 336 },
  noon: { file: "noon.svg", width: 173, height: 48 },
  microless: { file: "microless-mark.webp", width: 64, height: 64 },
  gear_up: { file: "gear-up.webp", width: 268, height: 268 },
  gcc_gamers: { file: "gcc-gamers.svg", width: 478, height: 59 },
}

export function RetailerMark({ retailer }: { retailer: RetailerId }) {
  const mark = RETAILER_MARKS[retailer]
  const symbol = retailer === "gear_up"
  const scale = Math.min(40 / mark.width, 20 / mark.height)
  const width = symbol ? 20 : mark.width * scale
  const height = symbol ? 20 : mark.height * scale
  // Keep the complete retailer mark inside a definite-size viewport. The small
  // contrast mount follows its aspect ratio rather than filling every row.
  return (
    <span className={`retailer-mark-badge retailer-mark-badge-${retailer}`} aria-hidden="true">
      <span className="retailer-mark-mount">
        <span className="retailer-mark-art" style={{ width, height }}>
          <Image src={`/retailers/${mark.file}`} alt="" width={mark.width} height={mark.height} unoptimized
            style={symbol ? { position: "absolute", width: 80, height: 80, left: -9.2, top: -30.4, objectFit: "initial" } : { width, height, objectFit: "contain" }} />
        </span>
      </span>
    </span>
  )
}

export function WhatsAppMark() {
  return <Image className="whatsapp-mark" src="/retailers/whatsapp.svg" alt="" width={24} height={24} aria-hidden="true" unoptimized />
}
