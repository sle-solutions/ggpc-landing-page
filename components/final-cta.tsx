import { DeskRig } from "@/components/desk-rig"
import { Glyph } from "@/components/pixel"
import { InstallButton } from "@/components/install-button"

export function FinalCTA() {
  return (
    <section id="get-started" className="bench-close" aria-labelledby="closing-title">
      <div className="page-width">
        <div><h2 id="closing-title">Take GG PC shopping.</h2><div className="closing-actions" data-arrival><InstallButton /><span className="closing-companion"><DeskRig mode={1} /></span></div></div>
        <div><h3>Want it built for you?</h3><p>Choose a build to see parts, fees and available checkout options.</p>
          <a href="/builder" className="text-link">Explore builds <Glyph name="arrowRight" /></a>
          <a href="/warranty" className="text-link">QA and warranty</a>
        </div>
      </div>
    </section>
  )
}
