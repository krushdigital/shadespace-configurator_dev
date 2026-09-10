# ShadeSpace Configurator — UI Refresh Handover for Bolt.new

**Scope: presentation layer only.** This is a visual/UX re-skin of the existing React + Vite configurator. No business logic, pricing, data, persistence, PDF, email, admin or quoting code may change.

Reference prototype: `Rail Configurator.dc.html` (open in a browser; resize below 900 px for mobile, above 1180 px for the three-column desktop). Icons live in `icons/`, logos in `assets/`.

---

## 0. Hard rules (read first)

1. **Do not touch** anything under `src/hooks/`, `src/utils/`, `src/data/`, `src/lib/`, `src/shopify/`, `src/pages/` (admin), `src/components/admin/`, or `src/types/`. All pricing (`useShadeCalculations`, `usePricingSettings`, `useBasePricing`), catalogs (`useFabricCatalog`, `useHardwareCatalog`), geometry (`utils/geometry`, `fabricSolver`, `imperialParser`), quotes (`quoteManager`, `SaveQuoteModal`, `UnifiedSaveModal`, `MyQuotesModal`), PDFs (`pdf*`), analytics/telemetry, currency, and Supabase code stay byte-identical.
2. **Keep the `ConfiguratorState` shape exactly as is.** Every new screen reads and writes the same fields via the existing `updateConfig`. No new required fields; no renamed fields. If the UI needs transient state (which step is open, a hover, a modal), keep it in local component state only.
3. **Reuse the existing viewers as-is:** `InteractiveMeasurementCanvas` (Plan), `ShadeSail3DViewer` (3D), `HeightVisualizationCanvas`, `MeasurementLines`, `ShapeCanvas`, `Expanded3DViewerModal`. Mount them in the new layout; do not fork or restyle their internals. They must continue to receive `config`, `highlightedMeasurement`, `highlightedCorner`, `measurementOption`, `unit`, and callbacks exactly as today so that:
   - focusing/hovering an edge or diagonal input highlights that line in Plan and 3D (`setHighlightedMeasurement('AB')` etc.);
   - the shape reflows automatically as measurements are typed (existing geometry solver);
   - the "Approximate preview – add diagonals" and Shape Mode Auto/Manual toggles keep working;
   - hovering a corner row on the hardware step highlights that corner (`highlightedCorner`).
4. **Keep every existing modal and flow:** `FabricComparison`, `SketchUploadModal`, `HardwareSelectionModal` (with its hover detail card), `HeightInformationModal`, `SaveProgressButton` / `UnifiedSaveModal` / `SaveQuoteModal`, `MyQuotesModal`, `ConfigurationChecklist`, `DeliveryEstimate`, `PriceSummaryDisplay`, `MobilePricingBar`, `StandardPackPreview`, `ErrorBoundary`, `useMobileGuidance`, `useTabPermissions`. Where the prototype shows a simplified version, wrap the existing component in the new styling rather than rewriting it.
5. **Validation, step gating and copy that carries legal/commercial meaning stay identical** (acknowledgements, Fit Guarantee wording, "Optional now – required at checkout", height rules). Only the visual container changes.
6. Analytics events (`utils/analytics`, `eventTracker`) must still fire from the same user actions.

---

## 1. Layout system

Three responsive tiers (measure `window.innerWidth`, or use the existing breakpoints if the app already has them):

| Width | Layout |
|---|---|
| < 900 px (mobile) | Dark header (logo, "Step X of Y", Save), 5-segment progress bar with tappable step labels, single column content, inline Plan/3D card at the top of measurement screens (max 380 px wide), sticky bottom bar: Back · Estimated price · Continue. |
| 900–1180 px | Left rail (250 px, dark green) + content column. Inline Plan/3D card as on mobile. Price shown in the bottom bar. |
| ≥ 1180 px | Left rail + content column (max 760 px) + right summary panel (340 px, sticky): Plan/3D toggle + viewer, price card, key/value summary, Fit Guarantee note (custom only). |

**Replace the accordion** (`AccordionStep`) with one visible step at a time. Step groups shown in the rail / progress bar:

1. Material (fabric + color on one screen)
2. Shape (shape → fixing points)
3. Dimensions (how-to-measure → edges → diagonals → heights | size)
4. Edge style
5. Hardware
6. Review

