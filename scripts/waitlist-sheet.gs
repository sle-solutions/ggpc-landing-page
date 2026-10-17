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

// Run once from the editor so the web app (which executes as the owner) is allowed to edit the sheet.
function authorize() {
  waitlistSheet()
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
  // Added after Notes so existing sheets keep their column positions; ordersSheet() backfills the two headers.
  ["stripe_fee_est_aed", "Stripe fee est AED"], ["net_service_aed", "Net service AED"],
]
const ORDER_HEADERS = ORDER_COLUMNS.map(c => c[1])
const DAY_MS = 24 * 60 * 60 * 1000

function ordersSheet() {
  const ss = SpreadsheetApp.getActive()
  let sheet = ss.getSheetByName("Orders")
  if (!sheet) sheet = ss.insertSheet("Orders")
  if (sheet.getLastRow() === 0) sheet.appendRow(ORDER_HEADERS)
  else if (sheet.getLastColumn() < ORDER_HEADERS.length) sheet.getRange(1, sheet.getLastColumn() + 1, 1, ORDER_HEADERS.length - sheet.getLastColumn()).setValues([ORDER_HEADERS.slice(sheet.getLastColumn())])
  return sheet
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
  MailApp.sendEmail(to, subject, body)
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
