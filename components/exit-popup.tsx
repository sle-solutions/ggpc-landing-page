"use client"

import type React from "react"

import { useState } from "react"
import { X, Loader2, CheckCircle } from "lucide-react"

interface ExitPopupProps {
  isOpen: boolean
  onClose: () => void
}

export function ExitPopup({ isOpen, onClose }: ExitPopupProps) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setStatus("loading")

    try {
      const formData = new FormData()
      formData.append("access_key", "2bb892bf-772b-4881-8bd5-8c0ed44423c6")
      formData.append("email", email)
      formData.append("subject", "New GGPC Waitlist Signup - Exit Popup")
      formData.append("from_name", "GGPC Landing Page (Exit Intent)")

      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setStatus("success")

        setTimeout(() => {
          onClose()
          setStatus("idle")
          setEmail("")
        }, 2000)
      } else {
        setStatus("idle")
        setEmail("")
      }
    } catch (error) {
      console.error("Form submission error:", error)
      setStatus("idle")
      setEmail("")
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-[#0D0D0D]/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#1A0A0A] rounded-2xl border border-[#FF0040]/30 p-8 max-w-md w-full shadow-[0_0_50px_rgba(255,0,64,0.2)] animate-in fade-in zoom-in duration-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white transition-colors"
          aria-label="Close popup"
        >
          <X className="w-5 h-5" />
        </button>

        {status === "success" ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="font-pixel text-xl text-green-500 mb-2">You're in!</h3>
            <p className="text-gray-400">We'll get back to you soon.</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h3 className="font-pixel text-xl sm:text-2xl text-white mb-3">
                Wait, don't leave{" "}
                <span className="bg-gradient-to-r from-[#FF0040] to-[#FF4D00] bg-clip-text text-transparent">
                  empty-handed.
                </span>
              </h3>
              <p className="text-gray-400 leading-relaxed">
                Get a <span className="text-[#FFB800] font-semibold">FREE PC build consultation</span> when you join the
                waitlist. We'll help you plan your perfect rig, no strings attached.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full px-6 py-4 bg-[#0D0D0D] border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#FF0040] transition-colors"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full px-8 py-4 bg-gradient-to-r from-[#FF0040] to-[#FF4D00] text-white rounded-lg font-bold text-lg hover:shadow-[0_0_30px_rgba(255,0,64,0.5)] transition-all duration-300 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join Waitlist →"
                )}
              </button>
            </form>

            <button
              onClick={onClose}
              className="w-full text-center text-sm text-gray-600 hover:text-gray-400 mt-4 transition-colors"
            >
              No thanks, I'll figure it out myself
            </button>
          </>
        )}
      </div>
    </div>
  )
}
