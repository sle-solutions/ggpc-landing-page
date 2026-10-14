import Image from "next/image"
import { ArrowUpRight, Gamepad2 } from "lucide-react"

export function Founders() {
  return (
    <section id="about-ali" className="founder-section" aria-labelledby="founder-heading">
      <div className="page-width founder-layout">
        <div className="founder-heading"><h2 id="founder-heading">Built by <br /><span>gamers.</span></h2><p>For gamers.</p></div>
        <div className="founder-byline">
          <Image className="founder-photo" src="/images/ali-lari.jpg" alt="Ali Lari outdoors, wearing glasses and a green jumper" width={360} height={640} sizes="(max-width: 760px) calc(100vw - 40px), 360px" />
          <div className="founder-caption"><h3 className="founder-name">Ali Lari</h3><p>Founder</p></div>
          <span className="founder-games"><Gamepad2 size={18} aria-hidden="true" /> Playing: <strong>Cyberpunk 2077</strong></span>
        </div>
        <div className="founder-story">
          <p>I've been gaming since I was 5, Cars on PS2 and GTA San Andreas was my intro to a world I had never known existed. Now I play Cyberpunk, CS2 and, recently, EU4 whenever I can.</p>
          <p>Trying to build a new rig, but the UAE market is a complete mess, so I decided to solve that problem for the community to make buying a gaming PC feel as easy as ordering from Talabat.</p>
          <div className="community-invite"><p>Planning a build already? Ask for advice and follow our progress on Discord.</p><a href="https://discord.gg/HMd9ZkYHB3" target="_blank" rel="noopener noreferrer">Join the Discord <ArrowUpRight size={17} aria-hidden="true" /></a></div>
        </div>
      </div>
    </section>
  )
}
