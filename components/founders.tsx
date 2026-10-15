import Image from "next/image"
import { Glyph } from "@/components/pixel"

export function Founders() {
  return (
    <section id="story" className="story" aria-labelledby="story-heading">
      <div className="page-width story-grid">
        <h2 id="story-heading" className="story-heading">Built by gamers.{" "}<span>For gamers.</span></h2>
        <figure className="npc">
          <div className="npc-frame frame">
            <Image className="npc-photo" src="/images/ali-lari.webp" alt="Ali Lari outdoors, wearing glasses and a green jumper" width={360} height={640} sizes="(max-width: 760px) calc(100vw - 40px), 340px" />
          </div>
          <figcaption className="npc-plate">
            <span className="npc-name">Ali Lari</span>
            <span className="npc-role">Founder</span>
            <span className="npc-status"><Glyph name="gamepad" size={16} /> Now playing: <strong>Cyberpunk 2077</strong></span>
          </figcaption>
        </figure>
        <div className="dialog frame">
          <p className="dialog-speaker" aria-hidden="true">Ali</p>
          <div className="dialog-text">
            <p>I&apos;ve been gaming since I was 5. Cars on the PS2 and GTA San Andreas opened up a world I never knew existed. These days it&apos;s Cyberpunk, CS2 and, lately, EU4 whenever I get the chance.</p>
            <p>When I tried to build a new rig, the UAE market was a complete mess. So I&apos;m fixing it for the community, until buying a gaming PC feels as easy as ordering from Talabat.</p>
          </div>
          <ul className="dialog-options" aria-label="Reply">
            <li><a href="https://discord.gg/HMd9ZkYHB3" target="_blank" rel="noopener noreferrer"><Glyph name="arrowRight" size={16} className="dialog-cursor" /><span>Planning a build? Ask for advice on Discord</span><Glyph name="arrowUpRight" size={16} /></a></li>
            <li><a href="#closing-signup"><Glyph name="arrowRight" size={16} className="dialog-cursor" /><span>Count me in. Join the waitlist</span></a></li>
          </ul>
        </div>
      </div>
    </section>
  )
}
