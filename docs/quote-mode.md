# Private quote flow refinement

This branch is private preparation. No push, deployment, payment activation or message send is included.

When Stripe or the Sheet is unconfigured, the build page offers the existing WhatsApp quote route. It shows a build estimate, hides the inactive email/payment form and add-on controls, and avoids card-hold or launch-date promises. If the quote destination is missing, the page explains that and links back to the builder. A pending or uncertain earlier checkout outcome remains visible if configuration changes.

Configured checkout keeps its email, add-on, stable intent, server-priced reservation and provider flow. No fee, order-code, API, membership, payment or cancellation policy changes here. No member-code redemption is introduced.

WhatsApp links retain the selected service: Lane B includes `?lane=b` in the shared build link. Selected extras are named when they contribute to the displayed total. Hidden extras cannot inflate a quote-mode total. The message is a draft with a budget/games prompt; creating the link does not send it.

The builder describes catalog observations and preserves each observed age. It no longer promises today's prices, a refresh every few minutes or universal physical fit. A passed compatibility result is labelled as checks passed; an assumed stock cooler asks the buyer to confirm listing inclusion. These copy changes do not replace a failed compatibility check or alter loadout selection.

The two original UI counterexamples are retained outside the repository in the private `quote-ready-review` directory: an unavailable checkout still rendered its inactive form, and Lane B lost its service in the shared link. Both pass against this branch after correction. Source-bound tests/types/lint/build and the separate production browser review are recorded there. The initial production-mode interaction-test harness failure is retained; React's `act` tests run in the test environment, while production rendering is checked separately.

The local browser preview uses only real catalog reads and a reserved test phone number. No Stripe or Sheet credentials are passed. It must never be used to send a message, create a payment, claim real recipient delivery or produce Store media with unverified prices.
