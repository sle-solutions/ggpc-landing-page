---
name: GG PC
description: An RPG loadout screen in Fire Red pixel panels, where a first PC is a character to gear up.
colors:
  fire-red: "#ff0040"
  fire-red-text: "#ff5c80"
  blaze-orange: "#ff4d00"
  blaze-orange-text: "#ff8a4d"
  loot-amber: "#ffb800"
  fit-green: "#00ff66"
  discord-blurple: "#5865f2"
  void-ground: "#0d0d0d"
  ember-ground: "#120a0b"
  panel-oxblood: "#170b0e"
  panel-oxblood-raised: "#1d0c11"
  inspect-fill: "#100809"
  slot-iron: "#211a1d"
  slot-bevel-light: "#3a3034"
  slot-bevel-dark: "#0b0b0b"
  line-wine: "#3d1d25"
  line-wine-bright: "#6a2c3b"
  ink-white: "#ffffff"
  rose-ash: "#c6b5bb"
  rose-ash-dim: "#a7959c"
  error-blush: "#ffb8c9"
typography:
  display:
    fontFamily: "Press Start 2P, monospace"
    fontSize: "clamp(32px, 4vw, 56px)"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "0"
  headline:
    fontFamily: "Press Start 2P, monospace"
    fontSize: "clamp(20px, 2.4vw, 32px)"
    fontWeight: 400
    lineHeight: 1.5
  title:
    fontFamily: "Press Start 2P, monospace"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Press Start 2P, monospace"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.6
  price:
    fontFamily: "Press Start 2P, monospace"
    fontSize: "16px"
    fontWeight: 400
    fontFeature: "tnum"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  lede:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(17px, 1.4vw, 20px)"
    fontWeight: 600
    lineHeight: 1.45
  stat:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.6
    fontFeature: "tnum"
  arabic:
    fontFamily: "Geeza Pro, Noto Sans Arabic, Segoe UI, Tahoma, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.4
rounded:
  none: "0px"
spacing:
  gutter-phone: "20px"
  gutter-tablet: "32px"
  gutter-desktop: "48px"
  section-phone: "64px"
  section-tablet: "96px"
  section-desktop: "120px"
  slot-phone: "72px"
  slot-tablet: "88px"
  slot-wide: "96px"
  page-max: "1328px"
components:
  button-primary:
    backgroundColor: "{colors.fire-red}"
    textColor: "{colors.void-ground}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "4px 22px 8px"
    height: "52px"
  button-primary-hover:
    backgroundColor: "{colors.loot-amber}"
    textColor: "{colors.void-ground}"
  button-ghost:
    backgroundColor: "{colors.panel-oxblood}"
    textColor: "{colors.ink-white}"
    rounded: "{rounded.none}"
    padding: "4px 22px 8px"
    height: "52px"
  button-discord:
    backgroundColor: "{colors.discord-blurple}"
    textColor: "{colors.ink-white}"
    rounded: "{rounded.none}"
    padding: "4px 22px 8px"
    height: "52px"
  input-email:
    backgroundColor: "{colors.panel-oxblood}"
    textColor: "{colors.ink-white}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "56px"
  slot-tile:
    backgroundColor: "{colors.slot-iron}"
    rounded: "{rounded.none}"
    padding: "9px"
    size: "{spacing.slot-tablet}"
  item-tooltip:
    backgroundColor: "{colors.inspect-fill}"
    textColor: "{colors.ink-white}"
    padding: "20px"
  faq-item:
    backgroundColor: "{colors.panel-oxblood}"
    textColor: "{colors.ink-white}"
    padding: "14px 18px"
---

# Design System: GG PC

## Overview

**Creative North Star: "The Loadout Screen"**

GG PC is drawn as the equipment screen of a 16-bit RPG. A first PC is a character to gear up: each part sits in a square item slot around a pixel PC case doll, the selected part opens an item tooltip with real stats, and every surface below the hero continues the same game UI (debuffs with cures, a vendor inspect screen, a level-select staircase, a quest log, an NPC dialog, a loot chest). The ground is near-black, panels are dark oxblood with stepped pixel corners, and Fire Red is spent loudly in exactly one full-bleed band.

Density is screen-like rather than editorial: tight panels, crisp 2px rules, tabular numbers, and pixel type for names and headings while Inter carries every stat and sentence so the page stays readable. All imagery is authored pixel art in the brand palette, rendered as crisp-edged inline SVG; there are no photos except the founder portrait, which is framed as an NPC.

The world rejects the dark gamer template it replaced: no glowing product render, no headline plus three feature cards, no gradients-as-atmosphere, no rounded SaaS surfaces.

