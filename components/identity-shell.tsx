import type { ReactNode } from "react"
import { Wordmark } from "@/components/navbar"
export function IdentityShell({
  children,
  dashboard = false,
}: {
  children: ReactNode
  dashboard?: boolean
}) {
  return (
    <>
      <header className="identity-header">
        <div className="page-width identity-header-inner">
          <a href="/" className="hud-home" aria-label="GG PC home">
            <Wordmark />
          </a>
          <span>UAE only. More countries coming soon.</span>
        </div>
      </header>
      <main
        id="main-content"
        className={
          dashboard ? "usage-main page-width" : "identity-main page-width"
        }
      >
        {children}
      </main>
      <footer className="identity-footer page-width">
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
        <a href="https://discord.gg/HMd9ZkYHB3" rel="noreferrer">
          Support
        </a>
      </footer>
    </>
  )
}
