import assert from "node:assert/strict"
import { test } from "node:test"
import { NextRequest } from "next/server"
import { renderToStaticMarkup } from "react-dom/server"
import { JSDOM } from "jsdom"
import { readFileSync } from "node:fs"
import { SignupView } from "../components/signup-view"
import {
  UsageView,
  dailySeries,
  retainedRange,
} from "../components/usage-dashboard"
import { loadSignupPage, loadUsagePage } from "../lib/identity/pages"
import {
  FLOW_ERRORS,
  OPAQUE,
  TERMS_VERSION,
  PRIVACY_VERSION,
  USAGE_CONSENT_VERSION,
  parseFlow,
  parseAdmin,
  parseDashboard,
  privateIdentityPath,
  allowPublicPageAnalytics,
  type UsageDashboard,
} from "../lib/identity/protocol"
import {
  IdentityTransportError,
  allowedIdentityQuery,
  allowedIdentityRoute,
  boundedText,
  identityCookies,
  proxyIdentity,
  readIdentity,
  safeIdentityLocation,
} from "../lib/identity/server"
const FLOW = "A".repeat(43),
  COOKIE = "B".repeat(43),
  CSRF = "C".repeat(43)
const META = {
  kind: "extension" as const,
  providers: { google: false, discord: false },
  csrf: CSRF,
  termsVersion: TERMS_VERSION,
  privacyVersion: PRIVACY_VERSION,
  usageConsentVersion: USAGE_CONSENT_VERSION,
  providerStarted: false,
}
const URL_ROOT = "https://www.ggpc.app/api/identity/"
function report(): UsageDashboard {
  return {
    generatedAt: "2026-11-13T12:00:00.000Z",
    filters: {
      from: "2026-11-12",
      to: "2026-11-13",
      version: null,
      timezone: "UTC",
      retentionDays: 30,
    },
    summary: { events: 0, users: 0, sessions: 0 },
    daily: [],
    features: [],
    buckets: [],
    paths: [],
    repeated: [],
    cohorts: [],
    funnel: {
      opened: 0,
      searched: 0,
      compared: 0,
      built: 0,
      planned: 0,
      websiteHandoff: 0,
    },
    versions: [],
    population: { eligibleAccounts: 0, currentlyConsentingAccounts: 0 },
    notices: [],
  }
}
function doc(markup: React.ReactNode) {
  return new JSDOM(renderToStaticMarkup(markup)).window.document
}
function post(
  path: string,
  body = "csrf=" + CSRF,
  extra: Record<string, string> = {},
) {
  return new Request(URL_ROOT + path, {
    method: "POST",
    headers: {
      Origin: "https://www.ggpc.app",
      "Content-Type": "application/x-www-form-urlencoded",
      ...extra,
    },
    body,
  })
}
const providerURL = (provider: "google" | "discord") => {
  const u = new URL(
    provider === "google"
      ? "https://accounts.google.com/o/oauth2/v2/auth"
      : "https://discord.com/oauth2/authorize",
  )
  u.search = new URLSearchParams({
    client_id: "test",
    response_type: "code",
    redirect_uri: `https://www.ggpc.app/api/identity/oauth/${provider}/callback`,
    scope: provider === "google" ? "openid email" : "identify email",
    state: FLOW,
    code_challenge: CSRF,
    code_challenge_method: "S256",
    ...(provider === "google" ? { nonce: COOKIE } : {}),
  }).toString()
  return u.href
}

test("signup metadata cannot carry credentials, unknown providers or stale policy versions", () => {
  assert.deepEqual(parseFlow(META), META)
  for (const bad of [
    { ...META, token: "secret" },
    { ...META, providers: { ...META.providers, github: true } },
    { ...META, csrf: "short" },
    { ...META, termsVersion: "old" },
    { ...META, usageConsentVersion: "old" },
    { ...META, kind: "arbitrary" },
  ])
    assert.equal(parseFlow(bad), null)
})

test("admin metadata is closed and never accepts a member or credential payload", () => {
  assert.deepEqual(parseAdmin({ admin: true, csrf: CSRF }), {
    admin: true,
    csrf: CSRF,
  })
  assert.equal(parseAdmin({ admin: false, csrf: CSRF }), null)
  assert.equal(parseAdmin({ admin: true, csrf: CSRF, token: COOKIE }), null)
})

