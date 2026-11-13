import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import type { CheckoutReservation, ClaimRef, OrderRow, SheetClient } from "../lib/order/sheet"

// In-memory spreadsheet boundary only; all authority/claim operations are the
// actual shipped Apps Script source. No network, member rows or real codes.
export function scriptFixture(options: { legacyHeaders?: boolean; og?: string[]; waitlist?: string[]; notify?: boolean } = {}) {
  let locked = false, locks = 0, calls = 0, notifications = 0
  let writeHook: ((kind: string, row: number, column: number, values: unknown[][]) => void) | null = null
  let readHook: (() => void) | null = null
  let flushHook: (() => void) | null = null
  const writes: Array<{ kind: string; row: number; column: number; values: unknown[][] }> = []
  const flushWhileLocked: boolean[] = []
  class Range {
    constructor(readonly sheet: Sheet, readonly row: number, readonly column: number, readonly height: number, readonly width: number) {}
    getValues() { readHook?.(); return Array.from({ length: this.height }, (_, y) => Array.from({ length: this.width }, (_, x) => this.sheet.rows[this.row - 1 + y]?.[this.column - 1 + x] ?? "")) }
    getFormulas() { readHook?.(); return Array.from({ length: this.height }, (_, y) => Array.from({ length: this.width }, (_, x) => this.sheet.formulas[this.row - 1 + y]?.[this.column - 1 + x] ?? "")) }
    setValues(values: unknown[][]) {
      this.write(values, "values")
    }
    setRichTextValues(values: Array<Array<{ getText(): string }>>) {
      this.write(values.map(row => row.map(value => value.getText())), "text")
    }
    private write(values: unknown[][], kind: string) {
      writeHook?.("before", this.row, this.column, values)
      writes.push({ kind, row: this.row, column: this.column, values })
      const apply = () => values.forEach((row, y) => row.forEach((value, x) => { this.sheet.rows[this.row - 1 + y] ??= []; this.sheet.rows[this.row - 1 + y][this.column - 1 + x] = value }))
      if (this.sheet.buffered) this.sheet.pending.push(apply); else apply()
      writeHook?.("after", this.row, this.column, values)
    }
  }
  class Sheet {
    rows: unknown[][]
    formulas: string[][] = []
    buffered = false
    pending: Array<() => void> = []
    flush() { for (const write of this.pending.splice(0)) write() }
    constructor(rows: unknown[][] = []) { this.rows = rows.map(row => row.slice()) }
    getLastRow() { return this.rows.length } getLastColumn() { return Math.max(0, ...this.rows.map(row => row.length)) } getMaxColumns() { return 100 } getMaxRows() { return 1000 }
    getDataRange() { return this.getRange(1, 1, this.getLastRow(), this.getLastColumn()) }
    getRange(row: number, column: number, height: number, width: number) { return new Range(this, row, column, height, width) }
    appendRow(row: unknown[]) { this.getRange(this.rows.length + 1, 1, 1, row.length).setValues([row]) }
  }
  const sheets: Record<string, Sheet> = { Waitlist: new Sheet([["Email", "First joined"], ...(options.waitlist ?? ["member@example.invalid"]).map((email, index) => [email, new Date(1700000000000 + index * 1000)])]) }
  if (options.og) sheets.OG = new Sheet([["Email", "Rank"], ...options.og.map((email, i) => [email, i + 1])])
  const context: Record<string, any> = { Date, Set, Utilities: { DigestAlgorithm: { SHA_256: "sha256" }, Charset: { UTF_8: "utf8" }, computeDigest: (algorithm: string, value: string, charset: string) => { if (algorithm !== "sha256" || charset !== "utf8") throw new Error("wrong_digest_contract"); return Array.from(createHash("sha256").update(value, "utf8").digest(), n => n > 127 ? n - 256 : n) } }, console: { error() {} }, SpreadsheetApp: { newRichTextValue: () => { let text = ""; return { setText(value: string) { text = value; return this }, build: () => ({ getText: () => text }) } }, getActive: () => ({ getSheets: () => [sheets.Waitlist], getSheetByName: (name: string) => sheets[name] ?? null, insertSheet: (name: string) => sheets[name] = new Sheet() }), flush: () => { flushWhileLocked.push(locked); if (!locked) throw new Error("flush_outside_lock"); flushHook?.(); for (const sheet of Object.values(sheets)) sheet.flush() } }, LockService: { getScriptLock: () => ({ waitLock() { if (locked) throw new Error("nested_lock"); locked = true; locks++ }, releaseLock() { locked = false } }) }, PropertiesService: { getScriptProperties: () => ({ getProperty: (name: string) => name === "WAITLIST_SECRET" ? "synthetic-only" : options.notify ? "operator@example.invalid" : null }) }, MailApp: { sendEmail: () => { if (locked) throw new Error("network_under_lock"); notifications++ } }, ContentService: { MimeType: { JSON: "json" }, createTextOutput: (text: string) => ({ setMimeType: () => JSON.parse(text) }) } }
  runInNewContext(readFileSync(new URL("../scripts/waitlist-sheet.gs", import.meta.url), "utf8") + "\nglobalThis.__headers=ORDER_HEADERS;", context)
  const headers: string[] = Array.from(context.__headers)
  sheets.Orders = new Sheet([options.legacyHeaders ? headers.slice(0, 43) : headers])
  const actions: string[] = []
  function rawPost(body: Record<string, unknown>) { return context.doPost({ postData: { contents: JSON.stringify(body) } }) as Record<string, any> }
  function dispatch(action: string, value: unknown) { calls++; actions.push(action); return rawPost({ secret: "synthetic-only", action, ...(action.startsWith("member_code_") ? { memberCode: value } : action === "order_upsert" ? { order: value } : action === "og_check" ? { email: value } : { checkout: value }) }) }
  function ok(value: Record<string, any>) { if (value.ok !== true) throw new Error(String(value.error)); return value }
  const client: SheetClient = {
    async reserveCheckout(checkout: CheckoutReservation) { return ok(dispatch("checkout_reserve", checkout)) as { ok: true; orderId: string; og: boolean } },
    async attachCheckout(checkout: ClaimRef & { session: string }) { ok(dispatch("checkout_attach", checkout)); return { ok: true } },
    async transitionCheckout(checkout: ClaimRef & { eventId: string; order: OrderRow }) { ok(dispatch("checkout_transition", checkout)); return { ok: true } },
    async upsertOrder(order: OrderRow) { const r = ok(dispatch("order_upsert", order)); return { ok: true, created: r.created === true } },
  }
  return { client, headers, sheets, writes, actions, rawPost, flushWhileLocked, dispatch, info: (email: string) => context.ogCheck(email), locked: () => locked, locks: () => locks, notifications: () => notifications, calls: () => calls, onWrite: (hook: typeof writeHook) => { writeHook = hook }, onRead: (hook: typeof readHook) => { readHook = hook }, onFlush: (hook: typeof flushHook) => { flushHook = hook }, claim: (index = 1) => JSON.parse(String(sheets.Orders.rows[index]?.[headers.indexOf("Checkout claim")])), legacy: (order: Record<string, unknown>) => { const row = headers.map(header => order[header] ?? ""); sheets.Orders.rows.push(row) } }
}
