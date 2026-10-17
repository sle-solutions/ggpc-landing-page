import { Glyph } from "@/components/pixel"

export const faqs = [
  { question: "What is GG PC?", answer: "GG PC is a PC building tool for gamers in the UAE, currently in development. It is being built to compare PC part prices across UAE stores in AED, check that every part fits your build, and help first-time builders plan a PC that suits their budget." },
  { question: "Can I use GG PC yet?", answer: "Not yet. GG PC is in development. Join the waitlist to hear about early access and launch updates. We'll share a launch date when it's ready." },
  { question: "Is it useful if I've never built a PC?", answer: "That's exactly who it's for. GG PC helps you choose parts, compare local prices, and check compatibility, and you can get help planning your build." },
  { question: "What if I want someone to build it for me?", answer: "We're planning a build service for that. Tell us your budget and what you want from the PC, and we'll help with the parts, assembly, testing, and delivery." },
  { question: "What makes GG PC useful for UAE builders?", answer: "It's built around buying locally: UAE retailer prices in AED and help choosing the right parts for your build." },
  { question: "Should I join if I'm not ready to buy?", answer: "Yes. Follow along while you plan. The first 100 waitlist members get 10% off GG PC's build service and a free consultation to help choose their parts." },
  { question: "Are the prices on this page real?", answer: "No. The prices on this page are illustrative examples to show how comparison will work. Live prices from UAE stores arrive at launch." },
  { question: "Does GG PC sell PC parts?", answer: "No. GG PC is a price comparison and build planning tool, not a store. We are also planning an optional build service for people who want their PC assembled, tested and delivered. GG PC is not affiliated with similarly named PC builders or stores." },
  { question: "What emails will I get?", answer: "Launch news, early access updates, and information about your waitlist perks. Unsubscribe anytime." },
]

export function FAQ() {
  return (
    <section id="faq" className="faq" aria-labelledby="faq-heading">
      <div className="page-width faq-grid">
        <div className="faq-intro">
          <h2 id="faq-heading">Before you press start.</h2>
          <p>Quick answers before you join.</p>
        </div>
        <div className="faq-list">
          {faqs.map(faq => (
            <details key={faq.question}>
              <summary><span>{faq.question}</span><Glyph name="plus" size={16} className="faq-open" /><Glyph name="minus" size={16} className="faq-close" /></summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
