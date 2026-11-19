import { StoreStripLogo } from "@/components/retailer-brand"
import { RETAILER_IDS } from "@/lib/order/types"

export function ProductPreview() {
  return (
    <section id="vendors" className="store-strip" aria-labelledby="vendors-heading">
      <div className="page-width">
        <h2 id="vendors-heading">Stores you can compare</h2>
        <ul data-arrival>
          {RETAILER_IDS.map((id) => (
            <li key={id}><StoreStripLogo retailer={id} /></li>
          ))}
        </ul>
      </div>
    </section>
  )
}
