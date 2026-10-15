import { Sprite } from "@/components/pixel"

const levels: { title: string; body: string }[] = [
  { title: "Set your budget", body: "Tell us what you want to spend and what you play. Get recommended builds that put your money where it counts." },
  { title: "Lock in parts that fit", body: "Compatibility gets checked as you add each part, so a mismatch stays a choice and never becomes a purchase you regret." },
  { title: "Buy at the best price", body: "Compare UAE store prices in AED. Track price changes and get alerts while you plan your build." },
]

export function HowItWorks() {
  return (
    <section id="levels" className="levels" aria-labelledby="levels-heading">
      <div className="page-width">
        <h2 id="levels-heading">Three levels to your first PC.</h2>
        <ol className="level-path">
          {levels.map((level, index) => (
            <li key={level.title} className={`level level-${index + 1}`}>
              <span className="level-marker" aria-hidden="true">
                <span className="level-node">{index + 1}</span>
                {index === 0 && <span className="level-tag">Start</span>}
                {index === levels.length - 1 && <span className="level-flag"><Sprite name="flag" scale={3} /><span className="level-tag">Goal</span></span>}
              </span>
              <div className="level-block">
                <h3><span className="sr-only">Level {index + 1}: </span>{level.title}</h3>
                <p>{level.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
