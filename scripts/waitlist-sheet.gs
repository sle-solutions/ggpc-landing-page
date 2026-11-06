/**
 * GG PC waitlist → Google Sheet ("GG PC Waitlist" in the GG PC Drive folder).
 *
 * Setup (once):
 * 1. Open the sheet → Extensions → Apps Script, paste this file in, save.
 * 2. Project Settings → Script properties → add WAITLIST_SECRET (any long random string),
 *    or deploy with clasp alongside a Secret.js that defines `const WAITLIST_SECRET = "..."` (never commit it).
 * 3. Deploy → New deployment → Web app. Execute as: Me. Who has access: Anyone. Copy the /exec URL.
 * 4. In Vercel (and .env.local) set WAITLIST_SHEET_URL=<that URL> and WAITLIST_SHEET_SECRET=<same secret>.
 *
 * One row per email. A repeat signup updates that row (newest picks win, blanks never erase
 * earlier picks) and bumps Submissions. "Brief sent" and "Notes" are yours; the script never writes them.
 *
 * Backfills (e.g. the old Web3Forms waitlist) POST { secret, import: [{ email, first_joined, last_updated, submissions, ...fields }] }.
 *
 * Order actions (same web app, same secret; a body without `action` is the waitlist upsert above):
 *   { action: "og_check", email }            -> { ok:false, error:"reservation_required", info }
 *   { action: "checkout_reserve", checkout } -> original order/OG decision under one lock
 *   { action: "checkout_attach", checkout }  -> durably binds the exact provider session
 *   { action: "checkout_transition", checkout } -> monotonic signed-event completion
 *   { action: "order_upsert", order: {...} } -> { ok, created }   (keyed by order_id, never blanks a filled cell)
 * Orders live in an "Orders" tab the script creates on first use. "Notes" is yours; the script never writes it.
 * Script property ORDERS_NOTIFY_EMAIL (Project Settings) receives an email when an order becomes authorized or paid.
 * OG list: rank comes from an "OG" tab if present (run freezeOgList() once from the editor to snapshot the first 100
 * emails), otherwise from the waitlist sorted by "First joined". First 100 can use the perk once.
 */

const HEADERS = ["Email", "First joined", "Last updated", "Submissions", "Source", "Form", "Class", "Use case", "Budget", "Build preference", "Picks made", "Brief complete", "Page", "Referrer", "UTM source", "UTM medium", "UTM campaign", "Brief sent", "Notes"]
const FIELDS = { source: "Source", form: "Form", class: "Class", use_case: "Use case", budget: "Budget", build_preference: "Build preference", picks_made: "Picks made", brief_complete: "Brief complete", page: "Page", referrer: "Referrer", utm_source: "UTM source", utm_medium: "UTM medium", utm_campaign: "UTM campaign" }

function doPost(e) {
  let body
  try { body = JSON.parse(e.postData.contents) } catch (_) { return json({ ok: false, error: "bad json" }) }
  if (!body || !body.secret || body.secret !== waitlistSecret()) return json({ ok: false, error: "unauthorized" })
  // Old clients must fail closed, not create a discounted session from a separate check.
  if (body.action === "og_check") return withLock(() => json({ ok: false, error: "reservation_required", info: ogCheck(String(body.email || "").trim().toLowerCase()) }))
  if (body.action === "checkout_reserve") return withLock(() => json(checkoutReserve(body.checkout)))
  if (body.action === "checkout_attach") return withLock(() => json(checkoutAttach(body.checkout)))
  if (body.action === "checkout_transition") return withLock(() => json(checkoutTransition(body.checkout)))
  if (body.action === "order_upsert") return withLock(() => json(orderUpsert(body.order)))
  if (Array.isArray(body.import) || Array.isArray(body.remove)) return withLock(() => json(bulk(body.import || [], body.remove || [])))
  const email = String(body.email || "").trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: "bad email" })
  return withLock(() => json({ ok: true, created: upsert(email, body, new Date()) }))
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu("GG PC ops").addItem("Refresh Phase 1 gates", "refreshPhase1Gates").addToUi()
}

// Backfill: rows carry their own dates and submission counts, so re-running an import is idempotent.
function bulk(rows, remove) {
  let created = 0
  rows.forEach(r => {
    const email = String(r.email || "").trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    if (upsert(email, r, new Date(r.last_updated || Date.now()), r.first_joined ? new Date(r.first_joined) : null, Number(r.submissions) || null)) created++
  })
  const sheet = waitlistSheet()
  const drop = new Set(remove.map(e => String(e).trim().toLowerCase()))
  const values = sheet.getDataRange().getValues()
  let removed = 0
  for (let i = values.length - 1; i > 0; i--) if (drop.has(String(values[i][0]).trim().toLowerCase())) { sheet.deleteRow(i + 1); removed++ }
  return { ok: true, created, removed }
}

