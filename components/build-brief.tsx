"use client"

import { createContext, useContext, useState } from "react"
import type { ReactNode } from "react"
import type { GlyphName } from "@/lib/pixel-art"

// `label` values are what the waitlist submission carries; keep them stable for whoever reads the signups.
export const goals = {
  competitive: { label: "Competitive games", role: "Duelist", icon: "crosshair", title: "Make every frame count.", advice: "Start with your games and your monitor's refresh rate. Balance the CPU and graphics card before spending on extras.", focus: ["CPU and GPU balance", "Your monitor's refresh rate", "Room for future upgrades"] },
  immersive: { label: "Big worlds, great visuals", role: "Explorer", icon: "mountains", title: "Build for the worlds you play in.", advice: "Start with the resolution you want to play at. Give the graphics card room in your budget, then check power and cooling.", focus: ["Graphics card and resolution", "Power supply and cooling", "Storage for your game library"] },
  mixed: { label: "Gaming and everyday work", role: "All-rounder", icon: "hybrid", title: "One PC. More than one job.", advice: "Think about the games and apps you use most. Balance the CPU, graphics card, and memory around both.", focus: ["Your games and work apps", "Memory and multitasking", "A balanced parts list"] },
} as const satisfies Record<string, { label: string; role: string; icon: GlyphName; title: string; advice: string; focus: readonly string[] }>

export const budgets = { entry: "Under AED 3,000", balanced: "AED 3,000 to 5,000", higher: "Over AED 5,000", unsure: "Still figuring it out" } as const
export const budgetIcons: Record<keyof typeof budgets, GlyphName> = { entry: "coin1", balanced: "coin2", higher: "coin3", unsure: "coinUnknown" }
export const assembly = { diy: "I want to build it", service: "I want it built for me" } as const
export const assemblyModes: Record<keyof typeof assembly, { mode: string; icon: GlyphName }> = { diy: { mode: "Solo", icon: "wrench" }, service: { mode: "Co-op", icon: "delivery" } }

export type BuildBrief = { goal: keyof typeof goals | null; budget: keyof typeof budgets | null; path: keyof typeof assembly | null }
const empty: BuildBrief = { goal: null, budget: null, path: null }
const BriefContext = createContext<{ brief: BuildBrief; choose: <K extends keyof BuildBrief>(key: K, value: BuildBrief[K]) => void; reset: () => void }>({ brief: empty, choose: () => {}, reset: () => {} })

export function BuildBriefProvider({ children }: { children: ReactNode }) {
  const [brief, setBrief] = useState<BuildBrief>(empty)
  function choose<K extends keyof BuildBrief>(key: K, value: BuildBrief[K]) { setBrief(current => ({ ...current, [key]: value })) }
  return <BriefContext.Provider value={{ brief, choose, reset: () => setBrief(empty) }}>{children}</BriefContext.Provider>
}

export function useBuildBrief() { return useContext(BriefContext) }
