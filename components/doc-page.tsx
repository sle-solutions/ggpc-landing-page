import type { ReactNode } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export function DocPage({ title, updated, updatedLabel = "Last updated", byline, children }: { title: string; updated: string; updatedLabel?: string; byline?: ReactNode; children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="main-content" className="doc">
        <article className="page-width doc-body">
          <h1>{title}</h1>
          <p className="doc-updated">{`${updatedLabel} ${updated}`}</p>
          {byline ? <p className="doc-updated">{byline}</p> : null}
          {children}
        </article>
      </main>
      <Footer />
    </>
  )
}
