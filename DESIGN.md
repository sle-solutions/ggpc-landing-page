---
name: GG PC
description: A Fire Red gaming poster with physical PC parts, a short build quest, and a clear waitlist offer.
colors:
  brand-primary: "#ff0040"
  brand-secondary: "#ff4d00"
  brand-accent: "#ffb800"
  ground: "#0d0d0d"
  dark: "#1a0a0a"
  ink: "#ffffff"
  secondary: "#c6b5bb"
  dark-secondary: "#cdb8c0"
  line: "#542632"
  field-line: "#743343"
  success: "#00ff66"
  error: "#ffb8c9"
typography:
  display: {fontFamily: "Press Start 2P, monospace", fontSize: "clamp(42px, 5.1vw, 74px)", fontWeight: 400, lineHeight: 1.32, letterSpacing: "-0.025em"}
  headline: {fontFamily: "Press Start 2P, monospace", fontSize: "clamp(23px, 2.5vw, 36px)", fontWeight: 400, lineHeight: 1.6, letterSpacing: "-0.02em"}
  title: {fontFamily: "Inter, sans-serif", fontSize: "24px", fontWeight: 700, lineHeight: 1.45}
  body: {fontFamily: "Inter, sans-serif", fontSize: "15px", fontWeight: 400, lineHeight: 1.75}
  label: {fontFamily: "Inter, sans-serif", fontSize: "13px", fontWeight: 600}
  action: {fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 700}
rounded:
  control: "4px"
spacing:
  tight: "16px"
  group: "32px"
  section: "112px"
components:
  button-primary:
    textColor: "{colors.ground}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "12px 24px"
    height: "52px"
  email-field:
    backgroundColor: "{colors.dark}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "52px"
  quest-option:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "16px 20px"
    height: "64px"
  quest-option-selected:
    backgroundColor: "{colors.brand-primary}"
    textColor: "{colors.ground}"
---

# Design System: GG PC

## Overview

Creative North Star: **Fire Red Build Poster**. This is the current GG PC identity expressed through a gaming-poster composition, not a new palette or logo. Source authority is the user's brand archive and original raster in `.impeccable/brand-reference/`. The previous pale mockup is superseded.

The opening pairs a stacked BUILD. COMPARE. GAME. pixel slogan with physical hardware, a clear first-PC proposition, immediate email form, and confirmed first-100 offer. A full Fire Red problem section changes pace. An oversized GPU and retailer rail demonstrate the comparison; compact ordered steps explain the route. The optional quest shows one question at a time. An editorial portrait spread carries the founder's original story. A dominant OG closing groups full benefits before signup in mobile DOM order. The bilingual footer ends the page.

User-selected problem statements, all five OG perks, founder story, and real portrait are pinned. Only Cyberpunk and San Andreas spelling fixes were made. No timer, signup count, launch date, invented testimonial, or em/en dashes.

## Colors

Original Fire Red, orange and amber drive composition and action. Black and dark-red form the ground, white is the main foreground, rose shades carry secondary text. The red problem section uses near-black text, with about 4.93:1 contrast. Green marks actual compatibility-preview fit, quest completion and signup success. Pink marks retry errors.

Buttons retain the brand gradient `linear-gradient(115deg, var(--brand-primary), var(--brand-secondary))`; text stays near-black. Hover is amber, active orange. No gradient text, glow effects, decorative glass, shadows or background grids. Text selection is amber with dark text. Caret and focus rings are amber.

## Typography

Self-hosted Press Start 2P (400) carries logo, slogan and major headlines; Inter (400 through 800) carries product titles, controls, body and prices. Both use `display: swap` and SIL OFL 1.1; licenses live in `public/fonts/`. Press Start 2P is a reserved name.

Hero lettering tops out at 74px; mobile 34px through 56px, 34px at 360px and below. Founder peak reaches 54px; OG closing reaches 64px. Minor process/FAQ headlines are deliberately quieter. Body measures cap at about 65ch; prices use tabular numerals. Arabic slogan has `lang=ar`, `dir=rtl`, and readable sans fallback.

## Layout

Content max width 1328px with 48px side margins; at 1100px margins become 32px, at 760px 20px. Use `--space-tight`, `--space-group`, `--space-section` for related groups and section intervals; the section token becomes 64px on phones.

Desktop hero contains the complete 2.2:1 workbench raster at right/bottom under the 96px header. Its type is 52% wide, proposition/form capped independently. Tablet artwork can extend internally, but the hero clips it to prevent horizontal overflow. On mobile the hardware sits behind the three slogan lines at 60% opacity, keeping the proposition and form below it.

Problem statements use a two-column open list on red, one column on mobile. Comparison pairs a large cutout GPU with a dark retailer table; below 760px the table follows the product. Preview context precedes prices. The three process steps form an ordered horizontal route and stack on phones.

Quest navigation precedes a 1.2fr/1fr setup-and-brief composition. Only one native fieldset is visible. Under 760px the brief follows the controls. Founder heading/story occupy the left column; the original 360px portrait spans both rows on the right. Mobile orders heading, portrait/byline, story. Photo is a 4:5 CSS crop, or 5:6 on phones; no original pixels changed.

OG heading spans the closing region. Full perks precede a separate black signup area; mobile retains that DOM order. Closing email and action always stack. Footer social links and slogans reflow into compact rows and then a vertical bilingual lockup. Major internal anchors have 32px scroll padding.

## Components and States

Original 800px GG raster: 90x42px crop with 192px source, -48px/-72px offsets, white pixel PC text 26px and 12px gap. At 360px and below: 75x35px crop, 160px source, -40px/-60px offsets, PC 22px, gap 10px. No replacement logo.

Retailer rows use optically sized original symbols in matching 44px white mounts (40px on phones), beside visible names and muted domains. Microless uses its official 192px PNG; Gear-up/PC Dubai symbols use CSS crops of unchanged original rasters. Provenance is in `public/retailers/provenance.json`. Prices and generic GPU are explicitly illustrative.

Quest: native labeled radios, three honest completion steps, Back, direct step navigation, reset and skip. Next enables only after the current choice. Changing step focuses its legend; initial mount never moves focus. Completed goal/budget/assembly choices attach to both waitlist forms. Reset clears choices; memory-only state resets on reload. No artificial XP, signup gate, sound or persistent profile.

Forms preserve Web3Forms endpoint and fields, required email validation/autocomplete, length cap 254, honeypot, 15s abort and per-form request lock. Loading disables controls and shows Joining.../spinner; success persists and acknowledges a submitted brief; errors preserve email and invite retry. The closing action is Claim My Spot. First 100: 10% off first custom build, free consultation, early comparison access, guides/pricing reports and launch updates.

Native compatibility and FAQ disclosures retain summary keyboard behavior. All secondary links and disclosures have at least 44px hit height; footer X also has 44px minimum width. Social icons are authentic Simple Icons paths (CC0), monochrome currentColor, decorative inside named Discord/X/Instagram links. Destinations are unchanged. Footer slogan: BUILD. COMPARE. GAME. / ابنِ. قارن. العب.

## Motion

180ms action/input/choice transitions use `cubic-bezier(.16, 1, .3, 1)`. A 360ms clip reveal acknowledges real quest completion. Signup spinner is 1s linear. Reduced-motion uses immediate state changes and auto anchor scrolling. No entrance loops or staged delays.

## Do and Don't

Keep the original identity, selected copy, real photo, honest preview labels, natural controls and clear offer. Vary spatial weight and density by each section's role. Keep game-like behavior optional and useful. Avoid equal-weight brochure sections, fake achievements, hidden eligibility conditions, decorative effects and new claims.
