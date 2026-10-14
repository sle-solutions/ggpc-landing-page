import Image from "next/image"
import { ArrowUpRight } from "lucide-react"

export function Wordmark() {
  return <span className="wordmark"><span className="brand-mark"><Image src="/brand/gg-mark-dark.png" width={800} height={800} loading="eager" alt="" aria-hidden="true" /></span><span className="brand-name">PC</span></span>
}
export function Navbar() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <a href="#" aria-label="GG PC home"><Wordmark /></a>
        <nav aria-label="Main navigation" className="primary-nav">
          <a href="#the-tool">The tool</a><a href="#build-quest">Build quest</a><a href="#about-ali">Our story</a>
        </nav>
        <a className="header-cta" href="#signup">Join the waitlist <ArrowUpRight size={16} aria-hidden="true" /></a>
      </div>
    </header>
  )
}