**Key Characteristics:**
- Near-black ground with oxblood bevelled panels clipped to stepped pixel corners.
- Square item slots whose border colour is the part's price tier, with a visible legend.
- Press Start 2P for names, headings, prices and window labels; Inter for stats and prose.
- Authored pixel sprites and 1-bit glyphs only; Bayer-dithered stage lights behind featured items.
- Green means "fits" or "best price"; amber means interaction and loot.
- Stepped motion only, with one authored reward moment.

## Colors

A near-black and oxblood ground lit by the Fire Red brand trio (red, orange, amber), with a single game-readout green.

### Primary
- **Fire Red** (fire-red): the brand voice. Primary buttons, the one full-bleed debuff band, the high price tier, the hot word of the slogan, the NPC speaker tag, and the frames of the inspected GPU tooltip and closing signup. **Fire Red Text** (fire-red-text) is its lighter reading tint for red-tier names and slot labels on dark panels.

### Secondary
- **Blaze Orange** (blaze-orange): the mid price tier and the "ready" state of the quest reward frame. **Blaze Orange Text** (blaze-orange-text) is its reading tint for mid-tier slot labels.
- **Loot Amber** (loot-amber): the low price tier, every focus ring, primary button hover, text selection, level nodes, the OG offer, glyph accents in links, and selected quest options. Amber is the colour of "you can act on this".

### Tertiary
- **Fit Green** (fit-green): game readouts only. Fit checks ("6/6 fit"), best vendor price, cure labels, completed quest steps, the progress meter, signup success and the GOAL tag.
- **Discord Blurple** (discord-blurple): reserved for the Discord party panel and its button.

### Neutral
- **Void Ground** (void-ground): page background, button text on red and amber, the header.
- **Ember Ground** (ember-ground): alternating section ground for the levels and founder sections.
- **Panel Oxblood** (panel-oxblood) and **Panel Oxblood Raised** (panel-oxblood-raised): the fill of framed panels, fields and FAQ rows; the raised tone grounds the OG loot section.
- **Inspect Fill** (inspect-fill): the darker interior of item tooltips, the item stage and the reward tooltip.
- **Slot Iron** (slot-iron) with **Slot Bevel Light** (slot-bevel-light) and **Slot Bevel Dark** (slot-bevel-dark): item slots, quest steps and quest options.
- **Line Wine** (line-wine) and **Line Wine Bright** (line-wine-bright): 2px dividers and default panel frames; the bright tone is the resting frame line and ghost button edge.
- **Ink White** (ink-white): headings, values, the selection cursor brackets, the dialog frame.
- **Rose Ash** (rose-ash) and **Rose Ash Dim** (rose-ash-dim): secondary prose, stat keys, notes and window labels.
- **Error Blush** (error-blush): form error text.

### Named Rules
**The One Red Band Rule.** Fire Red fills a full-bleed surface exactly once per page: the debuff band, with Void Ground type and 3px Void Ground rules. Everywhere else red is a frame, a button or a word.

**The Tier Is Price Rule.** Slot border colour encodes the part's price tier in the example build: amber under AED 700, orange AED 700 to 2,000, red over AED 2,000. It is never a quality or rarity rating, and any surface that shows tiered slots shows the legend.

**The Green Means Fits Rule.** Fit Green is reserved for compatibility, best price and completion readouts. Never use it for decoration or generic success styling.

## Typography

**Display Font:** Press Start 2P (with monospace), self-hosted
**Body Font:** Inter (with system-ui, sans-serif), self-hosted variable 400 to 800
**Arabic Font:** the platform Arabic faces (Geeza Pro, Noto Sans Arabic, Segoe UI, Tahoma), for the footer slogan only. Neither brand face carries Arabic glyphs, so the slogan uses `lang="ar"` and `dir="rtl"` with this system stack.

**Character:** The pixel face names things (items, levels, headings, prices, window titles) the way a game UI does; Inter does all the reading, so stats and prose never pay the legibility cost of a bitmap face.

### Hierarchy
- **Display** (400, 32px phone, 40px at 560px, 48px at 1200px, 56px at 1360px, line-height 1.3): the stacked BUILD. COMPARE. GAME. slogan only.
- **Headline** (400, 20px to 32px, line-height 1.5): section headings. The debuff band, founder and OG headings run larger (up to 40px and 56px).
- **Title** (400, 14px to 20px, line-height 1.6): item names, level names, debuff names, quest legends, NPC name.
- **Label** (400, 11px to 12px, uppercase, line-height 1.6): window bars (LOADOUT, BUILD TOTAL), buttons, tags (START, GOAL, CURE, BEST DEAL), quest steps.
- **Price** (400, 13px to 20px, tabular): vendor prices in the pixel face, always tabular.
- **Lede** (600, 17px to 20px, line-height 1.45, max 34 to 36ch): the hero proposition.
- **Body** (400, 16px to 18px, line-height 1.6, 52 to 64ch): prose, FAQ answers, dialog text.
- **Stat** (600 to 700, 14px to 15px, tabular): stat values, build total, power budget.
- **Arabic** (700, 28px, line-height 1.4): the footer slogan ابنِ. قارن. العب. only.

