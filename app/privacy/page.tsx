import type { Metadata } from "next"
import { DocPage } from "@/components/doc-page"

export const metadata: Metadata = {
  title: "Privacy policy | GG PC",
  description: "What GG PC collects on ggpc.app, in the GG PC Chrome extension and through Gigi, our Discord bot, who processes it, and how to get it deleted.",
  alternates: { canonical: "/privacy" },
}

export default function Privacy() {
  return (
    <DocPage title="Privacy policy" updated="17 October 2026">
      <p>GG PC is a PC building tool for gamers in the UAE. This page explains what we collect on ggpc.app, in the GG PC Chrome extension and through Gigi, our Discord bot, and what we do with it. Short version: the website only wants your email so we can tell you about GG PC, and the extension keeps your build on your device and only shares public product prices.</p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Your email address</strong>, when you join the waitlist.</li>
        <li><strong>Your build quest answers</strong> (what your PC is for, your budget range, and who is building it), if you answer any of the optional quest before signing up, plus the page you signed up from.</li>
        <li><strong>Anonymous page analytics</strong> through Vercel Web Analytics, which counts visits without cookies and without identifying you.</li>
      </ul>

      <h2>Orders</h2>
      <p>If you order a build through ggpc.app/build, we collect your name, email, phone number, delivery address and the build you chose. Stripe processes the payment and GG PC never sees your card number. We keep each order as a row in a private Google Sheet and get an alert by Google email. Store links in the Lane B shopping list may be affiliate links, which can let those stores set cookies when you open them.</p>
      <h2>The GG PC Chrome extension</h2>
      <p>The extension compares PC part prices across UAE stores and checks that your parts fit together. It does not need an account.</p>
      <h3>What it reads</h3>
      <ul>
        <li><strong>Product pages on supported stores</strong> (Amazon.ae, noon, Microless, Gear-Up and GCC Gamers): the product name, price, stock, image and specs shown on the page you are viewing. It does not run on any other website.</li>
        <li><strong>Public store search results</strong>: to compare prices, your browser asks those stores for their public search results for the part you are viewing or searching for.</li>
      </ul>
      <h3>What stays on your device</h3>
      <p>Your build, tracked parts, recent searches and settings are saved in your browser's extension storage. They are not sent to us. You can delete them at any time in the extension's Settings (Delete all GG PC data) or by removing the extension.</p>
      <h3>What it shares with GG PC</h3>
      <ul>
        <li><strong>Public product prices</strong>: the store, product name, product link (without tracking parameters), price, stock, image and published specs of products it sees, so everyone gets price history and comparisons. These submissions carry no account, no cookies, no device or user identifier and no browsing history.</li>
        <li><strong>Error reports</strong>: when something breaks, a short technical error message and the store page involved, so we can fix it.</li>
      </ul>
      <p>You can turn both off with the "Share prices with GG PC" switch in the extension's Settings. Comparisons still work without it.</p>
      <p>The extension does not collect your name, email, payment details, purchases, passwords or the pages you visit outside the supported stores, and it never sells or shares data for advertising.</p>
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
        <li><strong>Vercel</strong> hosts the site and provides the anonymous analytics.</li>
        <li><strong>Railway</strong> hosts the GG PC price service that receives the extension's anonymous price submissions and error reports, and hosts Gigi and its database.</li>
        <li><strong>Anthropic</strong> writes Gigi's replies from recent server messages (Claude API, not used for training).</li>
        <li><strong>Discord</strong> hosts the community server where Gigi runs, and supplies the member count shown on the page. No website visitor data is sent to Discord.</li>
      </ul>
      <h2>What we do with it</h2>
      <p>We use your email to send launch news, early access updates and information about your waitlist perks. Your quest answers help us plan your build and shape the product. We never sell your data and we do not use advertising trackers.</p>
      <h2>Your choices</h2>
      <p>Every email we send lets you unsubscribe. To have your email and answers deleted, message us on Discord or Instagram and we will remove them.</p>
      <h2>Contact</h2>
      <p>Reach the GG PC team on <a href="https://discord.gg/HMd9ZkYHB3">Discord</a> or <a href="https://www.instagram.com/ggpc.app/">Instagram</a>.</p>
    </DocPage>
  )
}