let pendingOrderNotifications = null
function withLock(fn) {
  if (pendingOrderNotifications !== null) throw new Error("nested_lock")
  const lock = LockService.getScriptLock()
  lock.waitLock(20000)
  const notifications = []
  pendingOrderNotifications = notifications
  let result
  try { result = fn() } finally { pendingOrderNotifications = null; lock.releaseLock() }
  // Existing order alerts stay outside the authority lock. No provider network
  // runs while reserving/attaching/consuming a claim.
  notifications.forEach(row => notifyOrder(row, name => ORDER_HEADERS.indexOf(name)))
  return result
}

function upsert(email, data, when, firstJoined, submissions) {
  const sheet = waitlistSheet()
  const col = name => HEADERS.indexOf(name)
  const values = sheet.getDataRange().getValues()
  const index = values.findIndex((row, i) => i > 0 && String(row[0]).trim().toLowerCase() === email)
  const row = index > 0 ? values[index].slice(0, HEADERS.length) : HEADERS.map(() => "")
  while (row.length < HEADERS.length) row.push("")
  if (index < 0) {
    row[col("Email")] = email
    row[col("First joined")] = firstJoined || when
    row[col("Submissions")] = 0
  } else if (firstJoined && (!row[col("First joined")] || firstJoined < new Date(row[col("First joined")]))) {
    row[col("First joined")] = firstJoined
  }
  row[col("Last updated")] = when
  row[col("Submissions")] = submissions || Number(row[col("Submissions")] || 0) + 1
  Object.keys(FIELDS).forEach(key => {
    const value = data[key]
    if (value !== undefined && value !== null && String(value).trim() !== "") row[col(FIELDS[key])] = String(value).slice(0, 500)
  })
  if (index > 0) sheet.getRange(index + 1, 1, 1, HEADERS.length).setValues([row])
  else sheet.appendRow(row)
  return index < 0
}

function waitlistSheet() {
  const sheet = SpreadsheetApp.getActive().getSheets()[0]
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS)
  return sheet
}

// Run once from the editor so the web app (which executes as the owner) is allowed to edit the sheet and send order alerts.
// appsscript.json must list both scopes: spreadsheets.currentonly and script.send_mail.
function authorize() {
  waitlistSheet()
  MailApp.getRemainingDailyQuota()
}

function waitlistSecret() {
  return PropertiesService.getScriptProperties().getProperty("WAITLIST_SECRET") || (typeof WAITLIST_SECRET === "undefined" ? null : WAITLIST_SECRET)
}

function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON)
}

// ---------- Orders ----------

const ORDER_COLUMNS = [
  ["order_id", "Order ID"], ["created", "Created"], ["updated", "Updated"], ["status", "Status"], ["lane", "Lane"], ["email", "Email"],
  ["name", "Name"], ["phone", "Phone"], ["address", "Address"], ["build_name", "Build name"], ["build_code", "Build code"], ["parts", "Parts"],
  ["parts_aed", "Parts AED"], ["sourcing_fee_aed", "Sourcing fee AED"], ["build_fee_aed", "Build fee AED"], ["add_ons", "Add-ons"],
  ["add_ons_aed", "Add-ons AED"], ["og_applied", "OG applied"], ["og_discount_aed", "OG discount AED"], ["service_total_aed", "Service total AED"],
  ["total_aed", "Total AED"], ["stripe_session", "Stripe session"], ["payment_intent", "Payment intent"], ["prices_checked", "Prices checked"], [null, "Notes"],
  // Added after Notes so existing sheets keep their column positions; ordersSheet() backfills missing headers.
  ["stripe_fee_est_aed", "Stripe fee est AED"], ["net_service_aed", "Net service AED"], ["protection_fee_aed", "Protection fee AED"],
  // Manual operations fields. Null keys keep Stripe order upserts from writing these cells.
  [null, "QA status"], [null, "QA evidence"], [null, "Handover date"], [null, "Warranty claim status"],
  [null, "Warranty claim opened"], [null, "Warranty claim notes"], [null, "Warranty claims (count)"],
  // Phase 1 gate inputs are manual and intentionally have no webhook keys.
  [null, "Paid verified date"], [null, "Job completed date"], [null, "Actual customer payments AED"],
  [null, "Actual refunds AED"], [null, "Actual parts cost AED"], [null, "Actual payment fees AED"],
  [null, "Actual builder payout AED"], [null, "Confirmed labour claim?"],
]
// Existing 43 positions, including all manual fields, stay unchanged. One appended
// structured cell is the same Orders authority, not a second coupon ledger.
const ORDER_BASE_HEADERS = ORDER_COLUMNS.map(c => c[1]).slice(0, -8)
const CHECKOUT_CLAIM_HEADER = "Checkout claim"
const ORDER_HEADERS = ORDER_COLUMNS.map(c => c[1]).concat([CHECKOUT_CLAIM_HEADER])
const PHASE1_HEADERS = ["Phase 1 gates", "Result", "Definition"]

function ordersSheet() {
  const ss = SpreadsheetApp.getActive()
  let sheet = ss.getSheetByName("Orders")
  if (!sheet) sheet = ss.insertSheet("Orders")
  if (sheet.getLastRow() === 0) {
    expandOrderGrid(sheet, ORDER_HEADERS.length)
    sheet.appendRow(ORDER_HEADERS)
  }
  else ensureOrderOpsHeaders(sheet)
  return sheet
}

