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
