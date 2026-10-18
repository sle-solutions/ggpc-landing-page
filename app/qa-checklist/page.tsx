import type { Metadata } from "next"
import { QaChecklist } from "@/components/qa-checklist"

export const metadata: Metadata = {
  title: "Build QA checklist | GG PC",
  robots: { index: false, follow: false },
}

export default function QaChecklistPage() {
  return <QaChecklist />
}
