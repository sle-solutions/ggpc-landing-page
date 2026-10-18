import type { Metadata } from "next"
import Link from "next/link"
import { Glyph } from "@/components/pixel"
import { BackToGuides, GuideNext, GuideSection, GuideShell, type TocItem } from "@/components/guide-shell"

const site = "https://www.ggpc.app"
const url = `${site}/guides/pc-part-compatibility`
const headline = "PC part compatibility explained: how to check your build fits (2026)"

export const metadata: Metadata = {
  title: `${headline} | GG PC`,
  description: "A plain English guide to PC part compatibility: CPU socket, RAM type, GPU length, PSU connectors, cooler height, case size and M.2 slots, with the order to check them in.",
  alternates: { canonical: "/guides/pc-part-compatibility" },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Article",
      "@id": `${url}#article`,
      headline,
      description: "A plain English guide to checking that every part in a gaming PC build is compatible, from CPU socket to case size.",
      datePublished: "2026-10-17",
      dateModified: "2026-10-17",
      inLanguage: "en-AE",
      author: { "@type": "Person", name: "Ali Lari" },
      publisher: { "@id": `${site}/#organization` },
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: site },
        { "@type": "ListItem", position: 2, name: "Guides", item: `${site}/guides` },
        { "@type": "ListItem", position: 3, name: headline, item: url },
      ],
    },
  ],
}

const toc: TocItem[] = [
  { id: "socket", label: "CPU socket and motherboard", marker: "1" },
  { id: "chipset", label: "Chipset and BIOS updates", marker: "2" },
  { id: "ram", label: "RAM type", marker: "3" },
  { id: "gpu", label: "GPU length and case clearance", marker: "4" },
  { id: "psu", label: "PSU wattage and connectors", marker: "5" },
  { id: "cooler", label: "CPU cooler height and mounting", marker: "6" },
  { id: "form-factor", label: "Motherboard size and case", marker: "7" },
  { id: "storage", label: "M.2 slots and lane sharing", marker: "8" },
  { id: "order", label: "What to check, in order", marker: "9" },
  { id: "uae", label: "A note for UAE buyers", marker: "check" },
]

const sockets = [
  { socket: "AM5", cpus: "AMD Ryzen 7000 and 9000 series", memory: "DDR5 only" },
  { socket: "LGA1700", cpus: "Intel Core 12th, 13th and 14th gen", memory: "DDR4 or DDR5, depending on the board" },
  { socket: "LGA1851", cpus: "Intel Core Ultra 200S series", memory: "DDR5 only" },
]

const order = [
  "CPU socket matches the motherboard socket.",
  "The board's chipset supports your CPU, and you know whether it needs a BIOS update.",
  "RAM type (DDR4 or DDR5) is the one the motherboard takes.",
  "GPU length and slot width fit inside the case.",
  "PSU has enough wattage and the right connectors for the GPU.",
  "CPU cooler supports your socket and is shorter than the case allows.",
  "Motherboard size is supported by the case.",
  "Enough M.2 slots for your drives, and no lane sharing surprises.",
]