### Named Rules
**The Names In Pixels Rule.** Press Start 2P is for names, headings, labels and prices. Sentences and stat rows are Inter. Pixel type is always weight 400 and letter-spacing 0.

**The Tabular Numbers Rule.** Every price, wattage and total uses tabular figures so columns align like an inventory readout.

## Layout

A single centred page width (max 1328px) with fluid gutters (20px, 32px from 760px, 48px from 1200px) and section padding of 64px, 96px and 120px at the same steps. Slots size from a single variable (72px, 64px under 360px, 88px from 760px, 96px from 1360px).

The hero at 1200px and up is three columns: copy and form on the left (380 to 460px), the loadout stage in the centre, the item tooltip on the right (270 to 330px). At tablet the copy splits into slogan beside lede and form, and the loadout pairs stage with tooltip. On phones the order is copy, loadout, then extras (OG offer and quest link), so the case doll enters the first screen.

Lower sections use two-column panels from 760px (vendor screen, quest window, founder, FAQ, OG loot). The levels are a three-column staircase whose blocks rise 220px, 290px, 360px. Sections alternate Void Ground and Ember Ground, with the red band and the raised oxblood OG section as the only other grounds.

**The Parked Join Bar Rule.** Below 760px a fixed join bar slides up after the hero form scrolls away and hides while the closing signup is on screen; when parked it is visibility hidden and inert, not just translated.

## Elevation & Depth

Depth is pixel bevel, never blur. Surfaces are flat colour planes; raised objects get hard inset bevels (light top-left, dark bottom-right) and frames are built from a stepped-clipped line layer under a fill layer inset 2px. There are no drop shadows or glows anywhere.

### Shadow Vocabulary
- **Slot bevel** (`box-shadow: inset 0 0 0 2px #0b0b0b, inset 4px 4px 0 #3a3034, inset -4px -4px 0 #151012`): item slots, quest steps, quest options, reward slot. The 2px ring is swapped for the tier colour on loadout slots and for amber on selection.
- **Button lip** (`box-shadow: inset 0 -4px 0 <edge>`): the darker bottom lip of every button; it shrinks to 2px and the button moves down 2px on press.
- **Platform block** (`box-shadow: inset 0 4px 0 #9a4256, inset 4px 0 0 #3a1a24, inset -4px 0 0 #170a0e, inset 0 -4px 0 #0e0608`): the level-select staircase blocks.
- **Field well** (`box-shadow: inset 0 0 0 2px #6a2c3b, inset 4px 4px 0 #0b0507`): the email field, reading as a recessed slot.

### Named Rules
**The Bevel Not Blur Rule.** Every shadow is an inset with zero blur. If a value has a blur radius, it is not from this world.

## Shapes

Every corner is square or stepped; the radius is 0 everywhere. Panels, buttons, tooltips and the NPC portrait are clipped to a stepped polygon (8px steps in 4px increments for panels and buttons, 4px steps in 2px increments for small chips, retailer tiles, level nodes and the photo). Frames are 2px; dividers are 2px solid, the debuff band uses 3px, and in-panel sub-dividers inside a tooltip or dialog are 2px dashed.

**The Cursor Bracket Rule.** Selection is shown with white corner cursor brackets (12px by 3px arms) outside the element: the selected loadout slot and the level 1 START marker. Brackets mean "you are here", never decoration.

## Components

### Buttons
Chunky pixel buttons with a pressed lip; they feel like a controller press.
- **Shape:** stepped corners, no radius; minimum height 52px (56px in forms, 44 to 48px in the header and join bar).
- **Primary:** Fire Red fill, Void Ground pixel label (12px uppercase), darker red lip.
- **Hover / Focus:** hover swaps the fill to Loot Amber with a two-step colour change (160ms steps(2)); focus is a 2px amber outline offset 4px; press drops 2px.
- **Ghost:** a Line Wine Bright frame around a Panel Oxblood fill, white label; hover turns the frame amber.
- **Discord:** Blurple fill, white label, used only in the party panel.
- **Text link:** Rose Ash Inter 15px/600 with a Line Wine Bright underline and an amber glyph; hover goes white with an amber underline.

