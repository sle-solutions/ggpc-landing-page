# Private member-code operations proposal

This source is unactivated. No actual member codes or outboxes were prepared, no membership was frozen, and no remote script, workbook, deployment or environment was changed. The reconciled workbook has no OG tab and no Orders data; this bridge refuses issuance until an operator separately establishes and reviews the authoritative frozen OG membership. It never imports the offline rehearsal issuer or freezes, creates, sorts or re-ranks membership.

## Authority and limits

The same secret-authenticated Apps Script exposes `member_code_issue` and `member_code_check`. Both take the existing ScriptLock, share the Orders claim44 hold/consumption interpretation, flush while locked and release on errors. There is no network operation under that lock. Unknown schema, duplicate normalized emails/digests/issuance IDs, invalid physical ranks, formulas in membership or authority fields, ambiguous partial records or malformed authority rows fail closed. Manual Orders fields remain untouched. Legacy positive consumption remains authoritative after cancellation.

Issuance requires an existing OG sheet of exactly `Email | Rank` or the recognized five-column schema below, with 1..100 valid distinct emails and numeric Rank matching original physical order. Original email spelling and rank cells are preserved. No alias collapsing occurs: normalization is trim/lowercase only. The source appends only these three proposed text columns after the original two:

| Column | Meaning |
| --- | --- |
| Code SHA256 | Domain-separated SHA256 of the complete random bearer |
| Code issuance ID | Immutable random UUID tying the operator's retry to its original request |
| Code issued at | Exact UTC ISO server time recorded at durable issue or repair |

Only an empty target with available benefit can receive a new record. An exact digest+issuance-ID pair with blank timestamp can repair its own partial record while still available. A lone anchor, unknown date/schema, another member's matching anchor or unrelated partial record requires manual reconciliation. No existing code is overwritten or automatically replaced. A fully recorded exact retry is read-only and may confirm an already held/consumed record, reporting unavailable. No age-based release exists.

A successful check proves only that the presented exact email/digest matches a recorded code and reports current `available`, `held` or `consumed`. It does not consume a benefit. Every success includes `checkoutAuthorized:false`. It is not identity verification, payment proof, delivery proof, issuance activation proof or checkout redemption. No public API/UI, Stripe input or WhatsApp quote accepts this proof as discount authority. Existing shared checkout reservation and fee-only pricing rules are unchanged; parts and protection remain excluded from the OG service-fee discount. Future coordinated redemption/identity policy, membership reconciliation, remote cutover, code delivery and activation still require root admission.

## Inert operator CLI

`scripts/member-code-ops.cjs` has no import-time actions or dependencies beyond Node built-ins. A bearer is `GGPC-OG-` followed by canonical base64url of 32 cryptographically random bytes. Digest input is UTF-8 `ggpc-og-member-code:v1\0` plus the complete bearer; protocol is `ggpc-member-code-ops-v1`. Only the digest travels to Apps Script or enters its sheet. No new HMAC/auth key, database, API scope or live storage is introduced.

Future operator commands, **not executed by this preparation**:

```text
node scripts/member-code-ops.cjs prepare /absolute/private/member.json /absolute/private/outbox.json
node scripts/member-code-ops.cjs issue /absolute/private/outbox.json
node scripts/member-code-ops.cjs check /absolute/private/presented.json /absolute/private/check-receipt.json
```

Use an owner-only canonical 0700 directory outside this repository. Inputs/outboxes/receipts are owner-only regular 0600 JSON files; symlinks, oversized files, noncanonical paths and source-tree storage are refused. Prepare input has only `email`; presented-check input has only `email` and `code`. Do not put either on a shell command line, in URLs, logs or chat. Prepare creates a new fsynced outbox containing the sensitive code and immutable digest/issuance payload before any transport. It cannot overwrite an existing outbox and does not read authority environment values. Console summaries contain neither email nor bearer. Protect/retain the outbox as the only private delivery custody; this leaf provides no sending command.

Only explicit issue/check reads the existing `WAITLIST_SHEET_URL` and `WAITLIST_SHEET_SECRET` config. URL must be exact HTTPS `script.google.com/macros/s/<deployment>/exec`, with no userinfo, query, fragment or port. Apps Script's HTTPS `script.googleusercontent.com/macros/echo` output redirect receives a GET without the POST credential/body. Redirects have a bounded length and one ordinary URI representation: after one decode, residual percent syntax, the secret (including query form-space notation) or the normalized email causes refusal before GET. Doubly/deeply encoded or malformed opaque redirects stay unknown for reconciliation; ordinary opaque and single-encoded opaque keys remain supported. Transport is bounded and has no automatic retry.

Before issue dispatch, the CLI fsyncs `issue_unknown` in the same private outbox and takes an exclusive local lock. It marks `record_verified_ops_only` only after exact protocol/request/issuance binding and authenticated issue+check timestamps match. `activationVerified` always remains false. A timeout, wrong/old response, partial storage failure or unknown result preserves the original code and payload. Reconcile and explicitly retry that same outbox; never prepare a replacement or steal an unknown lock. A process crash can leave the lock for manual review. A readonly check similarly creates a private unknown receipt before dispatch; its receipt contains a request binding, not the presented email or bearer.

Local flush/fsync/readback and ScriptLock reduce ambiguity but do not make Sheets or the local filesystem a cross-system transaction. Unknown outcomes stay unknown. No policy for refunds, ownership transfer, lost code replacement or hold release is inferred here.

## Local checks

`npm test` retains the existing113 tests plus actual Apps Script buffered/partial/failure/claim-state and real Node crypto/outbox controls. Tests use only `.invalid` members, synthetic secrets, temporary private directories and in-process transports. `npm run typecheck`, default `npm run build` and scoped lint are required. Existing Next ESLint config cannot cover CJS directly because its global React rule lacks a plugin on that file type; the CLI is checked separately with ESLint recommended rules and explicit Node globals, while TS tests use the repository config. No actual network, env credentials or customer data is needed.
