import { proxyIdentity } from "@/lib/identity/server"
export const dynamic = "force-dynamic"
export const revalidate = 0
export const runtime = "nodejs"
export const maxDuration = 75
type Context = { params: Promise<{ path: string[] }> }
export async function GET(request: Request, context: Context) {
  return proxyIdentity(request, (await context.params).path)
}
export async function POST(request: Request, context: Context) {
  return proxyIdentity(request, (await context.params).path)
}
