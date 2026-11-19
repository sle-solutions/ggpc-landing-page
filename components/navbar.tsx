import Image from "next/image"
import { InstallButton } from "@/components/install-button"
import { MobileMenu } from "@/components/mobile-menu"

export function Wordmark() {
  return <Image className="site-wordmark" src="/brand/ggpc-wordmark.svg" width={125} height={30} alt="GG PC" unoptimized />
}

export function Navbar() {
  const links = [
    { href: "/builder", label: "PC builder" },
    { href: "/#quest", label: "Build quest" },
    { href: "/guides", label: "Field guide" },
    { href: "/#faq", label: "FAQ" },
  ].map(link => <a key={link.href} href={link.href}>{link.label}</a>)

  return (
    <header className="hud">
      <div className="hud-inner page-width">
        <a className="hud-home" href="/" aria-label="GG PC home"><Wordmark /></a>
        <nav aria-label="Main navigation" className="hud-nav">{links}</nav>
        <InstallButton className="hud-cta" />
        <MobileMenu>{links}<InstallButton /></MobileMenu>
      </div>
    </header>
  )
}
