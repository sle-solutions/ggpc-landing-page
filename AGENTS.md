# GG PC website (ggpc.app)

Agent instructions for this repo (Claude Code reads it through the `CLAUDE.md` symlink, Codex reads it directly). Read `../CLAUDE.md` (workspace map, cross-project contracts) and `../STATUS.md` (live state, next steps) first. Verified against the code on 2026-10-18.

https://www.ggpc.app does three jobs:
- **Install and brand site** (home page, build quest, FAQ, `/guides` hub + 6 SEO guides).
- **Web builder** `/builder`: four auto-picked gaming PCs at live UAE prices.
- **Order page** `/build/<code>`: re-prices a build from the extension or the builder, then Stripe checkout for "Build it for me" (Lane A) or "I buy, you build" (Lane B).

Next.js 16 App Router, React 19, Tailwind 4, TypeScript, npm. Deployed on Vercel (Pro); `main` auto-deploys to production.

## Rules that never bend

- `PRODUCT.md` (facts, offer, what must not be claimed) and `DESIGN.md` (the "Loadout Screen" pixel design system) are the authority for every UI and copy change.
- Copy: plain English, game voice, first-time builders first, no em or en dashes.
- Never invent a launch date, prices, signup counts, retailer coverage, testimonials, benchmarks or guarantees. Preview prices on marketing sections must be labelled illustrative. The builder and order pages show only real API prices; on API errors they say so, never fall back to demo numbers.
- Every fee and price rule lives in `lib/order/config.ts` (and tier budgets in `lib/order/loadouts.ts`). Never hard-code a fee in a component; read it from there so copy, FAQ, terms and checkout stay in sync.
- Server-side pricing only: checkout re-quotes from the API and ignores anything the browser sends.
- Affiliate tags only in Lane B store links (`lib/order/affiliate.ts`), never on parts GG PC buys. When the Amazon tag is set, Amazon prices are hidden next to tagged links.
- The build code format and the API response shapes are cross-project contracts (see `../CLAUDE.md`). Change both sides together.

## Commands

```bash
npm run dev                  # next dev (preview config in .claude/launch.json uses port 3010)
npm run build                # prebuild runs `npm run sprites`, then next build
npm run typecheck            # tsc --noEmit
npm run lint                 # ESLint
npm test                     # node:test via tsx + jsdom: tests/*.test.tsx
npx tsx --test --test-name-pattern "<name>" tests/<file>.test.tsx
npm run sprites              # regenerate public/sprites/*.svg from lib/pixel-art.ts (commit the SVGs)
git push origin main         # deploys production (Vercel Git integration); `vercel --prod` for a manual redeploy
```

Use npm (`package-lock.json` is real; `pnpm-lock.yaml` is a stub). `npm run lint` (ESLint, `eslint.config.mjs`) passes with warnings; old rules are downgraded to warnings there, tests may use `any`.

## Branches and deploys

- `main` is the working branch. Vercel's Git integration deploys every push to `main` to production (www.ggpc.app); pushes to any other branch get a preview URL. So commit risky work on a feature branch, check its preview, then merge to `main`. `vercel --prod` still works for a manual redeploy.
- All old branches (`codex/build-bench-overhaul`, `feat/order-build`, `claude/*`) were merged and deleted on 2026-10-18; only `main` exists.

## Map

