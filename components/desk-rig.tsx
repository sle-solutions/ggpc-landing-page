// A small desk PC with a face on its monitor. Its pose changes with the selected tool.
export function DeskRig({ mode, variant = "classic" }: { mode: number; variant?: "classic" | "scout" | "operator" }) {
  return (
    <svg className="desk-rig" viewBox="0 0 100 80" aria-hidden="true" shapeRendering="crispEdges">
      <g fill="#160c10">
        <path d="M42 18V8h3v10h-3zm-3-11h9v6h-9zM12 24h5v-5h5v-3h51v3h7v5h5v37h-5v5H18v-4h-6z" />
        <path d="M6 43h9v5H9v11H4V46h2zM24 64h8v8h-3v3H17v-5h7zm38 0h8v6h8v5H63v-3h-1z" />
        <path className="rig-hand" d="M83 37h6v6h5v-8h5v13H87v-5h-4z" />
      </g>
      <path fill="#a69a9b" d="M17 25h5v-5h48v3H23v4h-6z"/>
      <path fill="#e6d9ce" d="M17 27h5v-4h48v3h4v30h-4v5H21v-4h-4z"/>
      <path fill="#a49a92" d="M21 57h49v4H21zm53-31h5v31h-5z"/>
      <path fill="#4e3742" d="M79 28h3v28h-3zM30 63h32v2H30z"/>
      <path fill="#210f1a" d="M22 28h46v2h3v18h-3v3H22v-3h-2V31h2z"/>
      {variant === "scout" && <g fill="#64d8ce">
        <path d="M18 28h56v4H18zm0 4h4v14h-4zm52 0h4v14h-4zM73 27v-9h4v-8h4v12h-4v5z" />
      </g>}
      {variant === "operator" && <g fill="#ffb84d">
        <path d="M12 37V23h5v-6h7v-4h43v4h8v5h5v16h-4V25h-5v-5h-7v-3H26v3h-6v5h-4v12zM9 35h10v16H9zm65 0h10v16H74z" />
        <path d="M76 50h4v6H64v-4h12z" />
      </g>}
      <g className="rig-gaze" fill="#ff7463">
        {mode === 0 && <path d="M29 34h9v9h-9zm23 0h9v9h-9z"/>}
        {mode === 1 && <path d="M28 38h3v-3h6v3h3v3h-4v-3h-4v3h-4zm22 0h3v-3h6v3h3v3h-4v-3h-4v3h-4z"/>}
        {mode === 2 && <path d="M28 36h12v4H28zm24-2h8v9h-8z"/>}
      </g>
      <path fill="#9c6a70" d="M24 54h22v2H24z"/><path fill="#d10a32" d="M62 53h5v3h-5z"/>
      <path fill="#ffb800" d="M41 7h5v4h-5z"/>
    </svg>
  )
}
