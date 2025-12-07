"use client"

import { useState } from "react"
import { Plus, Minus } from "lucide-react"

const faqs = [
  {
    question: "Will you spam me?",
    answer:
      "No. You'll only hear from us for major updates like launch news, early access invites and your founding member perks. That's it.",
  },
  {
    question: "I'm not ready to build yet. Should I still sign up?",
    answer: "Yes. Get your 10% discount now. Use it whenever you're ready.",
  },
  {
    question: "Is this actually launching?",
    answer:
      "Yes. We're targeting launch in 6 months. Follow us by joining the Discord!",
  },
  {
    question: "What if I just want someone to build it for me?",
    answer:
      "That's exactly what our build service is for. Pick your budget, tell us what you want and we handle everything from parts to testing and delivery.",
  },
  {
    question: "How is this different from PCPartPicker?",
    answer:
      "PCPartPicker doesn't support UAE stores. GG PC is built specifically for the UAE market. We work with local stores and have local prices, local delivery, plus an online build service not offered elsewhere.",
  },
]

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

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
              className="rounded-xl transition-all duration-300"
              style={{
                backgroundColor: "#0D0D0D",
                border: `1px solid ${openIndex === index ? "rgba(255, 0, 64, 0.5)" : "rgba(255, 255, 255, 0.1)"}`,
              }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="text-lg font-semibold text-white pr-4">{faq.question}</span>
                <div
                  className="p-1 rounded-lg transition-colors"
                  style={{
                    backgroundColor: openIndex === index ? "rgba(255, 0, 64, 0.2)" : "rgba(255, 255, 255, 0.05)",
                  }}
                >
                  {openIndex === index ? (
                    <Minus className="w-5 h-5" style={{ color: "#FF0040" }} />
                  ) : (
                    <Plus className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>
              <div
                className="overflow-hidden transition-all duration-300"
                style={{ maxHeight: openIndex === index ? "192px" : "0" }}
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
