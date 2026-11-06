import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { runInNewContext } from "node:vm"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { QaChecklist } from "../components/qa-checklist"
import { POST as waitlistPost } from "../app/api/waitlist/route"

type Write = { row: number; column: number; values: unknown[][]; kind: "values" | "text" }
type TextValue = { getText(): string }

class FakeRange {
  constructor(private readonly sheet: FakeSheet, private readonly row: number, private readonly column: number, private readonly height: number, private readonly width: number) {}
  getValues() { return Array.from({ length: this.height }, (_, y) => Array.from({ length: this.width }, (_, x) => this.sheet.rows[this.row - 1 + y]?.[this.column - 1 + x] ?? "")) }
  setValues(values: unknown[][]) {
    this.sheet.applyWrite({ row: this.row, column: this.column, values, kind: "values" }, () => values.forEach((line, y) => line.forEach((value, x) => {
      const row = this.sheet.rows[this.row - 1 + y] ?? (this.sheet.rows[this.row - 1 + y] = [])
      row[this.column - 1 + x] = value
    })))
  }
  setRichTextValues(values: TextValue[][]) {
    const text = values.map(line => line.map(value => value.getText()))
    this.sheet.applyWrite({ row: this.row, column: this.column, values: text, kind: "text" }, () => text.forEach((line, y) => line.forEach((value, x) => {
      const row = this.sheet.rows[this.row - 1 + y] ?? (this.sheet.rows[this.row - 1 + y] = [])
      row[this.column - 1 + x] = value
    })))
  }
  setDataValidation() {}
  setFontWeight() {}
}

class FakeSheet {
  rows: unknown[][]
  writes: Write[] = []
  maxRows = 100
  buffered = false
  pending: Array<() => void> = []
  writeAttempts = 0
  failWrite?: { at: number; after: boolean }
  applyWrite(write: Write, action: () => void) {
    const fail = ++this.writeAttempts === this.failWrite?.at
    if (fail && !this.failWrite?.after) throw new Error("Synthetic write failure")
    this.writes.push(write)
    if (this.buffered) this.pending.push(action); else action()
    if (fail) throw new Error("Synthetic write failure")
  }
  flush() { for (const action of this.pending.splice(0)) action() }
  constructor(rows: unknown[][] = []) { this.rows = rows.map(row => [...row]) }
  getLastRow() { return this.rows.length }
  getLastColumn() { return Math.max(0, ...this.rows.map(row => row.length)) }
  getMaxColumns() { return this.getLastColumn() }
  getMaxRows() { return this.maxRows }
  insertRowsAfter(after: number, howMany: number) { assert.equal(after, this.maxRows); this.maxRows += howMany }
  insertColumnsAfter(after: number, howMany: number) { this.rows.forEach(row => { while (row.length < after + howMany) row.push("") }) }
  getRange(row: number, column: number, height: number, width: number) { return new FakeRange(this, row, column, height, width) }
  getDataRange() { return this.getRange(1, 1, this.getLastRow(), this.getLastColumn()) }
  appendRow(row: unknown[]) { this.applyWrite({ row: this.rows.length + 1, column: 1, values: [row], kind: "values" }, () => this.rows.push([...row])) }
}