test("disabled providers stay disabled and analytics consent is independent and unchecked", () => {
  const d = doc(<SignupView flow={META} id={FLOW} />)
  const providers = [
    ...d.querySelectorAll<HTMLButtonElement>("button[formaction]"),
  ]
  assert.equal(providers.length, 2)
  assert.ok(providers.every((b) => b.disabled))
  assert.match(d.body.textContent!, /not configured yet/)
  assert.equal(d.querySelectorAll("input[name=usageConsent]").length, 2)
  for (const input of d.querySelectorAll<HTMLInputElement>(
    "input[name=usageConsent]",
  )) {
    assert.equal(input.checked, false)
    assert.equal(input.required, false)
  }
  for (const input of d.querySelectorAll<HTMLInputElement>(
    "input[name=acceptTerms]",
  ))
    assert.equal(input.required, true)
  assert.equal(d.querySelector('input[autocomplete="new-password"]'), null)
  assert.match(
    d.body.textContent!,
    /New password signup and password-reset emails are not available/,
  )
  assert.ok(
    [...d.querySelectorAll("form")].every(
      (f) =>
        f.method === "post" &&
        f.getAttribute("action")?.startsWith(`/api/identity/flow/${FLOW}/`),
    ),
  )
})

test("configured providers have exact distinct actions and existing password credentials stay in POST bodies", () => {
  const d = doc(
    <SignupView
      flow={{ ...META, providers: { google: true, discord: true } }}
      id={FLOW}
    />,
  )
  assert.equal(
    d.querySelector<HTMLButtonElement>(`button[formaction$='/google']`)
      ?.disabled,
    false,
  )
  assert.equal(
    d.querySelector<HTMLButtonElement>(`button[formaction$='/discord']`)
      ?.disabled,
    false,
  )
  const password = d.querySelector("input[name=password]")!
  assert.equal(password.getAttribute("type"), "password")
  assert.equal(password.getAttribute("autocomplete"), "current-password")
  assert.equal(password.getAttribute("value"), null)
  assert.equal(
    password.closest("form")?.getAttribute("action"),
    `/api/identity/flow/${FLOW}/password`,
  )
  assert.equal(d.querySelectorAll('form[method="get"]').length, 0)
})

test("missing or already-started flows do not expose working credential forms", () => {
  assert.equal(
    doc(<SignupView flow={null} />).querySelectorAll("form").length,
    0,
  )
  const started = doc(
    <SignupView flow={{ ...META, providerStarted: true }} id={FLOW} />,
  )
  assert.equal(started.querySelectorAll("form").length, 0)
  assert.match(started.body.textContent!, /Finish the open sign-in/)
  const admin = doc(<SignupView flow={{ ...META, kind: "admin" }} id={FLOW} />)
  assert.equal(admin.querySelectorAll('input[name="usageConsent"]').length, 0)
  assert.match(
    admin.body.textContent!,
    /does not change your existing analytics choice/,
  )
})

test("the proxy route allowlist excludes extension exchange, mutation and arbitrary targets", () => {
  for (const path of [
    ["extension", "intents"],
    ["extension", "exchange"],
    ["usage-consent"],
    ["admin", "users"],
    ["https:", "evil.example"],
    ["flow", FLOW + "/password"],
    ["flow", "..", "password"],
  ])
    for (const method of ["GET", "POST", "PUT"])
      assert.equal(allowedIdentityRoute(path, method), false)
  assert.equal(
    allowedIdentityRoute(["flow", FLOW, "provider", "google"], "POST"),
    true,
  )
  assert.equal(allowedIdentityRoute(["admin", "usage"], "POST"), false)
  assert.equal(allowedIdentityRoute(["admin", "logout"], "GET"), false)
})

test("duplicate and unknown query parameters are rejected, normal Google callback extras are bounded", () => {
  assert.equal(
    allowedIdentityQuery(
      "admin/usage",
      new URLSearchParams("from=2026-11-12&from=2026-11-13"),
    ),
    false,
  )
  assert.equal(
    allowedIdentityQuery(
      "flow/" + FLOW,
      new URLSearchParams("target=https://evil.example"),
    ),
    false,
  )
  assert.equal(
    allowedIdentityQuery(
      "oauth/google/callback",
      new URLSearchParams(
        "state=" +
          FLOW +
          "&code=test&scope=openid+email&authuser=0&prompt=consent",
      ),
    ),
    true,
  )
  assert.equal(
    allowedIdentityQuery(
      "oauth/google/callback",
      new URLSearchParams("code=" + "x".repeat(11000)),
    ),
    false,
  )
})

test("only exact HttpOnly identity-cookie names are sent upstream", () => {
  assert.equal(
    identityCookies(
      `other=private; __Host-ggpc-flow-${FLOW}=${COOKIE}; tracking=yes; __Host-ggpc-admin=${CSRF}`,
    ),
    `__Host-ggpc-flow-${FLOW}=${COOKIE}; __Host-ggpc-admin=${CSRF}`,
  )
  assert.equal(identityCookies("unrelated=secret"), "")
  assert.throws(() => identityCookies("__Host-ggpc-admin=wrong"))
  assert.throws(() => identityCookies("x".repeat(12001)))
})

