import { Pause, Play } from "lucide-react"
import { StoreStripLogo } from "@/components/retailer-brand"
import { RETAILER_IDS } from "@/lib/order/types"

export function ProductPreview() {
  const stores = RETAILER_IDS.map(id => <li key={id}><StoreStripLogo retailer={id} /></li>)

  return (
    <section id="vendors" className="store-strip" aria-labelledby="vendors-heading">
      <div className="page-width">
        <h2 id="vendors-heading">Stores you can compare</h2>
        <div className="store-window">
          <div className="store-track">
            <ul>{stores}</ul>
            <ul aria-hidden="true">{stores}</ul>
          </div>
        </div>
        <label className="store-motion-control">
          <input type="checkbox" className="sr-only" aria-label="Pause store marquee" />
          <Pause aria-hidden="true" size={16} />
          <Play aria-hidden="true" size={16} />
        </label>
      </div>
    </section>
  )
}
