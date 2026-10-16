import type { Metadata } from "next"
import { DocPage } from "@/components/doc-page"

export const metadata: Metadata = {
  title: "Privacy policy | GG PC",
  description: "What GG PC collects on ggpc.app and in the GG PC Chrome extension, who processes it, and how to get it deleted.",
  alternates: { canonical: "/privacy" },
}

export default function Privacy() {
  return (
    <DocPage title="Privacy policy" updated="16 October 2026">
      <p>GG PC is a PC building tool for gamers in the UAE. This page explains what we collect on ggpc.app and in the GG PC Chrome extension, and what we do with it. Short version: the website only wants your email so we can tell you about GG PC, and the extension keeps your build on your device and only shares public product prices.</p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Your email address</strong>, when you join the waitlist.</li>
        <li><strong>Your build quest answers</strong> (what your PC is for, your budget range, and who is building it), if you answer any of the optional quest before signing up, plus the page you signed up from.</li>
        <li><strong>Anonymous page analytics</strong> through Vercel Web Analytics, which counts visits without cookies and without identifying you.</li>
      </ul>

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
      <h2>Who processes it</h2>
      <ul>
        <li><strong>Web3Forms</strong> receives the waitlist form and forwards it to us by email.</li>
        <li><strong>Google Sheets</strong> may hold a private copy of waitlist signups that only the GG PC team can open.</li>
        <li><strong>Vercel</strong> hosts the site and provides the anonymous analytics.</li>
        <li><strong>Railway</strong> hosts the GG PC price service that receives the extension's anonymous price submissions and error reports.</li>
        <li><strong>Discord</strong> supplies the community member count shown on the page. No visitor data is sent to Discord.</li>
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
