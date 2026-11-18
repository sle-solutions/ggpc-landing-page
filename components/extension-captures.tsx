import Image from "next/image"
import { Glyph } from "@/components/pixel"

export function ExtensionCaptures() {
  return (
    <section id="extension" className="extension-captures" aria-labelledby="extension-heading">
      <div className="page-width">
        <div className="section-head">
          <h2 id="extension-heading">Your next build, in view.</h2>
          <p>Compare supported UAE store prices and keep your parts list beside the page. Sign in to use the Chrome extension.</p>
        </div>
        <div className="capture-window frame">
          <div className="capture-grid">
            <figure>
              <Image src="/images/extension/compare-025.jpg" width={1280} height={800} unoptimized alt="GG PC comparison of a Sapphire RX 9070 XT across UAE stores, with offers and unavailable results." />
              <figcaption>
                <h3>Compare the same part.</h3>
                <p>Check offers side by side, including stores where no price was returned.</p>
                <a className="text-link" href="/images/extension/compare-025.jpg" target="_blank" rel="noopener noreferrer">View comparison full size<span className="sr-only"> (opens in a new tab)</span><Glyph name="arrowUpRight" size={16} /></a>
              </figcaption>
            </figure>
            <figure>
              <Image src="/images/extension/build-025.jpg" width={1280} height={800} unoptimized alt="GG PC build list with CPU, motherboard, RAM and GPU selected and four empty slots." />
              <figcaption>
                <h3>Keep building your list.</h3>
                <p>Four of eight slots are filled here. Power use is an estimate; missing parts still need choosing.</p>
                <a className="text-link" href="/images/extension/build-025.jpg" target="_blank" rel="noopener noreferrer">View build full size<span className="sr-only"> (opens in a new tab)</span><Glyph name="arrowUpRight" size={16} /></a>
              </figcaption>
            </figure>
          </div>
          <p className="capture-note">GG PC 0.2.5, captured November 16, 2026. Retailer prices and stock can change. Confirm exact specifications and physical fit before buying.</p>
        </div>
      </div>
    </section>
  )
}
