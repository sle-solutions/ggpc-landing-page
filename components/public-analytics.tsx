"use client"
import { usePathname } from "next/navigation"
import { Analytics } from "@vercel/analytics/next"
import {
  privateIdentityPath,
  allowPublicPageAnalytics,
} from "@/lib/identity/protocol"
/** Authentication and private dashboard pages never mount a page-analytics sender. */
export function PublicAnalytics() {
  const path = usePathname()
  return !path || privateIdentityPath(path) ? null : (
    <Analytics
      beforeSend={(event) =>
        allowPublicPageAnalytics(event.url) ? event : null
      }
    />
  )
}
