import type { ReactNode } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"

export function DocPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main id="main-content" className="doc">
        <article className="page-width doc-body">
          <h1>{title}</h1>
          <p className="doc-updated">Last updated {updated}</p>
          {children}
        </article>
      </main>
      <Footer />
    </>
  )
}
