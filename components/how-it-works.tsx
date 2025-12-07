import { MousePointer, GitBranch, Gamepad2 } from "lucide-react"

const steps = [
  {
    number: "01",
    icon: MousePointer,
    title: "Pick your parts",
    description: "Use our tool to compare prices and check compatibility. Or tell us your budget and we'll recommend.",
  },
  {
    number: "02",
    icon: GitBranch,
    title: "Choose your path",
    description: "DIY with confidence, or let us handle the build.",
  },
  {
    number: "03",
    icon: Gamepad2,
    title: "Game on",
    description: "Your rig arrives tested, ready, and backed by real support.",
  },
]

export function HowItWorks() {
  return (
    <section className="py-20 md:py-32 px-4" style={{ backgroundColor: "#0D0D0D" }}>
      <div className="max-w-6xl mx-auto">
        <h2 className="font-pixel text-2xl sm:text-3xl md:text-4xl text-center mb-4 text-white">
          From clueless to gaming
        </h2>
        <p
          className="text-center text-2xl md:text-3xl font-bold bg-clip-text text-transparent mb-12 md:mb-16"
          style={{ backgroundImage: "linear-gradient(to right, #FF0040, #FF4D00)" }}
        >
          in 3 steps.
        </p>

        <div className="relative">
          {/* Connecting Line (Desktop) */}
          <div
            className="hidden md:block absolute top-24 left-[16.67%] right-[16.67%] h-0.5"
            style={{ backgroundImage: "linear-gradient(to right, #FF0040, #FF4D00, #FFB800)" }}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
            {steps.map((step, index) => (
              <div key={index} className="relative text-center">
                {/* Step Number */}
                <div className="relative inline-block mb-6">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center relative z-10"
                    style={{ backgroundImage: "linear-gradient(to bottom right, #FF0040, #FF4D00)" }}
                  >
                    <span className="font-pixel text-2xl text-white">{step.number}</span>
                  </div>
                  <div
                    className="absolute inset-0 rounded-full blur-xl"
                    style={{ backgroundColor: "rgba(255, 0, 64, 0.3)" }}
                  />
                </div>

                <div className="p-4">
                  <step.icon className="w-8 h-8 mx-auto mb-4" style={{ color: "#FFB800" }} />
                  <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{step.description}</p>
                </div>

                {/* Mobile Arrow */}
                {index < steps.length - 1 && (
                  <div className="md:hidden flex justify-center my-4">
                    <div
                      className="w-0.5 h-8"
                      style={{ backgroundImage: "linear-gradient(to bottom, #FF0040, #FF4D00)" }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
