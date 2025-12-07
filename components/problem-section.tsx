"use client"

import { DollarSign, Puzzle, HandshakeIcon, AlertTriangle } from "lucide-react"

const problems = [
  {
    icon: DollarSign,
    title: "Everything is 2x the price",
    description: "UAE stores charge insane markups. No easy way to compare.",
  },
  {
    icon: Puzzle,
    title: "Will these parts even work together?",
    description: "Compatibility is a nightmare. One wrong click = expensive paperweight.",
  },
  {
    icon: HandshakeIcon,
    title: "I don't want to haggle at Computer Plaza",
    description: "You're not a used car salesman. You just want fair prices.",
  },
  {
    icon: AlertTriangle,
    title: "What if I break something?",
    description: "That IO shield haunts your dreams. One wrong move and it's over.",
  },
]

export function ProblemSection() {
  return (
    <section className="py-20 md:py-32 px-4" style={{ backgroundColor: "#1A0A0A" }}>
      <div className="max-w-6xl mx-auto">
        <h2 className="font-pixel text-2xl sm:text-3xl md:text-4xl text-center mb-4 text-white">
          Building a PC in the UAE?
        </h2>
        <p
          className="text-center text-2xl md:text-3xl font-bold bg-clip-text text-transparent mb-12 md:mb-16 italic"
          style={{ backgroundImage: "linear-gradient(to right, #FF0040, #FF4D00)" }}
        >
          Good luck.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {problems.map((problem, index) => (
            <div
              key={index}
              className="group p-6 md:p-8 rounded-xl transition-all duration-300"
              style={{
                backgroundColor: "#0D0D0D",
                border: "1px solid rgba(255, 0, 64, 0.2)",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 0, 64, 0.5)"
                e.currentTarget.style.boxShadow = "0 0 30px rgba(255, 0, 64, 0.1)"
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 0, 64, 0.2)"
                e.currentTarget.style.boxShadow = "none"
              }}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg transition-colors" style={{ backgroundColor: "rgba(255, 0, 64, 0.1)" }}>
                  <problem.icon className="w-6 h-6" style={{ color: "#FF0040" }} />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-white mb-2">{problem.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{problem.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
