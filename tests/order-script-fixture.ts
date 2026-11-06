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
  class Range {
    constructor(readonly sheet: Sheet, readonly row: number, readonly column: number, readonly height: number, readonly width: number) {}
    getValues() { readHook?.(); return Array.from({ length: this.height }, (_, y) => Array.from({ length: this.width }, (_, x) => this.sheet.rows[this.row - 1 + y]?.[this.column - 1 + x] ?? "")) }
    setValues(values: unknown[][]) {
      writeHook?.("before", this.row, this.column, values)
      values.forEach((row, y) => row.forEach((value, x) => { this.sheet.rows[this.row - 1 + y] ??= []; this.sheet.rows[this.row - 1 + y][this.column - 1 + x] = value }))
      writeHook?.("after", this.row, this.column, values)
    }
  }
  class Sheet {
    rows: unknown[][]
    constructor(rows: unknown[][] = []) { this.rows = rows.map(row => row.slice()) }
    getLastRow() { return this.rows.length } getLastColumn() { return Math.max(0, ...this.rows.map(row => row.length)) } getMaxColumns() { return 100 } getMaxRows() { return 1000 }
    getDataRange() { return this.getRange(1, 1, this.getLastRow(), this.getLastColumn()) }
    getRange(row: number, column: number, height: number, width: number) { return new Range(this, row, column, height, width) }
    appendRow(row: unknown[]) { this.getRange(this.rows.length + 1, 1, 1, row.length).setValues([row]) }
  }
  const sheets: Record<string, Sheet> = { Waitlist: new Sheet([["Email", "First joined"], ...(options.waitlist ?? ["member@example.invalid"]).map((email, index) => [email, new Date(1700000000000 + index * 1000)])]) }
  if (options.og) sheets.OG = new Sheet([["Email", "Rank"], ...options.og.map((email, i) => [email, i + 1])])
  const context: Record<string, any> = { Date, Set, console: { error() {} }, SpreadsheetApp: { getActive: () => ({ getSheets: () => [sheets.Waitlist], getSheetByName: (name: string) => sheets[name] ?? null, insertSheet: (name: string) => sheets[name] = new Sheet() }), flush: () => { flushHook?.() } }, LockService: { getScriptLock: () => ({ waitLock() { if (locked) throw new Error("nested_lock"); locked = true; locks++ }, releaseLock() { locked = false } }) }, PropertiesService: { getScriptProperties: () => ({ getProperty: (name: string) => name === "WAITLIST_SECRET" ? "synthetic-only" : options.notify ? "operator@example.invalid" : null }) }, MailApp: { sendEmail: () => { if (locked) throw new Error("network_under_lock"); notifications++ } }, ContentService: { MimeType: { JSON: "json" }, createTextOutput: (text: string) => ({ setMimeType: () => JSON.parse(text) }) } }
  runInNewContext(readFileSync(new URL("../scripts/waitlist-sheet.gs", import.meta.url), "utf8") + "\nglobalThis.__headers=ORDER_HEADERS;", context)
  const headers: string[] = Array.from(context.__headers)
  sheets.Orders = new Sheet([options.legacyHeaders ? headers.slice(0, 43) : headers])
  function dispatch(action: string, value: unknown) { calls++; return context.doPost({ postData: { contents: JSON.stringify({ secret: "synthetic-only", action, ...(action === "order_upsert" ? { order: value } : action === "og_check" ? { email: value } : { checkout: value }) }) } }) as Record<string, any> }
  function ok(value: Record<string, any>) { if (value.ok !== true) throw new Error(String(value.error)); return value }
  const client: SheetClient = {
    async reserveCheckout(checkout: CheckoutReservation) { return ok(dispatch("checkout_reserve", checkout)) as { ok: true; orderId: string; og: boolean } },
    async attachCheckout(checkout: ClaimRef & { session: string }) { ok(dispatch("checkout_attach", checkout)); return { ok: true } },
    async transitionCheckout(checkout: ClaimRef & { eventId: string; order: OrderRow }) { ok(dispatch("checkout_transition", checkout)); return { ok: true } },
    async upsertOrder(order: OrderRow) { const r = ok(dispatch("order_upsert", order)); return { ok: true, created: r.created === true } },
  }
  return { client, headers, sheets, dispatch, info: (email: string) => context.ogCheck(email), locked: () => locked, locks: () => locks, notifications: () => notifications, calls: () => calls, onWrite: (hook: typeof writeHook) => { writeHook = hook }, onRead: (hook: typeof readHook) => { readHook = hook }, onFlush: (hook: typeof flushHook) => { flushHook = hook }, claim: (index = 1) => JSON.parse(String(sheets.Orders.rows[index]?.[headers.indexOf("Checkout claim")])), legacy: (order: Record<string, unknown>) => { const row = headers.map(header => order[header] ?? ""); sheets.Orders.rows.push(row) } }
}