test("blocked requests never contact the identity API", async () => {
  let calls = 0
  const fetcher = (async () => {
    calls++
    throw Error("must not send")
  }) as typeof fetch
  for (const request of [
    new Request(URL_ROOT + "extension/exchange", { method: "POST" }),
    post(`flow/${FLOW}/password`, "x=1", { Origin: "https://evil.example" }),
    post(`flow/${FLOW}/password`, "x=1", {
      "Content-Type": "application/json",
    }),
    new Request(URL_ROOT + "admin/usage?from=a&from=b"),
  ]) {
    const path = new URL(request.url).pathname
      .replace("/api/identity/", "")
      .split("/")
    const response = await proxyIdentity(request, path, fetcher)
    assert.ok(response.status >= 400)
    assert.match(response.headers.get("cache-control")!, /no-store/)
  }
  assert.equal(calls, 0)
})

test("proxy forwards bounded credentials only to the fixed API, without bearer or unrelated cookies", async () => {
  let got: any
  const response = await proxyIdentity(
    post(`flow/${FLOW}/password`, "csrf=" + CSRF + "&password=test-only", {
      Authorization: "Bearer never-forward",
      Cookie: `private=never-forward; __Host-ggpc-flow-${FLOW}=${COOKIE}`,
    }),
    ["flow", FLOW, "password"],
    (async (url, init) => {
      got = { url: String(url), ...init }
      return new Response(null, {
        status: 303,
        headers: {
          Location: `https://www.ggpc.app/signup?flow=${FLOW}&error=invalid_credentials`,
        },
      })
    }) as typeof fetch,
  )
  assert.equal(response.status, 303)
  assert.equal(
    got.url,
    `https://api-production-1e7d.up.railway.app/api/identity/flow/${FLOW}/password`,
  )
  assert.equal(got.headers.Authorization, undefined)
  assert.equal(got.headers.Cookie, `__Host-ggpc-flow-${FLOW}=${COOKIE}`)
  assert.equal(got.redirect, "manual")
  assert.equal(got.cache, "no-store")
  assert.equal(got.body, "csrf=" + CSRF + "&password=test-only")
  assert.equal(response.headers.get("referrer-policy"), "no-referrer")
})

test("oversized forms are stopped before upstream transport", async () => {
  let calls = 0
  const r = await proxyIdentity(
    post(`flow/${FLOW}/password`, "password=" + "x".repeat(8300)),
    ["flow", FLOW, "password"],
    (async () => {
      calls++
      return Response.json({})
    }) as typeof fetch,
  )
  assert.equal(r.status, 413)
  assert.equal(calls, 0)
  await assert.rejects(boundedText(new Response("12345"), 4))
})

test("unsafe cookies and redirects cannot escape through the proxy", async () => {
  for (const headers of [
    { Location: "https://evil.example/" },
    {
      Location: `https://www.ggpc.app/signup?flow=${FLOW}`,
      "Set-Cookie": `__Host-ggpc-admin=${COOKIE}; Secure; HttpOnly; SameSite=Lax; Path=/; Domain=ggpc.app`,
    },
    {
      Location: `https://www.ggpc.app/signup?flow=${FLOW}`,
      "Set-Cookie": "unrelated=secret; Secure; HttpOnly; SameSite=Lax; Path=/",
    },
    {
      Location: `https://www.ggpc.app/signup?flow=${FLOW}`,
      "Set-Cookie": `__Host-ggpc-admin=${COOKIE}; HttpOnly; SameSite=Lax; Path=/`,
    },
  ]) {
    const r = await proxyIdentity(
      new Request(URL_ROOT + "browser/begin?mode=admin"),
      ["browser", "begin"],
      (async () =>
        new Response(null, {
          status: 303,
          headers: headers as Record<string, string>,
        })) as typeof fetch,
    )
    assert.equal(r.status, 502)
    assert.equal(r.headers.get("set-cookie"), null)
    assert.equal(r.headers.get("location"), null)
  }
})

test("safe same-host cookies are preserved independently without exposing them in JSON", async () => {
  const headers = new Headers({
    Location: `https://www.ggpc.app/signup?flow=${FLOW}`,
  })
  headers.append(
    "Set-Cookie",
    `__Host-ggpc-flow-${FLOW}=${COOKIE}; Max-Age=600; Path=/; HttpOnly; Secure; SameSite=Lax`,
  )
  const r = await proxyIdentity(
    new Request(URL_ROOT + "browser/begin?mode=admin"),
    ["browser", "begin"],
    (async () => new Response(null, { status: 303, headers })) as typeof fetch,
  )
  assert.equal(r.status, 303)
  assert.equal(r.headers.getSetCookie().length, 1)
  assert.equal(await r.text(), "")
})

