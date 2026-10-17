import type { ReactNode } from "react"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Glyph } from "@/components/pixel"

export const discordUrl = "https://discord.gg/HMd9ZkYHB3"

export type Crumb = { label: string; href?: string }
export type TocItem = { id: string; label: string; marker: string }

function Marker({ value }: { value: string }) {
  return <span className="toc-node" aria-hidden="true">{value === "check" ? <Glyph name="check" size={16} /> : value}</span>
}

export function GuideShell({ crumbs, title, meta, lede, toc, children }: { crumbs: Crumb[]; title: string; meta: ReactNode; lede?: ReactNode; toc?: TocItem[]; children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="main-content" className="guide">
        <div className="page-width">
          <nav aria-label="Breadcrumb" className="crumbs">
            <ol>
              {crumbs.map((crumb, i) => (
                <li key={crumb.label}>
                  {crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : <span aria-current="page">{crumb.label}</span>}
                  {i < crumbs.length - 1 ? <span className="crumb-sep" aria-hidden="true">/</span> : null}
                </li>
              ))}
            </ol>
          </nav>

          <header className="guide-head">
            <h1>{title}</h1>
            <p className="guide-meta">{meta}</p>
            {lede}
          </header>

          <div className={toc ? "guide-layout has-toc" : "guide-layout"}>
            {toc ? (
              <aside className="guide-toc frame">
                <nav aria-label="On this page">
                  <p className="guide-toc-title">On this page</p>
                  <ol>
                    {toc.map(item => (
                      <li key={item.id}>
                        <a href={`#${item.id}`}><Marker value={item.marker} /><span>{item.label}</span></a>
                      </li>
                    ))}
                  </ol>
                </nav>
              </aside>
            ) : null}
            <div className="guide-body">{children}</div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

export function GuideSection({ id, marker, title, children }: { id: string; marker: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="guide-section" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}><Marker value={marker} /><span>{title}</span></h2>
      {children}
    </section>
  )
}

export function GuideNext({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="guide-next frame" aria-labelledby="next-step-title">
      <h2 id="next-step-title">{title}</h2>
      {children}
      <div className="guide-next-actions">
        <Link className="btn btn-primary" href="/#signup">Join the waitlist<Glyph name="arrowRight" size={16} /></Link>
        <a className="btn btn-discord" href={discordUrl} target="_blank" rel="noopener noreferrer">Ask on Discord<Glyph name="arrowUpRight" size={16} /></a>
      </div>
    </section>
  )
}

export function BackToGuides() {
  return (
    <p className="guide-back"><Link className="text-link" href="/guides"><Glyph name="arrowLeft" size={16} />All UAE PC building guides</Link></p>
  )
}
