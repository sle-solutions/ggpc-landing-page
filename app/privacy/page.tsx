import type { Metadata } from "next"
import { DocPage } from "@/components/doc-page"

export const metadata: Metadata = {
  title: "Privacy policy | GG PC",
  description: "What GG PC collects on ggpc.app, in the GG PC Chrome extension and through Gigi, our Discord bot, who processes it, and how to get it deleted.",
  alternates: { canonical: "/privacy" },
}

export default function Privacy() {
  return (
    <DocPage title="Privacy policy" updated="13 November 2026">
      <p>GG PC is a PC building tool for gamers in the UAE. This page explains what we collect on ggpc.app, in the GG PC Chrome extension and through Gigi, our Discord bot, and what we do with it. The extension keeps local drafts. Versions 0.2.3 and 0.2.4 offer optional accounts. Version 0.2.5 requires account sign-in before extension features run and adds separately optional feature-usage analytics, as explained below. These changes apply after you install 0.2.5. Public price sharing remains separate. Earlier-version technical error reporting is described below.</p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Your email address</strong>, when you join the waitlist.</li>
        <li><strong>Your build quest answers</strong> (what your PC is for, your budget range, and who is building it), if you answer any of the optional quest before signing up, plus the page you signed up from.</li>
        <li><strong>Public-page analytics</strong> through Vercel Web Analytics, which counts public website visits without analytics cookies. We do not load this analytics component on signup or private dashboard pages.</li>
      </ul>

      <h2>Orders</h2>
      <p>If you order a build through ggpc.app/build, we collect your name, email, phone number, delivery address and the build you chose. Stripe processes the payment and GG PC never sees your card number. We keep each order as a row in a private Google Sheet and get an alert by Google email. During build QA, we also keep the checklist, inside photos, handover date and any warranty request notes in the private order folder or order sheet. The print checklist page itself does not send or store what you type. Store links in the Lane B shopping list may be affiliate links, which can let those stores set cookies when you open them.</p>
      <h2>The GG PC Chrome extension</h2>
      <p>The extension compares PC part prices across UAE stores and checks build compatibility. Accounts are optional in versions 0.2.3 and 0.2.4. Version 0.2.5 requires sign-in and acceptance of the current terms and privacy notice before comparing, building, tracking or reading supported product pages. Older-version practices remain described below. The sections for 0.2.3 also cover 0.2.4.</p>
      <h3>What it reads</h3>
      <ul>
        <li><strong>Supported store pages</strong> (Amazon.ae, noon, Microless, Gear-Up and GCC Gamers): product names, prices, stock, images, links and published specs. In 0.2.3, comparison, build and tracking actions require evidence that the listing is a supported PC part, monitor or operating system.</li>
        <li><strong>Store and catalog searches</strong>: your browser asks stores for results for the part or search you choose. Search queries and product identifiers or links also reach the GG PC catalog service for grouping, comparisons and history, even when public price sharing is off. Store requests may use your existing browser session and store cookies. GG PC does not receive those store cookies.</li>
      </ul>
      <h3>What stays on your device</h3>
      <p>Your local build, tracked parts, recent searches, recently viewed part links, settings and cached observations are saved in Chrome extension storage. Version 0.2.3 keeps separate local guest and account workspaces. Signing out hides that account's workspace but keeps its local drafts cached on the device for a later sign-in. Identifiers used to keep those workspaces separate also remain on the device with the cached drafts.</p>
      <p>In 0.2.3, Settings &gt; Delete GG PC data on this device clears the extension's local data, including cached guest and account workspaces, and signs you out. Removing the extension also removes its local storage. Neither action deletes your account or its server-side saved builds.</p>
      <h3>Public price sharing and earlier technical reports</h3>
      <ul>
        <li><strong>Public product observations</strong>: store and product identifiers, product names, links, prices, stock, images and published product details, so GG PC can provide price history and comparisons. Product and image URL query strings are removed from these submissions. They do not carry your GG PC account token, browser cookies or a persistent installation identifier.</li>
        <li><strong>Technical error reports</strong>: the error message and stack, extension version, time and relevant context such as the store page or check involved. A random identifier for the current extension worker session groups related reports. It is separate from your account token.</li>
      </ul>
      <p>In versions 0.2.3 and 0.2.4, the "Share prices with GG PC" switch is on by default and controls automatic public product submissions and technical error reports. Comparisons can still run when it is off. This switch does not control account requests you choose to make. Requests to GG PC and its hosting provider also expose normal network information, such as an IP address, needed to serve requests and limit abuse. The extension does not read your general browsing history or pages outside the supported stores.</p>
      <h3>Required accounts and provider sign-in in version 0.2.5</h3>
      <p>New accounts use a verified Google or Discord identity. Existing email and password accounts can still sign in. During provider sign-in, we process the provider account identifier, email address and verification status to authenticate you and create or find your GG PC account. Google uses the openid and email permissions. Discord uses identify and email. We do not request Discord server, bot, direct-message or friend permissions. The provider processes its own sign-in page and normal connection information under its own privacy policy.</p>
      <p>Provider identities are bound by their provider account identifiers. We do not automatically link accounts just because email addresses match. If an existing account uses that email, sign in with its existing method and contact support about linking. Provider access tokens are used on the server to verify identity and are not stored as GG PC account credentials or sent to extension pages. Provider-only accounts do not have a usable GG PC password; new password signup and password-reset emails are not available in this flow.</p>
      <p>The signup page and its narrow identity proxy run on ggpc.app, with the account service on Railway. Short-lived, Secure, HttpOnly cookies bind sign-in to its browser window. A single-use code linked to the extension&apos;s sign-in request returns to the extension; the extension exchanges it for its account session. An account access token is not put in a page URL or website JavaScript. Sign-in flow records expire after ten minutes, and handoff codes after sixty seconds. Expired flow records are removed by service cleanup while it is running.</p>
      <p>The service records the accepted terms and privacy versions and when they were accepted. Usage analytics has a separate, optional choice. Refusing analytics does not prevent signup or use. Signing out or an expired session locks the extension features. Existing device builds and tracked rules are retained in their separate local workspaces. Importing an earlier guest build requires your explicit choice and does not itself upload a saved account copy.</p>
      <h3>Optional feature-usage analytics in version 0.2.5</h3>
      <p>Feature analytics is off until you explicitly enable it. When enabled, the extension sends a fixed set of feature events, such as opening the panel, viewing a screen, completing a search or comparison, adding a part, opening compatibility details, starting or checking tracking, opening a purchase plan and handing a build to the website. Events contain the extension version, a random browser-session identifier, an event identifier, a session sequence number, a minute-rounded time and, where relevant, broad outcome, error, duration and result-count buckets.</p>
      <p>These usage events do not include store URLs or hosts, browsing history, search text, product names or identifiers, selected parts, prices, build names or codes, email, provider identifiers, passwords, tokens, message text, stack traces, precise location or a persistent device fingerprint. The receiving API authenticates your account, so the event records are account-linked and pseudonymous, not anonymous.</p>
      <p>We use aggregate reports to understand feature adoption, common paths, ordered funnels, drop-off points, repeat activity and bounded errors. The private dashboard is restricted to authorized administrators and does not show account identities or raw individual event histories. Common screen paths require at least three sessions. These reports describe opted-in users only, not everyone using GG PC.</p>
      <p>Active feature-event records are retained for thirty days. Expired records are excluded from reports immediately and physically removed by hourly cleanup while the account service is running, and during later event writes. You can withdraw consent in extension Settings at any time; this clears the queued usage events and deletes your active account-linked feature-event records. Signing out, switching accounts or closing the browser clears its session queue. Account deletion also removes active usage records. The thirty-day rule applies to the active event store, not every hosting/security log or restricted recovery copy. Those operational records are not used to create feature-usage reports.</p>
      <p>In version 0.2.5, legacy raw technical error-report uploads are disabled. Optional usage analytics reports only the bounded error categories described above. Feature analytics is separate from public price sharing. Changing one choice does not change the other. Normal network information, including an IP address, reaches our hosting and proxy providers to serve requests and limit abuse; we do not add IP addresses to feature-event records. We do not use this feature analytics for advertising or sell it.</p>
      <h3>Private usage dashboard</h3>
      <p>An authorized administrator can sign in to the private usage dashboard. Its Secure, HttpOnly session cookie lasts for at most one hour, and the service rechecks account role, expiry and revocation before returning aggregate reports. No dashboard session credential is exposed to page JavaScript. Signup and dashboard pages do not load public-page analytics or third-party media.</p>
      <h3>Limited Use commitment</h3>
      <p>GG PC follows the Chrome Web Store User Data Policy and its Limited Use requirements for extension user data, including information received from Google APIs. We use that information only to provide, secure or improve the disclosed PC comparison, building, tracking and account features. Transfers are limited to what those purposes require, legal obligations, protection against fraud or abuse, or a business transfer with your prior explicit consent. We do not use or transfer it for advertising, sell it to data brokers or other resellers, or use it for credit or lending decisions. Human access is limited to your specific consent, permitted internal analysis of aggregated and anonymized data, security needs or legal obligations. See the <a href="https://developer.chrome.com/docs/webstore/program-policies/limited-use" rel="noreferrer">Chrome Web Store Limited Use policy</a>.</p>
      <h3>Add to build in version 0.2.2</h3>
      <p>In 0.2.2, using Add to build sends the selected product's public details, including price and stock, to the GG PC service even if public price sharing is off. If an existing GG PC account token is present, the request can associate that product with your account's in-progress build. Without a valid token, the account request is rejected and the item remains in the local inbox. There is no account sign-in form in 0.2.2.</p>
      <h3>Optional accounts in version 0.2.3</h3>
      <p>In 0.2.3, Add to build updates the local build or inbox. It no longer sends that action to a cloud build. Automatic public price sharing, when enabled, is still separate. To create or use an account, you enter an email address, username and password, or your sign-in details. The GG PC account service receives those details to create or authenticate the account. The account database stores a bcrypt password hash used to verify passwords.</p>
      <p>Account requests use HTTPS with the default GG PC service. If you change the API address in Settings, account requests go to that selected server; only choose a server you trust. A local development server can use HTTP on the same device.</p>
      <p>The access token and account identity are kept in Chrome's in-memory extension session storage, restricted to trusted extension contexts. The token is used for authenticated account requests. Chrome clears this storage when the browser restarts or the extension is disabled, reloaded or updated, so you may need to sign in again. Signing out also clears the session.</p>
      <p>Recovery uses a code you create after confirming your password. Keep your own copy: the service returns the code when it is created and stores its hash. A replacement invalidates the previous code, and a successful recovery consumes it. Recovery requires your email, code and a new password. Email verification and password-reset emails are not available.</p>
      <h3>Saving and deleting account builds in version 0.2.3</h3>
      <p>Only choosing Save to account uploads a private build snapshot: its name, local identifier, selected parts and slots, product identifiers, store links, images and published specs. The snapshot is associated with your account and has a revision and update time. Prices, stock and comparison offers are excluded. Loading a saved build restores selections that need fresh price checks; editing locally does not automatically save those changes to your account.</p>
      <p>Delete account copy removes that saved build from the account's active saved-build list. Your local build stays on the device. Save and delete requests also create retry receipts containing the request identifier, a fingerprint and the response. A save receipt includes a copy of the saved snapshot, which can remain after Delete account copy. Receipts stop being usable for retries after seven days, but expired receipts are physically removed only during a later save or delete for that account, so they can remain longer if there is no later account mutation.</p>
      <p>To request deletion of your account and its associated data, contact the GG PC team through the Discord or Instagram links below. This is a manual support request; Delete account copy and Delete GG PC data on this device do not delete the account.</p>
      <p>The extension does not collect payment-card details and does not use your data for advertising or sell it.</p>
      <h2>Gigi, the GG PC Discord bot</h2>
      <p>Gigi is an AI bot (an "NPC", not a person) in the GG PC Discord server. It answers questions about PC parts with prices from the GG PC price service, posts real price drops, welcomes new members and passes anything sensitive to our moderators.</p>
      <h3>What it reads and keeps</h3>
      <ul>
        <li><strong>Messages in the GG PC server</strong>, to decide whether to help. We keep the text for 30 days, then only counts (who posted when, and replies), which we use to measure whether the community is healthy.</li>
        <li><strong>Who is in the server</strong>, and when members join or leave, so it can say hello and so we can see whether newcomers stick around.</li>
        <li><strong>Reactions on Gigi's own messages</strong>, so it learns what was useful.</li>
      </ul>
      <p>When you delete a message in Discord, Gigi deletes its copy. It never builds profiles of members and never asks for personal or payment details.</p>
      <h3>Direct messages</h3>
      <p>Members of the GG PC server can message Gigi privately. It only reads the DMs you send it, and only to reply. We do not store the text of DMs: we keep a count of how many replies Gigi sent you, so it can apply a daily limit. To write a reply, your recent DMs with Gigi go to Anthropic's Claude API, the same way server messages do. If a DM needs a moderator, Gigi tells the moderators who it was from and why, not what you wrote.</p>
      <h3>How it writes replies</h3>
      <p>To write a reply, Gigi sends the recent messages in that channel to Anthropic's Claude API. Anthropic processes them for us and does not use them to train its models. Nothing from the server is used to train AI models. To improve Gigi, we look at moderators' edits to its drafts and at counts such as reactions, with member names and links removed.</p>
      <h3>Your choices</h3>
      <ul>
        <li>Use <code>/gigi-off</code> and Gigi will never reply to or react to you. <code>/gigi-on</code> turns it back on.</li>
        <li>Use <code>/forget-me</code> to delete the stored text of your messages, or <code>/privacy</code> to see this summary in Discord.</li>
      </ul>
      <h2>Who processes it</h2>
      <ul>
        <li><strong>Web3Forms</strong> receives the waitlist form and forwards it to us by email.</li>
        <li><strong>Google Sheets</strong> may hold a private copy of waitlist signups and orders that only the GG PC team can open, and Google email sends us order alerts.</li>
        <li><strong>Stripe</strong> takes card payments for orders and shares the name, email, phone and delivery address you enter at checkout.</li>
        <li><strong>Vercel</strong> hosts the site, identity proxy and private dashboard, and provides public-page analytics outside signup and admin pages.</li>
        <li><strong>Railway</strong> hosts the GG PC price and account service and its database, which process extension product submissions, technical reports, account details, provider identity bindings, password and recovery hashes, short-lived sign-in/admin sessions, accepted policy versions, optional feature-event records, saved build snapshots and retry receipts. It also hosts Gigi and its database.</li>
        <li><strong>Anthropic</strong> writes Gigi's replies from recent server messages (Claude API, not used for training).</li>
        <li><strong>Google and Discord</strong> authenticate you when you explicitly choose their sign-in method. Discord also hosts the community server where Gigi runs and supplies its public member count. Opening an ordinary GG PC page does not sign you in to either provider.</li>
      </ul>
      <h2>What we do with it</h2>
      <p>We use waitlist email addresses to send launch news, early access updates and information about waitlist perks. Previously submitted quest answers may be retained with existing waitlist records. The current build quest keeps your answers in this tab and does not submit them. Account details are used to authenticate you, support the available recovery method and manage the builds you choose to save; creating an account does not join the waitlist. Separately consented feature events help us improve the extension as described above. We never sell your data and we do not use advertising trackers.</p>
      <h2>Your choices</h2>
      <p>Every email we send lets you unsubscribe. To have your email and answers deleted, message us on Discord or Instagram and we will remove them.</p>
      <h2>Contact</h2>
      <p>Reach the GG PC team on <a href="https://discord.gg/HMd9ZkYHB3">Discord</a> or <a href="https://www.instagram.com/ggpc.app/">Instagram</a>.</p>
    </DocPage>
  )
}
