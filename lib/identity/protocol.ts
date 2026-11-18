/** Closed public contracts for account pages. No credential belongs in a view model. */
export const OPAQUE = /^[A-Za-z0-9_-]{43}$/
export const TERMS_VERSION = "2026-11-13-v1"
export const PRIVACY_VERSION = "2026-11-13-v1"
export const USAGE_CONSENT_VERSION = "2026-11-13-v1"
const DASHBOARD_NOTICES = [
  "Only opted-in accounts are measured. Nonconsenting usage is not measured.",
  "Consent population is current, not a reconstruction of historical consent.",
  "Common screen paths require at least three sessions; adjacent repeats are collapsed and paths stop after 20 screens.",
  "Cohorts begin at the first event observed in this date range, not first-ever activation.",
] as const
export const PRIVATE_PATHS = ["/signup", "/admin", "/api/identity"] as const
export function privateIdentityPath(path: string) {
  return PRIVATE_PATHS.some(
    (prefix) => path === prefix || path.startsWith(prefix + "/"),
  )
}
// Receipt URLs can contain a provider session reference; exclude only this order path.
export function privateReceiptPath(path: string) {
  const receipt = /^\/build\/[^/]+\/done\/?$/
  if (receipt.test(path)) return true
  try { return receipt.test(decodeURIComponent(path)) } catch { return false }
}
export function allowPublicPageAnalytics(url: string) {
  try {
    const path = new URL(url, "https://www.ggpc.app").pathname
    return !privateIdentityPath(path) && !privateReceiptPath(path)
  } catch {
    return false
  }
}
export type Flow = {
  kind: "extension" | "admin"
  providers: { google: boolean; discord: boolean }
  csrf: string
  termsVersion: string
  privacyVersion: string
  usageConsentVersion: string
  providerStarted: boolean
}
const object = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x)
const only = (x: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(x).every((k) => keys.includes(k))
export function parseFlow(x: unknown): Flow | null {
  if (
    !object(x) ||
    !only(x, [
      "kind",
      "providers",
      "csrf",
      "termsVersion",
      "privacyVersion",
      "usageConsentVersion",
      "providerStarted",
    ]) ||
    !["extension", "admin"].includes(String(x.kind)) ||
    !object(x.providers) ||
    !only(x.providers, ["google", "discord"]) ||
    typeof x.providers.google !== "boolean" ||
    typeof x.providers.discord !== "boolean" ||
    typeof x.csrf !== "string" ||
    !OPAQUE.test(x.csrf) ||
    x.termsVersion !== TERMS_VERSION ||
    x.privacyVersion !== PRIVACY_VERSION ||
    x.usageConsentVersion !== USAGE_CONSENT_VERSION ||
    typeof x.providerStarted !== "boolean"
  )
    return null
  return x as Flow
}
export function parseAdmin(x: unknown): { admin: true; csrf: string } | null {
  return object(x) &&
    only(x, ["admin", "csrf"]) &&
    x.admin === true &&
    typeof x.csrf === "string" &&
    OPAQUE.test(x.csrf)
    ? { admin: true, csrf: x.csrf }
    : null
}
export const EVENT_NAMES = [
  "panel_open",
  "screen_view",
  "search_completed",
  "comparison_completed",
  "build_part_added",
  "compatibility_opened",
  "tracking_started",
  "tracking_check_completed",
  "purchase_plan_opened",
  "website_handoff",
] as const
export const SCREENS = [
  "page",
  "search",
  "build",
  "alerts",
  "settings",
  "product",
  "plan",
] as const
export const ERRORS = [
  "unavailable",
  "blocked",
  "invalid",
  "storage",
  "timeout",
] as const
export type EventName = (typeof EVENT_NAMES)[number]
export const EVENT_LABELS: Record<EventName, string> = {
  panel_open: "Panel opened",
  screen_view: "Screen viewed",
  search_completed: "Search completed",
  comparison_completed: "Comparison completed",
  build_part_added: "Part added to build",
  compatibility_opened: "Compatibility opened",
  tracking_started: "Tracking started",
  tracking_check_completed: "Tracking checked",
  purchase_plan_opened: "Purchase plan opened",
  website_handoff: "Website handoff",
}
export const SCREEN_LABELS: Record<(typeof SCREENS)[number], string> = {
  page: "This page",
  search: "Search",
  build: "My build",
  alerts: "Alerts",
  settings: "Settings",
  product: "Part details",
  plan: "Purchase plan",
}
export type CountRow = { events: number; users: number; sessions: number }
export type UsageDashboard = {
  generatedAt: string
  filters: {
    from: string
    to: string
    version: string | null
    timezone: "UTC"
    retentionDays: 30
  }
  summary: CountRow
  daily: ({ day: string } & CountRow)[]
  features: ({ event: EventName; outcome: "success" | "failure" } & CountRow)[]
  buckets: {
    event: EventName
    outcome: "success" | "failure"
    error: (typeof ERRORS)[number] | null
    durationBucket: 0 | 1 | 2 | 3 | null
    resultBucket: 0 | 1 | 2 | 3 | null
    events: number
  }[]
  paths: { path: string; sessions: number }[]
  repeated: { bucket: "1" | "2-3" | "4-7" | "8+"; users: number }[]
  cohorts: { week: string; users: number; repeatUsers: number }[]
  funnel: {
    opened: number
    searched: number
    compared: number
    built: number
    planned: number
    websiteHandoff: number
  }
  versions: { version: string }[]
  population: { eligibleAccounts: number; currentlyConsentingAccounts: number }
  notices: string[]
}
const count = (n: unknown): n is number =>
  Number.isSafeInteger(n) && Number(n) >= 0
const version = (v: unknown): v is string =>
  typeof v === "string" && /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v)