function appScript(rows: unknown[][], waitlistRows: unknown[][] = []) {
  const sheet = new FakeSheet(rows)
  const waitlist = new FakeSheet(waitlistRows)
  const sheets: Record<string, FakeSheet> = { Orders: sheet }
  const spreadsheet = {
    getSheetByName: (name: string) => sheets[name] || null,
    insertSheet: (name: string) => (sheets[name] = new FakeSheet()),
    getSheets: () => [waitlist, sheet],
  }
  const validation = { requireDate() { return this }, requireNumberGreaterThanOrEqualTo() { return this }, requireValueInList() { return this }, setAllowInvalid() { return this }, build() { return this } }
  const menuCalls: string[] = []
  const lock = { held: false, releases: 0, trace: [] as string[], failFlush: "" as "" | "before" | "after" }
  const menu = { addItem(label: string, functionName: string) { menuCalls.push(label + ":" + functionName); return this }, addToUi() { menuCalls.push("added"); return this } }
  const context: Record<string, unknown> = {
    Date,
    SpreadsheetApp: { getActive: () => spreadsheet, getUi: () => ({ createMenu: (name: string) => { menuCalls.push(name); return menu } }), newDataValidation: () => validation,
      newRichTextValue: () => { let text = ""; return { setText(value: string) { assert.equal(typeof value, "string"); text = value; return this }, build: () => ({ getText: () => text }) } },
      flush: () => { assert.equal(lock.held, true, "flush must occur while owned lock is held"); lock.trace.push("flush"); if (lock.failFlush === "before") throw new Error("Synthetic flush failure"); for (const sheet of [waitlist, ...Object.values(sheets)]) sheet.flush(); if (lock.failFlush === "after") throw new Error("Synthetic flush failure") } },
    LockService: { getScriptLock: () => ({ waitLock: () => { assert.equal(lock.held, false); lock.held = true; lock.trace.push("acquire") }, releaseLock: () => { assert.equal(lock.held, true); lock.trace.push("release"); lock.held = false; lock.releases++ } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (key: string) => key === "WAITLIST_SECRET" ? "synthetic-local-only" : "" }) },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: (text: string) => ({ text, setMimeType() { return this } }) },
    MailApp: { sendEmail: () => undefined },
    console,
  }
  const source = readFileSync(new URL("../scripts/waitlist-sheet.gs", import.meta.url), "utf8") + "\nglobalThis.__headers = ORDER_HEADERS; globalThis.__withLock = withLock; globalThis.__waitlistHeaders = HEADERS; globalThis.__orderUpsert = orderUpsert; globalThis.__waitlistUpsert = upsert; globalThis.__doPost = doPost; globalThis.__freeze = freezeOgList; globalThis.__ogRank = ogRank; globalThis.__bulk = bulk; globalThis.__ensure = ensureOrderOpsSchema; globalThis.__refresh = refreshPhase1Gates; globalThis.__calculate = calculatePhase1GateSummary; globalThis.__onOpen = onOpen; globalThis.__summary = function(){return SpreadsheetApp.getActive().getSheetByName('Phase 1 gates')};"
  runInNewContext(source, context)
  return { sheet, waitlist, sheets, lock, withLock: context.__withLock as (fn: () => unknown) => unknown, waitlistHeaders: context.__waitlistHeaders as string[],
    waitlistUpsert: context.__waitlistUpsert as (email: string, data: Record<string, unknown>, when: Date, firstJoined?: Date | null, submissions?: number) => boolean,
    doPost: context.__doPost as (event: { postData: { contents: string } }) => { text: string },
    bulk: context.__bulk as (rows: unknown[], remove: string[]) => unknown,
    freeze: context.__freeze as () => void, rank: context.__ogRank as (email: string) => number | null,
    headers: context.__headers as string[], upsert: context.__orderUpsert as (order: Record<string, unknown>) => unknown, ensure: context.__ensure as () => unknown, refresh: context.__refresh as () => unknown, calculate: context.__calculate as (rows: unknown[][]) => Record<string, unknown>, onOpen: context.__onOpen as () => void, menuCalls, summary: context.__summary as () => FakeSheet | null }
}

function noFormulaInput(sheet: FakeSheet) {
  // Google documents leading '=' strings as formulas for these raw write APIs.
  // This spy never evaluates a formula; it detects the unsafe API boundary.
  for (const write of sheet.writes.filter(w => w.kind === "values")) {
    for (const line of write.values) for (const value of line) {
      assert.ok(typeof value !== "string" || !value.startsWith("="), "formula-like string reached raw value API")
    }
  }
}

function unchangedColumns(sheet: FakeSheet, columns: number[]) {
  assert.ok(!sheet.writes.some(w => w.row > 1 && w.values.some(line => line.some((_, i) => columns.includes(w.column + i)))), "manual cells must not be rewritten")
}

