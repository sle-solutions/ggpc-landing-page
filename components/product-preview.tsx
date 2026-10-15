import Image from "next/image"
import { Glyph, Sprite } from "@/components/pixel"

type Vendor = { store: string; logo: string; domain: string; image: string; size: number; price: string; best?: boolean }
const microless = { store: "Microless", logo: "microless", domain: "microless.com", image: "microless-mark.webp", size: 64 }
const gearUp = { store: "Gear-up", logo: "gear-up", domain: "gear-up.me", image: "gear-up.webp", size: 268 }
const pcDubai = { store: "PC Dubai", logo: "pc-dubai", domain: "pcdubai.com", image: "pc-dubai.webp", size: 112 }

// Illustrative prices only; the hero's build total uses the best price for each part.
export const gpuVendors: Vendor[] = [{ ...microless, price: "2,849", best: true }, { ...gearUp, price: "2,999" }, { ...pcDubai, price: "3,150" }]
const cpuVendors: Vendor[] = [{ ...pcDubai, price: "1,149", best: true }, { ...microless, price: "1,189" }, { ...gearUp, price: "1,239" }]

export function RetailerMark({ logo, image, size }: { logo: string; image: string; size: number }) {
  return (
    <span className={`retailer-logo retailer-logo-${logo}`} aria-hidden="true">
      <span className="retailer-mark"><Image src={`/retailers/${image}`} alt="" width={size} height={size} unoptimized /></span>
    </span>
  )
}

export function ProductPreview() {
  return (
    <section id="vendors" className="vendors" aria-labelledby="vendors-heading">
      <div className="page-width">
        <div className="section-head">
          <h2 id="vendors-heading">Same item. Three vendors.</h2>
          <p>Pick any part and GG PC lines up what every UAE store charges for it, in AED. Here is the CPU from the build above, inspected.</p>
        </div>
        <div className="vendor-screen frame">
          <div className="vendor-item">
            <div className="item-stage">
              <div className="item-inner">
                <Sprite name="spotlight" className="stage-light" />
                <Sprite name="cpuLarge" scale={8} className="item-art" label="Pixel illustration of a desktop processor, top view" />
              </div>
            </div>
            <div className="item-card">
              <h3 className="item-name">Ryzen 7 7700X</h3>
              <p className="item-type">Processor <span aria-hidden="true">·</span> Orange price tier</p>
              <dl className="item-stats">
                <div><dt>Cores / threads</dt><dd>8 / 16</dd></div>
                <div><dt>Boost clock</dt><dd>Up to 5.4 GHz</dd></div>
                <div><dt>Socket</dt><dd>AM5</dd></div>
                <div><dt>Power</dt><dd>105W</dd></div>
              </dl>
              <details className="fit-check">
                <summary><Glyph name="check" size={16} /><span>Fits this example build</span><Glyph name="caret" size={16} className="fit-caret" /></summary>
                <p>The AM5 socket matches the B650 board in the build above. This is how GG PC will flag compatibility as you pick parts. It is a sample result, not a check of your PC.</p>
              </details>
            </div>
          </div>
          <div className="vendor-list">
            <p className="vendor-title" aria-hidden="true"><span>Vendor</span><span>AED</span></p>
            <table>
              <caption className="sr-only">Illustrative prices for this processor in AED</caption>
              <thead className="sr-only"><tr><th scope="col">Vendor</th><th scope="col">Price</th></tr></thead>
              <tbody>
                {cpuVendors.map(({ store, logo, domain, image, size, price, best }) => (
                  <tr key={store} className={best ? "is-best" : undefined}>
                    <th scope="row">
                      <span className="retailer-identity">
                        <RetailerMark logo={logo} image={image} size={size} />
                        <span className="retailer-copy"><span className="retailer-name">{store}</span><span className="retailer-domain" aria-hidden="true">{domain}</span></span>
                      </span>
                    </th>
                    <td>
                      {best && <span className="best-tag">Best deal</span>}
                      <span className="vendor-price"><span className="sr-only">AED </span>{price}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="vendor-readout"><Glyph name="coinBag" size={32} /><span>The best deal saves <strong>AED 90</strong> on the highest listing.</span></p>
            <p className="vendor-readout"><Glyph name="bell" size={32} /><span>Price watch: get an alert when it drops below <strong>AED 1,099</strong>.</span></p>
            <p className="vendor-note">Illustrative prices, not live offers. Stores shown as examples, not partners or sponsors.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
