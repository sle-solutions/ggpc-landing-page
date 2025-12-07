import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Fetch invite data with member counts from Discord API
    const response = await fetch("https://discord.com/api/v9/invites/HMd9ZkYHB3?with_counts=true", {
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      throw new Error("Failed to fetch Discord data")
    }

    const data = await response.json()

    return NextResponse.json({
      memberCount: data.approximate_member_count || 0,
      onlineCount: data.approximate_presence_count || 0,
    })
  } catch (error) {
    console.error("Discord API error:", error)
    // Return fallback values on error
    return NextResponse.json({ memberCount: 0, onlineCount: 0 }, { status: 500 })
  }
}
