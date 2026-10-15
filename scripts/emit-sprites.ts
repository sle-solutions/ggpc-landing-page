// Writes every pixel sprite in lib/pixel-art.ts to public/sprites/<name>.svg so pages reference cached files instead of inlining path data.
import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { sprite, spriteNames } from "../lib/pixel-art"

const out = join(process.cwd(), "public/sprites")
mkdirSync(out, { recursive: true })
for (const name of spriteNames) {
  const art = sprite(name)
  const body = art.paths.map(path => `<path fill="${path.c}" d="${path.d}"/>`).join("")
  writeFileSync(join(out, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${art.w} ${art.h}" width="${art.w}" height="${art.h}" shape-rendering="crispEdges">${body}</svg>\n`)
}
console.log(`emitted ${spriteNames.length} sprites`)
