import {
  flowError,
  OPAQUE,
  parseAdmin,
  parseDashboard,
  parseFlow,
  type Flow,
  type UsageDashboard,
} from "./protocol"
import { readIdentity, IdentityTransportError } from "./server"
type Params = Record<string, string | string[] | undefined>
type Reader = (
  path: string,
  cookie: string,
  query?: URLSearchParams,
) => Promise<unknown>
export type SignupPageModel = {
  id?: string
  flow: Flow | null
  error: string | null
}
export async function loadSignupPage(
  params: Params,
  cookie: string,
  reader: Reader = readIdentity,
): Promise<SignupPageModel> {
  const id =
    typeof params.flow === "string" && OPAQUE.test(params.flow)
      ? params.flow
      : undefined
  let flow: Flow | null = null,
    error = flowError(params.error)
  if (id) {
    try {
      flow = parseFlow(await reader(`flow/${id}`, cookie))
      if (!flow) error = flowError("identity_unavailable")
    } catch (e) {
      error =
        e instanceof IdentityTransportError && e.status === 410
          ? flowError("flow_expired")
          : flowError("identity_unavailable")
    }
  }
  return { id, flow, error }
}
export type UsagePageModel = {
  authorized: boolean
  data: UsageDashboard | null
  csrf?: string
  error?: string
  query?: Record<string, string>
}
export async function loadUsagePage(
  params: Params,
  cookie: string,
  reader: Reader = readIdentity,
): Promise<UsagePageModel> {
  let admin
  try {
    admin = parseAdmin(await reader("admin/status", cookie))
  } catch (e) {
    return {
      authorized: false,
      data: null,
      ...(!(
        e instanceof IdentityTransportError && [401, 403].includes(e.status)
      ) && {
        error: "Dashboard sign-in is unavailable right now. Try again shortly.",
      }),
    }
  }
  if (!admin) return { authorized: false, data: null }
  const query: Record<string, string> = {},
    invalid = Object.keys(params).some(
      (k) =>
        !["from", "to", "version"].includes(k) || typeof params[k] !== "string",
    )
  if (invalid)
    return {
      authorized: true,
      data: null,
      csrf: admin.csrf,
      error:
        "Choose one date range and extension version. Reset the filters to try again.",
    }
  for (const [key, value] of Object.entries(params))
    if (typeof value === "string" && !(key === "version" && value === ""))
      query[key] = value
  try {
    const data = parseDashboard(
      await reader("admin/usage", cookie, new URLSearchParams(query)),
    )
    return {
      authorized: true,
      csrf: admin.csrf,
      data,
      query,
      ...(!data && {
        error: "The usage report could not be read. Try again shortly.",
      }),
    }
  } catch (e) {
    if (e instanceof IdentityTransportError && [401, 403].includes(e.status))
      return { authorized: false, data: null }
    return {
      authorized: true,
      csrf: admin.csrf,
      data: null,
      query,
      error:
        e instanceof IdentityTransportError && e.status === 400
          ? "Choose a valid date range within the last 30 UTC days and an available extension version."
          : "Usage data is unavailable right now. Try Apply filters again shortly.",
    }
  }
}
