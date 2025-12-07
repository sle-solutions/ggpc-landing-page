"use client"

import { useState, useEffect } from "react"
import { Menu, X } from "lucide-react"

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToSignup = () => {
    document.getElementById("signup")?.scrollIntoView({ behavior: "smooth" })
    setIsMobileMenuOpen(false)
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-[#0D0D0D]/95 backdrop-blur-md border-b border-white/10" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 md:h-20">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="font-pixel text-lg sm:text-xl md:text-2xl bg-gradient-to-r from-[#FF0040] to-[#FF4D00] bg-clip-text text-transparent">
                GG PC
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="https://discord.gg/HMd9ZkYHB3"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 border border-[#FF0040] text-[#FF0040] rounded-lg font-semibold hover:bg-[#FF0040]/10 transition-all duration-300"
            >
              Join Discord
            </a>
            <button
              onClick={scrollToSignup}
              className="px-6 py-2 bg-gradient-to-r from-[#FF0040] to-[#FF4D00] text-white rounded-lg font-semibold hover:shadow-[0_0_20px_rgba(255,0,64,0.5)] transition-all duration-300"
            >
              Join Waitlist
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-1.5 sm:p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-3 sm:py-4 border-t border-white/10">
            <div className="flex flex-col gap-2 sm:gap-3">
              <a
                href="https://discord.gg/HMd9ZkYHB3"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 sm:py-3 border border-[#FF0040] text-[#FF0040] rounded-lg font-semibold text-center text-sm sm:text-base hover:bg-[#FF0040]/10 transition-all"
              >
                Join Discord
              </a>
              <button
                onClick={scrollToSignup}
                className="px-4 py-2.5 sm:py-3 bg-gradient-to-r from-[#FF0040] to-[#FF4D00] text-white rounded-lg font-semibold text-sm sm:text-base"
              >
                Join Waitlist
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
