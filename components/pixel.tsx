import { glyph, sprite, type GlyphName, type SpriteName } from "@/lib/pixel-art"

export function Sprite({ name, scale = 4, className, label }: { name: SpriteName; scale?: number; className?: string; label?: string }) {
  const art = sprite(name)
  return (
    <svg
      className={`sprite${className ? ` ${className}` : ""}`}
      viewBox={`0 0 ${art.w} ${art.h}`}
      width={art.w * scale}
      height={art.h * scale}
      shapeRendering="crispEdges"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {art.paths.map(path => <path key={path.c} d={path.d} fill={path.c} />)}
    </svg>
  )
}

export function Glyph({ name, size = 16, className }: { name: GlyphName; size?: number; className?: string }) {
  const art = glyph(name)
  return (
    <svg className={`glyph${className ? ` ${className}` : ""}`} viewBox={`0 0 ${art.size} ${art.size}`} width={size} height={size} fill="currentColor" shapeRendering="crispEdges" aria-hidden="true" focusable="false">
      <path d={art.d} />
    </svg>
  )
}
