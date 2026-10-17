import assert from "node:assert/strict"
import { test } from "node:test"
import { decodeBuildCode, encodeBuildCode, toQuoteRequest } from "../lib/order/build-code"
import { GOLDEN_CODE } from "./order-fixtures"

test("golden vector decodes and re-encodes to the same code", () => {
  const r = decodeBuildCode(GOLDEN_CODE)
  assert.ok(r.ok)
  if (!r.ok) return
  assert.equal(r.build.name, "My build")
  assert.deepEqual(r.build.parts.map(p => p.slot), ["CPU", "CPU_COOLER", "GPU"])
  assert.equal(r.build.parts[0].candidates.length, 2)
  assert.deepEqual(r.build.parts[1].candidates, [])
  assert.deepEqual(r.build.parts[2].candidates, [{ retailer: "microless", retailerSku: "123456" }])
  assert.equal(encodeBuildCode("My build", [["CPU", "amazon_ae:B0BBHD5D8Y", "noon:N53346840A"], ["CPU_COOLER"], ["GPU", "microless:123456"]]), GOLDEN_CODE)
  assert.equal(toQuoteRequest(r.build).parts[2].candidates[0].retailerSku, "123456")
})

test("round trips a non-ASCII name and splits the SKU on the first colon", () => {
  const code = encodeBuildCode("Ali's بناء 🎮", [["CPU", "noon:N1:odd"]])
  const r = decodeBuildCode(code)
  assert.ok(r.ok && r.build.name === "Ali's بناء 🎮" && r.build.parts[0].candidates[0].retailerSku === "N1:odd")
})

test("unknown versions and garbage are rejected", () => {
  assert.deepEqual(decodeBuildCode("2." + GOLDEN_CODE.slice(2)), { ok: false, reason: "new_version" })
  for (const bad of ["", "1.", "x.abc", "1.!!!", "nodot", "1." + Buffer.from("[1,2]").toString("base64url"), "1." + Buffer.from("not json").toString("base64url")]) {
    assert.deepEqual(decodeBuildCode(bad), { ok: false, reason: "bad_code" }, bad)
  }
})

test("limits: candidates, slots, retailer, SKU, name, length", () => {
  const ok = (parts: unknown, name = "x") => decodeBuildCode("1." + Buffer.from(JSON.stringify([name, parts])).toString("base64url")).ok
  assert.equal(ok([["CPU", "noon:1"]]), true)
  assert.equal(ok([["CPU", "noon:1", "noon:2", "noon:3", "noon:4"]]), false, "4 candidates")
  assert.equal(ok([["CPU"]]), false, "only the cooler may have none")
  assert.equal(ok([["CPU_COOLER"]]), true)
  assert.equal(ok([["CPU", "noon:1"], ["CPU", "noon:2"]]), false, "duplicate core slot")
  assert.equal(ok([["NOPE", "noon:1"]]), false)
  assert.equal(ok([["CPU", "pcdubai:1"]]), false)
  assert.equal(ok([["CPU", "noon:has space"]]), false)
  assert.equal(ok([["CPU", "noon:" + "a".repeat(129)]]), false)
  assert.equal(ok([["CPU", "noon:" + "a".repeat(128)]]), true)
  assert.equal(ok([["CPU", "noon:1", "noon:1"]]), false, "duplicate candidate")
  assert.equal(ok([["CPU", "noon:1"]], "n".repeat(61)), false)
  assert.equal(ok([["CPU", "noon:1"]], "n".repeat(60)), true)
  const extras = (n: number) => Array.from({ length: n }, (_, i) => ["EXTRA", `noon:e${i}`])
  assert.equal(ok(extras(6)), true)
  assert.equal(ok(extras(7)), false)
  const core = ["CPU", "CPU_COOLER", "MOTHERBOARD", "RAM", "STORAGE", "GPU", "POWER_SUPPLY", "CASE"].map(s => [s, "noon:1"])
  assert.equal(ok([...core, ...extras(6)]), true)
  assert.equal(decodeBuildCode("1." + "A".repeat(4001)).ok, false)
})

test("slot order is not assumed", () => {
  const r = decodeBuildCode(encodeBuildCode("", [["GPU", "noon:1"], ["CPU", "noon:2"]]))
  assert.ok(r.ok && r.build.parts[0].slot === "GPU")
})
