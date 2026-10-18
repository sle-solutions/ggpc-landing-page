import Image from "next/image"
import type { RetailerId } from "@/lib/order/types"

const RETAILER_MARKS: Record<RetailerId, { file: string; width: number; height: number }> = {
  amazon_ae: { file: "amazon.webp", width: 1000, height: 335 },
  noon: { file: "noon.svg", width: 173, height: 48 },
  microless: { file: "microless-mark.webp", width: 64, height: 64 },
  gear_up: { file: "gear-up.webp", width: 268, height: 268 },
  gcc_gamers: { file: "gcc-gamers.svg", width: 478, height: 59 },
}

export function RetailerMark({ retailer }: { retailer: RetailerId }) {
  const mark = RETAILER_MARKS[retailer]
  return (
    <span className={`retailer-mark-badge retailer-mark-badge-${retailer}`} aria-hidden="true">
      <Image src={`/retailers/${mark.file}`} alt="" width={mark.width} height={mark.height} unoptimized />
    </span>
  )
}

export function WhatsAppMark() {
  return <Image className="whatsapp-mark" src="/retailers/whatsapp.svg" alt="" width={24} height={24} aria-hidden="true" unoptimized />
}
