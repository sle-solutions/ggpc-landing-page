"use client"

import { Check, Sparkles } from "lucide-react"

const benefits = [
  "Early access to the price comparison tool before anyone else",
  "10% off your first custom build",
  "Free consultation - 1-on-1 help planning your perfect rig",
  "Exclusive guides - UAE-specific build guides and pricing reports",
  "Launch updates - Be first to know when we go live",
]

export function ValueStack() {
  const scrollToSignup = () => {
    document.getElementById("signup")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <section className="py-20 md:py-32 px-4" style={{ backgroundColor: "#1A0A0A" }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-pixel text-2xl sm:text-3xl md:text-4xl mb-4 text-white">Join the first 100.</h2>
          <p
            className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(to right, #FF0040, #FFB800)" }}
          >
            Get the VIP treatment.
          </p>
        </div>

        <div className="relative">
          {/* Glow Effect */}
          <div
            className="absolute inset-0 blur-3xl"
            style={{
              backgroundImage: "linear-gradient(to right, rgba(255, 0, 64, 0.1), transparent, rgba(255, 77, 0, 0.1))",
            }}
          />

          <div
            className="relative rounded-2xl p-8 md:p-12"
            style={{
              backgroundImage: "linear-gradient(to bottom, #0D0D0D, #1A0A0A)",
              border: "1px solid rgba(255, 0, 64, 0.3)",
            }}
          >
            <div className="flex items-center gap-2 mb-8">
              <Sparkles className="w-6 h-6" style={{ color: "#FFB800" }} />
              <span className="font-pixel text-sm" style={{ color: "#FFB800" }}>
                OG MEMBER PERKS     
              </span>
            </div>

            <ul className="space-y-5 mb-10">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-4">
                  <div className="p-1 rounded-full mt-0.5" style={{ backgroundColor: "rgba(255, 0, 64, 0.2)" }}>
                    <Check className="w-4 h-4" style={{ color: "#FF0040" }} />
                  </div>
                  <span className="text-lg text-gray-200">{benefit}</span>
                </li>
              ))}
            </ul>

            <div
              className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6"
              style={{ borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}
            >
              <p className="font-semibold" style={{ color: "#FFB800" }}>
                <span className="animate-pulse">🔥</span> No spam, pinky promise.
              </p>
              <button
                onClick={scrollToSignup}
                className="w-full sm:w-auto px-8 py-4 text-white rounded-lg font-bold text-lg transition-all duration-300"
                style={{ backgroundImage: "linear-gradient(to right, #FF0040, #FF4D00)" }}
                onMouseOver={(e) => (e.currentTarget.style.boxShadow = "0 0 30px rgba(255, 0, 64, 0.5)")}
                onMouseOut={(e) => (e.currentTarget.style.boxShadow = "none")}
              >
                Claim My Spot →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