test("redirects remain bound to exact provider callback and extension handoff", () => {
  for (const provider of ["google", "discord"] as const) {
    assert.equal(
      safeIdentityLocation(
        providerURL(provider),
        `flow/${FLOW}/provider/${provider}`,
      ),
      providerURL(provider),
    )
    assert.throws(() =>
      safeIdentityLocation(
        providerURL(provider).replace(
          encodeURIComponent(
            "https://www.ggpc.app/api/identity/oauth/" + provider + "/callback",
          ),
          encodeURIComponent("https://evil.example/callback"),
        ),
        `flow/${FLOW}/provider/${provider}`,
      ),
    )
  }
  const handoff = `https://hnkngjlliafocefngenbofeddalifcjk.chromiumapp.org/ggpc-auth#code=${COOKIE}&state=${CSRF}`
  assert.equal(safeIdentityLocation(handoff, `flow/${FLOW}/password`), handoff)
  for (const bad of [
    handoff + "&token=secret",
    handoff.replace("/ggpc-auth", "/other"),
    handoff.replace("chromiumapp.org", "chromiumapp.org.evil.example"),
  ])
    assert.throws(() => safeIdentityLocation(bad, `flow/${FLOW}/password`))
})

test("unexpected API JSON cannot leak a token, identity or raw diagnostic", async () => {
  for (const payload of [
    { ...META, token: "secret" },
    { stack: "sensitive", error: "internal raw password data" },
  ]) {
    const r = await proxyIdentity(
      new Request(URL_ROOT + `flow/${FLOW}`),
      ["flow", FLOW],
      (async () => Response.json(payload)) as typeof fetch,
    )
    assert.equal(r.status, 502)
    assert.doesNotMatch(await r.text(), /secret|password|stack/)
  }
  const r = await proxyIdentity(
    new Request(URL_ROOT + "admin/status"),
    ["admin", "status"],
    (async () =>
      Response.json(
        { error: "secret stack" },
        { status: 401 },
      )) as typeof fetch,
  )
  assert.equal(r.status, 401)
  assert.deepEqual(await r.json(), { error: "signin_failed" })
})

test("ordinary member and missing admin sessions cannot receive usage data", async () => {
  for (const status of [401, 403]) {
    const r = await proxyIdentity(
      new Request(URL_ROOT + "admin/usage"),
      ["admin", "usage"],
      (async () =>
        Response.json(
          { error: "admin_sign_in_required" },
          { status },
        )) as typeof fetch,
    )
    assert.equal(r.status, status)
    assert.match(r.headers.get("cache-control")!, /no-store/)
    assert.doesNotMatch(await r.text(), /events|sessions|users/)
  }
  const d = doc(<UsageView authorized={false} data={report()} />)
  assert.equal(d.querySelector(".usage-summary"), null)
  assert.equal(d.querySelector(".usage-filters"), null)
  assert.match(d.body.textContent!, /Admin sign-in required/)
  assert.equal(
    d.querySelector('a[href="/api/identity/browser/begin?mode=admin"]')
      ?.textContent,
    "Admin sign-in",
  )
})

test("valid empty reporting remains empty and real filters are server GET controls", () => {
  const d = doc(<UsageView authorized csrf={CSRF} data={report()} />)
  assert.match(d.body.textContent!, /No feature events in this range/)
  assert.match(d.body.textContent!, /Nonconsenting activity is not measured/)
  assert.equal(d.querySelectorAll("svg rect").length, 0)
  assert.equal(
    d.querySelector('form[aria-label="Usage filters"]')?.getAttribute("method"),
    "get",
  )
  assert.equal(
    d
      .querySelector('form[action="/api/identity/admin/logout"]')
      ?.getAttribute("method"),
    "post",
  )
  assert.equal(d.querySelectorAll('input[name="csrf"]').length, 1)
  assert.equal(d.querySelectorAll('input[value="' + COOKIE + '"]').length, 0)
})

test("aggregate parser rejects user-level fields, invalid counts and browsing paths", () => {
  assert.ok(parseDashboard(report()))
  for (const bad of [
    { ...report(), userId: "private" },
    { ...report(), notices: ["private diagnostic must not escape"] },
    { ...report(), summary: { events: -1, users: 1, sessions: 1 } },
    {
      ...report(),
      paths: [{ path: "https://store.example/private", sessions: 3 }],
    },
    { ...report(), paths: [{ path: "search > product", sessions: 2 }] },
    {
      ...report(),
      buckets: [
        {
          event: "panel_open",
          outcome: "success",
          error: null,
          durationBucket: "0",
          resultBucket: null,
          events: 1,
        },
      ],
    },
    { ...report(), filters: { ...report().filters, from: "2026-02-30" } },
  ])
    assert.equal(parseDashboard(bad), null)
})

