import { RetailerMark } from "@/components/retailer-brand"
import { RETAILER_IDS, RETAILER_NAMES } from "@/lib/order/types"

export function ProductPreview() {
  return (
    <section id="vendors" className="store-strip" aria-labelledby="vendors-heading">
      <div className="page-width">
        <h2 id="vendors-heading">Stores you can compare</h2>
        <ul data-arrival>
          {RETAILER_IDS.map((id) => (
            <li key={id}><RetailerMark retailer={id} />{RETAILER_NAMES[id]}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
