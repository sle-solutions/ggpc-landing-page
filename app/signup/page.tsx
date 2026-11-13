import type { Metadata } from "next"
import { cookies } from "next/headers"
import { SignupView } from "@/components/signup-view"
import { loadSignupPage } from "@/lib/identity/pages"
export const dynamic = "force-dynamic"
export const revalidate = 0
export const metadata: Metadata = {
  title: "Sign in | GG PC",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
  alternates: { canonical: "/signup" },
}
export default async function Signup({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <SignupView
      {...await loadSignupPage(
        await searchParams,
        (await cookies()).toString(),
      )}
    />
  )
}