test("ordered funnel, missing days and bucket nulls preserve their actual meaning", () => {
  const r = report()
  r.summary = { events: 10, users: 2, sessions: 3 }
  r.daily = [{ day: "2026-11-13", events: 10, users: 2, sessions: 3 }]
  r.features = [
    {
      event: "panel_open",
      outcome: "success",
      events: 3,
      users: 2,
      sessions: 3,
    },
  ]
  r.funnel = {
    opened: 3,
    searched: 2,
    compared: 1,
    built: 1,
    planned: 0,
    websiteHandoff: 0,
  }
  r.paths = [{ path: "search > product > build", sessions: 3 }]
  r.buckets = [
    {
      event: "panel_open",
      outcome: "success",
      error: null,
      durationBucket: null,
      resultBucket: 0,
      events: 3,
    },
  ]
  assert.ok(parseDashboard(r))
  assert.deepEqual(
    dailySeries(r).map((x) => x.events),
    [0, 10],
  )
  const d = doc(<UsageView authorized csrf={CSRF} data={r} />)
  assert.match(d.body.textContent!, /Search → Part details → My build/)
  assert.match(d.body.textContent!, /Not measured/)
  assert.match(d.body.textContent!, /first event observed within this range/)
  assert.ok(d.querySelectorAll('div[role="region"][tabindex="0"]').length >= 5)
  assert.equal(d.querySelectorAll("svg rect").length, 2)
})

test("retention filter calendar is UTC and includes exactly thirty days", () => {
  assert.deepEqual(retainedRange(new Date("2026-11-13T23:59:00Z")), {
    min: "2026-10-15",
    max: "2026-11-13",
  })
})

test("auth and admin pages exclude analytics and carry private headers/robots", async () => {
  for (const path of [
    "/signup",
    "/signup/child",
    "/admin",
    "/admin/usage",
    "/api/identity/flow/test",
  ])
    assert.equal(privateIdentityPath(path), true)
  assert.equal(privateIdentityPath("/guides/signup"), false)
  assert.equal(privateIdentityPath("/administer"), false)
  assert.equal(
    allowPublicPageAnalytics("https://www.ggpc.app/signup?flow=" + FLOW),
    false,
  )
  assert.equal(
    allowPublicPageAnalytics("https://www.ggpc.app/admin/usage"),
    false,
  )
  assert.equal(allowPublicPageAnalytics("https://www.ggpc.app/builder"), true)
  const root = readFileSync(
    new URL("../app/layout.tsx", import.meta.url),
    "utf8",
  )
  assert.match(root, /<PublicAnalytics\s*\/>/)
  assert.doesNotMatch(root, /<Analytics\s*\/>/)
  const analytics = readFileSync(
    new URL("../components/public-analytics.tsx", import.meta.url),
    "utf8",
  )
  assert.match(
    analytics,
    /privateIdentityPath\(path\)[\s\S]*?null[\s\S]*?<Analytics/,
  )
  const config = (await import("../next.config.mjs")).default
  const headers = (await config.headers()) as {
    source: string
    headers: { key: string; value: string }[]
  }[]
  for (const path of ["/signup", "/admin/:path*", "/api/identity/:path*"]) {
    const row = headers.find((r: { source: string }) => r.source === path)!
    assert.ok(row)
    assert.match(
      row.headers.find((h: { key: string }) => h.key === "Cache-Control")!
        .value,
      /no-store/,
    )
    assert.equal(
      row.headers.find((h: { key: string }) => h.key === "Referrer-Policy")!
        .value,
      path === "/api/identity/:path*" ? "no-referrer" : "strict-origin",
    )
    assert.match(
      row.headers.find(
        (h: { key: string }) => h.key === "Content-Security-Policy",
      )!.value,
      /connect-src 'self'/,
    )
  }
})