| Path | What |
|---|---|
| `app/page.tsx` | Home: navbar, hero install, problem, supported-store overview, how it works, dated extension captures, local build quest, founders, FAQ, final install/service CTA, Discord CTA, footer, sticky install CTA, inside `BuildBriefProvider` |
| `components/extension-captures.tsx`, `public/images/extension/` | Two approved unchanged 0.2.5 captures, dated November 16, 2026, with full-size links and price/fit limits. Do not crop, repaint or present them as current offers or a complete-build fit result |
| `app/builder/page.tsx` | Web builder. `?tier=starter\|mid\|high\|top`, one loadout per screen, sticky total + "Have it built" and WhatsApp quote actions on phones |
| `app/build/[code]/page.tsx`, `done/page.tsx` | Order page and post-payment page (dynamic, noindex). `?lane=b` for Lane B. Next route params are already decoded; pass the code directly to `decodeBuildCode` so invalid percent escapes render recovery instead of throwing |
| `app/warranty/page.tsx` | Public build QA and warranty explanation; only states the confirmed two-year labour warranty and separates store/manufacturer part warranties |
| `app/qa-checklist/page.tsx`, `components/qa-checklist.tsx` | Publicly accessible, noindex print/PDF QA form; inputs stay in the current tab, no network persistence or photo upload, not a secure/private route |
| `app/api/order/checkout` | Re-quotes server-side, writes the order row to the sheet, creates the Stripe Checkout Session |
| `app/api/stripe/webhook` | Maps Stripe events to order status in the sheet; returns 500 until the sheet write works so Stripe retries |
| `app/api/waitlist` | Mirrors a signup into the Google Sheet (maxDuration 60) |
| `app/api/discord-members` | Live member counts from the Discord invite (cached 5 min) |
| `app/guides/` + `components/guide-shell.tsx` | SEO guides hub and 6 guides (static). New guides also go in `app/sitemap.ts` and `public/llms.txt` |
| `app/privacy`, `app/terms` | Legal pages; terms read fees from `config.ts`. Privacy covers the extension too |
| `lib/order/` | `config.ts` (all fees, add-ons, workshop address, OG perk, Stripe descriptor), `pricing.ts` (lane rules, integer-fils totals, `laneAServiceFils`), `loadouts.ts` (tiers, `partsCapAed`, `fetchLoadouts`, `loadoutCode`), `build-code.ts` (v1 decoder + encoder), `quote.ts` (`apiBase`, `fetchQuote`), `checkout.ts`, `webhook.ts`, `order-row.ts` (`GG-XXXXXX` ids), `sheet.ts`, `stripe.ts`, `affiliate.ts`, `format.ts` (`formatAed`, `seenAgo`, `cleanTitle`), `types.ts` |
| `lib/campaign/white-friday.ts` | White Friday UTC boundaries for 22 to 29 Nov 2026 in Asia/Dubai and server-only non-production preview switch; campaign UI evaluates dates in the browser so cached routes need no rebuild |
| `components/order-*.tsx` | Order page pieces: lane switch + totals (`order-view`), parts and shopping lists (`order-parts`), client checkout panel (`order-checkout`) |
| `components/retailer-brand.tsx`, `public/retailers/` | Local retailer marks for live builder/order rows and the local WhatsApp icon; keep the active retailer map aligned with `lib/order/types.ts` and sources recorded in `provenance.json` |
| `components/build-paths.tsx`, `build-brief.tsx`, `waitlist-form.tsx` | Build quest keeps goal/budget/path in tab context and links to the separate builder; the legacy waitlist form is no longer mounted. The `label` strings in `build-brief.tsx` land in the sheet: keep them stable |
| `components/pixel.tsx`, `lib/pixel-art.ts`, `scripts/emit-sprites.ts` | Pixel art is code: run-length data -> committed SVGs in `public/sprites/`. `Glyph` is inline SVG, `Sprite` an `<img>` |
| `scripts/waitlist-sheet.gs` | Apps Script web app (deployed separately with clasp) |
| `app/globals.css` | All styling and design tokens (order and builder styles are near the end) |

Unused leftovers from the v0.app scaffold: `components/ui/`, `components/theme-provider.tsx`, `hooks/`, `styles/globals.css`, most Radix/recharts/cmdk dependencies. Do not build on them.

## How the integrations work

