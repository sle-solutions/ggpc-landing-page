# Order QA and warranty operations

Use one `/qa-checklist` printout for each order. It is a public, noindex page with no form submission, browser storage or photo upload. Enter only the order ID and build-operation details; do not enter customer contact details. Store photos in the private order folder and put its private link in the sheet and checklist.

## Order sheet fields

The `Orders` tab keeps these manual fields after `Protection fee AED`:

| Column | Use |
|---|---|
| `QA status` | `In progress`, `Hold` or `Ready for handover`. Ready is a human decision after checking the recorded work. |
| `QA evidence` | Link to the private folder containing the checklist and inside photos. |
| `Handover date` | Date the build was handed over. It is a handover record, not a warranty start-date rule. |
| `Warranty claim status` | Record the current report state: `Reported`, `Reviewing`, `Confirmed labour claim`, `Resolved`, or `Closed: parts referral`. Use the last status when the request concerns a part and has been referred to its store or manufacturer warranty. |
| `Warranty claim opened` | Date the request was first reported. Do not infer an eligibility period from this field. |
| `Warranty claim notes` | Keep a dated ledger, appending each new request with its request ID, date and outcome. Append dated updates to that entry; never overwrite prior reports or confirmations. Record the reported symptom, checks and next action without customer personal information. Keep any evidence link private. |
| `Warranty claims (count)` | Count separate reported warranty requests for the order, whether or not a GG PC labour claim is later confirmed. Increment once when a new request is reported, not for each update to the same request. |

The count tracks reported requests, while status records the current handling outcome. Review the dated notes ledger manually when counting requests; the count is not a confirmed-labour-claim rate and must not be used as the under-3% warranty-rate metric. A report about a part stays with that part's store and manufacturer warranty. Do not add a warranty start date, exclusions, resolution promise, shipping terms, response time or other policy to the record.

## Add the columns

After verifying the Apps Script project and backing up the Orders tab, run `ensureOrderOpsSchema()` from the Apps Script editor. It appends missing headers only, including the existing `Protection fee AED` header if the tab has the known 27-column prefix. It stops before changing the sheet if any existing header is out of order. It may add columns to the sheet grid to fit the headers. It does not modify order data or deploy the web app.

The Stripe `order_upsert` action skips all seven manual QA and warranty columns. Keep those fields after `Protection fee AED` so webhook writes retain them.

## Phase 1 gate tracking

The gate fields are manual, null-key columns after `Warranty claims (count)`. Stripe upserts skip them. Enter typed dates in `Paid verified date` only after payment is verified, and in `Job completed date` only after the build is finished and handed over. A gate-counted order needs both dates and a unique Order ID; Stripe status alone does not determine the count, so verified non-Stripe payments can be recorded too.

Record actual AED values, including an explicit `0` when verified. Leave a value blank while it is unknown; blank values block the affected finance metric. `Actual customer payments AED` means money received by GG PC: for Lane A include the full GG PC customer charge; for Lane B include only the GG PC build/protection charge, not the customer's separate store purchases. `Actual refunds AED` is actual refunds paid by GG PC. Net GG PC receipts are payments minus refunds. `Actual parts cost AED` is GG PC's actual parts outlay (enter 0 for Lane B only when verified). `Actual payment fees AED` and `Actual builder payout AED` are actual amounts. Negative values are invalid.

The gross retained rate is `(net GG PC receipts - parts cost) / net GG PC receipts`. The net retained rate subtracts actual payment fees and builder payout too. Each is weighted across completed paid orders by summing retained AED and dividing by summed net receipts. They are separate metrics; the gate tracker does not combine them into one overall readiness result. Each has a 7% threshold. If net receipts are zero or below, the rate is unavailable.

Set `Confirmed labour claim?` to `Yes` only when the reported request is confirmed as a GG PC labour claim. Set it to `No` after review confirms it is not one. Leave it blank while unknown; blanks require review and do not count as No. `Warranty claims (count)` still counts reported requests and is not used for the gate. The warranty gate is confirmed labour-claim orders / completed paid orders, strictly below 3%. The phase counter gate is at least 30 completed paid builds.

Run `ensureOrderOpsSchema()` from the Apps Script editor after backing up the Orders tab to append the fields and create the `Phase 1 gates` summary tab. The `GG PC ops` menu refreshes results and the timestamp after manual edits; reopening the spreadsheet adds the menu without changing sheet data. Duplicate Order IDs block the metrics until corrected. The summary contains values only, never formulas in Orders rows.