test("public waitlist route forwards formula-like input that is stored as exact literal text", async () => {
  const script = appScript([])
  const before = { url: process.env.WAITLIST_SHEET_URL, secret: process.env.WAITLIST_SHEET_SECRET, fetch: globalThis.fetch }
  process.env.WAITLIST_SHEET_URL = "https://example.invalid/synthetic-script"
  process.env.WAITLIST_SHEET_SECRET = "synthetic-local-only"
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://example.invalid/synthetic-script")
    const result = script.doPost({ postData: { contents: String(init?.body) } })
    return new Response(result.text, { status: 200 })
  }
  try {
    const email = "=1+1@sample.invalid"
    const response = await waitlistPost(new Request("https://example.invalid/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, build_preference: "=1+1", picks_made: "3/3" }) }))
    assert.equal(response.status, 200)
    assert.equal(script.waitlist.rows[1][0], email)
    assert.equal(script.waitlist.rows[1][9], "=1+1")
    assert.equal(script.waitlist.rows[1][10], "3/3")
    noFormulaInput(script.waitlist)
    assert.ok(script.waitlist.writes.some(w => w.kind === "text" && w.values.flat().includes("3/3")))
  } finally {
    if (before.url === undefined) delete process.env.WAITLIST_SHEET_URL; else process.env.WAITLIST_SHEET_URL = before.url
    if (before.secret === undefined) delete process.env.WAITLIST_SHEET_SECRET; else process.env.WAITLIST_SHEET_SECRET = before.secret
    globalThis.fetch = before.fetch
  }
})

test("waitlist updates preserve exact keys, dates, counters, missing fields and untouched manual columns", () => {
  const script = appScript([])
  const email = "=literal@sample.invalid", first = new Date("2026-10-01T10:00:00Z"), later = new Date("2026-10-02T10:00:00Z")
  const fields = ["source", "form", "class", "use_case", "budget", "build_preference", "picks_made", "brief_complete", "page", "referrer", "utm_source", "utm_medium", "utm_campaign"]
  assert.equal(script.waitlistUpsert(email, Object.fromEntries(fields.map(k => [k, "=1+1"])), first), true)
  const anchoredEmail = "=LITERAL@Sample.Invalid"
  script.waitlist.rows[1][0] = anchoredEmail
  const manualBrief = { formula: "=2+2", style: "manual" }, manualNotes = { richText: "manual notes" }
  script.waitlist.rows[1][17] = manualBrief; script.waitlist.rows[1][18] = manualNotes
  script.waitlist.writes = []
  assert.equal(script.waitlistUpsert(email, { picks_made: "3/3", form: "" }, later), false)
  assert.equal(script.waitlist.rows.length, 2)
  assert.equal(script.waitlist.rows[1][0], anchoredEmail)
  assert.equal(script.waitlist.rows[1][1], first)
  assert.equal(script.waitlist.rows[1][2], later)
  assert.equal(script.waitlist.rows[1][3], 2)
  assert.equal(script.waitlist.rows[1][5], "=1+1")
  assert.equal(script.waitlist.rows[1][10], "3/3")
  assert.equal(script.waitlist.rows[1][17], manualBrief); assert.equal(script.waitlist.rows[1][18], manualNotes)
  noFormulaInput(script.waitlist); unchangedColumns(script.waitlist, [1, 18, 19])
})

test("backfill keeps typed dates/counts and freeze copies formula-like email keys as literal text", () => {
  const script = appScript([])
  script.bulk([{ email: "=member@sample.invalid", first_joined: "2026-01-02T03:04:05Z", last_updated: "2026-02-03T04:05:06Z", submissions: 7, picks_made: "3/3" }], [])
  assert.equal(script.waitlist.rows[1][3], 7)
  assert.equal(Object.prototype.toString.call(script.waitlist.rows[1][1]), "[object Date]")
  assert.equal((script.waitlist.rows[1][1] as Date).toISOString(), "2026-01-02T03:04:05.000Z")
  script.freeze()
  assert.equal(script.sheets.OG.rows[1][0], "=member@sample.invalid")
  assert.equal(script.sheets.OG.rows[1][1], 1)
  assert.equal(script.rank("=member@sample.invalid"), 1)
  noFormulaInput(script.waitlist); noFormulaInput(script.sheets.OG)
})

test("allowed legacy-false order create/update preserves literal text, typed values and manual cells", () => {
  const script = appScript([])
  const order = { order_id: "=synthetic-order", status: "checkout_started", email: "=order@sample.invalid", name: "=1+1", phone: "+971000000000", address: "=1+1", build_name: "=1+1", build_code: "=1+1", parts: "=1+1", add_ons: "3/3", created: "2026-10-01T10:00:00Z", parts_aed: 4000, og_applied: false }
  script.upsert(order)
  const manual = new Map<number, object>()
  for (const col of [25, ...Array.from({ length: 15 }, (_, i) => i + 29)]) {
    const value = { formulaOrRichText: "manual" + col }; manual.set(col, value); script.sheet.rows[1][col - 1] = value
  }
  const created = script.sheet.rows[1][1]
  script.sheet.writes = []
  script.upsert({ ...order, name: "'=text stays exact", created: "2026-11-01T10:00:00Z", parts_aed: 0, og_applied: false })
  assert.equal(script.sheet.rows.length, 2)
  assert.equal(script.sheet.rows[1][0], order.order_id)
  assert.equal(script.sheet.rows[1][5], order.email)
  assert.equal(script.sheet.rows[1][6], "'=text stays exact")
  assert.equal(script.sheet.rows[1][7], order.phone)
  assert.equal(script.sheet.rows[1][15], "3/3")
  assert.equal(script.sheet.rows[1][12], 0)
  assert.equal(script.sheet.rows[1][17], false)
  assert.equal(script.sheet.rows[1][1], created)
  assert.equal(Object.prototype.toString.call(created), "[object Date]")
  for (const [col, value] of manual) assert.equal(script.sheet.rows[1][col - 1], value)
  noFormulaInput(script.sheet); unchangedColumns(script.sheet, [...manual.keys()])
})

test("literal writes preserve Unicode, whitespace and leading punctuation without identity prefixes", () => {
  for (const value of ["=1+1", "+123", "-123", "@label", "'literal", "3/3", "0000123", "  =1+1", "نص عربي", "line1\nline2"]) {
    const script = appScript([])
    script.waitlistUpsert("member@sample.invalid", { build_preference: value }, new Date("2026-10-01T10:00:00Z"))
    assert.equal(script.waitlist.rows[1][9], value)
    assert.ok(script.waitlist.writes.some(w => w.kind === "text" && w.values.flat().includes(value)))
    noFormulaInput(script.waitlist)
  }
})

test("a new managed row can grow a full grid without changing the existing row", () => {
  const script = appScript([])
  script.waitlistUpsert("first@sample.invalid", {}, new Date("2026-10-01T10:00:00Z"))
  const first = [...script.waitlist.rows[1]]; script.waitlist.maxRows = 2
  script.waitlistUpsert("second@sample.invalid", { picks_made: "3/3" }, new Date("2026-10-02T10:00:00Z"))
  assert.ok(script.waitlist.getMaxRows() >= 3)
  assert.deepEqual(script.waitlist.rows[1], first)
  assert.equal(script.waitlist.rows[2][10], "3/3")
})

test("partial new waitlist writes never return success and retry preserves the anchored dates/counts", () => {
  for (const failure of [{ at: 1, after: true }, { at: 2, after: false }, { at: 2, after: true }]) {
    const headers = appScript([]).waitlistHeaders
    const script = appScript([], [headers])
    const first = new Date("2026-10-01T10:00:00Z"), retry = new Date("2026-10-02T10:00:00Z")
    script.waitlist.failWrite = failure
    assert.throws(() => script.waitlistUpsert("=retry@sample.invalid", { picks_made: "3/3" }, first), /Synthetic write failure/)
    assert.equal(script.waitlist.rows[1][0], "=retry@sample.invalid")
    const brief = { formula: "manual" }, notes = { richText: "manual" }
    script.waitlist.rows[1][17] = brief; script.waitlist.rows[1][18] = notes
    script.waitlist.failWrite = undefined; script.waitlist.writes = []
    assert.equal(script.waitlistUpsert("=retry@sample.invalid", {}, retry), false)
    assert.equal(script.waitlist.rows.length, 2)
    assert.equal((script.waitlist.rows[1][1] as Date).getTime(), first.getTime())
    assert.equal(script.waitlist.rows[1][2], retry)
    assert.equal(script.waitlist.rows[1][3], 2)
    assert.equal(script.waitlist.rows[1][10], "3/3")
    assert.equal(script.waitlist.rows[1][17], brief); assert.equal(script.waitlist.rows[1][18], notes)
    unchangedColumns(script.waitlist, [1, 18, 19]); noFormulaInput(script.waitlist)
  }
})

test("partial allowed legacy-false order writes recover the exact ID and typed amounts/dates", () => {
  for (const failure of [{ at: 1, after: true }, { at: 2, after: false }, { at: 2, after: true }].flatMap(f => [false].flatMap(og => [4000, 1e-7, 1e21].map(amount => ({ ...f, og, amount }))))) {
    const headers = appScript([]).headers
    const script = appScript([headers])
    script.sheet.failWrite = failure
    const original = { order_id: "=retry-order", created: "2026-10-01T10:00:00Z", status: "checkout_started", email: "=retry@sample.invalid", build_name: "=1+1", parts_aed: failure.amount, og_discount_aed: 0, og_applied: failure.og }
    assert.throws(() => script.upsert(original), /Synthetic write failure/)
    assert.equal(script.sheet.rows[1][0], original.order_id)
    assert.equal(script.sheet.rows[1][17], failure.og ? "TRUE" : "FALSE")
    const manual = { formula: "manual" }; script.sheet.rows[1][24] = manual
    script.sheet.failWrite = undefined; script.sheet.writes = []
    script.upsert({ order_id: original.order_id, status: "authorized" })
    assert.equal(script.sheet.rows.length, 2)
    assert.equal((script.sheet.rows[1][1] as Date).toISOString(), new Date(original.created).toISOString())
    assert.equal(script.sheet.rows[1][12], failure.amount)
    assert.equal(script.sheet.rows[1][17], failure.og)
    assert.equal(script.sheet.rows[1][18], 0)
    assert.equal(script.sheet.rows[1][9], "=1+1")
    assert.equal(script.sheet.rows[1][24], manual)
    unchangedColumns(script.sheet, [1, 25, ...Array.from({ length: 15 }, (_, i) => i + 29)]); noFormulaInput(script.sheet)
  }
})

test("public signup reports failure for an interrupted typed fill and its retry heals the same row", async () => {
  const script = appScript([], [appScript([]).waitlistHeaders])
  script.waitlist.failWrite = { at: 2, after: false }
  const before = { url: process.env.WAITLIST_SHEET_URL, secret: process.env.WAITLIST_SHEET_SECRET, fetch: globalThis.fetch, error: console.error }
  process.env.WAITLIST_SHEET_URL = "https://example.invalid/synthetic-script"
  process.env.WAITLIST_SHEET_SECRET = "synthetic-local-only"
  console.error = () => undefined
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://example.invalid/synthetic-script")
    return new Response(script.doPost({ postData: { contents: String(init?.body) } }).text)
  }
  const request = () => new Request("https://example.invalid/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "=retry@sample.invalid", picks_made: "3/3" }) })
  try {
    assert.equal((await waitlistPost(request())).status, 502)
    const originalJoined = new Date(String(script.waitlist.rows[1][1])).getTime()
    assert.ok(Number.isFinite(originalJoined))
    script.waitlist.failWrite = undefined
    assert.equal((await waitlistPost(request())).status, 200)
    assert.equal(script.waitlist.rows.length, 2)
    assert.equal((script.waitlist.rows[1][1] as Date).getTime(), originalJoined)
    assert.equal(script.waitlist.rows[1][3], 2)
    noFormulaInput(script.waitlist)
  } finally {
    if (before.url === undefined) delete process.env.WAITLIST_SHEET_URL; else process.env.WAITLIST_SHEET_URL = before.url
    if (before.secret === undefined) delete process.env.WAITLIST_SHEET_SECRET; else process.env.WAITLIST_SHEET_SECRET = before.secret
    globalThis.fetch = before.fetch; console.error = before.error
  }
})

test("managed order cells reject unsupported values before initializing a partial data row", () => {
  for (const value of [["=1+1"], { text: "=1+1" }, Number.NaN, Number.POSITIVE_INFINITY]) {
    const script = appScript([appScript([]).headers])
    assert.throws(() => script.upsert({ order_id: "GG-SYNTHETIC", name: value }), /Unsupported managed cell value/)
    assert.equal(script.sheet.rows.length, 1)
    assert.deepEqual(script.sheet.writes, [])
  }
})

test("buffered signup writes commit before lock release and success is returned", () => {
  const script = appScript([], [appScript([]).waitlistHeaders]); script.waitlist.buffered = true
  const result = script.withLock(() => {
    script.waitlistUpsert("buffered@sample.invalid", { picks_made: "3/3" }, new Date("2026-10-01T10:00:00Z"))
    assert.equal(script.waitlist.rows.length, 1, "writes are not committed before flush")
    return { ok: true }
  })
  assert.deepEqual(result, { ok: true })
  assert.deepEqual(script.lock.trace, ["acquire", "flush", "release"])
  assert.equal(script.waitlist.rows.length, 2)
  assert.equal(Object.prototype.toString.call(script.waitlist.rows[1][1]), "[object Date]")
  assert.equal(script.waitlist.rows[1][3], 1)
  assert.equal(script.waitlist.rows[1][10], "3/3")
  assert.equal(script.lock.held, false)
})

test("an unrelated historical blank First joined is not replaced with the current signup time", () => {
  const headers = appScript([]).waitlistHeaders, row = headers.map(() => "" as unknown)
  row[0] = "historical@sample.invalid"; row[3] = 5
  const script = appScript([], [headers, row]), now = new Date("2026-11-06T10:00:00Z")
  script.waitlistUpsert("historical@sample.invalid", { picks_made: "3/3" }, now)
  assert.equal(script.waitlist.rows[1][1], "")
  assert.equal(script.waitlist.rows[1][3], 6)
  const explicit = new Date("2026-01-01T10:00:00Z")
  script.waitlistUpsert("historical@sample.invalid", {}, now, explicit)
  assert.equal(script.waitlist.rows[1][1], explicit)
})

test("date recovery leaves impossible historical ISO text unchanged and accepts an exact valid ISO", () => {
  for (const value of ["2026-02-30T00:00:00.000Z", "2026-02-29T00:00:00.000Z"]) {
    const fresh = appScript([]), waitlistRow = fresh.waitlistHeaders.map(() => "" as unknown), orderRow = fresh.headers.map(() => "" as unknown)
    waitlistRow[0] = "historical@sample.invalid"; waitlistRow[1] = value; waitlistRow[3] = 1
    orderRow[0] = "GG-DATE"; orderRow[1] = value; orderRow[3] = "checkout_started"
    const script = appScript([fresh.headers, orderRow], [fresh.waitlistHeaders, waitlistRow])
    script.waitlistUpsert("historical@sample.invalid", {}, new Date("2026-11-06T10:00:00Z"))
    script.upsert({ order_id: "GG-DATE", status: "paid" })
    assert.equal(script.waitlist.rows[1][1], value)
    assert.equal(script.sheet.rows[1][1], value)
  }
  const fresh = appScript([]), row = fresh.waitlistHeaders.map(() => "" as unknown), valid = "2026-02-28T00:00:00.000Z"
  row[0] = "historical@sample.invalid"; row[1] = valid; row[3] = 1
  const script = appScript([], [fresh.waitlistHeaders, row])
  script.waitlistUpsert("historical@sample.invalid", {}, new Date("2026-11-06T10:00:00Z"))
  assert.equal((script.waitlist.rows[1][1] as Date).toISOString(), valid)
})

test("body failure still flushes buffered anchors while held and releases the owned lock", () => {
  const script = appScript([], [appScript([]).waitlistHeaders]); script.waitlist.buffered = true
  script.waitlist.failWrite = { at: 1, after: true }
  assert.throws(() => script.withLock(() => script.waitlistUpsert("buffered@sample.invalid", {}, new Date("2026-10-01T10:00:00Z"))), /Synthetic write failure/)
  assert.deepEqual(script.lock.trace, ["acquire", "flush", "release"])
  assert.equal(script.waitlist.rows[1][0], "buffered@sample.invalid")
  assert.equal(script.lock.held, false)
})

test("flush failures before or after commit cannot return success and always release the owned lock", () => {
  for (const point of ["before", "after"] as const) {
    for (const bodyThrows of [false, true]) {
      const script = appScript([], [appScript([]).waitlistHeaders]); script.waitlist.buffered = true; script.lock.failFlush = point
      let returned: unknown
      assert.throws(() => { returned = script.withLock(() => { script.waitlistUpsert("buffered@sample.invalid", {}, new Date("2026-10-01T10:00:00Z")); if (bodyThrows) throw new Error("Body failed"); return { ok: true } }) }, /Synthetic flush failure/)
      assert.equal(returned, undefined)
      assert.deepEqual(script.lock.trace, ["acquire", "flush", "release"])
      assert.equal(script.lock.held, false); assert.equal(script.lock.releases, 1)
      assert.equal(script.waitlist.rows.length, point === "after" ? 2 : 1)
    }
  }
})

test("opening the sheet adds a refresh menu without writing sheet data", () => {
  const script = appScript([["existing"]])
  const before = script.sheet.rows.map(row => [...row])
  script.onOpen()
  assert.deepEqual(script.sheet.rows, before)
  assert.deepEqual(script.menuCalls, ["GG PC ops", "Refresh Phase 1 gates:refreshPhase1Gates", "added"])
})

test("schema setup appends the ops and gate headers and repeated Stripe upserts preserve manual cells", () => {
  const fresh = appScript([])
  const headers = fresh.headers
  const oldHeaders = headers.slice(0, 28)
  const row = oldHeaders.map(header => header === "Order ID" ? "GG-ABC123" : header === "Status" ? "authorized" : "")
  const script = appScript([oldHeaders, row])

  script.ensure()
  const opsHeaders = Array.from(headers.slice(28))
  assert.deepEqual(Array.from(script.sheet.rows[0].slice(28)), opsHeaders)
  const ops = script.sheet.rows[1]
  ops[headers.indexOf("QA status")] = "Ready for handover"
  ops[headers.indexOf("QA evidence")] = "private://order-evidence"
  ops[headers.indexOf("Warranty claim status")] = "Reported"
  ops[headers.indexOf("Warranty claim opened")] = "2026-10-18"
  ops[headers.indexOf("Warranty claim notes")] = "2026-10-18: customer reported a boot issue"
  ops[headers.indexOf("Warranty claims (count)")] = 2

  script.upsert({ order_id: "GG-ABC123", status: "paid", email: "updated@example.test", parts_aed: 4000 })
  script.upsert({ order_id: "GG-ABC123", status: "paid", total_aed: 5000 })
  const saved = script.sheet.rows[1]
  for (const header of opsHeaders) assert.equal(saved[headers.indexOf(header)], ops[headers.indexOf(header)], header)
  assert.equal(saved[headers.indexOf("Email")], "updated@example.test")
  assert.equal(saved[headers.indexOf("Total AED")], 5000)
  const summary = script.summary()
  assert.ok(summary)
  assert.deepEqual(summary.rows[0], ["Phase 1 gates", "Result", "Definition"])
  script.refresh()
  assert.equal(summary.rows[3][1], 0)
  assert.equal(summary.rows[4][1], 0)
  assert.equal(summary.rows[5][1], "No completed paid builds")
  assert.match(String(summary.rows[5][2]), /Every order must be Yes or No/)
  assert.match(String(summary.rows[6][2]), /net GG PC receipts/)
  assert.match(String(summary.rows[7][2]), /builder payout/)
  assert.doesNotMatch(script.sheet.rows[1].join(" "), /=COUNTUNIQUE|=IF\(/)
})

test("Phase 1 calculations require valid dates and explicit claim states, and weight actual amounts", () => {
  const script = appScript([])
  const order = (id: string, payments: number | "", refund: number | "", parts: number | "", fees: number | "", payout: number | "", claim: string) => {
    const row: unknown[] = script.headers.map(() => "")
    const put = (header: string, value: unknown) => { row[script.headers.indexOf(header)] = value }
    put("Order ID", id)
    put("Paid verified date", new Date("2026-10-18T00:00:00Z"))
    put("Job completed date", new Date("2026-10-18T00:00:00Z"))
    put("Actual customer payments AED", payments)
    put("Actual refunds AED", refund)
    put("Actual parts cost AED", parts)
    put("Actual payment fees AED", fees)
    put("Actual builder payout AED", payout)
    put("Confirmed labour claim?", claim)
    return row
  }
  assert.equal(script.calculate([]).claimRate, "No completed paid builds")
  const unknown = order("GG-UNKNOWN", 1000, 0, 900, 10, 0, "")
  assert.equal(script.calculate([unknown]).claimRate, "Review needed")
  assert.equal(script.calculate([unknown]).grossRate, "Pass: 10.0%")
  const notAValidDate = [...unknown]
  notAValidDate[script.headers.indexOf("Paid verified date")] = "2026-10-18"
  assert.equal(script.calculate([notAValidDate]).completedCount, 0)
  const weighted = [order("GG-A", 1000, 0, 930, 10, 0, "No"), order("GG-B", 9000, 0, 8100, 90, 0, "No")]
  assert.equal(script.calculate(weighted).grossRate, "Pass: 9.7%")
  assert.equal(script.calculate(weighted).netRate, "Pass: 8.7%")
  const refunded = order("GG-REFUND", 100, 100, 0, 0, 0, "No")
  assert.equal(script.calculate([refunded]).grossRate, "Net receipts are zero or below")
  const duplicate = order("GG-DUP", 100, 0, 0, 0, 0, "No")
  assert.equal(script.calculate([duplicate, duplicate]).grossRate, "Resolve duplicate order IDs")
})

test("schema setup adds Protection fee and ops fields to the known live 27-column prefix", () => {
  const fresh = appScript([])
  const oldHeaders = fresh.headers.slice(0, 27)
  const script = appScript([oldHeaders, oldHeaders.map(() => "")])

  script.ensure()
  assert.deepEqual(script.sheet.rows[0].slice(27), [
    "Protection fee AED", "QA status", "QA evidence", "Handover date", "Warranty claim status",
    "Warranty claim opened", "Warranty claim notes", "Warranty claims (count)", "Paid verified date", "Job completed date",
    "Actual customer payments AED", "Actual refunds AED", "Actual parts cost AED", "Actual payment fees AED", "Actual builder payout AED", "Confirmed labour claim?", "Checkout claim",
  ])
  assert.equal(script.sheet.getMaxColumns(), fresh.headers.length)
})

test("schema setup refuses a mismatched existing header without changing the sheet", () => {
  const fresh = appScript([])
  const headers = fresh.headers.slice(0, -7)
  headers[4] = "Wrong column"
  const before = [Array.from(headers), Array.from(headers, () => "existing data")]
  const script = appScript(before)

  assert.throws(() => script.ensure(), /header mismatch at column 5/)
  assert.deepEqual(script.sheet.rows, before)
})

test("print checklist records the promised checks without uploading or certifying a result by default", () => {
  const html = renderToStaticMarkup(createElement(QaChecklist))
  for (const label of ["Order ID", "Inspector", "Inspection date", "BIOS version", "Memory profile", "30-minute stress test", "Test tool", "Start time", "End time", "Peak temperature", "Private evidence folder link", "Handover date", "Inspector sign-off"]) {
    assert.match(html, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  }
  assert.match(html, /two-year labour warranty/)
  assert.match(html, /publicly accessible, not a private or secure record/)
  assert.match(html, /There is no upload on this page/)
  assert.doesNotMatch(html, /<form\b|\bmethod=|\baction=/)
  assert.match(html, /Select after run/)
})
