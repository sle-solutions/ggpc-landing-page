"use client"

import { Gamepad2, ExternalLink } from "lucide-react"

const founders = [
  {
    name: "Ali Lari",
    role: "Co-Founder",
    bio: "I've been gaming since I was 5, Crash Bandicoot on PS2 was my intro to a world I had never known existed. Now I play CS2 and, recently, EU4 whenever I can. Trying to build a new rig, but the UAE market is a complete mess, so I decided to solve that problem for the community to make buying a gaming PC feel as easy as ordering from Talabat.",
    initials: "AL",
    currentlyPlaying: "CS2",
    link: null,
    image: "https://yt3.ggpht.com/A21nKCDAD303w_gKyaVbJpQeEQbvn8epJlXGeu4lVZKD3QHW72FrPBwliC_lpbdk40HB2yVJ2g=s600-c-k-c0x00ffffff-no-rj-rp-mo",
  },
  {
    name: "Firas Elayan",
    role: "Co-Founder",
    bio: "Software engineer. McMaster grad. I build the backend that makes GG PC work. Price scraping, compatibility logic, all of it. I love astronomy, trivia and solving niche problems. Let's make this happen.",
    initials: "FE",
    currentlyPlaying: "Clair Obscur: Expedition 33",
    link: "https://firaselayan.me/",
    image: "https://media.licdn.com/dms/image/v2/D5603AQEnznAJNKDLsQ/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1730375522056?e=1766620800&v=beta&t=DlyJMWcYXzizZUHgPjzQIWgByHH_tuDZ3mbIzzPL4qA",
  },
]

export function Founders() {
  return (
    <section className="py-12 sm:py-16 md:py-32 px-3 sm:px-4" style={{ backgroundColor: "#1A0A0A" }}>
      <div className="max-w-5xl mx-auto">
        <h2 className="font-pixel text-xl sm:text-2xl md:text-4xl text-center mb-3 sm:mb-4">
          Built by{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(to right, #FF0040, #FF4D00)" }}
          >
            gamers.
          </span>
        </h2>
        <p className="text-center text-xl sm:text-2xl md:text-3xl font-bold text-white mb-8 sm:mb-12 md:mb-16">
          For gamers.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
          {founders.map((founder, index) => (
            <div
              key={index}
              className="rounded-xl p-4 sm:p-6 md:p-8 transition-all"
              style={{ backgroundColor: "#0D0D0D", border: "1px solid rgba(255, 255, 255, 0.1)" }}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = "rgba(255, 0, 64, 0.3)")}
              onMouseOut={(e) => (e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)")}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-base sm:text-xl font-bold text-white shrink-0 overflow-hidden"
                  style={{
                    backgroundImage: founder.image ? "none" : "linear-gradient(to bottom right, #FF0040, #FF4D00)",
                  }}
                >
                  {founder.image ? (
                    <img
                      src={founder.image || "/placeholder.svg"}
                      alt={founder.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    founder.initials
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {founder.link ? (
                      <a
                        href={founder.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg sm:text-xl font-bold text-white hover:text-[#FF0040] transition-colors flex items-center gap-1"
                      >
                        {founder.name}
                        <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
                      </a>
                    ) : (
                      <h3 className="text-lg sm:text-xl font-bold text-white">{founder.name}</h3>
                    )}
                  </div>
                  <p className="text-sm sm:text-base" style={{ color: "#FF0040" }}>
                    {founder.role}
                  </p>
                  {founder.currentlyPlaying && (
                    <div
                      className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm mt-2"
                      style={{ backgroundColor: "rgba(255, 184, 0, 0.1)", border: "1px solid rgba(255, 184, 0, 0.3)" }}
                    >
                      <Gamepad2 className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" style={{ color: "#FFB800" }} />
                      <span className="text-gray-400 whitespace-nowrap">Playing:</span>
                      <span className="font-semibold" style={{ color: "#FFB800" }}>
                        {founder.currentlyPlaying}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-sm sm:text-base text-gray-400 leading-relaxed">{founder.bio}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
