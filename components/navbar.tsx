import { BookOpen, CircleHelp, Gamepad2, Wrench } from "lucide-react"
import Image from "next/image"
import { InstallButton } from "@/components/install-button"
import { MobileMenu } from "@/components/mobile-menu"

export function Wordmark() {
  return <span className="wordmark"><span className="brand-mark"><Image src="/brand/gg-mark.webp" width={384} height={384} loading="eager" alt="" aria-hidden="true" /></span><span className="brand-name">PC</span></span>
}

export function Navbar() {
  const links = [
    { href: "/builder", label: "PC builder", icon: Wrench },
    { href: "/#quest", label: "Build quest", icon: Gamepad2 },
    { href: "/guides", label: "Field guide", icon: BookOpen },
    { href: "/#faq", label: "FAQ", icon: CircleHelp },
  ].map(link => <a key={link.href} href={link.href}><link.icon size={16} strokeWidth={1.7} aria-hidden="true" />{link.label}</a>)

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