test("rendered policy versions explain account-linked consent without claiming anonymous usage", async () => {
  const Privacy = (await import("../app/privacy/page")).default,
    Terms = (await import("../app/terms/page")).default
  const privacy = doc(<Privacy />).body.textContent!,
    terms = doc(<Terms />).body.textContent!
  for (const pattern of [
    /0\.2\.5 requires account sign-in/,
    /account-linked and pseudonymous, not anonymous/,
    /withdraw consent/,
    /thirty days/,
    /not every hosting\/security log or restricted recovery copy/,
    /separate from public price sharing/,
  ])
    assert.match(privacy, pattern)
  assert.match(privacy, /Limited Use requirements/)
  assert.match(privacy, /including information received from Google APIs/)
  assert.match(terms, /without enabling it/)
  assert.match(
    terms,
    /versions 0\.2\.3 and 0\.2\.4 retain their optional-account behavior/,
  )
  assert.equal(OPAQUE.test(CSRF), true)
  assert.ok(FLOW_ERRORS.terms_required)
})

test("server page loader denies all report reads before an authorized admin check", async () => {
  for (const state of [
    null,
    { admin: false, csrf: CSRF },
    { admin: true, csrf: CSRF, token: "secret" },
  ]) {
    const calls: string[] = []
    const result = await loadUsagePage({}, "cookie", async (path) => {
      calls.push(path)
      return state
    })
    assert.equal(result.authorized, false)
    assert.equal(result.data, null)
    assert.deepEqual(calls, ["admin/status"])
  }
  for (const status of [401, 403]) {
    const result = await loadUsagePage({}, "cookie", async () => {
      throw new IdentityTransportError(status, "denied")
    })
    assert.equal(result.authorized, false)
    assert.equal(result.data, null)
  }
})

test("server page loader revalidates protected report access and fails closed if revoked between reads", async () => {
  const calls: string[] = []
  const result = await loadUsagePage({}, "cookie", async (path) => {
    calls.push(path)
    if (path === "admin/status") return { admin: true, csrf: CSRF }
    throw new IdentityTransportError(401, "revoked")
  })
  assert.equal(result.authorized, false)
  assert.equal(result.csrf, undefined)
  assert.equal(result.data, null)
  assert.deepEqual(calls, ["admin/status", "admin/usage"])
})

test("server report loader omits empty all-version filter and rejects duplicate or unknown filter shapes", async () => {
  let observed: URLSearchParams | undefined
  const reader = async (
    path: string,
    _cookie: string,
    query?: URLSearchParams,
  ) => {
    if (path === "admin/status") return { admin: true, csrf: CSRF }
    observed = query
    return report()
  }
  const result = await loadUsagePage(
    { version: "", from: "2026-11-12", to: "2026-11-13" },
    "cookie",
    reader,
  )
  assert.equal(result.authorized, true)
  assert.deepEqual(result.data, report())
  assert.equal(observed?.has("version"), false)
  for (const query of [
    { from: ["a", "b"] },
    { target: "https://evil.example" },
  ]) {
    observed = undefined
    const invalid = await loadUsagePage(query, "cookie", reader)
    assert.equal(invalid.data, null)
    assert.equal(observed, undefined)
    assert.match(invalid.error!, /Choose one date range/)
  }
})

test("server signup loader never sends malformed flow IDs or raw errors to a view", async () => {
  let calls = 0
  const bad = await loadSignupPage(
    { flow: [FLOW, FLOW], error: "secret-diagnostic" },
    "cookie",
    async () => {
      calls++
      return META
    },
  )
  assert.equal(calls, 0)
  assert.equal(bad.flow, null)
  assert.equal(bad.error, FLOW_ERRORS.signin_failed)
  const expired = await loadSignupPage({ flow: FLOW }, "cookie", async () => {
    throw new IdentityTransportError(410, "internal")
  })
  assert.equal(expired.error, FLOW_ERRORS.flow_expired)
  assert.equal(expired.flow, null)
  const valid = await loadSignupPage({ flow: FLOW }, "cookie", async () => META)
  assert.deepEqual(valid.flow, META)
})

test("reports outside the thirty-day bound and unretained selected versions are not misrepresented", () => {
  assert.equal(
    parseDashboard({
      ...report(),
      filters: { ...report().filters, from: "2026-01-01" },
    }),
    null,
  )
  const d = doc(
    <UsageView
      authorized
      csrf={CSRF}
      data={report()}
      query={{ version: "99.0.0" }}
    />,
  )
  const option = d.querySelector('option[value="99.0.0"]')!
  assert.match(option.textContent!, /no retained events/)
  assert.equal(option.hasAttribute("selected"), true)
})

test("browser begin creates its binding only on the canonical website host", async () => {
  let calls = 0
  const r = await proxyIdentity(
    new Request("https://ggpc.app/api/identity/browser/begin?mode=admin"),
    ["browser", "begin"],
    (async () => {
      calls++
      throw Error("must not call upstream on alias")
    }) as typeof fetch,
  )
  assert.equal(r.status, 303)
  assert.equal(r.headers.get("location"), URL_ROOT + "browser/begin?mode=admin")
  assert.equal(r.headers.get("set-cookie"), null)
  assert.equal(calls, 0)
  assert.match(r.headers.get("cache-control")!, /no-store/)
})

