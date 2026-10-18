import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { runInNewContext } from "node:vm"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { QaChecklist } from "../components/qa-checklist"

class FakeRange {
  constructor(private readonly sheet: FakeSheet, private readonly row: number, private readonly column: number, private readonly height: number, private readonly width: number) {}
  getValues() { return Array.from({ length: this.height }, (_, y) => Array.from({ length: this.width }, (_, x) => this.sheet.rows[this.row - 1 + y]?.[this.column - 1 + x] ?? "")) }
  setValues(values: unknown[][]) {
    values.forEach((line, y) => line.forEach((value, x) => {
      const row = this.sheet.rows[this.row - 1 + y] ?? (this.sheet.rows[this.row - 1 + y] = [])
      row[this.column - 1 + x] = value
    }))
  }
}

class FakeSheet {
  rows: unknown[][]
  constructor(rows: unknown[][] = []) { this.rows = rows.map(row => [...row]) }
  getLastRow() { return this.rows.length }
  getLastColumn() { return Math.max(0, ...this.rows.map(row => row.length)) }
  getMaxColumns() { return this.getLastColumn() }
  insertColumnsAfter(after: number, howMany: number) { this.rows.forEach(row => { while (row.length < after + howMany) row.push("") }) }
  getRange(row: number, column: number, height: number, width: number) { return new FakeRange(this, row, column, height, width) }
  getDataRange() { return this.getRange(1, 1, this.getLastRow(), this.getLastColumn()) }
  appendRow(row: unknown[]) { this.rows.push([...row]) }
}

function appScript(rows: unknown[][]) {
  const sheet = new FakeSheet(rows)
  const spreadsheet = {
    getSheetByName: () => sheet,
    insertSheet: () => sheet,
  }
  const context: Record<string, unknown> = {
    SpreadsheetApp: { getActive: () => spreadsheet },
    LockService: { getScriptLock: () => ({ waitLock: () => undefined, releaseLock: () => undefined }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => "" }) },
    MailApp: { sendEmail: () => undefined },
    console,
  }
  const source = readFileSync(new URL("../scripts/waitlist-sheet.gs", import.meta.url), "utf8") + "\nglobalThis.__headers = ORDER_HEADERS; globalThis.__orderUpsert = orderUpsert; globalThis.__ensure = ensureOrderOpsSchema;"
  runInNewContext(source, context)
  return { sheet, headers: context.__headers as string[], upsert: context.__orderUpsert as (order: Record<string, unknown>) => unknown, ensure: context.__ensure as () => unknown }
}

test("schema setup appends the seven exact ops headers and repeated Stripe upserts preserve manual cells", () => {
  const fresh = appScript([])
  const headers = fresh.headers
  const oldHeaders = headers.slice(0, -7)
  const row = oldHeaders.map(header => header === "Order ID" ? "GG-ABC123" : header === "Status" ? "authorized" : "")
  const script = appScript([oldHeaders, row])

  script.ensure()
  const opsHeaders = ["QA status", "QA evidence", "Handover date", "Warranty claim status", "Warranty claim opened", "Warranty claim notes", "Warranty claims (count)"]
  assert.deepEqual(script.sheet.rows[0].slice(-7), opsHeaders)
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
})

test("schema setup adds Protection fee and ops fields to the known live 27-column prefix", () => {
  const fresh = appScript([])
  const oldHeaders = fresh.headers.slice(0, 27)
  const script = appScript([oldHeaders, oldHeaders.map(() => "")])

  script.ensure()
  assert.deepEqual(script.sheet.rows[0].slice(27), [
    "Protection fee AED", "QA status", "QA evidence", "Handover date", "Warranty claim status",
    "Warranty claim opened", "Warranty claim notes", "Warranty claims (count)",
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
