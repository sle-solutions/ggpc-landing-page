const steps = [
  { title: "Start with your budget", body: "Tell us what you want to spend and what you want to play. Get build recommendations to help you decide where your money should go." },
  { title: "Choose parts that fit together", body: "Check compatibility as you add parts. Catch a mismatch while it is still a choice, rather than a purchase you regret." },
  { title: "Find where to buy", body: "Compare UAE retailer prices in AED. Track price changes and get alerts while you plan your build." },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="guidance-section page-width" aria-labelledby="guidance-heading">
      <h2 id="guidance-heading">A build plan you can actually follow.</h2>
      <ol className="guidance-steps">{steps.map(step => <li key={step.title}><h3>{step.title}</h3><p>{step.body}</p></li>)}</ol>
    </section>
  )
}