- **Price API** (`extension/server`, default `https://api-production-1e7d.up.railway.app/api`, override `GGPC_API_URL`): `POST /prices/quote` (order page, no-store, 404 means "not live") and `GET /prices/loadouts?budgets=` (builder, no-store, 15 s timeout; the API owns its own cache). Budgets sent are parts caps derived from the all-in tier budgets. Builder observation ages add elapsed time since the API response's `generatedAt` at render; never treat cached `ageSeconds` as newly measured or change upstream provenance.
- **Order flow.** Lane A: card hold with manual capture; the founder buys the parts, confirms prices, then captures. Lane B: automatic capture of build fee + protection, then the workshop address is shown on the done page only after Stripe confirms payment. OG perk (10% off sourcing + build fee, first 100 original signups, once) requires the private code plus original signup email for every new automatic discounted reservation. No-code checkout is ordinary full price and creates no OG hold/use, even for known member emails. Exact previously bound v1/v2 attempts keep their existing decision and provider recipe. A stable tab checkout intent and server quote binding replay the original order/provider idempotency key; the exact session must be attached durably before returning its URL. Checkout refuses orders whose service revenue after fees falls below the labour floor.
- **Quote mode.** When Stripe, webhook signing or Sheet configuration is missing, the build page shows the existing WhatsApp quote action and a build estimate; it hides inactive payment and add-on controls and card-hold promises. Missing WhatsApp configuration has a builder fallback. Earlier pending/unknown checkout notices remain visible if configuration changes. Quote links retain Lane B with `?lane=b`, state the chosen service and include selected add-on names only when they contribute to the displayed total. These links prepare a message; they never send it or activate payment/member codes.
- **Stripe.** Selected merchant: Lari Ventures, LLC (US, USD settlement, AED presentment); the separate unfinished GG PC account is unused. Use a restricted key (`rk_`: Checkout Sessions write, PaymentIntents read). New Sessions set `branding_settings: {display_name: "GG PC"}` as a Checkout header override; the shared account name can still appear in terms, receipts and other places. Sessions keep `managed_payments: {enabled: false}` (must stay off), `integration_identifier`, statement descriptor suffix `GGPC`. Webhook handles checkout session completed / async succeeded / async failed / expired and payment_intent succeeded / canceled. Without Stripe/Sheet configuration the page uses quote mode, with no card-payment form or inactive checkout promise. Actual merchant credentials, provider capability and coordinated consumer/authority cutover are root-owned live checks; do not infer them from source comments or configuration presence.
- **Legacy waitlist (not mounted in the launch UI).** Historical integration retained: two browser requests: Web3Forms (public access key, emails slesolutions.me@gmail.com) and a fire-and-forget `keepalive` POST to `/api/waitlist`, which forwards to the Apps Script.
- **Apps Script** (`scripts/waitlist-sheet.gs`, "GG PC Waitlist" sheet): no action = waitlist upsert; informational legacy `og_check` (returns `reservation_required`); `checkout_reserve_v2`, `checkout_attach`, `checkout_transition`, read-only `checkout_receipt`; old `checkout_reserve` admits only a genuine already-bound retry; legacy non-claim `order_upsert` ("Orders" tab, columns appended after Notes so old sheets keep positions); "OG" tab freezes the first 100. Script properties `WAITLIST_SECRET`, `ORDERS_NOTIFY_EMAIL`. Deploy with clasp (`clasp push` + `clasp update-deployment`, same /exec URL); clone first, the remote has `Secret.js`. Cold starts are slow (55 s timeouts).
- **Sheet text writes.** Public strings use the built-in Rich Text text setter, preserving exact email/order keys and text such as `3/3` without formula or date parsing. Never pass these strings to `setValues`/`appendRow` or add an identity-changing prefix. New rows anchor literal values before typed fills; partial failures throw and retries recover staged ISO dates, numbers and booleans. Existing upserts leave anchored IDs and manual cells untouched. Flush pending changes while ScriptLock is still held, on success and error paths; a flush failure must throw while still releasing the owned lock. This is not a transaction guarantee. This needs no advanced Sheets API or new scope.
- **OG reservation custody (private/unactivated proposal).** One `Checkout claim` JSON column is appended after all43 original Orders columns. Existing manual cells are never rewritten by order updates. Shared lock-held helpers preserve original member/order identity, prevent competing OG holds and consume monotonically despite contact-email/status changes. No age-only release; unknown legacy/provider/storage outcomes require reconciliation. Economic replay excludes later age-display buckets while retaining the original Parts/Prices checked snapshot. A known positive legacy OG status is preserved in claim44 before any legitimate status downgrade. A20-hour automatic provider-create retry horizon never expires entitlement. Old authorization paths fail closed; the private card integration adds versioned same-lock code admission and a strict code-anchored claim v2 without a new ownership/refund rule. Both ordinary and code-bearing new attempts use the versioned protocol; older scripts fail before a provider Session. Every receipt requires verified Stripe metadata/status plus the same durable authority and is read-only. Read `docs/og-reservations.md` before coordinated remote cutover or activation.
- **Member emails, codes and guides resumed, November 19, 2026.** The founder resumed those three fulfillment items after the earlier hold. Optional private code entry is available on configured checkout pages; it requires the original signup email, confirms the once-only sourcing/build-fee benefit before payment and stops on an unavailable code. Do not restore public benefit FAQ/search marketing or consultation promises. Consultation outreach/bookings and Discord sends remain on hold. Root owns recipient reconciliation, live code issuance/readback, activation, delivery and native verification; source/UI readiness is not proof those operations occurred. Preserve existing records, private preparation, eligibility and exact previously bound retries. Pass only the configured discount percentage into the client panel; do not import the full private order configuration there.
- **Private member-code operations (unactivated).** `scripts/member-code-ops.cjs` prepares owner-only private outboxes and explicitly issues/checks through the same secret-authenticated Apps Script. Existing validated frozen OG membership is required; only digest/issuance-ID/server-time columns may be appended after Email/Rank. No auto freeze/import/reissue, second database or public redemption authority. Orders claim44 remains the hold/consumption authority; all check replies have `checkoutAuthorized:false`. Raw `GGPC-OG-` bearers stay only in private local input/outbox custody, never Sheet/request/URL/log. Unknown results retain the exact original payload; no automatic retry or lock stealing. Read `docs/member-code-ops.md` before any future operator command or coordinated activation. This local source does not authorize customer-data access or remote changes.
- **Order QA, warranty and Phase 1 gates.** In the Orders tab, fields after `Protection fee AED` are manual-only: QA/warranty fields plus `Paid verified date`, `Job completed date`, actual customer payments/refunds/parts cost/payment fees/builder payout, and `Confirmed labour claim?`. Stripe upserts skip all null-key columns. `ensureOrderOpsSchema()` appends/checks headers only, creates the `Phase 1 gates` summary tab, and stops on mismatched existing headers; run from the Apps Script editor after backing up the tab. The `GG PC ops` menu refreshes summary values and timestamp after manual updates. Gate definitions and Lane A/B receipts treatment are in [`docs/order-qa-and-warranty.md`](docs/order-qa-and-warranty.md). The reported warranty request count is not the confirmed-labour gate. Append dated updates to notes and keep evidence links private. `/qa-checklist` is a print/PDF working sheet, not a secure record; do not enter customer contact details or upload photos.

