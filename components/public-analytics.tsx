"use client"
import { usePathname } from "next/navigation"
import { Analytics } from "@vercel/analytics/next"
import {
  privateIdentityPath,
  privateReceiptPath,
  allowPublicPageAnalytics,
} from "@/lib/identity/protocol"
/** Authentication, private dashboard and order-receipt pages never mount a page-analytics sender. */
export function PublicAnalytics() {
  const path = usePathname()
  return !path || privateIdentityPath(path) || privateReceiptPath(path) ? null : (
    <Analytics
      beforeSend={(event) =>
        allowPublicPageAnalytics(event.url) ? event : null
      }
    />
  )
}
