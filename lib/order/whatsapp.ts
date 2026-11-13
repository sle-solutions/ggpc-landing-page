import { formatAed } from "./format"

const PUBLIC_BUILD_URL = "https://www.ggpc.app/build/"

export function normalizeWhatsAppNumber(value: string | undefined): string | null {
  return value && /^[1-9]\d{7,14}$/.test(value) ? value : null
}

export function buildWhatsAppQuoteUrl({
  number,
  buildName,
  code,
  totalFils,
  lane = "A",
  addOnNames = [],
}: {
  number: string | undefined
  buildName: string
  code: string
  totalFils?: number | null
  lane?: "A" | "B"
  addOnNames?: string[]
}): string | null {
  const phone = normalizeWhatsAppNumber(number)
  if (!phone) return null

  const name = buildName.trim().slice(0, 60) || "My build"
  const total = Number.isSafeInteger(totalFils) && totalFils! >= 0 ? `\nTotal: ${formatAed(totalFils!)}` : ""
  const service = lane === "B" ? "I buy, you build." : "Build it for me."
  const extras = addOnNames.map(name => name.trim()).filter(Boolean)
  const extraLine = extras.length ? `\nExtras: ${extras.join(", ")}` : ""
  const link = `${PUBLIC_BUILD_URL}${encodeURIComponent(code)}${lane === "B" ? "?lane=b" : ""}`
  const message = `Hi, I'd like a quote for ${name}.\n${service}${total}${extraLine}\n${link}\nBudget and games:`
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

export function configuredWhatsAppNumber(): string | undefined {
  return process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
}
