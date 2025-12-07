"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Quote } from "lucide-react"

const testimonials = [
  {
    quote:
      "Finally, someone's doing this for the UAE. I'm tired of overpaying or flying parts in from the US. Day one signup for me.",
    name: "Khalid M.",
    location: "Dubai",
    initials: "KM",
  },
  {
    quote:
      "I've been wanting to build a PC for two years but the process here is such a headache. If GG PC is what they say it is, I'm in.",
    name: "Omar R.",
    location: "Abu Dhabi",
    initials: "OR",
  },
  {
    quote:
      "The build service is what got me. I don't have time to learn all this stuff, I just want a sick rig that works. Take my money.",
    name: "Yara S.",
    location: "Sharjah",
    initials: "YS",
  },
]

export function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0)

  const next = () => setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  const prev = () => setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)

  return (
    <section className="py-20 md:py-32 px-4" style={{ backgroundColor: "#0D0D0D" }}>
      <div className="max-w-6xl mx-auto">
        <h2 className="font-pixel text-xl sm:text-2xl md:text-3xl text-center mb-12" style={{ color: "#FFB800" }}>
          THE COMMUNITY HAS SPOKEN
        </h2>

        {/* Desktop Grid */}
        <div className="hidden md:grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="rounded-xl p-6 transition-shadow flex flex-col justify-between h-full md:min-h-[260px]"
              style={{
                backgroundColor: "#1A0A0A",
                borderLeft: "4px solid #FF0040",
              }}
              onMouseOver={(e) => (e.currentTarget.style.boxShadow = "0 0 30px rgba(255, 0, 64, 0.1)")}
              onMouseOut={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
              <Quote className="w-8 h-8 mb-4" style={{ color: "rgba(255, 0, 64, 0.5)" }} />
              <p className="text-gray-300 leading-relaxed mb-6 flex-1">"{testimonial.quote}"</p>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ backgroundImage: "linear-gradient(to bottom right, #FF0040, #FF4D00)" }}
                >
                  {testimonial.initials}
                </div>
                <div>
                  <p className="font-semibold text-white">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Carousel */}
        <div className="md:hidden">
          <div className="rounded-xl p-6" style={{ backgroundColor: "#1A0A0A", borderLeft: "4px solid #FF0040" }}>
            <Quote className="w-8 h-8 mb-4" style={{ color: "rgba(255, 0, 64, 0.5)" }} />
            <p className="text-gray-300 leading-relaxed mb-6">"{testimonials[currentIndex].quote}"</p>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ backgroundImage: "linear-gradient(to bottom right, #FF0040, #FF4D00)" }}
              >
                {testimonials[currentIndex].initials}
              </div>
              <div>
                <p className="font-semibold text-white">{testimonials[currentIndex].name}</p>
                <p className="text-sm text-gray-500">{testimonials[currentIndex].location}</p>
              </div>
            </div>
          </div>

          {/* Carousel Controls */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={prev}
              className="p-2 rounded-lg transition-colors"
              style={{ border: "1px solid rgba(255, 255, 255, 0.2)" }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className="w-2 h-2 rounded-full transition-colors"
                  style={{ backgroundColor: index === currentIndex ? "#FF0040" : "rgba(255, 255, 255, 0.2)" }}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="p-2 rounded-lg transition-colors"
              style={{ border: "1px solid rgba(255, 255, 255, 0.2)" }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
