import { Search, Bell, ShoppingCart, TrendingDown, Check } from "lucide-react"

export function ProductPreview() {
  return (
    <section className="py-20 md:py-32 px-4 overflow-hidden" style={{ backgroundColor: "#1A0A0A" }}>
      <div className="max-w-6xl mx-auto">
        <h2 className="font-pixel text-xl sm:text-2xl md:text-3xl text-center mb-4" style={{ color: "#FFB800" }}>
          SNEAK PEEK
        </h2>
        <p className="text-center text-2xl md:text-3xl font-bold text-white mb-12 md:mb-16">
          Your new build command center.
        </p>

        {/* Mockup Container */}
        <div className="relative">
          {/* Glow Effect */}
          <div
            className="absolute inset-0 blur-3xl"
            style={{
              backgroundImage: "linear-gradient(to right, rgba(255, 0, 64, 0.2), transparent, rgba(255, 77, 0, 0.2))",
            }}
          />

          {/* Mockup */}
          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl"
            style={{ backgroundColor: "#0D0D0D", border: "1px solid rgba(255, 255, 255, 0.1)" }}
          >
            {/* Coming Soon Overlay */}
            <div
              className="absolute inset-0 backdrop-blur-[2px] z-20 flex items-center justify-center"
              style={{ backgroundColor: "rgba(13, 13, 13, 0.6)" }}
            >
              <div className="text-center">
                <p
                  className="font-pixel text-2xl md:text-4xl bg-clip-text text-transparent mb-4"
                  style={{ backgroundImage: "linear-gradient(to right, #FF0040, #FF4D00)" }}
                >
                  COMING SOON
                </p>
                <p className="text-gray-400">Join the waitlist for early access</p>
              </div>
            </div>

            {/* Top Bar */}
            <div
              className="p-4 flex items-center justify-between"
              style={{ backgroundColor: "#1A0A0A", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}
            >
              <div className="flex items-center gap-4 flex-1">
                <div
                  className="flex items-center gap-2 rounded-lg px-4 py-2 flex-1 max-w-md"
                  style={{ backgroundColor: "#0D0D0D" }}
                >
                  <Search className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-500 text-sm">Search components...</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="p-2 hover:bg-white/5 rounded-lg">
                  <Bell className="w-5 h-5 text-gray-400" />
                </button>
                <button
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: "#FF0040" }}
                >
                  <ShoppingCart className="w-4 h-4" />
                  My Build (3)
                </button>
              </div>
            </div>

            <div className="flex">
              {/* Sidebar */}
              <div
                className="w-48 p-4 hidden md:block"
                style={{ backgroundColor: "rgba(26, 10, 10, 0.5)", borderRight: "1px solid rgba(255, 255, 255, 0.05)" }}
              >
                <p className="text-xs text-gray-500 mb-4 uppercase tracking-wider">Components</p>
                {["CPU", "GPU", "RAM", "Storage", "Motherboard", "PSU", "Case", "Cooling"].map((item, i) => (
                  <div
                    key={i}
                    className="px-3 py-2 rounded-lg text-sm mb-1 cursor-pointer transition-colors"
                    style={{
                      backgroundColor: i === 1 ? "rgba(255, 0, 64, 0.2)" : "transparent",
                      color: i === 1 ? "#FF0040" : "#9CA3AF",
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>

              {/* Main Content */}
              <div className="flex-1 p-6">
                {/* Product Card */}
                <div
                  className="rounded-xl p-6"
                  style={{ backgroundColor: "#1A0A0A", border: "1px solid rgba(255, 255, 255, 0.1)" }}
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Product Image */}
                    <div
                      className="w-full md:w-48 h-48 rounded-lg flex items-center justify-center"
                      style={{ backgroundImage: "linear-gradient(to bottom right, #2A2A2A, #1A1A1A)" }}
                    >
                      <div className="text-center">
                        <div
                          className="w-24 h-16 rounded-lg mb-2"
                          style={{
                            backgroundImage: "linear-gradient(to right, rgba(255, 0, 64, 0.3), rgba(255, 77, 0, 0.3))",
                          }}
                        />
                        <p className="text-xs text-gray-500">RTX 4070 Ti</p>
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-1">NVIDIA RTX 4070 Ti SUPER</h3>
                          <p className="text-sm text-gray-500">16GB GDDR6X • 285W TDP • DLSS 3</p>
                        </div>
                        <div className="flex items-center gap-1 text-green-500 text-sm">
                          <Check className="w-4 h-4" />
                          Compatible
                        </div>
                      </div>

                      {/* Price Comparison Table */}
                      <div className="space-y-2 mb-4">
                        <div
                          className="flex items-center justify-between p-3 rounded-lg"
                          style={{
                            backgroundColor: "rgba(255, 0, 64, 0.1)",
                            border: "1px solid rgba(255, 0, 64, 0.3)",
                          }}
                        >
                          <span className="text-white font-medium">Microless</span>
                          <div className="flex items-center gap-2">
                            <span
                              className="text-xs px-2 py-0.5 rounded text-white"
                              style={{ backgroundColor: "#FF0040" }}
                            >
                              BEST PRICE
                            </span>
                            <span className="font-bold" style={{ color: "#FF0040" }}>
                              AED 2,849
                            </span>
                          </div>
                        </div>
                        <div
                          className="flex items-center justify-between p-3 rounded-lg"
                          style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                        >
                          <span className="text-gray-400">Gear-up</span>
                          <span className="text-gray-400">AED 2,999</span>
                        </div>
                        <div
                          className="flex items-center justify-between p-3 rounded-lg"
                          style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
                        >
                          <span className="text-gray-400">PC Dubai</span>
                          <span className="text-gray-400">AED 3,150</span>
                        </div>
                      </div>

                      <button
                        className="w-full py-3 rounded-lg font-bold text-white hover:opacity-90 transition-opacity"
                        style={{ backgroundImage: "linear-gradient(to right, #FF0040, #FF4D00)" }}
                      >
                        Add to Build
                      </button>
                    </div>
                  </div>

                  {/* Price History */}
                  <div className="mt-6 pt-6" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-gray-400">Price History (30 days)</p>
                      <div className="flex items-center gap-1 text-green-500 text-sm">
                        <TrendingDown className="w-4 h-4" />
                        -8% from peak
                      </div>
                    </div>
                    {/* Simple Chart */}
                    <div className="h-20 flex items-end gap-1">
                      {[65, 70, 75, 72, 68, 65, 60, 58, 55, 52, 50, 48].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t opacity-60"
                          style={{
                            height: `${h}%`,
                            backgroundImage: "linear-gradient(to top, #FF0040, #FF4D00)",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Callouts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8 max-w-4xl mx-auto justify-items-center">
            {[
              "Compare prices across 10+ UAE stores",
              "Real-time price tracking & alerts",
              "Instant compatibility warnings",
              "One-click add to build",
            ].map((feature, i) => (
              <div key={i} className="w-full max-w-xs flex items-start md:items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 mt-1 md:mt-0"
                  style={{ backgroundColor: "#00FF66" }}
                />
                <div className="flex-1 text-left md:text-center text-sm text-gray-400 leading-tight">
                  {feature}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
