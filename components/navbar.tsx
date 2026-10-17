import Image from "next/image"
import { Glyph } from "@/components/pixel"

export function Wordmark() {
  return <span className="wordmark"><span className="brand-mark"><Image src="/brand/gg-mark.webp" width={384} height={384} loading="eager" alt="" aria-hidden="true" /></span><span className="brand-name">PC</span></span>
}

export function Navbar() {
  return (
    <header className="hud">
      <div className="hud-inner page-width">
        <a className="hud-home" href="/" aria-label="GG PC home"><Wordmark /></a>
        <nav aria-label="Main navigation" className="hud-nav">
          <a href="/builder">Builder</a><a href="/#vendors">Price check</a><a href="/#quest">Build quest</a><a href="/#story">Our story</a><a href="/#faq">FAQ</a>
        </nav>
        <a className="btn btn-primary hud-cta" href="/#signup"><span className="cta-long">Join the waitlist</span><span className="cta-short">Join</span><Glyph name="arrowRight" size={16} /></a>
      </div>
    </header>
  )
}