Rail/progress items are clickable when that group is completed (or all groups before it are completed). Clicking jumps to the group's first screen. Current group is highlighted; completed groups show a lime tick.

Continue button always names the next step ("Continue → shape"). When disabled it states what's missing ("Enter every edge to continue"). On Review it becomes "Add to cart · US$X" and stays disabled until diagonals (if required) and all acknowledgements are complete.

---

## 2. Visual tokens

- Font: Plus Jakarta Sans (400/500/600/700/800). Base 17 px; headings 30 px/800; helper text 16 px `#4c6b60`.
- Brand green `#01312d` (rail, headers, selected cards, primary buttons). Lime accent `#b5e853` (ticks, active progress, price). Mid green `#2e7d4f` (links, secondary emphasis). Panel bg `#f5f7f5`; card border `#dfe7e1`; soft green fill `#eef5ef`; muted text `#6b8478`.
- Cards: white, 2 px border `#dfe7e1`, radius 16 px. **Selected = filled `#01312d`, white text, lime tick top-right.** Never rely on outline alone.
- Buttons: radius 14 px, 16–17 px/700. Primary `#01312d`; secondary 2 px outline; disabled `#c6d4ca`.
- Touch targets ≥ 44 px. No nested boxes-in-boxes.
- Logo: `assets/logo-white.png` on dark surfaces; `assets/logo-color.webp` on light.

---

## 3. Screen-by-screen

### 3.1 Material & finish (fabric + color, one screen)
- Fabric cards (4). Each has a (?) — **hover** opens a floating popover (absolute, over content, not pushing layout) with `detailedDescription`. Desktop cards show name, badge, description, weight · warranty. Mobile cards are compact single-column rows (no description).
- **On select, the cards animate closed** (max-height/opacity transition, ~0.45 s) into a **pill row** of the four fabric names; the color swatch grid fades up beneath (`@keyframes fadeUp`). Desktop: hovering a *different* fabric's pill re-expands the cards; leaving the card area collapses them. Mobile: tapping the pill row expands; selecting collapses.
- Color swatches: use the existing `colors[].imageUrl` textures as `background-image`, **`background-size: 260%`** (zoomed crop avoids moiré), radius 14 px, name below. FR badge top-left for `isFireRetardant`. Selected = dark outline + centered lime tick.
- Hover/tap tooltip below swatch: name, shade factor, UV block, fire-retardant.
- Small magnifier (20 px, 55% opacity, full on hover) bottom-right of each swatch opens a modal: full texture left, name/fabric/FR/shade factor/UV/weight/warranty/description right, "Choose {color}" button.
- Keep "Compare fabrics" → existing `FabricComparison` modal.
- Switching fabric resets color (existing behaviour).

### 3.2 Shape
- Icons: `icons/square.svg`, `rectangle.svg`, `triangle.svg`, `right-triangle.svg`; custom tile uses `icons/custom-combined.svg` (dashed tile, full-width row below the four).
- Selecting a fixed shape sets `shapeType`; selecting Custom goes to fixing points.

### 3.3 Fixing points (custom only)
- Six tiles with `icons/points-3.svg` … `points-8.svg` (irregular sails on posts of varying height — do not use regular polygons). Captions: 3 "Any triangle", 4 "Most popular", 5–8 "Heights required".

### 3.4 How to measure (intro)
- Three numbered lines; custom flow also shows the sketch-upload card → existing `SketchUploadModal`.