test("both provider and password forms bind the exact analytics policy version", () => {
  const d = doc(<SignupView flow={META} id={FLOW} />)
  assert.equal(
    d.querySelectorAll('input[name="usageConsentVersion"]').length,
    2,
  )
  for (const field of d.querySelectorAll<HTMLInputElement>(
    'input[name="usageConsentVersion"]',
  ))
    assert.equal(field.value, USAGE_CONSENT_VERSION)
  const { usageConsentVersion, ...old } = META
  assert.ok(usageConsentVersion)
  assert.equal(parseFlow(old), null)
})

test("server reads send only named cookies and reject a poisoned metadata response", async () => {
  let seen: any
  const result = await readIdentity(
    `flow/${FLOW}`,
    `private=do-not-forward; __Host-ggpc-flow-${FLOW}=${COOKIE}`,
    new URLSearchParams(),
    (async (url, init) => {
      seen = { url: String(url), ...init }
      return Response.json(META)
    }) as typeof fetch,
  )
  assert.deepEqual(result, META)
  assert.equal(seen.headers.Cookie, `__Host-ggpc-flow-${FLOW}=${COOKIE}`)
  assert.equal(seen.redirect, "manual")
  assert.equal(seen.cache, "no-store")
  assert.equal(seen.headers.Authorization, undefined)
  await assert.rejects(
    readIdentity("admin/status", "", new URLSearchParams(), (async () =>
      Response.json({
        admin: true,
        csrf: CSRF,
        token: "never-view",
      })) as typeof fetch),
    (e) => e instanceof IdentityTransportError && e.status === 502,
  )
  let calls = 0
  await assert.rejects(
    readIdentity("extension/exchange", "", new URLSearchParams(), (async () => {
      calls++
      return Response.json({})
    }) as typeof fetch),
  )
  assert.equal(calls, 0)
})

test("cookie attributes cannot override the strict host-only policy and logout can clear it", async () => {
  for (const cookie of [
    `__Host-ggpc-admin=${COOKIE}; Secure; HttpOnly; SameSite=Lax; Path=/; Path=/evil; Max-Age=3600`,
    `__Host-ggpc-admin=${COOKIE}; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=3601`,
    `__Host-ggpc-admin=${COOKIE}; Secure; HttpOnly; SameSite=Lax; Path=/`,
    `__Host-ggpc-admin=; Secure; HttpOnly; SameSite=Lax; Path=/`,
  ]) {
    const r = await proxyIdentity(
      new Request(URL_ROOT + "browser/begin?mode=admin"),
      ["browser", "begin"],
      (async () =>
        new Response(null, {
          status: 303,
          headers: {
            Location: `https://www.ggpc.app/signup?flow=${FLOW}`,
            "Set-Cookie": cookie,
          },
        })) as typeof fetch,
    )
    assert.equal(r.status, 502)
    assert.equal(r.headers.get("set-cookie"), null)
  }
  const clear =
    "__Host-ggpc-admin=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax"
  const r = await proxyIdentity(
    post("admin/logout"),
    ["admin", "logout"],
    (async () =>
      new Response(null, {
        status: 303,
        headers: {
          Location: "https://www.ggpc.app/admin/usage",
          "Set-Cookie": clear,
        },
      })) as typeof fetch,
  )
  assert.equal(r.status, 303)
  assert.equal(r.headers.get("set-cookie"), clear)
})

