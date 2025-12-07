"use client"

import { useState, useEffect } from "react"
import { ChevronRight, Monitor, Cpu, Zap } from "lucide-react"

export function HeroSection() {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    const launchDate = new Date("2026-06-15T00:00:00")

    const timer = setInterval(() => {
      const now = new Date().getTime()
      const distance = launchDate.getTime() - now

      if (distance < 0) {
        clearInterval(timer)
        return
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const scrollToSignup = () => {
    document.getElementById("signup")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <section
      className="relative min-h-screen flex items-center justify-center pt-16 md:pt-20 pb-20 sm:pb-24 md:pb-12 px-3 sm:px-4 overflow-hidden"
      style={{ backgroundColor: "#0D0D0D" }}
    >
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/4 left-1/4 w-48 sm:w-72 md:w-96 h-48 sm:h-72 md:h-96 rounded-full blur-[60px] sm:blur-[80px] md:blur-[100px] animate-pulse"
          style={{ backgroundColor: "rgba(255, 0, 64, 0.2)" }}
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-48 sm:w-72 md:w-96 h-48 sm:h-72 md:h-96 rounded-full blur-[60px] sm:blur-[80px] md:blur-[100px] animate-pulse"
          style={{ backgroundColor: "rgba(255, 77, 0, 0.15)", animationDelay: "1000ms" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[450px] md:w-[600px] h-[300px] sm:h-[450px] md:h-[600px] rounded-full blur-[100px] sm:blur-[120px] md:blur-[150px]"
          style={{ backgroundColor: "rgba(255, 184, 0, 0.05)" }}
        />

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#FF0040 1px, transparent 1px), linear-gradient(90deg, #FF0040 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="relative max-w-6xl mx-auto text-center z-10">
        {/* Floating PC Components */}
        <div className="absolute -top-10 left-10 opacity-20 animate-float hidden lg:block">
          <Cpu className="w-16 h-16" style={{ color: "#FF0040" }} />
        </div>
        <div className="absolute top-20 right-10 opacity-20 animate-float-delayed hidden lg:block">
          <Monitor className="w-20 h-20" style={{ color: "#FF4D00" }} />
        </div>
        <div className="absolute bottom-20 left-20 opacity-20 animate-float hidden lg:block">
          <Zap className="w-14 h-14" style={{ color: "#FFB800" }} />
        </div>

        {/* Main Content */}
        <div className="space-y-4 sm:space-y-6 md:space-y-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold leading-tight tracking-tight">
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(to right, #FF0040, #FF4D00)" }}
            >
              Stop Overpaying.
            </span>
            <br />
            <span className="text-white">Stop Guessing.</span>
            <br />
            <span className="text-white">Start Gaming.</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed px-2 sm:px-0">
            GG PC is the UAE&#39;s first price comparison platform for PC parts with compatibility checking, price
            tracking, and a build service that does it all for you.
          </p>

          {/* Countdown Timer */}
          <div className="py-4 sm:py-6 md:py-8">
            <p
              className="font-pixel text-xs sm:text-sm md:text-base mb-3 sm:mb-4 tracking-wider"
              style={{ color: "#FF0040" }}
            >
              LAUNCHING IN
            </p>
            <div className="flex justify-center gap-2 sm:gap-3 md:gap-6">
              {[
                { value: timeLeft.days, label: "DAYS" },
                { value: timeLeft.hours, label: "HOURS" },
                { value: timeLeft.minutes, label: "MINS" },
                { value: timeLeft.seconds, label: "SECS" },
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <div
                    className="rounded-lg p-2 sm:p-3 md:p-6 min-w-[56px] sm:min-w-[70px] md:min-w-[100px]"
                    style={{
                      backgroundImage: "linear-gradient(to bottom, #1A0A0A, #0D0D0D)",
                      border: "1px solid rgba(255, 0, 64, 0.3)",
                    }}
                  >
                    <span
                      className="font-pixel text-xl sm:text-2xl md:text-5xl bg-clip-text text-transparent"
                      style={{ backgroundImage: "linear-gradient(to right, #FF0040, #FF4D00)" }}
                    >
                      {String(item.value).padStart(2, "0")}
                    </span>
                  </div>
                  <p className="text-[9px] sm:text-[10px] md:text-xs text-gray-500 mt-1 sm:mt-2 tracking-wider">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-2 sm:px-0">
            <button
              onClick={scrollToSignup}
              className="group w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-white rounded-lg font-bold text-base sm:text-lg transition-all duration-300 flex items-center justify-center gap-2"
              style={{
                backgroundImage: "linear-gradient(to right, #FF0040, #FF4D00)",
              }}
              onMouseOver={(e) => (e.currentTarget.style.boxShadow = "0 0 30px rgba(255, 0, 64, 0.5)")}
              onMouseOut={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
              Join the Waitlist
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="https://discord.gg/HMd9ZkYHB3"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg transition-all duration-300 text-center"
              style={{ border: "2px solid #FF0040", color: "#FF0040" }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 0, 64, 0.1)")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              Join the Discord
            </a>
          </div>

          {/* Urgency */}
          <div className="space-y-2 sm:space-y-3 pt-2 sm:pt-4 px-2 sm:px-0 pb-16 sm:pb-20">
            <p
              className="text-sm sm:text-base md:text-xl font-semibold flex items-center justify-center gap-2"
              style={{ color: "#FFB800" }}
            >
              <span className="animate-pulse">🔥</span>
              <span className="text-center">First 100 OG members get 10% off their first build!</span>
            </p>
            <p className="text-xs sm:text-sm text-gray-500" dir="rtl">
              بناء الكمبيوتر أصبح سهلاً
            </p>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-4 sm:bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-scroll" />
        </div>
      </div>
    </section>
  )
}