### 3.5 Dimensions
- Banner at top with diagram: custom = `icons/measure-space.svg` "Measure between your fixing points…"; fixed = `icons/measure-sail.svg` "Enter the finished sail size…".
- Unit toggle (ft / in | metric) — existing unit switch logic and `imperialParser`.
- Measurement cards (grid, min 230 px): tag chip "A → B", ft + in inputs (or m), tick when filled. `onFocus` → `setHighlightedMeasurement(key)`; the mounted Plan/3D viewer highlights that edge/diagonal.
- **Custom order:** edges → diagonals (own screen, *optional now, required at checkout*; Continue allowed) → heights (own screen; optional at 4 points with skip note, required at 5+; Post/Building toggle per point). 
- **Fixed:** single "size" screen (1–2 fields) + dashed card "Not perfectly square, or need varying heights? Switch to custom ›".
- "Your measurements match a Square/Triangle — Switch to Square" prompt when all custom edges are equal (existing detection).
- **Switch modal** (both directions): title, explanation, NOW → AFTER diagrams (`measure-sail.svg` / `measure-space.svg`), buttons **Start fresh**, **Keep my measurements** (maps values across — use existing conversion), Cancel. Keep the "What does this mean?" link if present today.
- Plan diagram: fixing points draggable on custom dimension screens (this is the existing Shape Mode = Manual behaviour in `InteractiveMeasurementCanvas`; expose it with the larger white-ringed handles and the hint "Drag the points to match your space").

### 3.6 Edge style
- Advice banner driven by existing perimeter logic ("At X perimeter, both edge types are suitable…").
- Two image cards: **Cabled edge first** ("Strongest and sleekest. Best for permanent installations.", wire mm from `getWireThickness`), then **Webbing reinforced** ("Easiest to install. Ideal for DIY projects.", webbing mm from `getWebbingWidth`, "Most popular" badge). Images: existing Shopify CDN URLs.

### 3.7 Hardware
- Options: **Hardware tensioning kit** (Recommended; pack image via `HARDWARE_PACK_IMAGES`; existing `StandardPackPreview` on the (i)), **Manual per corner**; fixed shapes also get **No hardware**. Custom + exact measurement option rules stay as coded (`allowNone` / `allowStandard`).
- Manual: "N/N configured" chip; one row per corner (letter circle, chosen items, price, Change/Select). Hover row → `setHighlightedCorner`. Click → existing `HardwareSelectionModal` (search, categories, qty ±, hover detail card with photo/material/deduction/SKU, "Apply to all corners"). Grease tube add-on row and "Hardware cost (added to total)" line as today.

### 3.8 Review
- Inline viewer card (mobile/mid) — desktop uses the right panel.
- Amber "Diagonal measurements required before checkout" card with inline inputs when missing (existing `ConfigurationChecklist` logic). "Heights not provided — Add heights ›" note when applicable.
- Summary rows with **Edit** link per row (jumps to that step): Fabric, Color, Shade factor, Thread, Shape, Perimeter, Area, Edge style, Wire/Webbing, Weight, Hardware — values from `calculations`.
- Measurements block (edges, diagonals "Not set" if missing).
- Price card (dark): "All-inclusive price to your door", total, one-line inclusions, Shade sail / Hardware split, Delivered approx. (`DeliveryEstimate`), Warranty, Price locked 30 days. Keep it to this single card — no nested boxes.
- Fit Guarantee card — **custom flow only**. Acknowledgement checkboxes (existing copy; the Fit Guarantee acknowledgement only for custom). "Save & email my PDF quote" → existing quote flow. Add to cart → existing handler.

---

## 4. Help (?) system
Every step title has a (?) — **hover opens, click pins**. Popover is `position: absolute` under the button, dark green, 360 px max, z-index above cards. Copy per step is in the prototype's `HELP` map; reuse existing tooltip copy where it already exists.

---

## 5. Assets to copy into the app
- `icons/square.svg, rectangle.svg, triangle.svg, right-triangle.svg, custom-combined.svg`
- `icons/points-3.svg … points-8.svg`
- `icons/measure-sail.svg, measure-space.svg`
- `assets/logo-white.png, logo-color.webp`

---

## 6. Acceptance checklist
- [ ] All existing Vitest suites (`src/__tests__`) pass unchanged.
- [ ] Price for an identical configuration is identical before/after.
- [ ] Plan & 3D viewers render on every dimension screen and in Review; focusing any edge/diagonal input highlights it; typing reshapes the sail; corner hover highlights on Hardware.
- [ ] Save progress, email quote, PDF, My Designs, admin dashboard unchanged.
- [ ] Custom: edges → diagonals (skippable) → heights (rules above) → review blocks add-to-cart until diagonals present.
- [ ] Fixed: size screen + switch-to-custom modal; no Fit Guarantee shown.
- [ ] Mobile (< 900 px): one column, sticky bottom bar, tappable progress labels, compact fabric rows, no hover-only interactions required.
