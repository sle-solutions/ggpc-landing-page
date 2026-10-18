# GG PC website (ggpc.app)

Agent instructions for this repo (Claude Code reads it through the `CLAUDE.md` symlink, Codex reads it directly). Read `../CLAUDE.md` (workspace map, cross-project contracts) and `../STATUS.md` (live state, next steps) first. Verified against the code on 2026-10-18.

https://www.ggpc.app does three jobs:
- **Waitlist and brand site** (home page, build quest, FAQ, `/guides` hub + 5 SEO guides).
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
| `app/page.tsx` | Home: navbar, hero, problem, product preview, how it works, build quest, founders, FAQ, final CTA, Discord CTA, footer, sticky CTA, inside `BuildBriefProvider` |
| `app/builder/page.tsx` | Web builder. `?tier=starter\|mid\|high\|top`, one loadout per screen, sticky total + "Have it built" and WhatsApp quote actions on phones |
| `app/build/[code]/page.tsx`, `done/page.tsx` | Order page and post-payment page (dynamic, noindex). `?lane=b` for Lane B |
| `app/warranty/page.tsx` | Public build QA and warranty explanation; only states the confirmed two-year labour warranty and separates store/manufacturer part warranties |
| `app/qa-checklist/page.tsx`, `components/qa-checklist.tsx` | Publicly accessible, noindex print/PDF QA form; inputs stay in the current tab, no network persistence or photo upload, not a secure/private route |
| `app/api/order/checkout` | Re-quotes server-side, writes the order row to the sheet, creates the Stripe Checkout Session |
| `app/api/stripe/webhook` | Maps Stripe events to order status in the sheet; returns 500 until the sheet write works so Stripe retries |
| `app/api/waitlist` | Mirrors a signup into the Google Sheet (maxDuration 60) |
| `app/api/discord-members` | Live member counts from the Discord invite (cached 5 min) |
| `app/guides/` + `components/guide-shell.tsx` | SEO guides hub and 5 guides (static). New guides also go in `app/sitemap.ts` and `public/llms.txt` |
| `app/privacy`, `app/terms` | Legal pages; terms read fees from `config.ts`. Privacy covers the extension too |
| `lib/order/` | `config.ts` (all fees, add-ons, workshop address, OG perk, Stripe descriptor), `pricing.ts` (lane rules, integer-fils totals, `laneAServiceFils`), `loadouts.ts` (tiers, `partsCapAed`, `fetchLoadouts`, `loadoutCode`), `build-code.ts` (v1 decoder + encoder), `quote.ts` (`apiBase`, `fetchQuote`), `checkout.ts`, `webhook.ts`, `order-row.ts` (`GG-XXXXXX` ids), `sheet.ts`, `stripe.ts`, `affiliate.ts`, `format.ts` (`formatAed`, `seenAgo`, `cleanTitle`), `types.ts` |
| `lib/campaign/white-friday.ts` | White Friday UTC boundaries for 22 to 29 Nov 2026 in Asia/Dubai and server-only non-production preview switch; campaign UI evaluates dates in the browser so cached routes need no rebuild |
| `components/order-*.tsx` | Order page pieces: lane switch + totals (`order-view`), parts and shopping lists (`order-parts`), client checkout panel (`order-checkout`) |
| `components/retailer-brand.tsx`, `public/retailers/` | Local retailer marks for live builder/order rows and the local WhatsApp icon; keep the active retailer map aligned with `lib/order/types.ts` and sources recorded in `provenance.json` |
| `components/build-paths.tsx`, `build-brief.tsx`, `waitlist-form.tsx` | Build quest writes goal/budget/path into context; the waitlist form sends them with the signup. The `label` strings in `build-brief.tsx` land in the sheet: keep them stable |
| `components/pixel.tsx`, `lib/pixel-art.ts`, `scripts/emit-sprites.ts` | Pixel art is code: run-length data -> committed SVGs in `public/sprites/`. `Glyph` is inline SVG, `Sprite` an `<img>` |
| `scripts/waitlist-sheet.gs` | Apps Script web app (deployed separately with clasp) |
| `app/globals.css` | All styling and design tokens (order and builder styles are near the end) |

Unused leftovers from the v0.app scaffold: `components/ui/`, `components/theme-provider.tsx`, `hooks/`, `styles/globals.css`, most Radix/recharts/cmdk dependencies. Do not build on them.

## How the integrations work

- **Price API** (`extension/server`, default `https://api-production-1e7d.up.railway.app/api`, override `GGPC_API_URL`): `POST /prices/quote` (order page, no-store, 404 means "not live") and `GET /prices/loadouts?budgets=` (builder, revalidate 300 s, 15 s timeout). Budgets sent are parts caps derived from the all-in tier budgets.
- **Order flow.** Lane A: card hold with manual capture; the founder buys the parts, confirms prices, then captures. Lane B: automatic capture of build fee + protection, then the workshop address is shown on the done page only after Stripe confirms payment. OG perk (10% off sourcing + build fee, first 100 waitlist signups by time, matched on checkout email, once) is checked server-side through the sheet. Checkout refuses orders whose service revenue after fees falls below the labour floor.
- **Stripe.** "GG PC" account under Lari Ventures LLC (US, USD settlement, AED presentment). Use a restricted key (`rk_`: Checkout Sessions write, PaymentIntents read). Sessions set `managed_payments: {enabled: false}` (must stay off), `integration_identifier`, statement descriptor suffix `GGPC`. Webhook handles checkout session completed / async succeeded / async failed / expired and payment_intent succeeded / canceled. Without keys the page renders and the button says "Checkout opens soon". Live keys wait on the EIN (see `../STATUS.md`).
- **Waitlist.** Two browser requests: Web3Forms (public access key, emails slesolutions.me@gmail.com) and a fire-and-forget `keepalive` POST to `/api/waitlist`, which forwards to the Apps Script.
- **Apps Script** (`scripts/waitlist-sheet.gs`, "GG PC Waitlist" sheet): no action = waitlist upsert; `og_check`; `order_upsert` ("Orders" tab, columns appended after Notes so old sheets keep positions); "OG" tab freezes the first 100. Script properties `WAITLIST_SECRET`, `ORDERS_NOTIFY_EMAIL`. Deploy with clasp (`clasp push` + `clasp update-deployment`, same /exec URL); clone first, the remote has `Secret.js`. Cold starts are slow (55 s timeouts).
- **Order QA and warranty operations.** In the Orders tab, fields after `Protection fee AED` are manual-only: `QA status`, `QA evidence`, `Handover date`, `Warranty claim status`, `Warranty claim opened`, `Warranty claim notes`, `Warranty claims (count)`. `ensureOrderOpsSchema()` appends/checks headers only and stops on a mismatched existing header; run from the Apps Script editor after backing up the tab. Stripe upserts skip null-key operations columns. The count tracks reported requests; set claim status to `Confirmed labour claim` only after confirming the report concerns GG PC labour. Append dated updates to notes and keep evidence links private. Follow [`docs/order-qa-and-warranty.md`](docs/order-qa-and-warranty.md). `/qa-checklist` is a print/PDF working sheet, not a secure record; do not enter customer contact details or upload photos.

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

## Before you finish

Run `npm run typecheck`, `npm test` and `npm run build` for code changes. Update `../STATUS.md` (landing-page section: replace stale lines, bump the date) when you ship, deploy, decide something or leave work half done. Update this file in the same commit when a route, fee rule, integration or workflow changes.