export default function PcPartCompatibility() {
  return (
    <GuideShell
      crumbs={[{ label: "Home", href: "/" }, { label: "Guides", href: "/guides" }, { label: headline }]}
      title={headline}
      meta={<>By Ali Lari, founder of GG PC <span aria-hidden="true">/</span> Updated <time dateTime="2026-10-17">17 October 2026</time></>}
      lede={
        <div className="guide-answer frame">
          <h2>Short answer</h2>
          <p>PC parts are compatible when they connect, fit and get enough power. In practice that means eight checks: the CPU socket matches the motherboard, the chipset and BIOS support the CPU, the RAM type is the one the board takes, the graphics card fits the case, the power supply has the wattage and connectors, the cooler fits, the motherboard size suits the case, and the board has the M.2 slots you need. Check them in that order and you will catch nearly every problem before you buy.</p>
        </div>
      }
      toc={toc}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <GuideSection id="socket" marker="1" title="CPU socket and motherboard">
        <p>The CPU socket is the physical connector on the motherboard, and a processor only fits a board with the same socket. This is the first check because it fixes your CPU and motherboard as a pair.</p>
        <table className="guide-table">
          <caption className="sr-only">Common CPU sockets and the processors they take</caption>
          <thead><tr><th scope="col">Socket</th><th scope="col">Processors</th><th scope="col">Memory</th></tr></thead>
          <tbody>
            {sockets.map(row => (
              <tr key={row.socket}><th scope="row">{row.socket}</th><td>{row.cpus}</td><td>{row.memory}</td></tr>
            ))}
          </tbody>
        </table>
        <p>Always confirm on the CPU maker's product page and the motherboard's spec page. Sockets are not interchangeable, so an AM5 processor will not sit in an LGA1700 board, and the reverse is also true.</p>
      </GuideSection>

      <GuideSection id="chipset" marker="2" title="Chipset and BIOS updates">
        <p>The chipset is the set of controllers on the motherboard that decides features such as how many USB ports and PCIe lanes you get. Two boards can share a socket and still differ in features, so read the spec page, not just the socket name.</p>
        <p>A CPU also has to be supported by the board's BIOS, which is the firmware stored on the board. If a board was made before your CPU came out, it may need a BIOS update before the CPU will start. Check the motherboard maker's CPU support list for your exact CPU and the BIOS version it needs. Some boards have a BIOS flashback feature that lets you update without a working CPU, and the spec page will say if yours does.</p>
      </GuideSection>

      <GuideSection id="ram" marker="3" title="RAM type">
        <p>DDR4 and DDR5 are different memory types, and they are not interchangeable. The notch in the stick sits in a different place, so the wrong type will not fit its slot. The motherboard decides which type you use, not the CPU alone, which matters most on LGA1700 where both kinds of board exist.</p>
        <ul className="guide-bullets">
          <li>Buy the type your board lists. A DDR5 board takes DDR5 only.</li>
          <li>Look for the board's QVL, the qualified vendor list. It names the memory kits the manufacturer has tested on that board.</li>
          <li>A kit that is not on the QVL often still works, but the QVL is the safest reference when you want a guarantee that a kit has been tested.</li>
          <li>Two matching sticks give you dual channel, which is the usual setup for gaming.</li>
        </ul>
      </GuideSection>

      <GuideSection id="gpu" marker="4" title="GPU length and case clearance">
        <p>A graphics card must physically fit in the case, and modern cards are large. Two measurements matter: length and thickness.</p>
        <ul className="guide-bullets">
          <li>Length: compare the card length with the maximum GPU length in the case specs. Leave a little spare room for cables and any front fans or radiators.</li>
          <li>Slot width: cards are described by how many expansion slots they cover, commonly two to three or more. A thick card blocks the slot beneath it, so check that you do not need that slot for something else.</li>
        </ul>
      </GuideSection>

      <GuideSection id="psu" marker="5" title="PSU wattage and connectors">
        <p>The power supply needs enough wattage for the whole system and the right cables for the graphics card. The graphics card is usually the biggest draw, so start with the card maker's recommended PSU wattage on its product page, and add headroom rather than running close to the limit.</p>
        <ul className="guide-bullets">
          <li>Wattage: a power supply rated comfortably above your system's needs runs cooler and leaves room for upgrades.</li>
          <li>PCIe 8-pin: many graphics cards take one or more 8-pin PCIe power cables. Count the cables your card needs and check that the PSU provides them.</li>
          <li>12VHPWR and 12V-2x6: some recent high end cards use this single small connector. 12V-2x6 is a revised version of 12VHPWR. Check what your card uses, whether your PSU has a matching cable, and push the plug in fully so it is seated all the way.</li>
          <li>Adapters: some cards ship with an adapter cable, but a PSU with the native cable is the tidier option. Check the card's box contents and the PSU's cable list.</li>
        </ul>
      </GuideSection>

      <GuideSection id="cooler" marker="6" title="CPU cooler height and mounting">
        <p>A CPU cooler has to mount on your socket and fit inside the case. Check both.</p>
        <ul className="guide-bullets">
          <li>Socket support: every cooler lists the sockets it supports. Confirm that yours, such as AM5 or LGA1700, is on the list, and that the mounting parts for it are in the box.</li>
          <li>Height: a tower air cooler must be shorter than the case's maximum cooler height, or the side panel will not close.</li>
          <li>RAM clearance: large coolers can sit over the memory slots. Check that the cooler leaves room for your RAM sticks, especially tall ones.</li>
          <li>Liquid coolers: a radiator must fit a supported spot in the case, so check the case's radiator support list.</li>
        </ul>
      </GuideSection>

      <GuideSection id="form-factor" marker="7" title="Motherboard size and case">
        <p>Motherboards come in standard sizes, and the case must support the one you pick. The common sizes are ATX (full size), Micro-ATX (smaller) and Mini-ITX (smallest).</p>
        <p>A larger case usually accepts smaller boards, so an ATX case commonly also takes Micro-ATX and Mini-ITX. A small case does not accept a larger board. Smaller boards usually have fewer expansion slots, fewer RAM slots and fewer M.2 slots, so choose the size that gives you the slots you need. The case's spec page lists the board sizes it supports.</p>
      </GuideSection>

      <GuideSection id="storage" marker="8" title="M.2 slots and lane sharing">
        <p>M.2 is the slot for the small SSD sticks that most gaming PCs use. Check how many M.2 slots the board has and what each one supports. Most modern drives are 2280 size, meaning 80 mm long, and the board's spec page lists the sizes each slot takes.</p>
        <p>Some boards share bandwidth between an M.2 slot and other connections, such as SATA ports or another slot. Using one can disable or slow the other. The motherboard manual lists these shared connections, so read it before you plan a build with several drives. Also note that an M.2 slot can carry NVMe or SATA drives, so check which the slot supports.</p>
      </GuideSection>

      <GuideSection id="order" marker="9" title="What to check, in order">
        <p>Run the checks in this order, because each one narrows the options for the next. Use the manufacturer spec pages as your source of truth.</p>
        <ol className="guide-order">
          {order.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <aside className="guide-note frame" aria-label="About GG PC">
          <span className="guide-tag">At launch</span>
          <p>GG PC is being built to run checks like these as you add each part, so a mismatch shows up before you buy. It has not launched yet, and the waitlist is open.</p>
        </aside>
      </GuideSection>

      <GuideSection id="uae" marker="check" title="A note for UAE buyers">
        <p>Check compatibility before you buy, not after. Return policies vary by retailer, so a part that turns out not to fit may be hard to send back. Read the specs on the retailer's listing and match them against the manufacturer's page, and look at the exact model number rather than the product name. For the wider picture of budget, parts and prices, see the <Link href="/guides/build-a-gaming-pc-uae">guide to building a gaming PC in the UAE</Link>.</p>
      </GuideSection>

      <GuideNext title="Next step">
        <p>GG PC is the tool being built to make these checks easier for UAE gamers. Join the <Link href="/#signup">GG PC waitlist</Link> for early access, or ask your build questions in the GG PC Discord.</p>
      </GuideNext>

      <BackToGuides />
    </GuideShell>
  )
}
