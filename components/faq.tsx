import { Glyph } from "@/components/pixel"

const faqs = [
  { question: "Can I use GG PC yet?", answer: "Not yet. GG PC is in development. Join the waitlist to hear about early access and launch updates. We'll share a launch date when it's ready." },
  { question: "Is it useful if I've never built a PC?", answer: "That's exactly who it's for. GG PC helps you choose parts, compare local prices, and check compatibility, and you can get help planning your build." },
  { question: "What if I want someone to build it for me?", answer: "We're planning a build service for that. Tell us your budget and what you want from the PC, and we'll help with the parts, assembly, testing, and delivery." },
  { question: "What makes GG PC useful for UAE builders?", answer: "It's built around buying locally: UAE retailer prices in AED and help choosing the right parts for your build." },
  { question: "Should I join if I'm not ready to buy?", answer: "Yes. Follow along while you plan. The first 100 waitlist members get 10% off their first custom build and a free consultation to help choose their parts." },
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