export function isDay(d: unknown): d is string {
  if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false
  const date = new Date(d + "T00:00:00Z")
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === d
}
const counts = (x: Record<string, unknown>) =>
  count(x.events) && count(x.users) && count(x.sessions)
function rows(
  x: unknown,
  limit: number,
  predicate: (row: Record<string, unknown>) => boolean,
) {
  return (
    Array.isArray(x) &&
    x.length <= limit &&
    x.every((r) => object(r) && predicate(r))
  )
}
export function parseDashboard(x: unknown): UsageDashboard | null {
  if (
    !object(x) ||
    !only(x, [
      "generatedAt",
      "filters",
      "summary",
      "daily",
      "features",
      "buckets",
      "paths",
      "repeated",
      "cohorts",
      "funnel",
      "versions",
      "population",
      "notices",
    ]) ||
    typeof x.generatedAt !== "string" ||
    !/^\d{4}-\d\d-\d\dT/.test(x.generatedAt) ||
    !Number.isFinite(Date.parse(x.generatedAt))
  )
    return null
  if (
    !object(x.filters) ||
    !only(x.filters, ["from", "to", "version", "timezone", "retentionDays"]) ||
    !isDay(x.filters.from) ||
    !isDay(x.filters.to) ||
    x.filters.from > x.filters.to ||
    Date.parse(x.filters.to) - Date.parse(x.filters.from) > 29 * 86_400_000 ||
    !(x.filters.version === null || version(x.filters.version)) ||
    x.filters.timezone !== "UTC" ||
    x.filters.retentionDays !== 30
  )
    return null
  if (
    !object(x.summary) ||
    !only(x.summary, ["events", "users", "sessions"]) ||
    !counts(x.summary)
  )
    return null
  if (
    !rows(
      x.daily,
      30,
      (r) =>
        only(r, ["day", "events", "users", "sessions"]) &&
        isDay(r.day) &&
        counts(r),
    ) ||
    !rows(
      x.features,
      20,
      (r) =>
        only(r, ["event", "outcome", "events", "users", "sessions"]) &&
        EVENT_NAMES.includes(r.event as EventName) &&
        ["success", "failure"].includes(String(r.outcome)) &&
        counts(r),
    )
  )
    return null
  if (
    !rows(
      x.buckets,
      2000,
      (r) =>
        only(r, [
          "event",
          "outcome",
          "error",
          "durationBucket",
          "resultBucket",
          "events",
        ]) &&
        EVENT_NAMES.includes(r.event as EventName) &&
        ["success", "failure"].includes(String(r.outcome)) &&
        (r.error === null ||
          ERRORS.includes(r.error as (typeof ERRORS)[number])) &&
        [null, 0, 1, 2, 3].includes(r.durationBucket as number | null) &&
        [null, 0, 1, 2, 3].includes(r.resultBucket as number | null) &&
        count(r.events),
    )
  )
    return null
  if (
    !rows(
      x.paths,
      10,
      (r) =>
        only(r, ["path", "sessions"]) &&
        typeof r.path === "string" &&
        r.path.split(" > ").length <= 20 &&
        r.path
          .split(" > ")
          .every((s) => SCREENS.includes(s as (typeof SCREENS)[number])) &&
        count(r.sessions) &&
        r.sessions >= 3,
    )
  )
    return null
  if (
    !rows(
      x.repeated,
      4,
      (r) =>
        only(r, ["bucket", "users"]) &&
        ["1", "2-3", "4-7", "8+"].includes(String(r.bucket)) &&
        count(r.users),
    ) ||
    !rows(
      x.cohorts,
      6,
      (r) =>
        only(r, ["week", "users", "repeatUsers"]) &&
        isDay(r.week) &&
        count(r.users) &&
        count(r.repeatUsers) &&
        r.repeatUsers <= r.users,
    )
  )
    return null
  if (
    !object(x.funnel) ||
    !only(x.funnel, [
      "opened",
      "searched",
      "compared",
      "built",
      "planned",
      "websiteHandoff",
    ]) ||
    ![
      "opened",
      "searched",
      "compared",
      "built",
      "planned",
      "websiteHandoff",
    ].every((k) => count((x.funnel as Record<string, unknown>)[k]))
  )
    return null
  if (
    !rows(
      x.versions,
      1000,
      (r) => only(r, ["version"]) && version(r.version),
    ) ||
    !object(x.population) ||
    !only(x.population, ["eligibleAccounts", "currentlyConsentingAccounts"]) ||
    !count(x.population.eligibleAccounts) ||
    !count(x.population.currentlyConsentingAccounts) ||
    x.population.currentlyConsentingAccounts > x.population.eligibleAccounts ||
    !Array.isArray(x.notices) ||
    x.notices.length > 10 ||
    !x.notices.every((n) => DASHBOARD_NOTICES.includes(n))
  )
    return null
  return x as UsageDashboard
}
export const FLOW_ERRORS: Record<string, string> = {
  invalid_credentials:
    "Those sign-in details did not match an existing password account. Try again.",
  provider_unavailable:
    "That sign-in provider is not configured yet. Try another available method.",
  verified_email_required:
    "Your provider needs a verified email address. Verify it with that provider, then start sign-in again from GG PC.",
  existing_account_method_required:
    "An account already uses that email. Sign in with its existing method. Accounts are never linked just because their emails match.",
  admin_required:
    "This account does not have dashboard access. Use an authorized administrator account.",
  terms_required:
    "Accept the current terms and privacy policy to continue. Usage analytics is optional.",
  invalid_csrf:
    "This sign-in request could not be verified. Start a new sign-in from GG PC.",
  flow_expired:
    "This sign-in link has expired. Start a new sign-in from GG PC.",
  flow_in_use:
    "This sign-in is already in progress. Return to its open provider window, or start a new sign-in from GG PC.",
  flow_consumed:
    "This sign-in has already been completed. Return to GG PC or start a new sign-in.",
  identity_unavailable:
    "Sign-in is unavailable right now. Your saved parts stay on this device. Try again shortly.",
  signin_failed:
    "Sign-in did not finish. Start a new sign-in from GG PC and try again.",
}
export function flowError(raw: unknown) {
  return typeof raw === "string"
    ? Object.hasOwn(FLOW_ERRORS, raw)
      ? FLOW_ERRORS[raw]
      : FLOW_ERRORS.signin_failed
    : null
}
