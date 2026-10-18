# GG PC

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

UAE and GCC gamers building or upgrading a PC. The user confirmed that first-time builders are the priority, with experienced builders also served.

## Product Purpose

Help people choose PC parts, compare local prices, and check compatibility. The landing page's confirmed goal is waitlist signups.

## Operating Context

The public landing page is https://www.ggpc.app. This Next.js application was created with v0.app. The extension lives separately at /Users/alilari/dev/ggpc-extension.

## Capabilities and Constraints

The existing product describes local price comparison, compatibility checking, price tracking and alerts, recommended builds, and an optional assembly, testing, and delivery service. These are presented as upcoming capabilities while the waitlist is open.

Preserve the Web3Forms waitlist integration and the existing Discord and social destinations. Remove the expired countdown and stale launch timing. Do not invent a launch date, live prices, guarantees, customer evidence, retailer coverage, or signup counts. Preview prices must be explicitly identified as illustrative.

## Brand Commitments

GG PC is the product name. The user requires the existing Fire Red identity, confirmed by their supplied brand guide and logos: #FF0040, #FF4D00, #FFB800, #0D0D0D, #1A0A0A, white; Press Start 2P for logo/headlines and Inter for body text. Use the original pixel GG mark. The prior pale Manrope direction is superseded. Write clear, natural English for gamers, with no em or en dashes. The user requested a full modern redesign and humanized copy. They selected a visual mockup before implementation.

## Evidence on Hand

Existing landing page source: app/page.tsx and components/. Product implementation: the separate extension repository. Founder story: components/founders.tsx. The existing page advertises 10% off GG PC's build service (sourcing fee and build fee, never store part prices) for the first 100 members, a free consultation, guides, and early access. The user confirmed that the 10% build-service discount and free consultation for the first 100 members are still active. Testimonial provenance is unconfirmed; do not invent customer proof.

## Product Principles

- Make the first PC build understandable.
- Explain what the product does with concrete examples.
- Keep the waitlist action easy to find and complete.
- Distinguish product previews from live commercial information.

Copy authority, 15 October 2026 (supersedes the 14 October word-for-word lock): the user asked for all copy rewritten in a game voice that keeps the same facts and the same offer. The problem statements, all five OG member perks and the founder story keep their facts. Use Ali’s existing real portrait. Brand, build quest, retailer logos, and timer removal remain current.

Gamification scope, 15 October 2026: game UI styling across the whole page, with the build quest as the only playable element. No XP, points, sounds or achievements. The user rejected the workbench render and GPU art; example part imagery is authored pixel art.

Order this build, 17 October 2026: ggpc.app/build/<code> (link from the extension) lets a player either have GG PC build it (Lane A: we buy the parts, card hold captured only after we confirm prices) or buy the parts themselves and send them to the workshop (Lane B). Pricing (marketplace decision, 17 October 2026): sourcing fee 6% of parts (Lane A only), build fee AED 450, buyer protection AED 149 flat on every order in both lanes (QA check with a 30 minute stress test and photos, 2-year labour warranty; parts keep store and manufacturer warranty; never OG-discounted), store part prices passed through at cost. Partner builders, when they come, get the build fee minus an 18% commission. The FAQ and build quest show these prices from lib/order/config.ts. Parts prices on the order page are real catalog prices only; no demo or illustrative prices there. The OG perk is 10% off the service lines only (first 100 waitlist signups by signup time, matched on checkout email, once per email). Do not claim a workshop address, add-on prices or a refunds policy until the founder sets them.

Web builder, 17 October 2026: ggpc.app/builder shows four gaming PCs (Starter AED 3,750, Mid 5,000, High 7,500, Top 11,000, all-in including fees) picked automatically from live store prices and fit checked. Say "picked from today's UAE store prices" and "fit checked"; do not claim frame rates, benchmarks or that a build is the best possible. The order page explains the two lanes in one line each: Build it for me (we buy every part, one payment) and I buy, you build (you order the parts, we build for AED 599).
