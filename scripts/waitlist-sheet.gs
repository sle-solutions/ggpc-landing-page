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
 */

const HEADERS = ["Email", "First joined", "Last updated", "Submissions", "Source", "Form", "Class", "Use case", "Budget", "Build preference", "Picks made", "Brief complete", "Page", "Referrer", "UTM source", "UTM medium", "UTM campaign", "Brief sent", "Notes"]
const FIELDS = { source: "Source", form: "Form", class: "Class", use_case: "Use case", budget: "Budget", build_preference: "Build preference", picks_made: "Picks made", brief_complete: "Brief complete", page: "Page", referrer: "Referrer", utm_source: "UTM source", utm_medium: "UTM medium", utm_campaign: "UTM campaign" }

function doPost(e) {
  let body
  try { body = JSON.parse(e.postData.contents) } catch (_) { return json({ ok: false, error: "bad json" }) }
  if (!body || !body.secret || body.secret !== waitlistSecret()) return json({ ok: false, error: "unauthorized" })
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
