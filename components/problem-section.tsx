import { AlertTriangle, DollarSign, Handshake, Puzzle } from "lucide-react"

const problems = [
  { icon: DollarSign, title: "Everything is 2x the price", description: "UAE stores charge insane markups. No easy way to compare." },
  { icon: Puzzle, title: "Will these parts even work together?", description: "Compatibility is a nightmare. One wrong click = expensive paperweight." },
  { icon: Handshake, title: "I don't want to haggle at Computer Plaza", description: "You're not a used car salesman. You just want fair prices." },
  { icon: AlertTriangle, title: "What if I break something?", description: "That IO shield haunts your dreams. One wrong move and it's over." },
]

export function ProblemSection() {
  return (
    <section id="building-in-uae" className="problem-section" aria-labelledby="problem-heading">
      <div className="page-width">
        <div className="problem-heading"><h2 id="problem-heading">Building a PC in the UAE?</h2><p>Good luck.</p></div>
        <div className="problem-list">{problems.map(({ icon: Icon, title, description }) => <article key={title}><Icon size={26} aria-hidden="true" /><div><h3>{title}</h3><p>{description}</p></div></article>)}</div>
      </div>
    </section>
  )
}
