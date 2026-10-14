import Image from "next/image"
import { Check, ChevronDown } from "lucide-react"

const prices = [
  { store: "Microless", logo: "microless", domain: "microless.com", image: "microless-mark.png", size: 192, price: "2,849" },
  { store: "Gear-up", logo: "gear-up", domain: "gear-up.me", image: "gear-up.jpg", size: 801, price: "2,999" },
  { store: "PC Dubai", logo: "pc-dubai", domain: "pcdubai.com", image: "pc-dubai.jpg", size: 800, price: "3,150" },
]

export function ProductPreview() {
  return (
    <section id="the-tool" className="comparison-section page-width" aria-labelledby="comparison-heading">
      <h2 id="comparison-heading">The same part. A clearer choice.</h2>
      <p className="comparison-context">We are building a place to compare local prices and check your parts list before you buy.</p>
      <div className="comparison-specimen">
        <div className="specimen-product">
          <Image src="/images/gpu-preview.webp" alt="Illustration of a triple-fan graphics card" width={768} height={512} sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1100px) 44vw, 560px" />
          <div className="specimen-description">
            <p className="part-category">Graphics card</p>
            <h3>NVIDIA RTX 4070 Ti SUPER</h3>
            <p className="part-specs">16GB GDDR6X <span aria-hidden="true">·</span> Example component</p>
            <details className="compatibility-detail">
              <summary><Check size={19} aria-hidden="true" /> Fits this example build <ChevronDown size={14} aria-hidden="true" /></summary>
              <p>The preview shows how GG PC will flag compatibility as you choose parts. These are sample results, not a compatibility check for your PC.</p>
            </details>
          </div>
        </div>
        <div className="specimen-prices">
          <h3 className="price-preview-title">Retailer price preview</h3>
          <p className="price-preview-note">Illustrative prices, not live offers.</p>
          <table><caption className="sr-only">Illustrative retailer prices in AED</caption>
            <thead className="sr-only"><tr><th scope="col">Retailer</th><th scope="col">Price</th></tr></thead>
            <tbody>{prices.map(({ store, logo, domain, image, size, price }) => (
              <tr key={store}>
                <th scope="row">
                  <span className="retailer-identity">
                    <span className={`retailer-logo retailer-logo-${logo}`} aria-hidden="true">
                      <span className="retailer-mark"><Image src={`/retailers/${image}`} alt="" width={size} height={size} loading="eager" unoptimized /></span>
                    </span>
                    <span className="retailer-copy"><span className="retailer-name">{store}</span><span className="retailer-domain" aria-hidden="true">{domain}</span></span>
                  </span>
                </th>
                <td><span>AED</span> {price}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