### Chips and tags
- **Style:** small solid plates in the pixel label face: CURE (green on Void Ground), BEST DEAL (Void Ground on green), START and GOAL (amber or green on Void Ground with a 2px wine ring), the NPC speaker tag (Void Ground on red).
- **State:** tags are status readouts, not filters; they never stand above a heading as a section label.

### Cards / Containers
- **Corner Style:** stepped pixel corners, 0 radius.
- **Background:** Panel Oxblood fill, Inspect Fill for tooltips and stages.
- **Shadow Strategy:** none; frames and bevels only (see Elevation & Depth).
- **Border:** 2px frame line, Line Wine Bright at rest. Inspected items take their tier colour (red for the GPU, orange for the CPU stage), the NPC portrait takes amber, the dialog takes white, the closing signup takes red, the party panel takes Blurple.
- **Internal Padding:** 14 to 20px on phones, 20 to 40px at desktop.

### Inputs / Fields
- **Style:** 56px tall, square, Panel Oxblood fill with the field-well bevel, white 16px Inter, Rose Ash Dim placeholder, amber caret.
- **Focus:** the ring turns amber plus a 2px amber outline offset 2px.
- **Error / Disabled:** Error Blush 14px/600 message below; disabled fields drop to 60% opacity; the busy button shows three stepped loading pips.
- **Success:** a dark green panel with a 2px green ring and a pixel-face heading.

### Navigation
- **Style:** the HUD header on Void Ground with a 2px Line Wine bottom rule, the pixel GG mark plus wordmark, Inter 14px/600 Rose Ash links (white with an amber underline on hover) from 1024px, and a compact primary button at the right. Sticky from 760px. On phones the nav collapses to mark and a short CTA.

### Loadout Stage and Item Tooltip (signature)
The loadout is a framed window: a pixel title bar (LOADOUT, green "6/6 fit"), three slots either side of a pixel PC case doll standing on a Bayer-dithered oxblood spotlight, a stats strip (build total, power budget) and the price tier legend. Slot labels sit on a Void Ground plate overlapping the slot's bottom edge in the tier text tint. The selected slot carries cursor brackets and its item opens a tooltip: pixel name in the tier text tint, Inter type line naming the tier, stat rows with 1px wine dividers and tabular values, a green fit line, and a recessed three-vendor price list with the best price in green. The tooltip frame follows its item's tier.

### Level Staircase
Three bevelled platform blocks rising left to right, each topped by an amber stepped number node. Level 1 carries a START tag and cursor brackets; level 3 carries the pixel goal flag sprite and a green GOAL tag.

### Quest Log and Reward
A two-pane window: bevelled step chips and a segmented green meter, bevelled option tiles that go amber-ringed with a check glyph when chosen, and a reward pane with a locked greyscale slot that pops (420ms steps(6)) and a reward tooltip that wipes in left to right with a stepped clip-path (520ms steps(8)) when the quest completes. This is the page's one authored motion moment.

### Motion
All motion uses steps() timing: button and caret changes in steps(2), the meter in steps(3), the join bar slide in steps(4), loading pips in steps(1). Everything, including smooth scroll, is disabled under prefers-reduced-motion.

## Do's and Don'ts

### Do:
- **Do** clip every panel, button and portrait to the stepped pixel polygon and keep the radius at 0.
- **Do** colour slot borders by price tier (amber under AED 700, orange AED 700 to 2,000, red over AED 2,000) and show the legend wherever tiered slots appear.
- **Do** mark the selected or current element with white corner cursor brackets.
- **Do** draw part imagery and icons as authored pixel sprites and 1-bit glyphs in the brand palette, rendered with crisp edges.
- **Do** set prices, wattages and totals in tabular figures, prices in the pixel face.
- **Do** time every transition and animation with steps(), and gate all of it behind prefers-reduced-motion.
- **Do** label every example price as illustrative next to where it appears.

### Don't:
- **Don't** fill a second full-bleed surface with Fire Red; the debuff band is the only one.
- **Don't** present tier colours as rarity or quality ratings.
- **Don't** use blurred shadows, glows, gradients for atmosphere, or rounded corners.
- **Don't** set sentences or stat rows in Press Start 2P, or bold the pixel face.
- **Don't** use Fit Green for anything other than fit, best price and completion readouts.
- **Don't** place small uppercase labels above section headings; tags are status readouts inside panels.
- **Don't** use photographic or 3D renders of parts; the only photo is the founder portrait in an NPC frame.
- **Don't** use smooth easing curves for UI motion.
