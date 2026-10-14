import { Plus } from "lucide-react"

const faqs = [
  { question: "Can I use GG PC yet?", answer: "GG PC is in development. Join the waitlist to hear about early access and launch updates. We will share a launch date when it is ready." },
  { question: "Is it useful if I have never built a PC?", answer: "Yes. We are building GG PC to help you choose parts, compare local prices, and check compatibility. You can also get help planning your build." },
  { question: "What if I want someone to build it for me?", answer: "We are planning a build service for that. Tell us your budget and what you want from the PC, and we will help with the parts, assembly, testing, and delivery." },
  { question: "What makes GG PC useful for UAE builders?", answer: "GG PC focuses on the local buying process, with UAE retailer prices in AED and help choosing parts for your build." },
  { question: "Should I join if I am not ready to buy?", answer: "Yes. You can follow progress while you plan your build. The first 100 waitlist members get 10% off their first custom build and a free consultation to help choose their parts." },
  { question: "What emails will I get?", answer: "Launch news, early access updates, and information about your waitlist benefits. You can unsubscribe anytime." },
]
export function FAQ() {
  return <section id="faq" className="faq-section page-width" aria-labelledby="faq-heading"><div className="faq-intro"><h2 id="faq-heading">Before you join.</h2><p>A few things you might want to know.</p></div><div className="faq-list">{faqs.map(faq => <details key={faq.question}><summary>{faq.question}<Plus size={19} aria-hidden="true" /></summary><p>{faq.answer}</p></details>)}</div></section>
}