// Run manually from the Apps Script editor after backing up the Orders tab.
// This only checks/appends headers; it does not edit order rows or overwrite mismatched columns.
function ensureOrderOpsSchema() {
  return withLock(() => {
    const ss = SpreadsheetApp.getActive()
    let sheet = ss.getSheetByName("Orders")
    if (!sheet) sheet = ss.insertSheet("Orders")
    const before = sheet.getLastColumn()
    if (sheet.getLastRow() === 0) {
      expandOrderGrid(sheet, ORDER_HEADERS.length)
      sheet.appendRow(ORDER_HEADERS)
    } else ensureOrderOpsHeaders(sheet)
    ensurePhase1GateSchema(ss, sheet)
    return { ok: true, columns: ORDER_HEADERS.length, appended: ORDER_HEADERS.slice(before) }
  })
}

// Creates a separate summary tab. Values are refreshed explicitly; Orders rows never contain formulas.
function ensurePhase1GateSchema(ss, orders) {
  let sheet = ss.getSheetByName("Phase 1 gates")
  if (!sheet) sheet = ss.insertSheet("Phase 1 gates")
  const values = [
    ["Phase 1 gates", "Result", "Definition"],
    ["Last refreshed", "", "Run refreshPhase1Gates() from the Apps Script editor after updating manual order fields."],
    ["Completed paid builds", "", "Distinct Order IDs with valid Paid verified date and Job completed date. Gate: at least 30."],
    ["Confirmed labour claims", "", "Completed paid orders marked Yes for Confirmed labour claim?; reported requests do not count."],
    ["Warranty claim rate", "", "Confirmed labour claim orders / completed paid orders. Every order must be Yes or No. Gate: strictly below 3%."],
    ["Gross retained rate", "", "(net GG PC receipts - parts cost) / net GG PC receipts, weighted across completed paid orders. Gate: at least 7%."],
    ["Net retained rate", "", "(net GG PC receipts - parts cost - payment fees - builder payout) / net GG PC receipts, weighted. Gate: at least 7%."],
  ]
  if (sheet.getLastRow() > 0) {
    const actual = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), PHASE1_HEADERS.length)).getValues()[0].slice(0, PHASE1_HEADERS.length).map(String)
    if (actual.some((value, i) => value !== PHASE1_HEADERS[i])) throw new Error("Phase 1 gates header mismatch; no summary cells were changed.")
  }
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, values.length, 3).setValues(values)
  sheet.getRange(1, 1, 1, 3).setFontWeight("bold")
  const lastRow = Math.max(2, orders.getMaxRows ? orders.getMaxRows() : orders.getLastRow() + 1)
  const dateRule = SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build()
  const amountRule = SpreadsheetApp.newDataValidation().requireNumberGreaterThanOrEqualTo(0).setAllowInvalid(false).build()
  const claimRule = SpreadsheetApp.newDataValidation().requireValueInList(["Yes", "No"], true).setAllowInvalid(false).build()
  const dateFields = ["Paid verified date", "Job completed date"]
  for (let i = 0; i < dateFields.length; i++) orders.getRange(2, ORDER_HEADERS.indexOf(dateFields[i]) + 1, lastRow - 1, 1).setDataValidation(dateRule)
  const amountFields = ["Actual customer payments AED", "Actual refunds AED", "Actual parts cost AED", "Actual payment fees AED", "Actual builder payout AED"]
  for (let i = 0; i < amountFields.length; i++) orders.getRange(2, ORDER_HEADERS.indexOf(amountFields[i]) + 1, lastRow - 1, 1).setDataValidation(amountRule)
  orders.getRange(2, ORDER_HEADERS.indexOf("Confirmed labour claim?") + 1, lastRow - 1, 1).setDataValidation(claimRule)
}

