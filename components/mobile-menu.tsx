"use client"

import { useRef, type ReactNode } from "react"

export function MobileMenu({ children }: { children: ReactNode }) {
  const menu = useRef<HTMLElement>(null)
  return (
    <div className="mobile-menu">
      <button type="button" popoverTarget="site-navigation" aria-label="Navigation menu">
        Menu <span aria-hidden="true" />
      </button>
      <nav id="site-navigation" aria-label="Mobile navigation" ref={menu} popover="auto"
        onClick={event => { if ((event.target as Element).closest("a")) menu.current?.hidePopover() }}>
        {children}
      </nav>
    </div>
  )
}
