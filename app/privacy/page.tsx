import type { Metadata } from "next"
import { DocPage } from "@/components/doc-page"

export const metadata: Metadata = {
  title: "Privacy policy | GG PC",
  description: "What GG PC collects when you join the waitlist, who processes it, and how to get it deleted.",
  alternates: { canonical: "/privacy" },
}

export default function Privacy() {
  return (
    <DocPage title="Privacy policy" updated="16 October 2026">
      <p>GG PC is a PC building tool in development for gamers in the UAE. This page explains what we collect on ggpc.app and what we do with it. Short version: we only want your email so we can tell you when GG PC launches.</p>
      <h2>What we collect</h2>
      <ul>
        <li><strong>Your email address</strong>, when you join the waitlist.</li>
        <li><strong>Your build quest answers</strong> (what your PC is for, your budget range, and who is building it), if you answer any of the optional quest before signing up, plus the page you signed up from.</li>
        <li><strong>Anonymous page analytics</strong> through Vercel Web Analytics, which counts visits without cookies and without identifying you.</li>
      </ul>
      <h2>Who processes it</h2>
      <ul>
        <li><strong>Web3Forms</strong> receives the waitlist form and forwards it to us by email.</li>
        <li><strong>Google Sheets</strong> may hold a private copy of waitlist signups that only the GG PC team can open.</li>
        <li><strong>Vercel</strong> hosts the site and provides the anonymous analytics.</li>
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