// Calculate from actual manual entries. Kept pure so edge cases can be tested without Sheets.
function calculatePhase1GateSummary(rows) {
  const col = name => ORDER_HEADERS.indexOf(name)
  const date = value => Object.prototype.toString.call(value) === "[object Date]" && isFinite(value.getTime())
  const money = value => typeof value === "number" && isFinite(value) && value >= 0
  const identified = rows.filter(row => String(row[col("Order ID")] || "").trim())
  const byId = new Map()
  identified.forEach(row => {
    const id = String(row[col("Order ID")]).trim()
    byId.set(id, (byId.get(id) || 0) + 1)
  })
  const duplicateCount = Array.from(byId.values()).reduce((sum, count) => sum + Math.max(0, count - 1), 0)
  const completed = identified.filter(row => date(row[col("Paid verified date")]) && date(row[col("Job completed date")]))
  const claims = completed.filter(row => row[col("Confirmed labour claim?")] === "Yes").length
  const claimStatesComplete = completed.every(row => ["Yes", "No"].includes(row[col("Confirmed labour claim?")]))
  const field = name => completed.map(row => row[col(name)])
  const financialFields = ["Actual customer payments AED", "Actual refunds AED", "Actual parts cost AED"]
  const netFields = [...financialFields, "Actual payment fees AED", "Actual builder payout AED"]
  const completeActuals = names => names.every(name => field(name).every(money))
  const total = name => field(name).reduce((sum, value) => sum + value, 0)
  const gateResult = (amounts, denominator) => duplicateCount ? "Resolve duplicate order IDs" : completed.length === 0 ? "No completed paid builds" : !completeActuals(amounts) ? "Incomplete actuals" : denominator <= 0 ? "Net receipts are zero or below" : null
  const receipts = total("Actual customer payments AED") - total("Actual refunds AED")
  const grossError = gateResult(financialFields, receipts)
  const grossRate = grossError || (receipts - total("Actual parts cost AED")) / receipts
  const netError = gateResult(netFields, receipts)
  const netRate = netError || (receipts - total("Actual parts cost AED") - total("Actual payment fees AED") - total("Actual builder payout AED")) / receipts
  const rateLabel = (rate, error, minimum) => error || (rate >= minimum ? "Pass: " : "Fail: ") + (rate * 100).toFixed(1) + "%"
  return {
    duplicateCount,
    completedCount: completed.length,
    confirmedClaims: claims,
    claimRate: duplicateCount ? "Resolve duplicate order IDs" : completed.length === 0 ? "No completed paid builds" : !claimStatesComplete ? "Review needed" : (claims / completed.length < 0.03 ? "Pass: " : "Fail: ") + (claims / completed.length * 100).toFixed(1) + "%",
    grossRate: rateLabel(grossRate, grossError, 0.07),
    netRate: rateLabel(netRate, netError, 0.07),
  }
}

function refreshPhase1Gates() {
  return withLock(() => {
    const ss = SpreadsheetApp.getActive()
    const orders = ss.getSheetByName("Orders")
    if (!orders) throw new Error("Orders tab not found. Run ensureOrderOpsSchema() first.")
    ensureOrderOpsHeaders(orders)
    ensurePhase1GateSchema(ss, orders)
    const data = orders.getDataRange().getValues()
    const result = calculatePhase1GateSummary(data.slice(1))
    const rows = [
      ["Last refreshed", new Date(), "Run refreshPhase1Gates() after updating manual order fields."],
      ["Duplicate Order IDs", result.duplicateCount ? "Resolve duplicates" : "None", "Repeated IDs block all gate calculations until corrected."],
      ["Completed paid builds", result.completedCount, "Distinct Order IDs with valid Paid verified date and Job completed date. Gate: at least 30."],
      ["Confirmed labour claims", result.confirmedClaims, "Completed paid orders marked Yes for Confirmed labour claim?; reported requests do not count."],
      ["Warranty claim rate", result.claimRate, "Confirmed labour claim orders / completed paid orders. Every order must be Yes or No. Gate: strictly below 3%."],
      ["Gross retained rate", result.grossRate, "(net GG PC receipts - parts cost) / net GG PC receipts, weighted. Gate: at least 7%."],
      ["Net retained rate", result.netRate, "(net GG PC receipts - parts cost - payment fees - builder payout) / net GG PC receipts, weighted. Gate: at least 7%."],
    ]
    ss.getSheetByName("Phase 1 gates").getRange(2, 1, rows.length, 3).setValues(rows)
    return { ok: true, completedCount: result.completedCount }
  })
}

function expandOrderGrid(sheet, neededColumns) {
  const maxColumns = sheet.getMaxColumns ? sheet.getMaxColumns() : 0
  if (maxColumns > 0 && maxColumns < neededColumns && sheet.insertColumnsAfter) {
    sheet.insertColumnsAfter(maxColumns, neededColumns - maxColumns)
  }
}

function ensureOrderOpsHeaders(sheet) {
  const lastColumn = sheet.getLastColumn()
  const actual = lastColumn ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(String) : []
  const expectedPrefix = ORDER_HEADERS.slice(0, actual.length)
  const isKnownLegacy = [27, 28, ORDER_BASE_HEADERS.length, ORDER_BASE_HEADERS.length + 1].includes(actual.length) &&
    actual.every((header, i) => header === ORDER_HEADERS[i])
  const mismatch = isKnownLegacy ? -1 : actual.findIndex((header, i) => header !== expectedPrefix[i])
  if (mismatch >= 0 || actual.length > ORDER_HEADERS.length) {
    const column = mismatch >= 0 ? mismatch + 1 : ORDER_HEADERS.length + 1
    throw new Error("Orders header mismatch at column " + column + "; expected the existing header order before adding QA and warranty fields. No cells were changed.")
  }
  if (![27, 28, ORDER_BASE_HEADERS.length, ORDER_BASE_HEADERS.length + 1, ORDER_COLUMNS.length, ORDER_HEADERS.length].includes(actual.length)) throw new Error("Orders schema review; unknown existing column count. No cells were changed.")
  if (actual.length < ORDER_HEADERS.length) {
    expandOrderGrid(sheet, ORDER_HEADERS.length)
    sheet.getRange(1, actual.length + 1, 1, ORDER_HEADERS.length - actual.length).setValues([ORDER_HEADERS.slice(actual.length)])
  }
}

