import assert from "node:assert/strict"
import { test } from "node:test"
import { createHash, randomBytes } from "node:crypto"
import { mkdtempSync, realpathSync, writeFileSync, readFileSync, statSync, chmodSync, rmSync, existsSync, readdirSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import { scriptFixture } from "./order-script-fixture"
import { handleCheckout } from "../lib/order/checkout"
import { FULL_CODE, fullQuote } from "./order-fixtures"
const require = createRequire(import.meta.url), ops = require("../scripts/member-code-ops.cjs")
const email = "member@example.invalid", other = "other@example.invalid", id = "11111111-2222-4333-8444-555555555555", id2 = "22222222-3333-4444-8555-666666666666"
const token = () => ops.CODE_PREFIX + randomBytes(32).toString("base64url")
const payload = (code = token(), e = email, issuanceId = id) => ({ version: 1, email: e, digest: ops.digestCode(code), issuanceId })
const checkPayload = (p: ReturnType<typeof payload>) => ({ version: 1, email: p.email, digest: p.digest })
function issue(f: ReturnType<typeof scriptFixture>, p: ReturnType<typeof payload>) { return f.dispatch("member_code_issue", p) }
function check(f: ReturnType<typeof scriptFixture>, p: ReturnType<typeof payload>) { return f.dispatch("member_code_check", checkPayload(p)) }
function temp() { const dir = mkdtempSync(path.join(realpathSync(tmpdir()), "ggpc-synthetic-member-code-")); chmodSync(dir, 0o700); const file = (name: string, value: unknown) => { const p = path.join(dir, name + ".json"); writeFileSync(p, JSON.stringify(value), { mode: 0o600, flag: "wx" }); return p }; return { dir, file, close: () => rmSync(dir, { recursive: true, force: true }) } }
const config = (fetch: typeof globalThis.fetch) => ({ url: "https://script.google.com/macros/s/SYNTHETIC_DEPLOYMENT/exec", secret: "synthetic-only", fetch })
const bridge = (f: ReturnType<typeof scriptFixture>, visit?: (body: Record<string, any>) => void) => config((async (_url, init) => { const body = JSON.parse(String(init?.body)); visit?.(body); return Response.json(f.rawPost(body)) }) as typeof fetch)

test("real crypto uses a versioned domain and256bit friendly bearer; prepare is private/inert and never logs credentials", async () => {
  const t = temp()
  try {
    const input = t.file("synthetic-member", { email: " MEMBER+tag@example.invalid " }), out = path.join(t.dir, "outbox.json")
    const env = new Proxy({}, { get() { throw new Error("prepare must not read authority env") } })
    assert.equal((await ops.main(["prepare", input, out], env)).status, "prepared")
    const box = JSON.parse(readFileSync(out, "utf8")); assert.match(box.code, /^GGPC-OG-[A-Za-z0-9_-]{43}$/); assert.equal(Buffer.from(box.code.slice(8), "base64url").length, 32); assert.equal(box.payload.email, "member+tag@example.invalid"); assert.equal(box.payload.digest, createHash("sha256").update("ggpc-og-member-code:v1\0" + box.code).digest("hex")); assert.notEqual(box.payload.digest, createHash("sha256").update(box.code).digest("hex")); assert.equal(statSync(out).mode & 0o777, 0o600); assert.equal(box.activationVerified, false)
    await assert.rejects(ops.main(["prepare", input, out], env)); assert.equal(JSON.parse(readFileSync(out, "utf8")).code, box.code)
    const child = spawnSync(process.execPath, [path.resolve("scripts/member-code-ops.cjs"), "prepare", input, path.join(t.dir, "child-outbox.json")], { env: { PATH: path.dirname(process.execPath), HOME: t.dir, NODE_ENV: "test" }, encoding: "utf8" }); assert.equal(child.status, 0); assert.equal(child.stderr, ""); assert(!child.stdout.includes(box.code) && !child.stdout.includes("example.invalid")); assert.match(child.stdout, /activationVerified.*false/)
  } finally { t.close() }
})
test("issue requires existing valid frozen OG and never freezes, creates, reranks or uses live waitlist fallback", () => {
  for (const f of [scriptFixture(), scriptFixture({ og: [] }), scriptFixture({ og: [email, email] })]) { const before = JSON.stringify(Object.fromEntries(Object.entries(f.sheets).map(([k, v]) => [k, v.rows]))); assert.equal(issue(f, payload()).ok, false); assert.equal(JSON.stringify(Object.fromEntries(Object.entries(f.sheets).map(([k, v]) => [k, v.rows]))), before); assert.equal(f.writes.length, 0) }
  const f = scriptFixture({ og: [email] }); f.sheets.OG.rows[1][1] = 2; assert.equal(issue(f, payload()).ok, false); assert.equal(f.writes.length, 0)
})
test("same frozen row owns one digest/issuance, original cells/rank stay exact and check is read-only", () => {
  const f = scriptFixture({ og: [" MEMBER@example.invalid ", other] }), p = payload(); const originals = f.sheets.OG.rows.map(r => r.slice(0, 2)); const orders = JSON.stringify(f.sheets.Orders.rows)
  const result = issue(f, p); assert.equal(result.ok, true); assert.equal(result.checkoutAuthorized, false); assert.equal(result.requestBinding, ops.requestBinding("issue", p)); assert.equal(result.issuanceId, id); assert.equal(result.available, true); assert.equal(JSON.stringify(result).includes(email), false); assert.equal(f.sheets.OG.rows[1][2], p.digest); assert.equal(f.sheets.OG.rows[1][3], id); assert.match(result.issuedAt, /^\d{4}-/)
  const count = f.writes.length; assert.deepEqual(issue(f, p), result); assert.equal(f.writes.length, count); assert.equal(check(f, p).requestBinding, ops.requestBinding("check", checkPayload(p))); assert.equal(f.writes.length, count); assert.equal(JSON.stringify(f.sheets.Orders.rows), orders); assert.deepEqual(f.sheets.OG.rows.map(r => r.slice(0, 2)), originals); assert.ok(f.writes.every(w => w.column >= 3)); assert.equal(f.flushWhileLocked.every(Boolean), true)
})
test("duplicate member digests and issuance identities reject BEFORE overwriting another record", () => {
  const f = scriptFixture({ og: [email, other] }), p = payload(); assert.equal(issue(f, p).ok, true); const original = JSON.stringify(f.sheets.OG.rows)
  for (const q of [payload(token(), email, id2), { ...p, email: other, issuanceId: id2 }, { ...payload(token(), other), issuanceId: id }]) assert.equal(issue(f, q).ok, false)
  assert.equal(JSON.stringify(f.sheets.OG.rows), original)
  { const bad = scriptFixture({ og: [email, other] }), q = payload(); assert.equal(issue(bad, q).ok, true); bad.sheets.OG.rows[2] = [other, 2, q.digest, id, bad.sheets.OG.rows[1][4]]; assert.equal(check(bad, q).ok, false); assert.equal(bad.writes.filter(w => w.row === 3).length, 0) }
})
test("only exact owned digest+issuance partial can repair; ambiguous fields/schema never auto-repair", () => {
  const f = scriptFixture({ og: [email] }), p = payload(); assert.equal(issue(f, p).ok, true); f.sheets.OG.rows[1][4] = ""; const before = f.writes.length; assert.equal(check(f, p).ok, false); assert.equal(issue(f, p).ok, true); assert(f.writes.length > before)
  for (const meta of [[p.digest, "", ""], ["", id, ""], ["", "", new Date().toISOString()], [p.digest, id2, ""], [p.digest, id, "not-a-date"]]) { const bad = scriptFixture({ og: [email] }); bad.sheets.OG.rows[0] = ["Email", "Rank", "Code SHA256", "Code issuance ID", "Code issued at"]; bad.sheets.OG.rows[1] = [email, 1, ...meta]; assert.equal(issue(bad, p).ok, false); assert.equal(bad.writes.length, 0) }
  const headers = scriptFixture({ og: [email] }); headers.sheets.OG.rows[0] = ["Email", "Rank", "Code SHA256"]; assert.equal(issue(headers, p).ok, false); assert.equal(headers.writes.length, 0)
})
test("read-only check never adds code or Orders schema and unknown Orders/formula authority fails closed", () => {
  const f = scriptFixture({ og: [email], legacyHeaders: true }), p = payload(); assert.equal(check(f, p).ok, false); assert.equal(f.sheets.OG.rows[0].length, 2); assert.equal(f.sheets.Orders.rows[0].length, 43); assert.equal(f.writes.length, 0)
  for (const mutate of [(s: ReturnType<typeof scriptFixture>) => { delete s.sheets.Orders }, (s: ReturnType<typeof scriptFixture>) => { s.sheets.Orders.rows[0][4] = "unknown" }, (s: ReturnType<typeof scriptFixture>) => { s.legacy({ "Order ID": "GG-LEG123", "OG applied": "TrUe", Email: email, Status: "paid" }) }, (s: ReturnType<typeof scriptFixture>) => { s.sheets.OG.formulas = [[], ["=formula"]] }, (s: ReturnType<typeof scriptFixture>) => { s.sheets.Orders.formulas = [["=header"]] }]) { const s = scriptFixture({ og: [email] }); mutate(s); assert.equal(issue(s, p).ok, false); assert.equal(s.writes.length, 0) }
})
test("real held/consumed claims govern code availability without consumption, reissue or checkout bypass", async () => {
  const f = scriptFixture({ og: [email] }), p = payload(); assert.equal(issue(f, p).ok, true)
  const r = { intent: id, binding: "a".repeat(64), email, order: { order_id: "GG-ABC123", email, status: "checkout_started", og_applied: false }, ogOrder: { order_id: "GG-ABC123", email, status: "checkout_started", og_applied: true } }; await f.client.reserveCheckout(r)
  const original = f.claim(), writeCount = f.writes.length; const held = check(f, p); assert.equal(held.recordMatched, true); assert.equal(held.available, false); assert.equal(held.benefitState, "held"); assert.equal(held.checkoutAuthorized, false); assert.deepEqual(f.claim(), original); assert.equal(f.writes.length, writeCount); assert.equal(issue(f, payload()).ok, false); assert.equal(issue(f, p).available, false)
  const ref = { orderId: "GG-ABC123", intent: id, binding: r.binding }; await f.client.attachCheckout({ ...ref, session: "cs_synthetic" }); await f.client.transitionCheckout({ ...ref, eventId: "evt_synthetic", order: { order_id: ref.orderId, status: "paid", stripe_session: "cs_synthetic" } }); assert.equal(check(f, p).benefitState, "consumed"); assert.equal(check(f, p).available, false); assert.equal(issue(f, payload()).ok, false); assert.equal(f.claim().state, "consumed")
  const unissued = scriptFixture({ og: [email] }); unissued.legacy({ "Order ID": "GG-LEG123", Email: email, "OG applied": true, Status: "paid" }); assert.equal(issue(unissued, p).ok, false); assert.equal(unissued.sheets.OG.rows[0].length, 2)
})
test("malformed/wrong code/email/unauthenticated/legacy attempts have bounded errors and no new entitlement", async () => {
  const f = scriptFixture({ og: [email, other] }), p = payload(); assert.equal(issue(f, p).ok, true)
  for (const request of [{ ...checkPayload(p), email: other }, { ...checkPayload(p), digest: "f".repeat(64) }, { ...checkPayload(p), email: "not email" }, { ...checkPayload(p), code: token() }]) { const r = f.dispatch("member_code_check", request); assert.deepEqual(r, { ok: false, error: "member_code_unavailable" }); assert(!JSON.stringify(r).includes(email)) }
  assert.equal(f.rawPost({ secret: token(), action: "member_code_issue", memberCode: p }).ok, false); assert.equal(f.dispatch("og_check", email).ok, false); await assert.rejects(f.client.upsertOrder({ order_id: "GG-NEW123", email: other, status: "checkout_started", og_applied: true }))
  const proof = check(f, p), sent: any[] = []; const response = await handleCheckout(new Request("https://example.invalid/api/order/checkout", { method: "POST", body: JSON.stringify({ code: FULL_CODE, lane: "B", email: "nonmember@example.invalid", intent: id2, addOnIds: [], og: true, memberCode: token(), codeAuth: { ...proof, checkoutAuthorized: true } }) }), { sheet: f.client, fetchQuote: async () => fullQuote(), randomInt: () => 1, stripe: { checkout: { sessions: { create: async value => { sent.push(value); return { id: "cs_nonmember", url: "https://example.invalid/checkout" } } } } } }); assert.equal(response.status, 200); assert.equal(sent[0].metadata.og, "false"); assert.equal(f.actions.slice(-2).join(","), "checkout_reserve,checkout_attach")
})
test("actual buffered Apps Script serializes competing and exact retries without two records", async () => {
  const f = scriptFixture({ og: [email] }), first = payload(), second = payload(token(), email, id2); f.sheets.OG.buffered = true
  const results = await Promise.all([Promise.resolve().then(() => issue(f, first)), Promise.resolve().then(() => issue(f, second))]); assert.equal(results.filter(r => r.ok).length, 1); assert.equal(f.sheets.OG.rows[1][2], first.digest); assert.equal(f.sheets.OG.rows[1][3], id); assert.equal(issue(f, first).ok, true); assert(f.flushWhileLocked.every(Boolean))
})
test("unknown issue write/flush results never report success and retain an exact recoverable record", () => {
  for (const phase of ["before", "after"]) { const f = scriptFixture({ og: [email] }), p = payload(); assert.equal(issue(f, p).ok, true); f.sheets.OG.rows[1][4] = ""; f.sheets.OG.buffered = true; let once = true; f.onWrite((at, row, col) => { if (once && at === phase && row === 2 && col === 3) { once = false; throw new Error("synthetic issue unknown") } }); assert.equal(issue(f, p).ok, false); f.onWrite(null); assert.equal(issue(f, p).ok, true); assert.equal(f.sheets.OG.rows[1][2], p.digest) }
  const f = scriptFixture({ og: [email] }), p = payload(); f.onFlush(() => { throw new Error("unknown flush") }); assert.throws(() => issue(f, p)); assert.equal(f.locked(), false); f.onFlush(null); assert.equal(issue(f, p).ok, true)
})
test("private outbox precedes remote issue, exact authenticated readback matches, and no bearer is sent", async () => {
  const t = temp()
  try { const input = t.file("member", { email }), out = path.join(t.dir, "outbox.json"); ops.prepare(input, out); const box = JSON.parse(readFileSync(out, "utf8")), f = scriptFixture({ og: [email] }); const transport = bridge(f, body => { const disk = JSON.parse(readFileSync(out, "utf8")); assert.equal(disk.status, "issue_unknown"); assert.equal(disk.code, box.code); assert.equal(JSON.stringify(body).includes(box.code), false); assert.equal(body.memberCode.digest, box.payload.digest) }); const result = await ops.issue(out, transport); assert.equal(result.status, "record_verified_ops_only"); assert.equal(result.checkoutAuthorized, false); assert.equal(result.activationVerified, false); assert.equal(JSON.parse(readFileSync(out, "utf8")).verifiedRecord.issuanceId, box.payload.issuanceId); assert.equal(f.sheets.OG.rows[1][2], box.payload.digest); assert.equal(readdirSync(t.dir).filter(p => p.includes("lock")).length, 0) } finally { t.close() }
})
test("lost issue response persists unknown with same code/payload; explicit same-outbox retry recovers rather than reissues", async () => {
  const t = temp()
  try { const input = t.file("member", { email }), out = path.join(t.dir, "outbox.json"); ops.prepare(input, out); const original = JSON.parse(readFileSync(out, "utf8")), f = scriptFixture({ og: [email] }); let once = true; const real = bridge(f).fetch; const transport = config((async (url, init) => { const r = await real(url, init); if (once) { once = false; throw new Error("unknown transport synthetic-only") } return r }) as typeof fetch); await assert.rejects(ops.issue(out, transport), /MEMBER_CODE_OPS_FAILED/); const unknown = JSON.parse(readFileSync(out, "utf8")); assert.equal(unknown.status, "issue_unknown"); assert.deepEqual(unknown.payload, original.payload); assert.equal(unknown.code, original.code); const originalRecord = f.sheets.OG.rows[1].slice(); assert.equal((await ops.issue(out, transport)).status, "record_verified_ops_only"); assert.deepEqual(f.sheets.OG.rows[1], originalRecord) } finally { t.close() }
})
test("wrong response binding or mismatched readback cannot mark the private outbox verified", async () => {
  for (const mode of ["binding", "readback"]) { const t = temp(); try { const input = t.file("member", { email }), out = path.join(t.dir, "outbox.json"); ops.prepare(input, out); const f = scriptFixture({ og: [email] }), real = bridge(f).fetch; const transport = config((async (url, init) => { const response = await real(url, init), body = JSON.parse(String(init?.body)), proof = await response.json(); if (mode === "binding") proof.requestBinding = "0".repeat(64); else if (body.action === "member_code_check") proof.issuedAt = "2020-01-01T00:00:00.000Z"; return Response.json(proof) }) as typeof fetch); await assert.rejects(ops.issue(out, transport)); assert.equal(JSON.parse(readFileSync(out, "utf8")).status, "issue_unknown") } finally { t.close() } }
})
test("explicit private check binds presented email/code and remains informational without exposing either in receipt", async () => {
  const t = temp()
  try { const code = token(), f = scriptFixture({ og: [email] }), p = payload(code); assert.equal(issue(f, p).ok, true); const input = t.file("presented", { email, code }), receipt = path.join(t.dir, "check.json"); const result = await ops.check(input, receipt, bridge(f)); assert.equal(result.status, "record_checked_ops_only"); const text = readFileSync(receipt, "utf8"); assert(!text.includes(email) && !text.includes(code)); assert.equal(JSON.parse(text).checkoutAuthorized, false); assert.equal(f.sheets.Orders.rows.length, 1) } finally { t.close() }
})
test("only exact trusted Apps Script URL is dispatched and redirects never forward credentials", async () => {
  for (const url of ["http://script.google.com/macros/s/id/exec", "https://example.invalid/macros/s/id/exec", "https://script.google.com/macros/s/id/exec?q=x", "https://u:p@script.google.com/macros/s/id/exec", "https://script.google.com/macros/s/id/exec#x"]) { const t = temp(); try { const input = t.file("member", { email }), out = path.join(t.dir, "outbox.json"); ops.prepare(input, out); let calls = 0; await assert.rejects(ops.issue(out, { url, secret: "synthetic", fetch: async () => { calls++; throw new Error("no") } })); assert.equal(calls, 0) } finally { t.close() } }
  const t = temp(); try { const input = t.file("member", { email }), out = path.join(t.dir, "outbox.json"); ops.prepare(input, out); const f = scriptFixture({ og: [email] }); let waiting: Response; const transport = config((async (url, init) => { if (init?.method === "POST") { waiting = Response.json(f.rawPost(JSON.parse(String(init.body)))); return new Response(null, { status: 302, headers: { location: "https://script.googleusercontent.com/macros/echo?synthetic=1" } }) } assert.equal(init?.method, "GET"); assert.equal(init?.body, undefined); assert.equal(init?.headers, undefined); assert(!String(url).includes("GGPC-OG-") && !String(url).includes("example.invalid")); return waiting }) as typeof fetch); assert.equal((await ops.issue(out, transport)).status, "record_verified_ops_only") } finally { t.close() }
})
test("same private outbox rejects concurrent local operations and unsafe permissions without any new code", async () => {
  const t = temp()
  try { const input = t.file("member", { email }), out = path.join(t.dir, "outbox.json"); ops.prepare(input, out); const f = scriptFixture({ og: [email] }), real = bridge(f).fetch; let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve }); let first = true; const transport = config((async (...args) => { if (first) { first = false; await gate } return real(...args) }) as typeof fetch); const running = ops.issue(out, transport); await new Promise(resolve => setImmediate(resolve)); await assert.rejects(ops.issue(out, transport)); release(); await running; const code = JSON.parse(readFileSync(out, "utf8")).code; chmodSync(out, 0o644); await assert.rejects(ops.issue(out, transport)); chmodSync(out, 0o600); assert.equal(JSON.parse(readFileSync(out, "utf8")).code, code); assert.equal(existsSync(out), true) } finally { t.close() }
})

