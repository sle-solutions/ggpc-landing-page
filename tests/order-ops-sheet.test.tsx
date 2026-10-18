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
  setDataValidation() {}
  setFontWeight() {}
}

class FakeSheet {
  rows: unknown[][]
  constructor(rows: unknown[][] = []) { this.rows = rows.map(row => [...row]) }
  getLastRow() { return this.rows.length }
  getLastColumn() { return Math.max(0, ...this.rows.map(row => row.length)) }
  getMaxColumns() { return this.getLastColumn() }
  getMaxRows() { return Math.max(this.rows.length, 100) }
  insertColumnsAfter(after: number, howMany: number) { this.rows.forEach(row => { while (row.length < after + howMany) row.push("") }) }
  getRange(row: number, column: number, height: number, width: number) { return new FakeRange(this, row, column, height, width) }
  getDataRange() { return this.getRange(1, 1, this.getLastRow(), this.getLastColumn()) }
  appendRow(row: unknown[]) { this.rows.push([...row]) }
}

function appScript(rows: unknown[][]) {
  const sheet = new FakeSheet(rows)
  const sheets: Record<string, FakeSheet> = { Orders: sheet }
  const spreadsheet = {
    getSheetByName: (name: string) => sheets[name] || null,
    insertSheet: (name: string) => (sheets[name] = new FakeSheet()),
  }
  const validation = { requireDate() { return this }, requireNumberGreaterThanOrEqualTo() { return this }, requireValueInList() { return this }, setAllowInvalid() { return this }, build() { return this } }
  const menuCalls: string[] = []
  const menu = { addItem(label: string, functionName: string) { menuCalls.push(label + ":" + functionName); return this }, addToUi() { menuCalls.push("added"); return this } }
  const context: Record<string, unknown> = {
    SpreadsheetApp: { getActive: () => spreadsheet, getUi: () => ({ createMenu: (name: string) => { menuCalls.push(name); return menu } }), newDataValidation: () => validation },
    LockService: { getScriptLock: () => ({ waitLock: () => undefined, releaseLock: () => undefined }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => "" }) },
    MailApp: { sendEmail: () => undefined },
    console,
  }
  const source = readFileSync(new URL("../scripts/waitlist-sheet.gs", import.meta.url), "utf8") + "\nglobalThis.__headers = ORDER_HEADERS; globalThis.__orderUpsert = orderUpsert; globalThis.__ensure = ensureOrderOpsSchema; globalThis.__refresh = refreshPhase1Gates; globalThis.__calculate = calculatePhase1GateSummary; globalThis.__onOpen = onOpen; globalThis.__summary = function(){return SpreadsheetApp.getActive().getSheetByName('Phase 1 gates')};"
  runInNewContext(source, context)
  return { sheet, headers: context.__headers as string[], upsert: context.__orderUpsert as (order: Record<string, unknown>) => unknown, ensure: context.__ensure as () => unknown, refresh: context.__refresh as () => unknown, calculate: context.__calculate as (rows: unknown[][]) => Record<string, unknown>, onOpen: context.__onOpen as () => void, menuCalls, summary: context.__summary as () => FakeSheet | null }
}

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
  const oldHeaders = headers.slice(0, -15)
  const row = oldHeaders.map(header => header === "Order ID" ? "GG-ABC123" : header === "Status" ? "authorized" : "")
  const script = appScript([oldHeaders, row])

  script.ensure()
  const opsHeaders = Array.from(headers.slice(-15))
  assert.deepEqual(Array.from(script.sheet.rows[0].slice(-15)), opsHeaders)
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
    "Actual customer payments AED", "Actual refunds AED", "Actual parts cost AED", "Actual payment fees AED", "Actual builder payout AED", "Confirmed labour claim?",
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
