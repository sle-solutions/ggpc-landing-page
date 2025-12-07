"use client"

import { useRef } from "react"
import { Search, CheckCircle, Wrench } from "lucide-react"

const features = [
  {
    icon: Search,
    title: "Price Comparison",
    description: "Every UAE store. Real prices. Updated daily. Know exactly where to buy.",
  },
  {
    icon: CheckCircle,
    title: "Compatibility Check",
    description: "We catch the mistakes before you make them. Every part guaranteed to work together.",
  },
  {
    icon: Wrench,
    title: "Build Service",
    description: "Don't want to DIY? We'll build, test and deliver your rig. You just game.",
  },
]

export function SolutionSection() {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <section className="py-20 md:py-32 px-4" style={{ backgroundColor: "#0D0D0D" }}>
      <div className="max-w-6xl mx-auto" ref={ref}>
        <h2 className="font-pixel text-2xl sm:text-3xl md:text-4xl text-center mb-4">
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(to right, #FF0040, #FF4D00)" }}
          >
            GG PC
          </span>{" "}
          makes it effortless.
        </h2>
        <p className="text-center text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-12 md:mb-16 leading-relaxed">
          Compare prices across every UAE store. Check compatibility instantly. Or just let us build it for you. Forget about all the haggling and stress.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 md:p-8 rounded-xl transition-all duration-500 hover:-translate-y-2"
              style={{
                backgroundImage: "linear-gradient(to bottom, #1A0A0A, #0D0D0D)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = "rgba(255, 0, 64, 0.3)")}
              onMouseOut={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.05)")}
            >
              <div
                className="p-4 rounded-xl w-fit mb-6 transition-shadow"
                style={{
                  backgroundImage: "linear-gradient(to bottom right, rgba(255, 0, 64, 0.2), rgba(255, 77, 0, 0.1))",
                }}
              >
                <feature.icon className="w-8 h-8" style={{ color: "#FF0040" }} />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
