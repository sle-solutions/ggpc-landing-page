import { DocPage } from "@/components/doc-page"

export default function NotFound() {
  return (
    <DocPage title="404: Level not found" updated="16 October 2026">
      <p>This page wandered off the map. Head back to the loadout and join the waitlist from there.</p>
      <p><a className="btn btn-primary" href="/"><span>Back to GG PC</span></a></p>
    </DocPage>
  )
}