// Rank (1 based) of an email in the first 100, or null. A frozen "OG" tab wins over the live waitlist order.
function ogRank(email) {
  const ss = SpreadsheetApp.getActive(), og = ss.getSheetByName("OG")
  const validEmail = value => typeof value === "string" && value.length <= 254 && !/[\x00-\x1f\x7f]/.test(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  if (og) {
    const values = og.getDataRange().getValues()
    if (String(values[0] && values[0][0]) !== "Email" || String(values[0] && values[0][1]) !== "Rank") throw new Error("membership_review")
    const rows = values.slice(1).filter(row => String(row[0] || "").trim())
    if (rows.some(row => !validEmail(row[0]))) throw new Error("membership_review")
    const emails = rows.map(row => normalizeEmail(row[0]))
    if (new Set(emails).size !== emails.length) throw new Error("membership_review")
    const i = emails.indexOf(email)
    return i < 0 ? null : i + 1 // Preserve physical frozen order; never sort by Rank.
  }
  const sheet = ss.getSheets()[0], values = sheet.getDataRange().getValues()
  if (String(values[0] && values[0][0]) !== "Email" || String(values[0] && values[0][1]) !== "First joined") throw new Error("membership_review")
  const rows = values.slice(1).filter(row => String(row[0] || "").trim()).map((r, order) => ({ email: normalizeEmail(r[0]), original: r[0], joined: r[1] instanceof Date || typeof r[1] === "string" && r[1].trim() ? new Date(r[1]).getTime() : NaN, order }))
  if (rows.some(row => !validEmail(row.original) || !Number.isFinite(row.joined)) || new Set(rows.map(row => row.email)).size !== rows.length) throw new Error("membership_review")
  rows.sort((a, b) => (a.joined - b.joined) || (a.order - b.order))
  const i = rows.findIndex(r => r.email === email)
  return i < 0 ? null : i + 1
}

function validateOrderHeaders(headers) {
  if (!Array.isArray(headers) || !headers.length || headers.length > ORDER_HEADERS.length || headers.some((value, i) => String(value) !== ORDER_HEADERS[i])) throw new Error("orders_schema_review")
}
function normalizeEmail(value) { return String(value || "").trim().toLowerCase() }
function trueCell(value) { return value === true || String(value).toUpperCase() === "TRUE" }

function ogBenefitState(email) {
  const sheet = SpreadsheetApp.getActive().getSheetByName("Orders")
  if (!sheet) return "available" // Informational reads do not extend/create schema.
  const values = sheet.getDataRange().getValues(), col = name => ORDER_HEADERS.indexOf(name)
  validateOrderHeaders(values[0] || [])
  let result = "available"
  values.slice(1).forEach(row => {
    const claim = readCheckoutClaim(row)
    if (claim) {
      if (claim.og && claim.member === email) {
        if (claim.state === "consumed") result = "consumed"
        else if (result !== "consumed") result = "held"
      }
    } else if (normalizeEmail(row[col("Email")]) === email && trueCell(row[col("OG applied")])) {
      if (["authorized", "paid"].includes(String(row[col("Status")]))) result = "consumed"
      else if (result !== "consumed") result = "held"
    }
  })
  return result
}
function ogUsed(email) { return ogBenefitState(email) !== "available" }

function ogCheck(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "bad email" }
  const rank = ogRank(email)
  const used = ogUsed(email)
  return { ok: true, eligible: rank !== null && rank <= 100 && !used, rank: rank, used: used }
}