## Environment

`GGPC_API_URL`, `SITE_URL`, `WAITLIST_SHEET_URL`, `WAITLIST_SHEET_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `AMAZON_AE_ASSOCIATE_TAG`, `NOON_COUPON_CODE`, `NOON_LINK_TEMPLATE`, `NEXT_PUBLIC_WHATSAPP_NUMBER` (WhatsApp Business number in international digits only; unset hides quote actions). All in `.env.example` (its `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is unused). Production values live in Vercel; never print them.

## Testing locally

- Builder and order page against production prices: `npm run dev`, open `/builder`, follow "Have it built".
- Full checkout: run the extension API (`npm run server` in `../extension`, :3000), a stub Apps Script on a local port (never the real sheet), `stripe listen --forward-to localhost:3055/api/stripe/webhook`, and `npm run dev -- -p 3055` with `GGPC_API_URL`, `WAITLIST_SHEET_URL`, `SITE_URL`, `STRIPE_WEBHOOK_SECRET` overridden. Pay with 4242 4242 4242 4242, then `stripe payment_intents capture <id>` for Lane A.
- Check every UI change at 375 px and desktop width. If the dev server serves stale CSS, restart it.

## SEO and GEO

`components/structured-data.tsx` (Organization, WebSite, WebPage, Person, FAQPage; no offers), `app/robots.ts` (allows AI crawlers, blocks `/api/`), `app/sitemap.ts`, `public/llms.txt` (mirrors the FAQ; keep it in sync when FAQ answers change), IndexNow and Search Console files in `public/`, `GEO-AUDIT-REPORT.md`. Titles follow "Page | GG PC". `next.config.mjs` sets security headers and long caching for static asset folders; images are unoptimized.

## Design system in brief

Fire Red palette, Press Start 2P for display and Inter for body, zero border radius with stepped pixel corners, pixel art only (no renders or GPU art). The build quest is the only playable element: no XP, points, sounds or achievements. The impeccable skill maintains `DESIGN.md`/`PRODUCT.md` (`.claude/skills/impeccable`, state in `.impeccable/`); its hooks in `.claude/settings.local.json` run a design check after edits.

