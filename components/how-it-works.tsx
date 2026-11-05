import { Sprite } from "@/components/pixel"

const levels: { title: string; body: string }[] = [
  { title: "Set your budget", body: "Start with what you play and what you want to spend. Explore web loadouts by budget, or choose your own parts in Chrome." },
  { title: "Lock in parts that fit", body: "Compatibility gets checked as you add each part, so you can catch common mismatches before buying. Confirm exact specifications with the manufacturer." },
  { title: "Compare before buying", body: "Compare UAE store prices in AED. Track price changes and get alerts while you plan your build." },
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
