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
 *   { action: "og_check", email }            -> { ok, eligible, rank, used }
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
  if (body.action === "og_check") return withLock(() => json(ogCheck(String(body.email || "").trim().toLowerCase())))
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

function withLock(fn) {
  const lock = LockService.getScriptLock()
  lock.waitLock(20000)
  try { return fn() } finally { lock.releaseLock() }
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
const ORDER_HEADERS = ORDER_COLUMNS.map(c => c[1])
const ORDER_BASE_HEADERS = ORDER_HEADERS.slice(0, -8)
const PHASE1_HEADERS = ["Phase 1 gates", "Result", "Definition"]
const DAY_MS = 24 * 60 * 60 * 1000

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
  if (actual.length < ORDER_HEADERS.length) {
    expandOrderGrid(sheet, ORDER_HEADERS.length)
    sheet.getRange(1, actual.length + 1, 1, ORDER_HEADERS.length - actual.length).setValues([ORDER_HEADERS.slice(actual.length)])
  }
}

// Rank (1 based) of an email in the first 100, or null. A frozen "OG" tab wins over the live waitlist order.
function ogRank(email) {
  const og = SpreadsheetApp.getActive().getSheetByName("OG")
  if (og) {
    const emails = og.getDataRange().getValues().map(r => String(r[0]).trim().toLowerCase()).filter(e => e.indexOf("@") > 0)
    const i = emails.indexOf(email)
    return i < 0 ? null : i + 1
  }
  const values = waitlistSheet().getDataRange().getValues().slice(1)
  const rows = values.map((r, order) => ({ email: String(r[0]).trim().toLowerCase(), joined: r[1] ? new Date(r[1]).getTime() : Infinity, order })).filter(r => r.email)
  rows.sort((a, b) => (a.joined - b.joined) || (a.order - b.order))
  const i = rows.findIndex(r => r.email === email)
  return i < 0 ? null : i + 1
}

function ogUsed(email) {
  const sheet = ordersSheet()
  const values = sheet.getDataRange().getValues()
  const col = name => ORDER_HEADERS.indexOf(name)
  const now = Date.now()
  return values.slice(1).some(r => {
    if (String(r[col("Email")]).trim().toLowerCase() !== email) return false
    if (!(r[col("OG applied")] === true || String(r[col("OG applied")]).toUpperCase() === "TRUE")) return false
    const status = String(r[col("Status")])
    if (status === "authorized" || status === "paid") return true
    return status === "checkout_started" && now - new Date(r[col("Created")]).getTime() < DAY_MS
  })
}

function ogCheck(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "bad email" }
  const rank = ogRank(email)
  const used = ogUsed(email)
  return { ok: true, eligible: rank !== null && rank <= 100 && !used, rank: rank, used: used }
}

function orderUpsert(order) {
  if (!order || !order.order_id) return { ok: false, error: "missing order_id" }
  const sheet = ordersSheet()
  const col = name => ORDER_HEADERS.indexOf(name)
  const values = sheet.getDataRange().getValues()
  const index = values.findIndex((r, i) => i > 0 && String(r[0]) === String(order.order_id))
  const row = index > 0 ? values[index].slice(0, ORDER_HEADERS.length) : ORDER_HEADERS.map(() => "")
  while (row.length < ORDER_HEADERS.length) row.push("")
  const created = index < 0
  const oldStatus = created ? "" : String(row[col("Status")])
  const now = new Date()
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
  if (index > 0) sheet.getRange(index + 1, 1, 1, ORDER_HEADERS.length).setValues([row])
  else sheet.appendRow(row)
  const newStatus = String(row[col("Status")])
  if (newStatus !== oldStatus && (newStatus === "authorized" || newStatus === "paid")) notifyOrder(row, col)
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
