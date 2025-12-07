"use client"

import type React from "react"

import { useState } from "react"
import { Loader2, CheckCircle, Sparkles } from "lucide-react"

export function FinalCTA() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setStatus("loading")

    try {
      const formData = new FormData()
      formData.append("access_key", "2bb892bf-772b-4881-8bd5-8c0ed44423c6")
      formData.append("email", email)
      formData.append("subject", "New GGPC Waitlist Signup")
      formData.append("from_name", "GGPC Landing Page")

      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setStatus("success")
        setEmail("")
        setTimeout(() => setStatus("idle"), 5000)
      } else {
        setStatus("error")
        setTimeout(() => setStatus("idle"), 5000)
      }
    } catch (error) {
      console.error("Form submission error:", error)
      setStatus("error")
      setTimeout(() => setStatus("idle"), 5000)
    }
  }

  return (
    <section id="signup" className="py-20 md:py-32 px-4 scroll-mt-20" style={{ backgroundColor: "#0D0D0D" }}>
      <div className="max-w-2xl mx-auto text-center">
        {status === "success" ? (
          <div className="space-y-6">
            <div
              className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
              style={{ backgroundColor: "rgba(34, 197, 94, 0.2)" }}
            >
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="font-pixel text-2xl sm:text-3xl text-green-500">You're in!</h2>
            <p className="text-xl text-gray-400">We'll get back to you soon!</p>
            <div className="relative">
              <Sparkles className="absolute -top-4 -left-4 w-6 h-6 animate-pulse" style={{ color: "#FFB800" }} />
              <Sparkles
                className="absolute -top-2 right-0 w-4 h-4 animate-pulse"
                style={{ color: "#FF0040", animationDelay: "100ms" }}
              />
              <Sparkles
                className="absolute bottom-0 left-1/4 w-5 h-5 animate-pulse"
                style={{ color: "#FF4D00", animationDelay: "200ms" }}
              />
            </div>
          </div>
        ) : (
          <>
            <h2 className="font-pixel text-2xl sm:text-3xl md:text-4xl mb-4 text-white">
              Ready to build{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(to right, #FF0040, #FF4D00)" }}
              >
                smarter?
              </span>
            </h2>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="flex-1 px-6 py-4 rounded-lg text-white placeholder-gray-500 transition-colors outline-none"
                  style={{
                    backgroundColor: "#1A0A0A",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#FF0040")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)")}
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="px-8 py-4 text-white rounded-lg font-bold text-lg transition-all duration-300 disabled:opacity-70 flex items-center justify-center gap-2 min-w-[180px]"
                  style={{ backgroundImage: "linear-gradient(to right, #FF0040, #FF4D00)" }}
                  onMouseOver={(e) => (e.currentTarget.style.boxShadow = "0 0 30px rgba(255, 0, 64, 0.5)")}
                  onMouseOut={(e) => (e.currentTarget.style.boxShadow = "none")}
                >
                  {status === "loading" ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    "Claim My Spot →"
                  )}
                </button>
              </div>

              <p className="text-sm text-gray-500">No spam. Unsubscribe anytime. Only launch updates and your perks.</p>

              
            </form>
          </>
        )}
      </div>
    </section>
  )
}