All active retailer marks use `components/retailer-brand.tsx`. Explicit rendered width/height and a compact contrast mount preserve the whole authentic mark; keep local provenance current and do not substitute a generic full-width white tile or percentage-only image bounds.

## Before you finish

Run `npm run typecheck`, `npm test` and `npm run build` for code changes. Update `../STATUS.md` (landing-page section: replace stale lines, bump the date) when you ship, deploy, decide something or leave work half done. Update this file in the same commit when a route, fee rule, integration or workflow changes.

Private launch preparation, 6 November 2026: no push on any branch (Vercel auto-deploys previews too). Local official Chrome asset/provenance lives in `public/browser/`; `lib/extension.ts` owns the exact Store item, `InstallButton` is shared by header/hero/final/sticky actions. Publication still requires corrected extension release acceptance.

## Identity and private usage pages (0.2.5 candidate)

`/signup` is a dynamic/no-store provider signup and existing-password sign-in page bound to a worker-created opaque flow. `/admin/usage` renders real opt-in aggregates only after a server-side admin-session check. Public/member sessions never receive report data. Provider secrets remain API-only. The narrow `/api/identity/[...path]` proxy validates methods/paths/query shape, forwards only named identity cookies and bounded forms to the fixed API, preserves validated Secure/HttpOnly cookies and trusted303 targets, and never proxies extension intent/exchange or bearer-authenticated usage mutation routes. `lib/identity/{protocol,server}.ts` own these contracts; do not expose raw upstream JSON or transport headers. Auth/admin pages exclude Vercel Analytics and use no-store/CSP headers. Form-bearing signup/admin HTML uses strict-origin in both header and metadata, sending no path/query while preserving native POST Origin. Identity API/redirect/callback responses remain no-referrer; null/missing/foreign Origin is rejected, never replaced by Referer. Existing public quote/order contracts stay unchanged. `GGPC_IDENTITY_API_URL` and `IDENTITY_PUBLIC_ORIGIN` are server-only, canonical by default; only non-production loopback overrides are allowed. NextRequest normalizes loopback IPs to localhost: the local-only browser-start canonical check recognizes that representation using the exact configured Host and port, while production routing and POST Origin remain exact. Never weaken cookies or CSP to compensate for local URL normalization.

Provider configuration, API schema/recovery and actual provider/native/Store verification must pass before this candidate is activated. No provider configuration or admin-role promotion is implied by source code. Forms and safe flow metadata include termsVersion, privacyVersion and usageConsentVersion; stale acceptance fails closed. The account/analytics policy versions are synchronized with extension `src/shared/identity-access.ts`.

Provider buttons use unchanged official marks stored locally in `public/identity/`, with sources and hashes in `provenance.json`. Google's current gradient G retains its complete approved white backing; Discord's white symbol keeps its original aspect ratio against Blurple. Keep these decorative images beside the accessible action labels, with no remote asset or provider-script dependency on signup/admin pages.

Usage withdrawal copy distinguishes saved device Off preferences from confirmed server withdrawal/deletion. Device-data clear preserves validated opaque privacy-Off preferences while clearing workspaces/auth; it does not itself revoke server consent or delete online data. Failed local persistence and failed server withdrawal produce an explicitly temporary pause that may be lost on extension/browser restart. Never claim durable Off or deletion before the corresponding write succeeds.

Private card/member integration: `docs/card-checkout-members.md` documents the accepted protocol and security amendment. `lib/order/sheet.ts` bounds the exact Apps Script target/credential-free redirect/reply and correlates reservation receipts. New branding uses a correlated primary/`legacyBinding` pair in the same reservation protocol: new claims store only the branded primary, while exact bound v1/v2 retries return their original binding and byte-exact provider recipe/key. Marker-absent old consumers can only replay existing claims; older Scripts reject the paired request before admission. Never add branding to an old retry or replace/reset its claim or Session. `lib/order/receipt.ts` validates actual provider plus durable claim refs before confirmation/workshop disclosure. Receipt GETs never consume or repair. Receipt pages exclude public analytics at mount and beforeSend, and set no-store/no-referrer headers and metadata; identity path semantics and ordinary public analytics remain unchanged. Run local checks without HOME overrides; the inherited synthetic CLI fixture now uses its absolute temporary paths directly. Merchant selection and all live operations remain with root.
