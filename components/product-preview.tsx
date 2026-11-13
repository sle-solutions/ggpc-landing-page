import { Glyph, Sprite } from "@/components/pixel"
import { RetailerMark } from "@/components/retailer-brand"
import type { RetailerId } from "@/lib/order/types"
const stores: { id: RetailerId; name: string }[] = [{ id: "amazon_ae", name: "Amazon.ae" }, { id: "noon", name: "noon" }, { id: "microless", name: "Microless" }, { id: "gear_up", name: "Gear-Up" }, { id: "gcc_gamers", name: "GCC Gamers" }]

export function ProductPreview() {
  return <section id="vendors" className="vendors" aria-labelledby="vendors-heading"><div className="page-width">
    <div className="section-head"><h2 id="vendors-heading">Same part. Compare your options.</h2><p>Check supported UAE stores in AED. Match the exact model and variant, then confirm the final price and stock at the store.</p></div>
    <div className="vendor-screen frame">
      <div className="vendor-item"><div className="item-stage"><div className="item-inner"><Sprite name="spotlight" className="stage-light" /><Sprite name="cpuLarge" scale={8} className="item-art" label="Pixel illustration of a desktop processor" /></div></div><div className="item-card"><h3 className="item-name">Compare the exact model.</h3><p>Similar names can hide different parts. Check the model, capacity, kit size and variant before choosing an offer.</p></div></div>
      <div className="vendor-list"><ul className="supported-stores">{stores.map(store => <li key={store.id}><RetailerMark retailer={store.id} /><span>{store.name}</span></li>)}</ul><p className="vendor-readout"><Glyph name="bell" size={32} /><span>Track a part in the extension and set your target price. Alerts depend on a successful price check.</span></p><p className="vendor-note">Live checks can be blocked by a store. Last-seen prices show their age and do not count as a live saving. Stores are not partners or sponsors.</p><a href="/builder" className="text-link">Browse live web loadouts<Glyph name="arrowRight" size={16} /></a></div>
    </div>
  </div></section>
}