test("unknown legacy authority, own held partial and malformed outbox never authorize or dispatch", async () => {
  for (const fields of [{ "Order ID": "unknown", Email: email, Status: "paid", "OG applied": false }, { "Order ID": "GG-ABC123", Email: "bad", Status: "paid", "OG applied": false }, { "Order ID": "GG-ABC123", Email: email, Status: "mystery", "OG applied": false }]) { const f = scriptFixture({ og: [email] }); f.legacy(fields); assert.equal(issue(f, payload()).ok, false); assert.equal(f.writes.length, 0) }
  const f = scriptFixture({ og: [email] }), p = payload(); assert.equal(issue(f, p).ok, true); f.sheets.OG.rows[1][4] = ""; f.legacy({ "Order ID": "GG-ABC123", Email: email, Status: "checkout_started", "OG applied": true }); const before = f.writes.length; assert.equal(issue(f, p).ok, false); assert.equal(f.writes.length, before)
  const t = temp(); try { const input = t.file("input", { email }), out = path.join(t.dir, "outbox.json"); ops.prepare(input, out); const box = JSON.parse(readFileSync(out, "utf8")); box.status = "record_verified_ops_only"; writeFileSync(out, JSON.stringify(box)); let calls = 0; await assert.rejects(ops.issue(out, config((async () => { calls++; throw new Error("not reached") }) as typeof fetch))); assert.equal(calls, 0) } finally { t.close() }
})
test("oversized/malformed output stays unknown; a reentrant competing script cannot write while the shared lock is held", async () => {
  const t = temp(); try { const input = t.file("input", { email }), out = path.join(t.dir, "outbox.json"); ops.prepare(input, out); let cancelled = false; const body = new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(17000)) }, cancel() { cancelled = true } }); await assert.rejects(ops.issue(out, config((async () => new Response(body)) as typeof fetch))); assert.equal(cancelled, true); assert.equal(JSON.parse(readFileSync(out, "utf8")).status, "issue_unknown") } finally { t.close() }
  const f = scriptFixture({ og: [email] }), p = payload(), q = payload(token(), email, id2); let challenged = false; f.onWrite((_phase, row, column) => { if (!challenged && row === 2 && column === 3) { challenged = true; assert.throws(() => issue(f, q), /nested_lock/) } }); assert.equal(issue(f, p).ok, true); assert.equal(challenged, true); assert.equal(f.sheets.OG.rows[1][2], p.digest); assert.equal(f.locked(), false)
})

