"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

const faqs = [
  {
    question: "Will you spam me?",
    answer:
      "No. You'll only hear from us for major updates — launch news, early access invites, and your founding member perks. That's it.",
  },
  {
    question: "I'm not ready to build yet. Should I still sign up?",
    answer: "Yes. Lock in your 20% discount now. Use it whenever you're ready — even 6 months from now.",
  },
  {
    question: "Is this actually launching?",
    answer:
      "Yes. We're targeting launch in 6 months. Real founders, real product, real progress. Follow along on Discord.",
  },
  {
    question: "What if I just want someone to build it for me?",
    answer:
      "That's exactly what our build service is for. Pick your budget, tell us what you want, and we handle everything — parts, assembly, testing, delivery.",
  },
  {
    question: "How is this different from PCPartPicker?",
    answer:
      "PCPartPicker doesn't support UAE stores. GG PC is built specifically for the UAE market — local stores, local prices, local delivery, plus a build service they don't offer.",
  },
]

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className="py-20 md:py-32 px-4" style={{ backgroundColor: "#1A0A0A" }}>
      <div className="max-w-3xl mx-auto">
        <h2 className="font-pixel text-2xl sm:text-3xl md:text-4xl text-center mb-12 text-white">
          Got questions?{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(to right, #FF0040, #FF4D00)" }}
          >
            We got answers.
          </span>
        </h2>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="rounded-lg overflow-hidden transition-colors"
              style={{
                backgroundColor: "#0D0D0D",
                borderLeft: openIndex === index ? "3px solid #FF0040" : "3px solid transparent",
              }}
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="font-semibold text-white pr-4">{faq.question}</span>
                <ChevronDown
                  className="w-5 h-5 flex-shrink-0 transition-transform duration-300"
                  style={{
                    color: "#FF0040",
                    transform: openIndex === index ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
              </button>
              <div
                className="overflow-hidden transition-all duration-300"
                style={{
                  maxHeight: openIndex === index ? "200px" : "0px",
                  opacity: openIndex === index ? 1 : 0,
                }}
              >
                <p className="px-6 pb-6 text-gray-400 leading-relaxed">{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
