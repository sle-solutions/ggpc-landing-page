#!/usr/bin/env node
// Decisive local oracles. No network mutation or deploy command is invoked.
const fs = require('node:fs'); const path = require('node:path'); const cp = require('node:child_process'); const assert = require('node:assert/strict'); const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..'); const out = path.join(root, 'tmp/launch-prep'); fs.mkdirSync(out, {recursive:true});
function run(args, log) {
 const result = cp.spawnSync(process.execPath, args, {cwd:root, env:{...process.env, PATH:path.dirname(process.execPath)+path.delimiter+process.env.PATH}, encoding:'utf8', maxBuffer:32*1024*1024});
 fs.writeFileSync(path.join(out, log), (result.stdout || '') + (result.stderr || ''));
 if (result.error || result.status !== 0) { process.stderr.write((result.stdout || '')+(result.stderr || '')); throw result.error || new Error(`${args.join(' ')} exited ${result.status}`); }
}
const protectedPaths = ['app/api/waitlist/route.ts','scripts/waitlist-sheet.gs','lib/order/config.ts','lib/order/quote.ts','lib/order/loadouts.ts','lib/order/build-code.ts','lib/order/checkout.ts','lib/order/pricing.ts','app/api/order/checkout/route.ts','app/api/stripe/webhook/route.ts','components/order-checkout.tsx','components/order-view.tsx','app/warranty/page.tsx','components/qa-checklist.tsx','app/robots.ts','app/sitemap.ts'];
if (process.argv[2] === '--contracts') {
 for (const file of protectedPaths) {
  const prior = cp.execFileSync('git', ['show', `561249f:${file}`], {cwd:root}); assert.deepEqual(fs.readFileSync(path.join(root,file)), prior, `preserved ${file}`);
 }
 const social=JSON.parse(fs.readFileSync(path.join(root,'scripts/social-image.provenance.json'),'utf8'));
 assert.doesNotMatch(fs.readFileSync(path.join(root,social.source),'utf8'),/WAITLIST|EARLY ACCESS|AT LAUNCH/i);
 for(const output of social.outputs) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,output.file))).digest('hex'),output.sha256);
 const provenance=JSON.parse(fs.readFileSync(path.join(root,'public/browser/provenance.json'),'utf8'));
 assert.equal(provenance.source,'https://www.google.com/chrome/static/images/chrome-logo.svg');
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,provenance.file))).digest('hex'),provenance.sha256);
 for (const file of fs.readdirSync(path.join(root,'app/guides'))) {
  const filename=path.join(root,'app/guides',file,'page.tsx'); if(!fs.existsSync(filename)) continue;
  assert.doesNotMatch(fs.readFileSync(filename,'utf8'), /#signup|join the.*waitlist|has not launched|At launch/i, filename);
 }
 run(['node_modules/tsx/dist/cli.mjs','--test','tests/launch-prep.test.tsx'], 'contracts.log');
 console.log('LAUNCH_WEB_CONTRACTS_PASSED');
} else if (process.argv[2] === '--checks') {
 for (const [name,args] of [['typecheck',['node_modules/typescript/bin/tsc','--noEmit']], ['tests',['node_modules/tsx/dist/cli.mjs','--test',...fs.readdirSync(path.join(root,'tests')).filter(f=>f.endsWith('.test.tsx')).map(f=>'tests/'+f)]], ['lint',['node_modules/eslint/bin/eslint.js','.']], ['sprites',['node_modules/tsx/dist/cli.mjs','scripts/emit-sprites.ts']], ['build',['node_modules/next/dist/bin/next','build']]]) {console.log(`Running ${name}`);run(args,`${name}.log`);}
 console.log('LAUNCH_WEB_CHECKS_PASSED');
} else { throw new Error('Use --contracts or --checks'); }