test("initial header/record storage failures preserve a single exact retry; no local durable intent means no remote call", async () => {
  for (const row of [1, 2]) for (const phase of ["before", "after"]) { const f = scriptFixture({ og: [email] }), p = payload(); f.sheets.OG.buffered = true; let once = true; f.onWrite((at, writtenRow, column) => { if (once && writtenRow === row && column === 3 && at === phase) { once = false; throw new Error("synthetic first-write failure") } }); assert.equal(issue(f, p).ok, false); assert.equal(f.locked(), false); f.onWrite(null); assert.equal(issue(f, p).ok, true); assert.equal(f.sheets.OG.rows.length, 2); assert.equal(f.sheets.OG.rows[1][2], p.digest); assert.equal(f.sheets.OG.rows[1][3], p.issuanceId) }
  const t = temp(), fs = require("node:fs"), originalRename = fs.renameSync
  try { const input = t.file("input", { email }), out = path.join(t.dir, "outbox.json"); ops.prepare(input, out); const original = JSON.parse(readFileSync(out, "utf8")); let calls = 0; fs.renameSync = (...args: unknown[]) => { if (args[1] === out) throw new Error("synthetic intent durability failure"); return originalRename(...args) }; await assert.rejects(ops.issue(out, config((async () => { calls++; throw new Error("never reached") }) as typeof fetch))); assert.equal(calls, 0); assert.deepEqual(JSON.parse(readFileSync(out, "utf8")), original); assert.equal(readdirSync(t.dir).some(name => name.includes("lock")), false) } finally { fs.renameSync = originalRename; t.close() }
})

