# Private card checkout and member benefits

This source is private and unactivated. It selects no merchant account, issues no code and makes no live provider, Sheet or customer operation. Root owns merchant/configuration, actual authority/Script cutover, provider proof, issuance/readback, activation and any later delivery. Existing marketing and original member promises remain intact.

## New reservation rule

A private code plus the matching original signup email is required for every new automatic discounted claim. The field is optional for ordinary full-price checkout. No code creates no new OG hold/use, including for a known original member email; an ordinary order's later paid event cannot use that member benefit. A supplied bad/unavailable code stops rather than silently selecting full price. First100 eligibility and the once-only 10% sourcing/build-fee value remain. Parts, protection and add-ons are undiscounted. Original-signup-email private quote/help remains available; a quote does not reserve, consume or authorize payment. No new mailbox, account-linking, transfer, lost-code or refund rule is added.

The HTTPS checkout POST retains `code` for the existing build code and adds optional `memberCode`. Only canonical 256-bit GGPC-OG bearers are digested; request bytes are bounded to 16 KiB. The raw code exists only in the private tab/request, never URLs, WhatsApp messages, persistent storage, application logs, Stripe parameters/metadata or Sheet requests/cells. No public code-check endpoint or database exists.

## One authority, one lock

`checkout_reserve_v2` requires protocol `ggpc-checkout-reservation-v2` and request correlation over the intent, economic binding, original email and digest/null. The secret-authenticated server sends only the digest. Inside one ScriptLock, the actual existing frozen OG record and Orders authority are validated and the code record is matched before any new discounted hold. No network, nested lock, auto freeze, issue, repair or membership reordering occurs inside admission. Code checks require complete immutable digest/issuance-ID/server-time metadata. Unknown/duplicate/formula/partial state refuses.

A genuine code claim is strict v2 in the same claim44 cell, with the existing fields plus its immutable `memberCode:{digest,issuanceId,issuedAt}` anchor. Other columns and manual fields are unchanged. Existing strict v1 and legacy-consumed records remain readable. Exact own held replays retain the original order/provider key, economics and original observation snapshot. No-code bindings and Session parameters stay byte-compatible with old already-bound v1 attempts; the old reserve action cannot create a new claim. A changed code, email, intent, quote or provider reference cannot rebind. Unknown outcomes remain held for review. The 20-hour automated create retry horizon is not entitlement expiry and never releases a benefit.

Lane A keeps manual capture, Lane B automatic, AED integer-fils pricing and the existing provider recipe. The exact Session is attached durably before its URL is returned. A lost reserve/create/attach response never proves no charge. Retry only the same attempt; no automatic replacement or release exists.

## Per-Session business name

The selected shared merchant is Lari Ventures, LLC; its account branding is not changed. New GG PC Sessions add only `branding_settings: { display_name: "GG PC" }`, which overrides the Checkout page header. The account business name can still appear in terms, receipts and other places. Actual provider display remains a root-owned verification.

The server preserves the exact former v1/v2 economic serialization as `legacyBinding` and binds the same payload plus the fixed branding settings as the new primary hash. One correlated request covers both hashes under the existing reservation protocol and ScriptLock. New claims store only the primary. An exact existing same-intent/member/code-bound claim returns its original binding; the server uses that selected binding for metadata/attachment and its exact original provider parameters/idempotency key. Historical retries receive no added branding. Existing claim schema, manual cells and consumption rules remain unchanged.

The new Script admits marker-absent old consumers only as exact existing retries, including coded v2. The older Script rejects the paired request before creating a hold. A mismatched reply, unknown outcome or unavailable consumer stops without fallback, a replacement Session or a claim reset. Root coordinates the compatible Script and website rollout; passing local controls does not activate Stripe or change production quote mode.

## Events and receipts

Only raw-body signature-verified, correctly bound authorized/paid events consume monotonically. Session and PaymentIntent metadata must agree; original member identity survives contact-email changes. Duplicate events repair partial owned writes. Cancellation, expiry, refund and elapsed time never reset use. Provider work and existing notifications stay outside ScriptLock.

`checkout_receipt` is server-only, secret-authenticated and read-only. It accepts the exact order/intent/economic binding/Session/PaymentIntent tuple and returns only that ref, lane, original build code and positive order status. It never appends a header, writes an order, consumes or repairs. The done page first verifies actual Stripe status/metadata, then the same durable claim. Pending or mismatched state shows confirmation pending. Only a bound paid Lane B order reveals the workshop; no return query or local code proof can do so. A new parts re-quote retains its own observation ages.

Card form/POST readiness requires Stripe secret, webhook signing secret and existing Sheet URL/secret together. That is configuration readiness, not cloud/provider admission. Missing readiness preserves WhatsApp quote mode and earlier unknown notices. Hosted Checkout needs no browser publishable key. Receipt pages have no-store/no-referrer headers and metadata and exclude public analytics at mount and beforeSend; ordinary public analytics and identity protections remain unchanged.

## Verification and live limits

Local tests use actual handlers, actual Apps Script and actual Stripe signature code with injected prices, synthetic secrets and disposable .invalid members. The prior b631 email-only theft is replayed only by the source-pinned private packet probe. The maintained suite resumes a checked-in synthetic .invalid v1 claim/provider golden with identical provider parameters and needs no sibling worktree. A fresh source-only copy runs the full ordinary suite without a sibling baseline. No inherited HOME override is run. Types, ordinary tests, scoped lint, production build and local 375 px/desktop controls must pass on the exact final source. Local tests do not establish provider readiness, cloud atomicity or zero bugs.

Root must back up/reconcile the current workbook, deployed script, frozen original membership/use/provider/unknown rows and original outboxes; admit schemas without changing original ranks/manual cells; coordinate compatible Script/website deployment; verify test-provider flows; and admit actual code activation before delivery. Configuration and passing source checks do not authorize a live charge, issuance, capture, refund, reset, send or booking.

The selected merchant may host other products. Clearly foreign/unclaimed signed events are 200 no-ops before provider/Sheet work. Only canonical GG order/UUID intent/hex binding metadata enters the managed transition path; owned unknown/mismatched claims remain reconcilable failures. Webhooks never create legacy/unclaimed rows. Existing legacy-consumed authority and genuine managed v1/v2 events remain supported. Root reconciles any actual older unclaimed order separately.
