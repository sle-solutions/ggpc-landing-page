import {
  OPAQUE,
  parseAdmin,
  parseDashboard,
  parseFlow,
  FLOW_ERRORS,
} from "./protocol"

const SITE = "https://www.ggpc.app"
const API = "https://api-production-1e7d.up.railway.app/api/identity/"
const EXTENSION =
  "https://hnkngjlliafocefngenbofeddalifcjk.chromiumapp.org/ggpc-auth"
const FLOW_COOKIE = /^__Host-ggpc-flow-[A-Za-z0-9_-]{43}$/
export const PRIVATE_HEADERS = {
  "Cache-Control": "no-store, private, max-age=0",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  Vary: "Cookie",
}
export class IdentityTransportError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code)
  }
}
export function publicIdentityOrigin() {
  const raw = process.env.IDENTITY_PUBLIC_ORIGIN || SITE
  const u = new URL(raw)
  if (
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    u.pathname !== "/" ||
    (u.origin !== SITE &&
      !(
        process.env.NODE_ENV !== "production" &&
        u.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)
      ))
  )
    throw new IdentityTransportError(503, "identity_unavailable")
  return u.origin
}
export function identityExtensionRedirect() {
  const test = process.env.IDENTITY_TEST_EXTENSION_REDIRECT
  if (
    test &&
    process.env.NODE_ENV !== "production" &&
    publicIdentityOrigin() !== SITE
  ) {
    if (!/^https:\/\/[a-p]{32}\.chromiumapp\.org\/ggpc-auth$/.test(test))
      throw new IdentityTransportError(503, "identity_unavailable")
    return test
  }
  return EXTENSION
}
export function identityApiBase() {
  const u = new URL(process.env.GGPC_IDENTITY_API_URL || API)
  const local =
    process.env.NODE_ENV !== "production" &&
    u.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)
  if (
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    u.pathname.replace(/\/$/, "") !== "/api/identity" ||
    (!local && u.href !== API && u.href !== API.slice(0, -1))
  )
    throw new IdentityTransportError(503, "identity_unavailable")
  return new URL(u.href.replace(/\/$/, "") + "/")
}
export function identityCookies(raw: string | null | undefined) {
  if (!raw) return ""
  if (raw.length > 12_000)
    throw new IdentityTransportError(400, "invalid_request")
  const result: string[] = []
  for (const part of raw.split(";")) {
    const value = part.trim()
    const eq = value.indexOf("=")
    if (eq < 0) continue
    const name = value.slice(0, eq)
    if (name !== "__Host-ggpc-admin" && !FLOW_COOKIE.test(name)) continue
    if (!OPAQUE.test(value.slice(eq + 1)))
      throw new IdentityTransportError(400, "invalid_request")
    result.push(value)
  }
  return result.join("; ")
}
export function allowedIdentityRoute(path: readonly string[], method: string) {
  if (
    path.some(
      (p) =>
        !p || p.includes("/") || p.includes("\\") || /[\x00-\x20\x7f]/.test(p),
    )
  )
    return false
  const p = path.join("/")
  if (method === "GET")
    return (
      p === "browser/begin" ||
      /^flow\/[A-Za-z0-9_-]{43}$/.test(p) ||
      /^oauth\/(google|discord)\/callback$/.test(p) ||
      p === "admin/status" ||
      p === "admin/usage"
    )
  if (method === "POST")
    return (
      /^flow\/[A-Za-z0-9_-]{43}\/(password|provider\/(google|discord))$/.test(
        p,
      ) || p === "admin/logout"
    )
  return false
}
export function allowedIdentityQuery(path: string, query: URLSearchParams) {
  const keys =
    path === "browser/begin"
      ? ["intent", "mode"]
      : path === "admin/usage"
        ? ["from", "to", "version"]
        : path.startsWith("oauth/")
          ? [
              "state",
              "code",
              "iss",
              "error",
              "error_description",
              "scope",
              "authuser",
              "prompt",
              "hd",
            ]
          : []
  if (query.toString().length > 10_000) return false
  return [...query.keys()].every(
    (k) => keys.includes(k) && query.getAll(k).length === 1,
  )
}
export async function boundedText(
  response: Response,
  limit: number,
  tooLargeStatus = 502,
) {
  if (Number(response.headers.get("content-length") || 0) > limit)
    throw new IdentityTransportError(tooLargeStatus, "identity_unavailable")
  if (!response.body) return ""
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const part = await reader.read()
      if (part.done) break
      length += part.value.byteLength
      if (length > limit) {
        await reader.cancel()
        throw new IdentityTransportError(tooLargeStatus, "identity_unavailable")
      }
      chunks.push(part.value)
    }
  } finally {
    reader.releaseLock()
  }
  const joined = new Uint8Array(length)
  let offset = 0
  for (const part of chunks) {
    joined.set(part, offset)
    offset += part.byteLength
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(joined)
}
function safeSetCookie(raw: string) {
  if (raw.length > 4096 || /[\r\n]/.test(raw))
    throw new IdentityTransportError(502, "identity_unavailable")
  const pieces = raw.split(";").map((p) => p.trim()),
    pair = pieces.shift()!,
    eq = pair.indexOf("="),
    name = pair.slice(0, eq),
    value = pair.slice(eq + 1)
  if (
    (name !== "__Host-ggpc-admin" && !FLOW_COOKIE.test(name)) ||
    (value !== "" && !OPAQUE.test(value))
  )
    throw new IdentityTransportError(502, "identity_unavailable")
  const attrs = pieces.map((p) => p.toLowerCase())
  const names = attrs.map((p) => p.split("=", 1)[0])
  if (
    new Set(names).size !== names.length ||
    names.some(
      (n) =>
        ![
          "secure",
          "httponly",
          "path",
          "samesite",
          "max-age",
          "expires",
        ].includes(n),
    ) ||
    !attrs.includes("secure") ||
    !attrs.includes("httponly") ||
    !attrs.includes("path=/") ||
    !attrs.includes("samesite=lax")
  )
    throw new IdentityTransportError(502, "identity_unavailable")
  const age = attrs.find((p) => p.startsWith("max-age="))
  if (value && !age)
    throw new IdentityTransportError(502, "identity_unavailable")
  if (
    age &&
    (!/^max-age=\d+$/.test(age) ||
      Number(age.slice(8)) > (name === "__Host-ggpc-admin" ? 3600 : 600))
  )
    throw new IdentityTransportError(502, "identity_unavailable")
  const expires = attrs.find((p) => p.startsWith("expires="))
  if (expires && !Number.isFinite(Date.parse(expires.slice(8))))
    throw new IdentityTransportError(502, "identity_unavailable")
  if (
    !value &&
    age !== "max-age=0" &&
    !(expires && Date.parse(expires.slice(8)) <= Date.now())
  )
    throw new IdentityTransportError(502, "identity_unavailable")
  return raw
}
export function safeIdentityLocation(raw: string, path: string) {
  const u = new URL(raw),
    site = publicIdentityOrigin()
  if (u.username || u.password)
    throw new IdentityTransportError(502, "identity_unavailable")
  const keys = (names: string[]) =>
    [...u.searchParams.keys()].every(
      (k) => names.includes(k) && u.searchParams.getAll(k).length === 1,
    )
  if (u.origin === site && !u.hash) {
    if (
      u.pathname === "/signup" &&
      keys(["flow", "error"]) &&
      OPAQUE.test(u.searchParams.get("flow") || "") &&
      (!u.searchParams.has("error") ||
        Object.hasOwn(FLOW_ERRORS, u.searchParams.get("error")!))
    )
      return u.href
    if (u.pathname === "/admin/usage" && !u.search) return u.href
  }
  if (
    u.origin === new URL(identityExtensionRedirect()).origin &&
    u.pathname === "/ggpc-auth" &&
    !u.search &&
    (path.startsWith("oauth/") || path.endsWith("/password"))
  ) {
    const fragment = new URLSearchParams(u.hash.slice(1))
    if (
      [...fragment.keys()].length === 2 &&
      fragment.getAll("code").length === 1 &&
      fragment.getAll("state").length === 1 &&
      OPAQUE.test(fragment.get("code") || "") &&
      OPAQUE.test(fragment.get("state") || "")
    )
      return u.href
  }
  const provider = path.match(/\/provider\/(google|discord)$/)?.[1]
  if (
    provider &&
    u.protocol === "https:" &&
    !u.hash &&
    u.origin ===
      (provider === "google"
        ? "https://accounts.google.com"
        : "https://discord.com") &&
    u.pathname ===
      (provider === "google" ? "/o/oauth2/v2/auth" : "/oauth2/authorize") &&
    keys([
      "response_type",
      "client_id",
      "redirect_uri",
      "scope",
      "state",
      "code_challenge",
      "code_challenge_method",
      "nonce",
    ]) &&
    u.searchParams.get("redirect_uri") ===
      `${site}/api/identity/oauth/${provider}/callback` &&
    u.searchParams.get("response_type") === "code" &&
    u.searchParams.get("scope") ===
      (provider === "google" ? "openid email" : "identify email") &&
    u.searchParams.get("code_challenge_method") === "S256" &&
    OPAQUE.test(u.searchParams.get("state") || "") &&
    OPAQUE.test(u.searchParams.get("code_challenge") || "") &&
    (provider !== "google" || OPAQUE.test(u.searchParams.get("nonce") || ""))
  )
    return u.href
  throw new IdentityTransportError(502, "identity_unavailable")
}
function parsePublicJson(path: string, raw: unknown) {
  return path.startsWith("flow/")
    ? parseFlow(raw)
    : path === "admin/status"
      ? parseAdmin(raw)
      : path === "admin/usage"
        ? parseDashboard(raw)
        : null
}
export async function readIdentity(
  path: string,
  cookie: string,
  query = new URLSearchParams(),
  fetcher: typeof fetch = fetch,
) {
  if (
    !allowedIdentityRoute(path.split("/"), "GET") ||
    !allowedIdentityQuery(path, query)
  )
    throw new IdentityTransportError(400, "invalid_request")
  const url = new URL(path, identityApiBase())
  url.search = query.toString()
  const response = await fetcher(url, {
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(path === "admin/usage" ? 65_000 : 10_000),
    headers: { Cookie: identityCookies(cookie), Accept: "application/json" },
  })
  if (!response.ok)
    throw new IdentityTransportError(
      [400, 401, 403, 409, 410].includes(response.status)
        ? response.status
        : 503,
      "identity_unavailable",
    )
  const value = parsePublicJson(
    path,
    JSON.parse(
      await boundedText(response, path === "admin/usage" ? 512_000 : 8_192),
    ),
  )
  if (!value) throw new IdentityTransportError(502, "identity_unavailable")
  return value
}
function errorResponse(code: string, status: number) {
  return Response.json({ error: code }, { status, headers: PRIVATE_HEADERS })
}
export async function proxyIdentity(
  request: Request,
  segments: readonly string[],
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  try {
    const method = request.method,
      path = segments.join("/")
    if (!allowedIdentityRoute(segments, method))
      return errorResponse("not_found", 404)
    const inbound = new URL(request.url)
    if (!allowedIdentityQuery(path, inbound.searchParams))
      return errorResponse("invalid_request", 400)
    if (
      method === "GET" &&
      path === "browser/begin" &&
      inbound.origin !== publicIdentityOrigin()
    ) {
      const canonical = new URL(
        "/api/identity/browser/begin",
        publicIdentityOrigin(),
      )
      canonical.search = inbound.searchParams.toString()
      return new Response(null, {
        status: 303,
        headers: { ...PRIVATE_HEADERS, Location: canonical.href },
      })
    }
    let body: string | undefined
    if (method === "POST") {
      if (request.headers.get("origin") !== publicIdentityOrigin())
        return errorResponse("invalid_origin", 403)
      if (
        !/^application\/x-www-form-urlencoded(?:\s*;\s*charset=utf-8)?$/i.test(
          request.headers.get("content-type") || "",
        )
      )
        return errorResponse("invalid_content_type", 415)
      body = await boundedText(new Response(request.body), 8_192, 413)
      if (new URLSearchParams(body).size > 12)
        return errorResponse("invalid_request", 400)
    }
    const target = new URL(path, identityApiBase())
    target.search = inbound.searchParams.toString()
    const headers: Record<string, string> = {
      Accept: "application/json",
      Cookie: identityCookies(request.headers.get("cookie")),
    }
    if (method === "POST") {
      headers.Origin = publicIdentityOrigin()
      headers["Content-Type"] = "application/x-www-form-urlencoded"
    }
    const upstream = await fetcher(target, {
      method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(path === "admin/usage" ? 65_000 : 35_000),
    })
    const outgoing = new Headers(PRIVATE_HEADERS)
    const cookies = upstream.headers.getSetCookie()
    for (const cookie of cookies)
      outgoing.append("Set-Cookie", safeSetCookie(cookie))
    if (upstream.status === 303) {
      const location = upstream.headers.get("location")
      if (!location)
        throw new IdentityTransportError(502, "identity_unavailable")
      outgoing.set("Location", safeIdentityLocation(location, path))
      return new Response(null, { status: 303, headers: outgoing })
    }
    const payload: unknown = JSON.parse(
      await boundedText(upstream, path === "admin/usage" ? 512_000 : 8_192),
    )
    if (!upstream.ok) {
      const raw =
        payload && typeof payload === "object" && !Array.isArray(payload)
          ? (payload as { error?: unknown }).error
          : null
      const code =
        typeof raw === "string" && Object.hasOwn(FLOW_ERRORS, raw)
          ? raw
          : "signin_failed"
      const flow = segments[0] === "flow" ? segments[1] : null
      if (
        request.headers.get("accept")?.includes("text/html") &&
        (method === "POST" || path.startsWith("oauth/"))
      ) {
        const recovery = new URL("/signup", publicIdentityOrigin())
        if (flow && OPAQUE.test(flow)) recovery.searchParams.set("flow", flow)
        recovery.searchParams.set("error", code)
        outgoing.set("Location", recovery.href)
        return new Response(null, { status: 303, headers: outgoing })
      }
      return errorResponse(
        code,
        [400, 401, 403, 409, 410, 429].includes(upstream.status)
          ? upstream.status
          : 503,
      )
    }
    const safe = parsePublicJson(path, payload)
    if (!safe) throw new IdentityTransportError(502, "identity_unavailable")
    outgoing.set("Content-Type", "application/json; charset=utf-8")
    return new Response(JSON.stringify(safe), {
      status: upstream.status,
      headers: outgoing,
    })
  } catch (error) {
    return errorResponse(
      "identity_unavailable",
      error instanceof IdentityTransportError ? error.status : 503,
    )
  }
}