test("real NextRequest loopback normalization cannot redirect canonical browser begin to itself", async () => {
  const prior = {
    mode: process.env.NODE_ENV,
    origin: process.env.IDENTITY_PUBLIC_ORIGIN,
  }
  try {
    Object.assign(process.env, {
      NODE_ENV: "test",
      IDENTITY_PUBLIC_ORIGIN: "http://127.0.0.1:3768",
    })
    const request = new NextRequest(
      "http://127.0.0.1:3768/api/identity/browser/begin?mode=admin",
      { headers: { host: "127.0.0.1:3768" } },
    )
    assert.equal(
      new URL(request.url).hostname,
      "localhost",
      "Exercise the installed NextRequest normalization, not a plain Request",
    )
    let calls = 0
    const response = await proxyIdentity(
      request,
      ["browser", "begin"],
      (async () => {
        calls++
        return new Response(null, {
          status: 303,
          headers: {
            Location: `http://127.0.0.1:3768/signup?flow=${FLOW}`,
            "Set-Cookie": `__Host-ggpc-flow-${FLOW}=${COOKIE}; Max-Age=600; Path=/; HttpOnly; Secure; SameSite=Lax`,
          },
        })
      }) as typeof fetch,
    )
    assert.equal(calls, 1)
    assert.equal(new URL(response.headers.get("location")!).pathname, "/signup")
    assert.match(
      response.headers.get("set-cookie")!,
      /HttpOnly; Secure; SameSite=Lax/,
    )
    for (const [url, host] of [
      ["http://localhost:3768", "localhost:3768"],
      ["http://127.0.0.1:9999", "127.0.0.1:9999"],
      ["http://evil.invalid:3768", "127.0.0.1:3768"],
    ]) {
      const alias = new NextRequest(
        url + "/api/identity/browser/begin?mode=admin",
        { headers: { host } },
      )
      const result = await proxyIdentity(
        alias,
        ["browser", "begin"],
        (async () => {
          throw Error("alias must not reach API")
        }) as typeof fetch,
      )
      assert.equal(result.status, 303)
      assert.equal(
        result.headers.get("location"),
        "http://127.0.0.1:3768/api/identity/browser/begin?mode=admin",
      )
      assert.equal(result.headers.get("set-cookie"), null)
    }
    const wrongOrigin = await proxyIdentity(
      new NextRequest("http://127.0.0.1:3768/api/identity/admin/logout", {
        method: "POST",
        headers: {
          host: "127.0.0.1:3768",
          origin: "http://localhost:3768",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: "csrf=" + CSRF,
      }),
      ["admin", "logout"],
    )
    assert.equal(wrongOrigin.status, 403)
    Object.assign(process.env, { NODE_ENV: "production" })
    const productionLocal = await proxyIdentity(request, ["browser", "begin"])
    assert.equal(
      productionLocal.status,
      503,
      "Local identity overrides remain forbidden in production",
    )
    delete process.env.IDENTITY_PUBLIC_ORIGIN
    const productionAlias = await proxyIdentity(
      new NextRequest(
        "https://ggpc.app/api/identity/browser/begin?mode=admin",
        { headers: { host: "www.ggpc.app" } },
      ),
      ["browser", "begin"],
    )
    assert.equal(productionAlias.status, 303)
    assert.equal(
      productionAlias.headers.get("location"),
      URL_ROOT + "browser/begin?mode=admin",
      "An untrusted Host must not override production request origin",
    )
  } finally {
    if (prior.mode === undefined)
      delete (process.env as Record<string, string | undefined>).NODE_ENV
    else Object.assign(process.env, { NODE_ENV: prior.mode })
    if (prior.origin === undefined) delete process.env.IDENTITY_PUBLIC_ORIGIN
    else process.env.IDENTITY_PUBLIC_ORIGIN = prior.origin
  }
})

test("form referrer metadata preserves Origin while opaque, missing and foreign origins stay denied", async () => {
  for (const pathname of [
    "../app/signup/page.tsx",
    "../app/admin/usage/page.tsx",
  ]) {
    const source = readFileSync(new URL(pathname, import.meta.url), "utf8")
    assert.match(source, /referrer:\s*"strict-origin"/)
    assert.doesNotMatch(source, /referrer:\s*"no-referrer"/)
  }
  let calls = 0
  const fetcher = (async () => {
    calls++
    return Response.json({ error: "invalid_csrf" }, { status: 403 })
  }) as typeof fetch
  for (const origin of [
    null,
    "null",
    "https://evil.invalid",
    "https://ggpc.app",
  ]) {
    const headers: Record<string, string> = {
      "content-type": "application/x-www-form-urlencoded",
      referer: "https://www.ggpc.app/",
    }
    if (origin !== null) headers.origin = origin
    const response = await proxyIdentity(
      new NextRequest(URL_ROOT + `flow/${FLOW}/password`, {
        method: "POST",
        headers,
        body: "csrf=" + CSRF,
      }),
      ["flow", FLOW, "password"],
      fetcher,
    )
    assert.equal(response.status, 403)
    assert.deepEqual(await response.json(), { error: "invalid_origin" })
  }
  assert.equal(calls, 0, "A same-origin Referer never substitutes for Origin")
  const response = await proxyIdentity(
    post(`flow/${FLOW}/password`),
    ["flow", FLOW, "password"],
    fetcher,
  )
  assert.equal(calls, 1)
  assert.equal(response.status, 403)
  assert.deepEqual(
    await response.json(),
    { error: "invalid_csrf" },
    "Preserving Origin does not bypass server CSRF checks",
  )
  assert.equal(
    response.headers.get("referrer-policy"),
    "no-referrer",
    "API responses keep the stricter redirect policy",
  )
})
