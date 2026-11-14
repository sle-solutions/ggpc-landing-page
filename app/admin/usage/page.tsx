import type { Metadata } from "next"
import { cookies } from "next/headers"
import { UsageView } from "@/components/usage-dashboard"
import { loadUsagePage } from "@/lib/identity/pages"
export const dynamic = "force-dynamic"
export const revalidate = 0
export const maxDuration = 75
export const metadata: Metadata = {
  title: "Feature usage | GG PC",
  robots: { index: false, follow: false },
  referrer: "strict-origin",
  alternates: { canonical: "/admin/usage" },
}
export default async function Usage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <UsageView
      {...await loadUsagePage(await searchParams, (await cookies()).toString())}
    />
  )
}
