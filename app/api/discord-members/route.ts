import { NextResponse } from "next/server"

export const revalidate = 300

const cache = { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" }

export async function GET() {
  try {
    // Invite data with approximate member and online counts from the Discord API
    const response = await fetch("https://discord.com/api/v9/invites/HMd9ZkYHB3?with_counts=true", { next: { revalidate: 300 } })
    if (!response.ok) throw new Error("Failed to fetch Discord data")
    const data = await response.json()
    return NextResponse.json({ memberCount: data.approximate_member_count || 0, onlineCount: data.approximate_presence_count || 0 }, { headers: cache })
  } catch (error) {
    console.error("Discord API error:", error)
    return NextResponse.json({ memberCount: 0, onlineCount: 0 }, { status: 500 })
  }
}