test("output redirects cannot copy private request credentials or email into a URL", async () => {
  for (const location of ["https://script.googleusercontent.com/macros/echo?user_content_key=synthetic-only", "https://script.googleusercontent.com/macros/echo?user_content_key=member%40example.invalid", "https://example.invalid/macros/echo", "https://script.googleusercontent.com/unrecognized"]) { const t = temp(); try { const input = t.file("input", { email }), out = path.join(t.dir, "outbox.json"); ops.prepare(input, out); let calls = 0; await assert.rejects(ops.issue(out, config((async () => { calls++; return new Response(null, { status: 302, headers: { location } }) }) as typeof fetch))); assert.equal(calls, 1); assert.equal(JSON.parse(readFileSync(out, "utf8")).status, "issue_unknown") } finally { t.close() } }
})

test("single/double/deep confidential output encodings are refused before GET, with unknown payload and opaque positives retained", async () => {
  const encoded = (value: string, depth: number) => { for (let n = 0; n < depth; n++) value = encodeURIComponent(value); return value }
  const cases = [
    { label: "plain opaque", query: "opaque-only", gets: 1 },
    { label: "single encoded opaque", query: "opaque%2Bkey%2Fvalue%3D", gets: 1 },
    { label: "single email", query: encoded(email, 1), gets: 0 },
    { label: "double email", query: encoded(email, 2), gets: 0 },
    { label: "deep email", query: encoded(email, 32), gets: 0 },
    { label: "mixed-case identity", query: encoded(email.toUpperCase(), 1), gets: 0 },
    { label: "single secret character", query: "%73ynthetic-only", gets: 0 },
    { label: "double secret character", query: "%2573ynthetic-only", gets: 0 },
    { label: "deep secret character", query: encoded("%73ynthetic-only", 32), gets: 0 },
    { label: "malformed escape", query: "opaque%GG", gets: 0 },
    { label: "nested opaque ambiguity", query: "opaque%252Bkey", gets: 0 },
    { label: "length bound", query: "x".repeat(17000), gets: 0 },
    { label: "form-space secret", query: "synthetic+secret", secret: "synthetic secret", gets: 0 },
  ]
  for (const sample of cases) {
    const t = temp()
    try {
      const input = t.file("input", { email }), out = path.join(t.dir, "outbox.json"); ops.prepare(input, out)
      const original = JSON.parse(readFileSync(out, "utf8")); let gets = 0, posts = 0
      await assert.rejects(ops.issue(out, { ...config((async (_url, init) => {
        if (init?.method === "POST") { posts++; return new Response(null, { status: 302, headers: { location: "https://script.googleusercontent.com/macros/echo?user_content_key=" + sample.query } }) }
        gets++; assert.equal(init?.body, undefined); assert.equal(init?.headers, undefined); throw new Error("synthetic output boundary stop")
      }) as typeof fetch), secret: sample.secret ?? "synthetic-only" }), (error: unknown) => { assert.equal((error as Error).message, "MEMBER_CODE_OPS_FAILED"); return true })
      assert.equal(posts, 1, sample.label); assert.equal(gets, sample.gets, sample.label)
      const unknown = JSON.parse(readFileSync(out, "utf8")); assert.equal(unknown.status, "issue_unknown"); assert.equal(unknown.code, original.code); assert.deepEqual(unknown.payload, original.payload); assert.equal(unknown.activationVerified, false)
    } finally { t.close() }
  }
})
