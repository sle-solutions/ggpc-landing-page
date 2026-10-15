import type { Metadata } from "next"
import { DocPage } from "@/components/doc-page"

export const metadata: Metadata = {
  title: "Waitlist terms | GG PC",
  description: "How the GG PC waitlist and the first 100 perks work, and what the example prices on the site mean.",
  alternates: { canonical: "/terms" },
}

export default function Terms() {
  return (
    <DocPage title="Waitlist terms" updated="16 October 2026">
      <p>GG PC is in development. Joining the waitlist is free and does not commit you to buy anything.</p>
      <h2>First 100 perks</h2>
      <p>The first 100 people to join the waitlist get 10% off their first custom build through GG PC and a free one to one consultation to help choose their parts. Places are counted in the order signups reach us. We will contact eligible members by email with details on how to use the perks.</p>
      <h2>Example prices and builds</h2>
      <p>Prices, builds, specs and compatibility results shown on ggpc.app are illustrative examples of how GG PC will work. They are not live offers or quotes, and they are not a compatibility check of your PC. Store names and logos appear as examples only; the stores are not partners or sponsors of GG PC.</p>
      <h2>Changes</h2>
      <p>GG PC is still being built, so features and timing may change. If these terms change, we will update this page.</p>
      <h2>Contact</h2>
      <p>Questions? Ask us on <a href="https://discord.gg/HMd9ZkYHB3">Discord</a>.</p>
    </DocPage>
  )
}
