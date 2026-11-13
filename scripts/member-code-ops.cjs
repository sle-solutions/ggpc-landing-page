'use strict';
// PRIVATE operator commands only. Import/prepare never read authority env or invoke transport.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const PROTOCOL = 'ggpc-member-code-ops-v1', CODE_PREFIX = 'GGPC-OG-', DOMAIN = 'ggpc-og-member-code:v1\0';
const ROOT = path.resolve(__dirname, '..'), MAX = 16384;
const failure = () => { throw new Error('MEMBER_CODE_OPS_FAILED'); };
const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === keys.slice().sort().join(',');
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
const iso = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function emailOf(value) {
  if (typeof value !== 'string' || value.length > 254 || Array.from(value).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) failure();
  const email = value.trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) failure(); return email;
}
function digestCode(code) { if (typeof code !== 'string' || !/^GGPC-OG-[A-Za-z0-9_-]{43}$/.test(code) || Buffer.from(code.slice(CODE_PREFIX.length), 'base64url').toString('base64url') !== code.slice(CODE_PREFIX.length)) failure(); return hash(DOMAIN + code); }
function requestBinding(action, input) { return hash(JSON.stringify([PROTOCOL, action, input.email, input.digest, action === 'issue' ? input.issuanceId : ''])); }
function privatePath(file) {
  if (typeof file !== 'string' || !path.isAbsolute(file) || path.resolve(file) !== file || path.extname(file) !== '.json' || file.startsWith(ROOT + path.sep)) failure();
  const dir = path.dirname(file), stat = fs.lstatSync(dir);
  if (fs.realpathSync(dir) !== dir || !stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o777) !== 0o700) failure(); return dir;
}
function readPrivate(file) {
  try {
    privatePath(file); const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    try { const stat = fs.fstatSync(fd); if (!stat.isFile() || stat.uid !== process.getuid() || (stat.mode & 0o777) !== 0o600 || stat.size > MAX) failure(); return JSON.parse(fs.readFileSync(fd, 'utf8')); }
    finally { fs.closeSync(fd); }
  } catch { failure(); }
}
function syncDir(dir) { const fd = fs.openSync(dir, 'r'); try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); } }
function createPrivate(file, value) {
  const dir = privatePath(file), data = JSON.stringify(value, null, 2) + '\n'; if (Buffer.byteLength(data) > MAX) failure();
  const fd = fs.openSync(file, 'wx', 0o600); try { fs.writeFileSync(fd, data); fs.fsyncSync(fd); } finally { fs.closeSync(fd); } syncDir(dir);
}
function replacePrivate(file, value) {
  const dir = privatePath(file), tmp = path.join(dir, crypto.randomUUID() + '.json');
  try { createPrivate(tmp, value); fs.renameSync(tmp, file); syncDir(dir); } finally { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); }
}
function locked(file, operation) {
  const dir = privatePath(file), lock = path.join(dir, path.basename(file, '.json') + '.lock.json'), owner = crypto.randomUUID(); let acquired = false;
  try {
    createPrivate(lock, { protocol: PROTOCOL, owner, at: new Date().toISOString() }); acquired = true;
    return Promise.resolve().then(operation).finally(() => { const saved = readPrivate(lock); if (saved.owner !== owner) failure(); fs.unlinkSync(lock); syncDir(dir); });
  } catch (error) { if (acquired) { try { if (readPrivate(lock).owner === owner) fs.unlinkSync(lock); } catch { /* Unknown local lock custody: retain for operator review. */ } } throw error; }
}
function validateOutbox(box) {
  if (!exact(box, ['protocol', 'status', 'preparedAt', 'code', 'payload', 'lastAttempt', 'verifiedRecord', 'activationVerified']) || box.protocol !== PROTOCOL || !['prepared', 'issue_unknown', 'record_verified_ops_only'].includes(box.status) || !iso(box.preparedAt) || box.activationVerified !== false || !exact(box.payload, ['version', 'email', 'digest', 'issuanceId']) || box.payload.version !== 1 || box.payload.email !== emailOf(box.payload.email) || box.payload.digest !== digestCode(box.code) || !uuid(box.payload.issuanceId)) failure();
  if (box.status === 'prepared' && (box.lastAttempt !== null || box.verifiedRecord !== null) || box.status !== 'prepared' && (!exact(box.lastAttempt, ['at', 'outcome']) || !iso(box.lastAttempt.at) || !['unknown', 'record_verified'].includes(box.lastAttempt.outcome))) failure();
  if (box.status === 'issue_unknown' && box.lastAttempt.outcome !== 'unknown' || box.status === 'record_verified_ops_only' && (box.lastAttempt.outcome !== 'record_verified' || !validProof(box.verifiedRecord, 'check', box.payload) || box.verifiedRecord.issuanceId !== box.payload.issuanceId)) failure();
  return box;
}
function prepare(inputFile, outboxFile) {
  try {
    const input = readPrivate(inputFile); if (!exact(input, ['email'])) failure(); const email = emailOf(input.email), code = CODE_PREFIX + crypto.randomBytes(32).toString('base64url');
    const box = { protocol: PROTOCOL, status: 'prepared', preparedAt: new Date().toISOString(), code, payload: { version: 1, email, digest: digestCode(code), issuanceId: crypto.randomUUID() }, lastAttempt: null, verifiedRecord: null, activationVerified: false };
    createPrivate(outboxFile, box); return { status: 'prepared', activationVerified: false };
  } catch { failure(); }
}
function configOf(config) {
  if (!config || typeof config.url !== 'string' || typeof config.secret !== 'string' || !config.secret || typeof config.fetch !== 'function') failure();
  const u = new URL(config.url);
  if (u.protocol !== 'https:' || u.hostname !== 'script.google.com' || u.port || u.username || u.password || u.search || u.hash || !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u.pathname) || u.href !== config.url) failure();
  return config;
}
function validProof(proof, action, payload) {
  return exact(proof, ['ok', 'protocol', 'action', 'requestBinding', 'issuanceId', 'issuedAt', 'recordMatched', 'benefitState', 'available', 'checkoutAuthorized']) && proof.ok === true && proof.protocol === PROTOCOL && proof.action === action && proof.requestBinding === requestBinding(action, payload) && uuid(proof.issuanceId) && iso(proof.issuedAt) && proof.recordMatched === true && ['available', 'held', 'consumed'].includes(proof.benefitState) && proof.available === (proof.benefitState === 'available') && proof.checkoutAuthorized === false;
}
async function boundedJson(response) {
  if (!response.body || Number(response.headers.get('content-length') || 0) > MAX) failure();
  const reader = response.body.getReader(), chunks = []; let length = 0;
  try {
    for (;;) { const { done, value } = await reader.read(); if (done) break; length += value.length; if (length > MAX) failure(); chunks.push(Buffer.from(value)); }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
async function dispatch(config, action, payload) {
  configOf(config); const signal = AbortSignal.timeout(55000);
  let response = await config.fetch(config.url, { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret: config.secret, action: 'member_code_' + action, memberCode: payload }), cache: 'no-store', signal });
  if ([302, 303].includes(response.status)) {
    const location = response.headers.get('location');
    if (typeof location !== 'string' || Buffer.byteLength(location) > MAX) failure();
    const next = new URL(location);
    if (next.protocol !== 'https:' || next.hostname !== 'script.googleusercontent.com' || next.port || next.username || next.password || next.hash || next.pathname !== '/macros/echo') failure();
    const locationText = decodeURIComponent(next.href);
    // One ordinary URI representation is supported. Residual percent syntax is
    // ambiguous/nested encoding, so refuse it rather than dispatching or repeatedly
    // decoding it. The opaque Google key may use ordinary single URI escapes.
    if (locationText.includes('%') || locationText.includes(config.secret) || locationText.replace(/\+/g, ' ').includes(config.secret) || locationText.toLowerCase().includes(payload.email)) failure();
    // Apps Script output redirect gets NO original POST body/credential.
    response = await config.fetch(next.href, { method: 'GET', redirect: 'error', cache: 'no-store', signal });
  }
  if (!response.ok || response.status !== 200) failure(); const proof = await boundedJson(response);
  if (!validProof(proof, action, payload)) failure();
  return proof;
}
async function issue(outboxFile, config) {
  try {
    return await locked(outboxFile, async () => {
      const box = validateOutbox(readPrivate(outboxFile)); configOf(config);
      box.status = 'issue_unknown'; box.lastAttempt = { at: new Date().toISOString(), outcome: 'unknown' }; replacePrivate(outboxFile, box); // Durable before any remote write.
      try {
        const issued = await dispatch(config, 'issue', box.payload);
        if (issued.issuanceId !== box.payload.issuanceId) failure();
        const checked = await dispatch(config, 'check', { version: 1, email: box.payload.email, digest: box.payload.digest });
        if (checked.issuanceId !== issued.issuanceId || checked.issuedAt !== issued.issuedAt) failure();
        box.status = 'record_verified_ops_only'; box.lastAttempt.outcome = 'record_verified'; box.verifiedRecord = checked; replacePrivate(outboxFile, box);
        return { status: box.status, benefitState: checked.benefitState, available: checked.available, checkoutAuthorized: false, activationVerified: false };
      } catch { failure(); } // Already-durable unknown state/code/payload stays intact. No automatic retry.
    });
  } catch { failure(); }
}
async function check(inputFile, receiptFile, config) {
  try {
    const input = readPrivate(inputFile); if (!exact(input, ['email', 'code'])) failure(); const payload = { version: 1, email: emailOf(input.email), digest: digestCode(input.code) }; configOf(config);
    const receipt = { protocol: PROTOCOL, status: 'check_unknown', at: new Date().toISOString(), requestBinding: requestBinding('check', payload), record: null, checkoutAuthorized: false, activationVerified: false };
    createPrivate(receiptFile, receipt);
    const proof = await dispatch(config, 'check', payload); receipt.status = 'record_checked_ops_only'; receipt.record = proof; replacePrivate(receiptFile, receipt);
    return { status: receipt.status, benefitState: proof.benefitState, available: proof.available, checkoutAuthorized: false, activationVerified: false };
  } catch { failure(); }
}
async function main(args, env, dependencies = {}) {
  if (!Array.isArray(args)) failure();
  if (args[0] === 'prepare' && args.length === 3) return prepare(args[1], args[2]);
  if (args[0] === 'issue' && args.length === 2) return issue(args[1], { url: env.WAITLIST_SHEET_URL, secret: env.WAITLIST_SHEET_SECRET, fetch: dependencies.fetch || globalThis.fetch });
  if (args[0] === 'check' && args.length === 3) return check(args[1], args[2], { url: env.WAITLIST_SHEET_URL, secret: env.WAITLIST_SHEET_SECRET, fetch: dependencies.fetch || globalThis.fetch });
  failure();
}
module.exports = Object.freeze({ PROTOCOL, CODE_PREFIX, DOMAIN, emailOf, digestCode, requestBinding, prepare, issue, check, main });
if (require.main === module) main(process.argv.slice(2), process.env).then(value => process.stdout.write(JSON.stringify(value) + '\n')).catch(() => { process.stderr.write('MEMBER_CODE_OPS_FAILED; preserve private outbox and reconcile before retry\n'); process.exitCode = 1; });