function orderUpsert(order, checkoutClaim) {
  if (!order || !order.order_id) return { ok: false, error: "missing order_id" }
  const sheet = ordersSheet()
  const col = name => ORDER_HEADERS.indexOf(name)
  const values = sheet.getDataRange().getValues()
  const index = values.findIndex((r, i) => i > 0 && String(r[0]) === String(order.order_id))
  const row = index > 0 ? values[index].slice(0, ORDER_HEADERS.length) : ORDER_HEADERS.map(() => "")
  while (row.length < ORDER_HEADERS.length) row.push("")
  const created = index < 0
  const oldStatus = created ? "" : String(row[col("Status")])
  const oldClaim = created ? null : readCheckoutClaim(row)
  if (!checkoutClaim && (oldClaim && oldClaim.kind !== "legacy-consumed" || trueCell(order.og_applied))) return { ok: false, error: "reservation_required" }
  if (!checkoutClaim && trueCell(row[col("OG applied")]) && (order.email && normalizeEmail(order.email) !== normalizeEmail(row[col("Email")]) || order.og_applied !== undefined && !trueCell(order.og_applied))) return { ok: false, error: "legacy_identity_review" }
  const now = new Date()
  // Preserve observed legacy consumption BEFORE a legitimate status downgrade.
  // This is evidence of the already-used benefit, not a new checkout/entitlement.
  if (!checkoutClaim && oldClaim && oldClaim.kind === "legacy-consumed") checkoutClaim = oldClaim
  if (!checkoutClaim && !created && trueCell(row[col("OG applied")]) && ["authorized", "paid"].includes(oldStatus)) {
    const member = normalizeEmail(row[col("Email")])
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(member)) return { ok: false, error: "legacy_identity_review" }
    checkoutClaim = { v: 1, kind: "legacy-consumed", orderId: String(order.order_id), member, og: true, state: "consumed", observedStatus: oldStatus, observedAt: now.toISOString() }
  }
  ORDER_COLUMNS.forEach(c => {
    const key = c[0]
    if (!key || key === "updated") return
    let value = order[key]
    if (value === undefined || value === null || value === "") return // never blank a filled cell
    if (key === "created" && !created) return
    if (key === "created") value = new Date(value)
    if (key === "status") value = acceptStatus(oldStatus, String(value))
    if (key === "status" && value === null) return
    row[col(c[1])] = typeof value === "string" ? value.slice(0, 5000) : value
  })
  if (created && !row[col("Created")]) row[col("Created")] = now
  row[col("Updated")] = now
  if (checkoutClaim) row[col(CHECKOUT_CLAIM_HEADER)] = JSON.stringify(checkoutClaim)
  if (index > 0) {
    // Manual Notes/QA/actuals are never written, even from a stale row projection.
    // Persist a managed claim first: an interrupted status write remains held or
    // consumed, and its exact retry repairs the remaining owned fields.
    if (checkoutClaim) sheet.getRange(index + 1, col(CHECKOUT_CLAIM_HEADER) + 1, 1, 1).setValues([[JSON.stringify(checkoutClaim)]])
    sheet.getRange(index + 1, 1, 1, 24).setValues([row.slice(0, 24)])
    sheet.getRange(index + 1, 26, 1, 3).setValues([row.slice(25, 28)])
  } else sheet.appendRow(row)
  if (checkoutClaim) {
    SpreadsheetApp.flush()
    const written = sheet.getRange(index > 0 ? index + 1 : sheet.getLastRow(), 1, 1, ORDER_HEADERS.length).getValues()[0]
    if (String(written[col("Order ID")]) !== String(order.order_id) || written[col(CHECKOUT_CLAIM_HEADER)] !== JSON.stringify(checkoutClaim) || ORDER_COLUMNS.some(c => c[0] && order[c[0]] !== undefined && order[c[0]] !== null && order[c[0]] !== "" && String(written[col(c[1])]) !== String(row[col(c[1])])) ) throw new Error("checkout_storage_unknown")
  }
  const newStatus = String(row[col("Status")])
  if (newStatus !== oldStatus && (newStatus === "authorized" || newStatus === "paid")) {
    if (pendingOrderNotifications) pendingOrderNotifications.push(row.slice())
    else notifyOrder(row, col)
  }
  return { ok: true, created: created }
}

// Stripe events can arrive out of order: a paid order never goes back, and finished orders stay finished.
function acceptStatus(old, next) {
  if (!old || old === next) return next
  if (old === "paid") return null
  if (old === "authorized") return next === "paid" || next === "canceled" ? next : null
  if (old === "canceled" || old === "expired") return null
  return next
}

function notifyOrder(row, col) {
  const to = PropertiesService.getScriptProperties().getProperty("ORDERS_NOTIFY_EMAIL")
  if (!to) return
  const get = name => row[col(name)]
  const subject = "GG PC order " + get("Order ID") + " " + get("Status") + " (lane " + get("Lane") + ", AED " + get("Total AED") + ")"
  const body = ["Order " + get("Order ID") + " is " + get("Status"), "Lane: " + get("Lane"), "Build: " + get("Build name"), "Total AED: " + get("Total AED"),
    "Customer: " + get("Name") + " <" + get("Email") + "> " + get("Phone"), "Address: " + get("Address"), "", "Parts:", get("Parts"), "", "Open the Orders tab for the full row."].join("\n")
  // A failed alert must never block the order write (Stripe would retry the webhook forever).
  try { MailApp.sendEmail(to, subject, body) } catch (error) { console.error("Order alert failed: " + error) }
}

// Run once from the editor (at the moment you want the first 100 locked) to write them to an "OG" tab.
function freezeOgList() {
  const ss = SpreadsheetApp.getActive()
  const values = waitlistSheet().getDataRange().getValues().slice(1)
  const rows = values.map((r, order) => ({ email: String(r[0]).trim().toLowerCase(), joined: r[1] ? new Date(r[1]).getTime() : Infinity, order })).filter(r => r.email)
  rows.sort((a, b) => (a.joined - b.joined) || (a.order - b.order))
  let sheet = ss.getSheetByName("OG")
  if (sheet) throw new Error("OG tab already exists. Delete it first if you really want to re-freeze.")
  sheet = ss.insertSheet("OG")
  sheet.appendRow(["Email", "Rank"])
  rows.slice(0, 100).forEach((r, i) => sheet.appendRow([r.email, i + 1]))
}

