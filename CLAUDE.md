# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Part of the GG PC workspace — see ../CLAUDE.md for the cross-project map and ../STATUS.md for live state.

Waitlist landing page for GG PC at https://www.ggpc.app. Next.js 16 App Router, React 19, Tailwind 4, TypeScript. Originally generated with v0.app, so `components/ui/` holds unused shadcn primitives; the real page lives in the top-level `components/*.tsx`.

## Commands

```bash
npm run dev            # next dev (the preview config in .claude/launch.json uses port 3010)
npm run build          # runs `sprites` first via prebuild, then next build
npm run sprites        # regenerate public/sprites/*.svg from lib/pixel-art.ts
npm run typecheck
npm run lint
npm test               # node:test + jsdom, tests/*.test.tsx
npx tsx --test --test-name-pattern "<name>" tests/waitlist-form.test.tsx   # single test
```

Use npm (package-lock.json is the real lockfile; pnpm-lock.yaml is a stub).

## Architecture

- `app/page.tsx` stacks the sections inside `BuildBriefProvider`. The build quest in `components/build-paths.tsx` writes goal/budget/path into that context, and `components/waitlist-form.tsx` reads it so every signup carries the player's picks. The `label` strings in `components/build-brief.tsx` are what lands in the sheet, so keep them stable.
- **Waitlist submit is two requests from the browser.** Web3Forms (`api.web3forms.com/submit`, public access key in the form) sends the email alert to slesolutions.me@gmail.com. A fire-and-forget `keepalive` POST to `app/api/waitlist/route.ts` mirrors the row into the "GG PC Waitlist" Google Sheet through the Apps Script web app in `scripts/waitlist-sheet.gs`. Apps Script cold starts are slow, which is why the route has `maxDuration = 60` and a 55s timeout. Env: `WAITLIST_SHEET_URL`, `WAITLIST_SHEET_SECRET` (set in Vercel; `.env.example` lists them). The Apps Script is redeployed with `clasp push` + `clasp update-deployment`, not by Vercel.
- **Orders (`/build/<code>`).** The extension's "Order this build" opens `app/build/[code]/page.tsx` (noindex, dynamic). `lib/order/` holds everything: `config.ts` (all numbers, add-on prices and workshop address, founder TODOs are nulls there), `build-code.ts` (contract v1 decoder, shared with the extension, golden vector in `tests/order-build-code.test.tsx`), `quote.ts` (server POST to the price API `/api/prices/quote`; 404 means not deployed, page shows "not live"), `pricing.ts` (lane rules and integer-fils totals), `affiliate.ts` (tags only in Lane B), `sheet.ts` (Apps Script `og_check` / `order_upsert`, "Orders" tab). `app/api/order/checkout` re-quotes server-side and never reads client prices, then makes a Stripe Checkout Session (Lane A uses manual capture so the founder verifies prices before charging); `app/api/stripe/webhook` writes status back to the sheet and returns 500 until that write works. Env: `GGPC_API_URL`, `SITE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `AMAZON_AE_ASSOCIATE_TAG`, `NOON_COUPON_CODE`, `NOON_LINK_TEMPLATE` (`.env.example`); Apps Script property `ORDERS_NOTIFY_EMAIL`. Without Stripe keys the page renders and the button says "Checkout opens soon". Never show demo prices on this page.
- `app/api/discord-members/route.ts` proxies the Discord invite API for live member counts (cached 5 min).
- **Pixel art is code.** Every sprite and glyph is run-length data in `lib/pixel-art.ts`. `scripts/emit-sprites.ts` writes them to `public/sprites/<name>.svg` (committed), and `components/pixel.tsx` renders them as `<img src="/sprites/...">`. After adding or changing a sprite, run `npm run sprites` and commit the SVGs.
- SEO/GEO: `components/structured-data.tsx` (JSON-LD), `app/robots.ts`, `app/sitemap.ts`, `public/llms.txt`, IndexNow key and Search Console file in `public/`. `GEO-AUDIT-REPORT.md` has the last audit.
- `next.config.mjs` sets security headers and long cache headers for `/sprites`, `/brand`, `/retailers`, `/images`. Images are unoptimized.

## Design and copy rules

`PRODUCT.md` (product facts, offer, what must not be invented) and `DESIGN.md` (the "Loadout Screen" design system: tokens, components, motion) are the authority for any UI or copy work. They are maintained by the impeccable skill (`.claude/skills/impeccable`, `.impeccable/` state). Its hooks in `.claude/settings.local.json` run a design check after edits and on stop.

Hard rules from those files:
- Fire Red palette, Press Start 2P for display, Inter for body, zero border radius, pixel art only (no renders or GPU art).
- No em or en dashes in copy. Game voice, plain English, first-time builders first.
- Never invent a launch date, live prices, signup counts, retailer coverage, testimonials or guarantees. Preview prices must be labelled illustrative.
- The build quest is the only playable element. No XP, points, sounds or achievements.
