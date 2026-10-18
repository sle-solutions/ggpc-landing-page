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
}: {
  number: string | undefined
  buildName: string
  code: string
  totalFils?: number | null
}): string | null {
  const phone = normalizeWhatsAppNumber(number)
  if (!phone) return null

  const name = buildName.trim().slice(0, 60) || "My build"
  const total = Number.isInteger(totalFils) && totalFils! >= 0 ? `\nTotal: ${formatAed(totalFils!)}` : ""
  const message = `Hi, I'd like a quote for ${name}.${total}\n${PUBLIC_BUILD_URL}${encodeURIComponent(code)}\nWhat is your budget and which games do you play?`
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

export function configuredWhatsAppNumber(): string | undefined {
  return process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
}