// ---------- Shared checkout reservation (lock-held helpers; no Stripe/network) ----------
// Protocol is private/unactivated until workbook reconciliation and coordinated cutover.
function checkoutUnavailable() { return { ok: false, error: "checkout_unavailable" } }
function validIntent(value) { return typeof value === "string" && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value) }
function validBinding(value) { return typeof value === "string" && /^[a-f0-9]{64}$/.test(value) }
function readCheckoutClaim(row) {
  const value = row[ORDER_HEADERS.indexOf(CHECKOUT_CLAIM_HEADER)]
  if (value === "" || value === undefined || value === null) return null
  let c
  try { c = JSON.parse(String(value)) } catch (_) { throw new Error("checkout_claim_review") }
  if (c && c.kind === "legacy-consumed") {
    if (Object.keys(c).sort().join(",") !== "kind,member,observedAt,observedStatus,og,orderId,state,v" || c.v !== 1 || c.og !== true || c.state !== "consumed" || !["authorized", "paid"].includes(c.observedStatus) || typeof c.observedAt !== "string" || !Number.isFinite(Date.parse(c.observedAt)) || new Date(c.observedAt).toISOString() !== c.observedAt || String(row[0]) !== c.orderId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.member) || c.member !== normalizeEmail(row[ORDER_HEADERS.indexOf("Email")]) || !trueCell(row[ORDER_HEADERS.indexOf("OG applied")])) throw new Error("legacy_identity_review")
    return c
  }
  if (!c || Object.keys(c).sort().join(",") !== "binding,createdAt,events,intent,member,og,orderId,partsSnapshot,paymentIntent,session,state,v" || c.v !== 1 || !/^GG-[0-9A-HJKMNP-TV-Z]{6}$/.test(c.orderId) || String(row[0]) !== c.orderId || !validIntent(c.intent) || !validBinding(c.binding) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.member) || c.member !== normalizeEmail(c.member) || typeof c.og !== "boolean" || typeof c.createdAt !== "string" || !Number.isFinite(Date.parse(c.createdAt)) || new Date(c.createdAt).toISOString() !== c.createdAt || !["held", "consumed"].includes(c.state) || typeof c.session !== "string" || typeof c.paymentIntent !== "string" || !Array.isArray(c.events) || c.events.length > 32) throw new Error("checkout_claim_review")
  if (c.session && !/^cs_[A-Za-z0-9_]{1,240}$/.test(c.session) || c.paymentIntent && !/^pi_[A-Za-z0-9_]{1,240}$/.test(c.paymentIntent)) throw new Error("checkout_claim_review")
  if (typeof c.partsSnapshot !== "string" || c.partsSnapshot.length > 5000) throw new Error("checkout_claim_review")
  if (new Set(c.events.map(e => e && e.id)).size !== c.events.length || c.og !== trueCell(row[ORDER_HEADERS.indexOf("OG applied")])) throw new Error("checkout_claim_review")
  if (c.events.some(e => !e || typeof e.id !== "string" || !/^evt_[A-Za-z0-9_]{1,240}$/.test(e.id) || !["authorized", "paid", "canceled", "expired"].includes(e.status) || typeof e.session !== "string" || typeof e.paymentIntent !== "string")) throw new Error("checkout_claim_review")
  if ((c.state === "consumed") !== c.events.some(e => ["authorized", "paid"].includes(e.status))) throw new Error("checkout_claim_review")
  return c
}
function checkoutRows() {
  const sheet = ordersSheet(), values = sheet.getDataRange().getValues(), ids = new Set(), intents = new Set()
  const rows = values.slice(1).filter(row => row.some(value => value !== "" && value !== null && value !== undefined))
  rows.forEach(row => {
    const id = String(row[0] || "")
    if (!id || ids.has(id)) throw new Error("orders_identity_review")
    ids.add(id)
    if (![true, false, "TRUE", "FALSE"].includes(row[ORDER_HEADERS.indexOf("OG applied")])) throw new Error("orders_og_review")
    if (!row[ORDER_HEADERS.indexOf(CHECKOUT_CLAIM_HEADER)] && trueCell(row[ORDER_HEADERS.indexOf("OG applied")]) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(row[ORDER_HEADERS.indexOf("Email")]))) throw new Error("legacy_identity_review")
    const claim = readCheckoutClaim(row)
    if (claim && claim.kind !== "legacy-consumed") { if (intents.has(claim.intent)) throw new Error("checkout_identity_review"); intents.add(claim.intent) }
  })
  return rows
}
function checkoutReserve(input) {
  if (!input || !validIntent(input.intent) || !validBinding(input.binding) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || input.email !== normalizeEmail(input.email)) return checkoutUnavailable()
  const rows = checkoutRows(), col = name => ORDER_HEADERS.indexOf(name)
  const prior = rows.find(row => { const c = readCheckoutClaim(row); return c && c.intent === input.intent })
  if (prior) {
    const c = readCheckoutClaim(prior)
    const expected = c.og ? input.ogOrder : input.order
    if (!expected || ORDER_COLUMNS.some(column => column[0] && !["order_id", "created", "updated", "prices_checked", "parts"].includes(column[0]) && expected[column[0]] !== undefined && String(prior[col(column[1])]) !== String(expected[column[0]]))) return checkoutUnavailable()
    // Parts contains human seenAgo text. Keep the original Parts/Prices checked
    // snapshot intact; the immutable binding still checks every identity, price,
    // fee and provider input, independently of a later age-display bucket.
    if (String(prior[col("Parts")] || "") !== c.partsSnapshot) return checkoutUnavailable()
    if (c.member !== input.email || c.binding !== input.binding || c.state !== "held" || Date.now() - Date.parse(c.createdAt) >= 20 * 60 * 60 * 1000 || ["canceled", "expired"].includes(String(prior[col("Status")]))) return checkoutUnavailable()
    return { ok: true, orderId: String(prior[0]), og: c.og, replayed: true }
  }
  // Same first-100 membership as before. No code, freeze operation or new ownership rule.
  const rank = ogRank(input.email), member = rank !== null && rank <= 100
  const benefit = ogBenefitState(input.email)
  if (benefit === "held") return checkoutUnavailable()
  // Existing consumed members can still order at full service price. They never
  // receive another perk; unresolved holds cannot silently become a new order.
  const og = member && benefit === "available", order = og ? input.ogOrder : input.order
  if (og && !order) return { ok: false, error: "below_floor" }
  if (!order || !/^GG-[0-9A-HJKMNP-TV-Z]{6}$/.test(order.order_id) || rows.some(row => String(row[0]) === order.order_id) || normalizeEmail(order.email) !== input.email || order.status !== "checkout_started" || order.og_applied !== og) return checkoutUnavailable()
  const claim = { v: 1, orderId: order.order_id, intent: input.intent, binding: input.binding, member: input.email, partsSnapshot: typeof order.parts === "string" ? order.parts.slice(0, 5000) : "", createdAt: new Date().toISOString(), og, state: "held", session: "", paymentIntent: "", events: [] }
  const result = orderUpsert(order, claim)
  if (!result.ok) return result
  return { ok: true, orderId: order.order_id, og, replayed: false }
}
function checkoutFind(input) {
  if (!input || !validIntent(input.intent) || !validBinding(input.binding) || typeof input.orderId !== "string") return null
  const row = checkoutRows().find(row => String(row[0]) === input.orderId)
  if (!row) return null
  const claim = readCheckoutClaim(row)
  return claim && claim.intent === input.intent && claim.binding === input.binding ? { row, claim } : null
}
function checkoutAttach(input) {
  const found = checkoutFind(input)
  if (!found || typeof input.session !== "string" || !/^cs_[A-Za-z0-9_]{1,240}$/.test(input.session) || found.claim.session && found.claim.session !== input.session) return checkoutUnavailable()
  found.claim.session = input.session
  const result = orderUpsert({ order_id: input.orderId, stripe_session: input.session }, found.claim)
  return result.ok ? { ok: true } : result
}
function checkoutTransition(input) {
  const found = checkoutFind(input), r = input && input.order
  if (!found || !r || r.order_id !== input.orderId || !["authorized", "paid", "canceled", "expired"].includes(r.status) || typeof input.eventId !== "string" || !/^evt_[A-Za-z0-9_]{1,240}$/.test(input.eventId)) return checkoutUnavailable()
  if (Object.keys(r).some(key => !["order_id", "status", "stripe_session", "payment_intent", "email", "name", "phone", "address"].includes(key))) return checkoutUnavailable()
  const c = found.claim, session = r.stripe_session || "", paymentIntent = r.payment_intent || ""
  if (session && !/^cs_[A-Za-z0-9_]{1,240}$/.test(session) || paymentIntent && !/^pi_[A-Za-z0-9_]{1,240}$/.test(paymentIntent) || !session && !paymentIntent || c.session && session && c.session !== session || c.paymentIntent && paymentIntent && c.paymentIntent !== paymentIntent) return checkoutUnavailable()
  const event = { id: input.eventId, status: r.status, session, paymentIntent }, prior = c.events.find(e => e.id === event.id)
  if (prior) {
    // A duplicate Session event can observe the SAME PaymentIntent after manual
    // capture. Both positive observations consume once; paid never downgrades.
    const positiveReplay = ["authorized", "paid"].includes(prior.status) && ["authorized", "paid"].includes(event.status) && prior.session === event.session && prior.paymentIntent === event.paymentIntent
    if (JSON.stringify(prior) !== JSON.stringify(event) && !positiveReplay) return checkoutUnavailable()
    const repaired = orderUpsert(r, c)
    return repaired.ok ? { ok: true, replayed: true } : repaired
  }
  if (c.events.length >= 32) return checkoutUnavailable()
  // No automatic release. Negative/late events cannot restore a consumed benefit.
  if (r.status === "authorized" || r.status === "paid") c.state = "consumed"
  if (session) c.session = session
  if (paymentIntent) c.paymentIntent = paymentIntent
  c.events.push(event)
  const result = orderUpsert(r, c)
  return result.ok ? { ok: true, replayed: false } : result
}
