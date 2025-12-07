"use client"

import { MessageCircle, Users } from "lucide-react"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function DiscordCTA() {
  const { data, isLoading } = useSWR("/api/discord-members", fetcher, {
    refreshInterval: 300000, // Refresh every 5 minutes
    fallbackData: { memberCount: 0, onlineCount: 0 },
  })

  return (
    <section className="py-20 md:py-32 px-4" style={{ backgroundColor: "#0D0D0D" }}>
      <div className="max-w-4xl mx-auto">
        <div
          className="relative rounded-2xl p-8 md:p-12 overflow-hidden"
          style={{
            backgroundImage: "linear-gradient(to bottom right, rgba(88, 101, 242, 0.2), #1A0A0A)",
            border: "1px solid rgba(88, 101, 242, 0.3)",
          }}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-10 left-10 w-32 h-32 border border-white rounded-full" />
            <div className="absolute bottom-10 right-10 w-24 h-24 border border-white rounded-full" />
            <div className="absolute top-1/2 left-1/4 w-16 h-16 border border-white rounded-full" />
          </div>

          <div className="relative text-center">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
              style={{ backgroundColor: "#5865F2" }}
            >
              <MessageCircle className="w-8 h-8 text-white" />
            </div>

            <h2 className="font-pixel text-2xl sm:text-3xl md:text-4xl mb-4 text-white">Join the GG PC Squad</h2>

            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
              Get build advice, share your setup, talk gaming and be first to hear updates. Our Discord is where the
              community lives.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://discord.gg/HMd9ZkYHB3"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-white rounded-lg font-bold text-lg transition-colors"
                style={{ backgroundColor: "#5865F2" }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#4752C4")}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#5865F2")}
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                Join Discord →
              </a>
            </div>

            <div className="flex items-center justify-center gap-2 mt-6 text-gray-500">
              <Users className="w-4 h-4" />
              <span>
                {isLoading
                  ? "Loading..."
                  : data?.memberCount > 0
                    ? `${data.memberCount.toLocaleString()} builders already inside`
                    : "Join our growing community"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
