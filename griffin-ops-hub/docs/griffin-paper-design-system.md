# Paper — editorial product UI

A portable design system for tools that must feel like a Mag7 / Fortune 10 internal product: cream paper, ink type, a charcoal rail, one brand signal, and no decorative chrome.

Drop this into any app. Swap `--color-brand`. Do not invent a second language.

This document is content-agnostic. It describes **how the interface is built**, not what the product says. It does not prescribe download/export controls, zip actions, or version stamps (`v1`, `v2`, `v4.1`, “V”) in the chrome.

---

## North star

The UI should read as a **typeset document inside a product shell**, not a dashboard template.

- Light work surface. Dark navigation. One accent.
- Hierarchy is size, weight, and ink — never color soup.
- Numbers are set in mono, always tabular.
- Surfaces are paper cards with a hairline shadow, not glass or gradients.
- Motion is a quiet entrance. It never sells the interface.

If a pixel does not carry information, remove it.

---

## Principles

- **Paper and ink.** Warm off-white canvas, near-black type. Not cool gray-on-white, not dark-mode-by-default.
- **One accent.** Brand color is a signal: active nav, primary CTA, focus ring, the one number that must be seen. It is never a fill for large regions.
- **Three type roles, no more.** Display serif for titles and hero figures. Geometric sans for UI and body. Mono for figures, IDs, kicker labels.
- **Earned pixels.** No blobs, meshes, emoji-as-icons, rainbow borders, or decorative illustration. Lucide (or equivalent) stroke icons only.
- **Concentric radii.** Outer radius = inner radius + padding on that axis.
- **Contain overflow.** Every flex/grid child that may shrink gets `min-w-0`. Tables and chip rows scroll internally. The page never scrolls sideways.
- **Mobile is the first canvas.** 390px is a first-class layout, not a squeeze of desktop.
- **Quiet chrome.** The shell is navigation and search. Do not add download, export, zip, or “save a copy” buttons to the rail or topbar. Distribution is outside the product UI.
- **No build labels in the UI.** Do not repeat software or document versions (`v1`, `v2`, `V`, `v4.1`) in eyebrows, topbars, sidebars, or footers. A period, audience, or section name is enough. Versioning belongs in release notes, not the interface.

---

## Tokens

Encode once in CSS (`@theme` under Tailwind, or `:root`). Never put raw hex in components.

### Color

Neutrals are warm. Brand is the only hue you swap per product.

```css
@theme {
  /* Canvas / ink */
  --color-background: #f3f1ee;          /* page paper */
  --color-foreground: #141311;          /* primary ink */
  --color-card: #ffffff;                /* elevated paper */
  --color-card-foreground: #141311;
  --color-popover: #ffffff;
  --color-popover-foreground: #141311;

  /* Actions on light */
  --color-primary: #141311;             /* ink button */
  --color-primary-foreground: #f7f5f2;
  --color-secondary: #ece9e4;
  --color-secondary-foreground: #141311;
  --color-muted: #ece9e4;               /* track, chip fill */
  --color-muted-foreground: #6f6a64;    /* labels */
  --color-faint: #8e887f;               /* tertiary meta */
  --color-accent: #ece9e4;
  --color-accent-foreground: #141311;

  /* Lines */
  --color-border: #e2dcd4;
  --color-input: #e2dcd4;
  --color-line-strong: #c9c2b8;         /* stat-strip rules, table heads */

  /* Brand — THE SWAP POINT */
  --color-brand: #c8102e;
  --color-brand-hover: #a50d25;
  --color-brand-soft: #f8e8eb;
  --color-ring: #c8102e;
  --color-destructive: #c8102e;
  --color-destructive-foreground: #ffffff;

  /* Status — small badges only, never panels */
  --color-warn: #a5620d;
  --color-warn-soft: #faf0df;
  --color-ok: #1f7a4d;
  --color-ok-soft: #e7f3ec;

  /* Dark rail */
  --color-side: #111110;
  --color-side-2: #1a1918;
  --color-side-text: #c8c4be;
  --color-side-muted: #8a8580;
  --color-side-strong: #f7f5f2;
  --color-side-fill: #f7f5f214;         /* 8% cream on charcoal */
  --color-side-line: #f7f5f21f;         /* 12% cream on charcoal */
}
```

**Usage rules**

| Token | Where it lives | Where it does not |
| --- | --- | --- |
| `background` | Page, sticky section nav backdrop | Cards, popovers |
| `card` | Surfaces, command palette, callouts | Page, sidebar |
| `foreground` | Titles, body, primary figures | Meta, placeholders |
| `muted-foreground` | Labels, secondary copy | Body paragraphs |
| `faint` | Tertiary meta, placeholders, icon rest | Anything a user must read first |
| `brand` | Eyebrow, active rail item, one hero figure, links, focus, bar fills | Card backgrounds, large panels, decorative rules everywhere |
| `brand-soft` | Quiet badges | Buttons, fills > ~24px tall |
| `side*` | Left rail + topbar only | Content column |

**Brand adoption:** change `--color-brand`, `--color-brand-hover`, `--color-brand-soft`, and `--color-ring`. Keep the warm neutrals and charcoal rail. If the org color is already a red, keep it; otherwise substitute (ink blue, forest, etc.). Do not add a second accent family.

**Forbidden as brand or fill:** purple, violet, magenta, yellow, gold, orange, neon, aurora gradients.

### Typography

```css
@theme {
  --font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Newsreader", Georgia, "Times New Roman", serif;
  --font-mono: "IBM Plex Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
}
```

Load with `preconnect` to the font CDN and a single stylesheet. Optical size on the serif (`opsz` 6–72). Weights: sans 400/500/600/700 + italic 400; display 400/500/600; mono 400/500.

| Role | Family | Weight | Size | Tracking | Leading | Color |
| --- | --- | --- | --- | --- | --- | --- |
| Page title | display | 500 | `clamp(2rem, 1.4rem + 2.6vw, 2.85rem)` | −0.03em | 1.1 | foreground |
| Section title | display | 500 | 1.25rem (`text-xl`) | −0.025em | 1.15 | foreground |
| Hero / stat figure | display | 500 | 1.875rem (`text-3xl`) | tight | 1.0 | foreground, or brand if it is the story |
| Body | sans | 400 | 15px (0.9375rem) | 0 | 1.55 | foreground |
| Lede | sans | 400 | 15px | 0 | 1.6 | muted-foreground, max 62ch |
| UI / nav item | sans | 500–600 | 14px | 0 | 1.3 | side-text / foreground |
| Button | sans | 600 | 14px | 0 | 1 | on-color |
| Eyebrow / kicker | mono | 400–500 | 11px | 0.1em | 1 | brand, uppercase |
| Group label (rail) | sans | 600 | 11px | 0.14em | 1 | side-muted, uppercase |
| Meta / caption | sans | 400 | 12px | 0 | 1.4 | faint |
| Tabular figure | mono | 400–500 | 12–14px | 0 | 1 | muted-foreground, `tabular-nums` |
| Numbered index | mono | 500 | 22px | 0 | 1 | brand |
| Badge | sans | 700 | 11px | 0.04em | 1 | on-soft, uppercase, pill |

**Base body:** 15px / 1.55 on `font-sans`. Headings inherit display via `h1–h4`. `h*` use `text-wrap: balance`. Paragraphs use `text-wrap: pretty`.

**Root smoothing**

```css
html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
  overflow-x: clip;
}
```

Selection: `color-mix(in oklab, var(--color-brand) 18%, white)` on foreground text.

Eyebrows name the **section or audience** (“Overview”, “Internal”), not a build or document version. Do not append `v1` / `v2` / `v4.1` to the product name in the kicker.

### Radius

```css
--radius-xs: 4px;
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 24px;
--radius: 12px;
```

| Surface | Radius |
| --- | --- |
| Page card / surface | 16px (`rounded-2xl`) |
| Callout, command dialog | 12px |
| Button, input, nav item | 8px (`rounded-md` / `rounded-[10px]`) |
| Icon button | 8px |
| Badge, section-nav chip | 9999px (pill) |
| Bar track / bar fill | 9999px |
| Nested control inside a 16px card with 24px pad | 8px |

Never give parent and padded child the same radius.

### Shadow

Two recipes. No third.

```css
--shadow-border:
  0px 0px 0px 1px rgb(20 19 17 / 0.06),
  0px 1px 2px -1px rgb(20 19 17 / 0.06),
  0px 2px 8px 0px rgb(20 19 17 / 0.04);

--shadow-border-hover:
  0px 0px 0px 1px rgb(20 19 17 / 0.08),
  0px 1px 2px -1px rgb(20 19 17 / 0.08),
  0px 2px 8px 0px rgb(20 19 17 / 0.06);

--shadow-float:
  0px 0px 0px 1px rgb(20 19 17 / 0.08),
  0px 16px 40px -12px rgb(20 19 17 / 0.18);
```

- **Cards, callouts, numbered chips:** `shadow-border`. Hover may step to `shadow-border-hover`.
- **Command palette, tooltips, floating menus:** `shadow-float`.
- Do not stack drop shadows on the sidebar. The rail is a flat field.
- Do not use `border` + `shadow-border` together on the same card — the inset 1px ring *is* the border.

### Spacing

4/8 scale. Common steps: 4, 8, 12, 16, 20, 24, 32, 40, 48.

| Region | Value |
| --- | --- |
| Page padding (mobile) | 16px |
| Page padding (sm+) | 24–32px |
| Content max width | 72rem (`max-w-6xl`), centered |
| Surface padding | 20px mobile / 24px desktop |
| Stack between surfaces | 24px |
| Stack between header and first surface | 32px |
| Stat strip vertical pad | 20px |
| Definition-list label column | 5.5rem |
| Tap target | ≥ 40px (icon buttons 40×40; section chips 36px tall; rail items ~40px) |

### Motion

```css
--ease-out-smooth: cubic-bezier(0.22, 1, 0.36, 1);
```

| Recipe | Duration | Easing | Properties |
| --- | --- | --- | --- |
| Hover / color | 150ms | ease-out | color, background, box-shadow |
| Press | 150ms | ease-out | `scale(0.96)` on buttons |
| Page / column enter | 480ms | `--ease-out-smooth` | opacity, `translateY(10px)`, `blur(3px)` → rest |
| Bar grow | 720ms | `--ease-out-smooth` | `scaleX(0→1)`, origin left, stagger 50–60ms/item |
| Tooltip in | ~150ms | ease-out | opacity + `scale(0.98→1)` |
| Dialog | 150–250ms | ease-out | opacity + scale from ~0.96, never from 0 |

Stagger enter-up with 40 / 90 / 140 / 190ms delays, max four beats.

**Reduced motion:** disable bar-grow, enter-up, and looping effects. Snap to rest opacity/transform. Honor `prefers-reduced-motion: reduce` globally.

Enumerate properties. Never `transition: all`.

---

## Layout chrome

Two planes, always.

```
┌────────────┬─────────────────────────────────────────┐
│            │  TOPBAR  (same charcoal as rail)        │
│  RAIL      ├─────────────────────────────────────────┤
│  248px     │                                         │
│  charcoal  │  CREAM CANVAS                           │
│  sticky    │    max-w-6xl, horizontal pad            │
│            │    sticky section nav (cream/90 blur)   │
│            │    header → stats → surfaces            │
│            │                                         │
└────────────┴─────────────────────────────────────────┘
```

### Rail

- Width 248px. `sticky top-0 h-dvh`. Hidden below `lg`; contents move into a left `Sheet`.
- Background `side`. No border on the right — the topbar spans the content column only, so the rail is a full-height slab.
- **Brand lockup:** mark 40px + name (`side-strong`, 14px semibold) + product kicker (11px uppercase, 0.08em, `side-muted`). The kicker is the product name, not a version.
- **Group labels:** 11px, uppercase, 0.14em, `side-muted`, 8–10px horizontal inset.
- **Items:** 10px radius, 10px/8px pad, 14px medium. Idle `side-text`. Hover `side-fill` + `side-strong`.
- **Active item:** `side-fill` + `side-strong` + **inset 2px brand bar** on the left (`shadow-[inset_2px_0_0_var(--color-brand)]`). Active icon is brand. Do not use a filled brand pill.
- Optional **figure** (count, volume) right-aligned, mono 12px, `tabular-nums`, `side-muted` (idle) / `side-text` (active).
- Footer of the rail: an in-page text link (methodology, notes) and a **status card** (`side-2` fill, `side-line` border, 12px radius) with a 6px status dot + two lines of 12px copy. This is the only “info” block in the rail.
- **Do not** put download, export, zip, or share-file actions in the rail.

### Topbar

- Height 56px. `sticky top-0 z-30`. Same `side` field as the rail so the chrome is one piece.
- Left: hamburger (`lg:hidden`) + mark on small screens + breadcrumb (`product / current`, 13px).
- Right: optional audience kicker (mono 10px uppercase, e.g. “Internal”) and the **search trigger**. Nothing else.
- Search trigger: 40×40 on mobile; on `sm+` a 200px field with icon, “Search…” in `side-muted`, and a `⌘K` kbd chip. Border `side-line`, fill `side-fill`.
- All topbar text uses `side-*`. Never `text-white`.
- **Do not** add a download or export control to the topbar. Do not show a software version next to the kicker.

### Content column

```
flex min-w-0 flex-1 flex-col
  topbar
  main#main  (min-w-0 flex-1)
    inner: mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8
```

`min-w-0` on the column, the main, and any CSS grid that contains tables or bars. This is the overflow contract.

On route change, replay `.enter-up` on the content column (`key={pathname}`).

### Mobile sheet

Left sheet, no border, `bg-side`, hosts the same rail component. Close on navigate. Sheet title exists for a11y (`sr-only` or visually hidden).

---

## Page composition

A page is a **header**, optional **stat strip**, optional **section nav**, then a **stack of surfaces**. Not a widget grid.

### Page header

```
[ 3.5×2px brand dash ]  EYEBrow in mono uppercase brand
Title in display serif, fluid size
Lede, 15px muted, max 62ch
Optional children (filters, CTAs) — left-aligned row, never right-pinned
```

The eyebrow is a **section or audience label** (“Overview”, “Branch”, “Internal”). Do not concatenate a version number onto it.

CTAs sit **below** the lede, full-width stacked on mobile (`flex-col gap-2`), row on `sm+`. Do not put buttons in the header’s right edge — they collide with host chrome. In-page CTAs are navigation (continue, notes), not file download.

### Stat strip

A ruled band, not a card row.

- `border-y` using `line-strong`. 20px vertical pad.
- Desktop: equal flex children, `border-l border-border` between, first child unpadded-left.
- Mobile: 2×2. Odd cells get a left rule; rows after the first get a top rule.
- Figure: display 30px, medium, tracking tight. Brand only if that cell is the story.
- Label: 12px semibold uppercase, 0.05em, muted.
- Sub: 12px faint.

No icons in the strip. No sparklines. No chip backgrounds.

### Section nav

- `sticky top-14 z-20` (sits under the 56px topbar).
- Backdrop `background/90` + `backdrop-blur-sm`.
- Horizontal row, `overflow-x-auto overscroll-x-contain`, `w-max` chips so they don’t wrap or overflow the page.
- Chip: 36px tall, pill, 14px medium. Idle muted; hover secondary fill; **active = primary ink fill + primary-foreground** (not brand — brand is already the rail).
- Drive active state with `IntersectionObserver` (`rootMargin: -20% 0px -60% 0px`). Targets use `scroll-mt-24`.

### Surface

```
rounded-2xl  bg-card  p-5 sm:p-6  shadow-border  min-w-0 max-w-full  scroll-mt-24
```

Title block: display `text-xl` medium. Optional kicker under it, 14px muted.

Stack surfaces with `space-y-6`. Two-up grids: `grid gap-6 lg:grid-cols-2`, and **every cell `min-w-0`**.

Footers under the stack may cite company, product, and period. They do not cite a UI or document version.

---

## Components

Primitives follow shadcn/Radix + `cva`. Restyle with tokens. Do not introduce a second kit.

### Button

| Variant | Surface | Label | Use |
| --- | --- | --- | --- |
| `default` | `primary` (ink) | `primary-foreground` | Primary action on cream |
| `brand` | `brand` | `primary-foreground` | The one irreversible / signature action |
| `outline` | transparent, `line-strong` border | foreground | Secondary. Hover: card + shadow-border |
| `secondary` | `secondary` | secondary-foreground | Quiet |
| `ghost` | none | foreground | Tertiary |
| `side` | none | side-text | Controls living on the charcoal chrome |
| `link` | none | brand, underline on hover | Inline |

Sizes: `h-10` default, `h-9` sm, `h-11` lg, `size-10` icon. Horizontal pad slightly tighter on the right (`pr-3.5`) to optically center with trailing icons.

Press: `active:scale-[0.96]`. Focus: 2px `ring` offset against the surface behind the button. Disabled: 50% opacity, no pointer.

As-child slot for `Link` / `<a>`. Mobile primary actions: `w-full sm:w-auto`.

Do not add a dedicated “Download” / “Export zip” variant or place those actions in chrome. If a product truly needs an export, it is an in-page action inside a surface — not a persistent shell control.

### Print / offline fallback

Some tools use email, an API, or another live channel as the primary handoff. When that channel can have an outage, give the page a **Print / Save as PDF** action so the same information can still travel. This is not the same thing as a download/export control — the button below is still forbidden in the rail or topbar; the difference is that print uses the browser's own dialog, needs no export-format decision, and does not depend on the backend that might be the thing that's down.

- `outline` variant button, placed inside the surface's own `.header-actions` row (review screen, receipt screen, confirmation screen) — never in the rail or topbar.
- Wired to `window.print()` directly. No custom PDF renderer, no second code path to keep in sync with the on-screen layout.
- Pair with a `@media print` stylesheet block that:
  - hides all chrome — rail, topbar, header-actions, section nav, context/sidebar columns, page and form footers, toasts, skip link;
  - sets the page inner padding to `0`;
  - collapses multi-column work grids to `display: block` so nothing gets cut off at the paper edge;
  - gives each surface `break-inside: avoid`, drops the `shadow-border` in favor of a plain 1px `border`, and adds bottom margin between surfaces.
- Because the button lives inside chrome that `@media print` hides, it disappears from the printed/PDF output on its own — no extra print-only class needed on the button itself.

### Badge

Pill, 11px, bold, uppercase, 0.04em, `px-2.5 py-0.5`.

| Variant | Fill | Text |
| --- | --- | --- |
| `brand` | brand-soft | brand |
| `warn` | warn-soft | warn |
| `ok` | ok-soft | ok |
| `muted` | muted | muted-foreground |
| `outline` | none + border | muted-foreground |

Default `muted`. One badge per item. Never a row of four. Badges name a category or state, not a release (`v1`, `v2`).

### Input

Height 40px, `rounded-md`, `border-input`, `bg-card`, 14px. Placeholder `faint`. Focus: `border-brand` + `ring-2 ring-brand/20`. No inner shadow.

### Callout

Not a tinted panel. A **paper card with a 2px brand rail** on the left.

```
flex gap-4  rounded-xl  bg-card  px-4/5 py-4  shadow-border
  ├  w-0.5 self-stretch rounded-full bg-brand
  └  label (11px bold uppercase brand) + body (14px foreground)
```

Use for a single framing sentence. Do not nest, do not color the background brand-soft.

### Numbered list

Bare ordered list. Each row: 14px left-offset 48px, hairline `border-b`. Index is a 24×24 `rounded-md` paper chip, mono 11px, `shadow-border`, absolutely left. Meta under the line in 12px faint.

The index is a **step number** (`1`, `2`, `3`), not a product version.

### Article row

Divider-separated articles, not cards.

- Index: mono 22px brand (`01`, `02`…). These are list indices, not release labels.
- Title: 16px sans semibold.
- Optional figure under the title: mono 14px brand, tabular.
- Badge top-right.
- Meta 12px faint.
- Definition list: on `sm+` a 5.5rem uppercase 11px label column, 14px value. Three fields max (cause / action / measure — rename to the domain).
- Footer of the article: 12px row, faint source left, brand text link + `ArrowUpRight` 14px right.

### Tables

- Wrapper: `min-w-0 overflow-x-auto`. Never let a table expand the page.
- Size: 13.5px. Head: 11px semibold uppercase 0.05em muted, `border-b line-strong`.
- Rows: `border-b border-border`, last row none. Cell pad `py-2.5`.
- Numeric columns: right-aligned, mono, `tabular-nums`, muted unless they are the primary value.
- Sortable heads: button, no chrome, trailing chevron only on the active column.
- Optional **amount bar:** a `bg-brand/10` block absolutely behind the value, width = value/max, inset 6px vertically, `rounded-sm`. The number sits `relative` on top.
- No zebra stripes. They compete with amount bars and badges.
- No outer table border. The surface already has an edge.

### Bar list

Each row:

1. Name (14px medium, truncate) + figure (mono 12px muted) on one baseline.
2. Track `h-2 rounded-full bg-muted`. Fill `bg-brand/75` (`bg-brand` if highlighted), `.bar-fill`, width % of max, stagger delay `i * 50ms`. Minimum visible width ~2%.
3. Caption 12px faint (count, share, hint).

Highlight with brand text on the name, not a row background. Rows may be links (`hover:opacity-80`). Tooltip on the bar: full precision figure.

### Composition bar

Single 10px track, `rounded-full overflow-hidden bg-muted`. Segments in ink steps, **not a rainbow**:

```
bg-brand
bg-foreground/70
bg-foreground/45
bg-foreground/25
bg-foreground/12
```

First segment is brand (the story). Remaining segments decay through ink. Legend under: 8px swatch + 12px muted label + mono faint percentage. Wrap with `gap-x-5 gap-y-2`.

Tooltips on each segment. Grow animation per segment, 60ms stagger.

### Command palette

- `⌘K` / `Ctrl+K` toggles. Trigger lives in the topbar.
- Dialog: `top-[18vh]`, `max-w-xl`, `rounded-xl p-0 shadow-float`. No close X — Escape dismisses.
- Input row: 48px, search icon faint, 14px, bottom border.
- List: `max-h-80`, 6px pad.
- Groups: uppercase 11px muted heading.
- Items: 40px, 14px, icon 16px faint, optional right-side mono figure.
- Empty: 32px pad, 14px muted, one sentence.
- Footer optional: 12px faint hints for keys.

Groups: Navigate / Records / People / Actions — rename to the domain. Keyboard selects; Enter navigates; palette closes before route change.

### Tooltip

`bg-foreground text-background`, mono 12px, `rounded-md`, `shadow-float`, 8px offset. Delay ~180ms on first show. Never wrap essential info — the caption under a bar should already be enough.

### Sheet

Used only as the mobile rail. Full height, `bg-side`, no cream panel, no drop shadow soup. Content is the sidebar component, not a restyled duplicate.

---

## Data visualization

Charts in this system are **bars in type**, not a chart library.

- Ranked comparison → bar list (length encodes magnitude).
- Share of a whole → composition bar (width encodes share, ink steps encode rank).
- Tabular comparison → table with an amount-behind-value bar.
- One headline number → stat strip, display serif.

Do not add pie charts, 3D, gradients on fills, or a second accent per series. If a series must be distinguished beyond five ink steps, use a table.

Figures:

- Currency / compact millions: mono, two decimal places when the unit is millions (`$18.99M`, never `$19.0M`).
- Percentages: mono, specified precision, no space before `%`.
- Counts: mono, locale grouping.
- Always `tabular-nums` in columns and strips.

---

## Interaction and accessibility

- Skip link to `#main`, visually hidden until focus.
- `:focus-visible` 2px `ring` (brand) + 2px offset, globally.
- `cursor: pointer` on `button` and `[role=button]` (Tailwind Preflight does not).
- Hit targets ≥ 40px in chrome; 36px allowed for in-page chips.
- `scroll-mt-24` on every in-page target (header + sticky section nav).
- Images of marks: explicit size, no layout shift. Media images get a 1px ink outline at 10% (`outline-offset: -1px`).
- Contrast: body ink on paper exceeds AA. `faint` is tertiary only. Side-muted on charcoal is for kickers, not body.
- Reduced motion as specified under Motion.
- Command palette, sheet, and dialog use Radix focus trap and `aria` titles.

---

## Responsive contract

| Breakpoint | Behavior |
| --- | --- |
| `< sm` (390) | 2-col stat strip, stacked CTAs (`w-full`), rail in sheet, icon-only search, section nav horizontally scrollable |
| `sm` | Stat strip becomes a single ruled row; search trigger expands; breadcrumbs appear |
| `lg` | 248px rail visible; hamburger hidden; two-column surface grids allowed |

**Overflow is a defect.** Diagnose with `document.documentElement.scrollWidth > innerWidth`. Usual causes: `min-width: auto` on flex children, `w-max` chip rows without `overflow-x-auto`, tables without a `min-w-0` wrapper, grids whose children won’t shrink.

Recipe: `min-w-0` on the flex/grid child → `overflow-x-auto` on the wide inner → `overflow-x: clip` on `html`.

Host chrome (preview pills, avatars) is not yours to hide. Keep primary actions left-aligned and off the top-right 96px of the viewport.

---

## Anti-patterns

| Don’t | Do |
| --- | --- |
| Purple / gold / neon accents | One `--color-brand`, warm neutrals |
| Gradient heroes, mesh, blobs | Flat paper, hairline shadow |
| Inter-on-Inter, or five families | Display + sans + mono, roles above |
| Zebra table rows | Hairline dividers + amount bars |
| Tinted callout panels | Left brand rail on paper |
| Right-pinned header CTAs | Left-aligned row under the lede |
| Download / export / zip in the rail or topbar | Keep distribution out of the product shell |
| A custom PDF renderer for the offline fallback | `window.print()` + a `@media print` stylesheet |
| `v1` / `v2` / `V` / `v4.1` in eyebrows, topbar, or footer | Section, audience, or period — no build label |
| `text-white` / raw hex in JSX | Tokens (`side-strong`, `primary-foreground`) |
| `transition: all` | Enumerated color / transform / opacity |
| Count-up animations on figures | Static typeset numbers; bars may grow |
| Emoji icons | Lucide (or equivalent) 16–20px strokes |
| Identical radius on card and button | Concentric: 16px card, 8px control |
| Dark canvas + light sidebar | Charcoal rail, cream canvas |
| Rainbow composition chart | Brand + four ink opacities |
| Page-level horizontal scroll | `min-w-0` + inner scroll |

---

## Adoption

To put Paper on another product:

- Copy the token block into the global stylesheet. Keep names.
- Set `--color-brand`, `--color-brand-hover`, `--color-brand-soft`, and `--color-ring` to the org color. Stop.
- Load the three font families (or substitutes with the same roles: an optical serif, a geometric sans, a duplex mono).
- Implement the shell: rail + topbar on `side`, cream `main`, `max-w-6xl` inner. Search in the topbar. No download control.
- Rebuild pages as header → stat strip → section nav → surfaces. Eyebrows are section labels, not versions.
- Restyle buttons, badges, inputs, dialogs against the variants above. Do not keep leftover primary-blue / radius-full from a prior kit.
- Replace charts with bar list / composition bar / amount-behind-value.
- Add `⌘K` command palette as the global find.
- If the product's primary handoff is a live channel that can go down (email, an API), add the print/offline fallback pattern above.
- Run the QA list below at 390 and 1280.

**Substitutions that preserve the language**

- Serif: Newsreader → Source Serif, Freight Text, or Georgia.
- Sans: Plus Jakarta Sans → Neue Haas / Source Sans / IBM Plex Sans. Avoid Inter as the only face.
- Mono: IBM Plex Mono, Berkeley Mono, or `ui-monospace`.
- Mark: any single-color logomark that reads at 28–40px on charcoal. No wordmark-plus-slogan in the rail.

**What not to customize:** the cream/ink/charcoal triad, the inset active-rail bar, the left-rule callout, the ruled stat strip, the ink-step composition bar. Those *are* the system.

---

## QA checklist

- [ ] Tokens only — no hex, no `text-white`, no arbitrary `p-[13px]` in components
- [ ] One brand hue; warn/ok only on badges
- [ ] Display serif on titles and hero figures; mono on every number
- [ ] Rail charcoal, canvas cream, cards white + `shadow-border`
- [ ] Active rail item = inset 2px brand bar, not a filled pill
- [ ] Callouts = left brand rail, not a pink/soft fill
- [ ] Stat strip = ruled band, 2×2 on mobile
- [ ] CTAs left, full-width on mobile
- [ ] No download, export, or zip control in the rail or topbar
- [ ] Any offline/print fallback uses `window.print()` + `@media print`, not a custom renderer, and lives inside a surface's own header-actions
- [ ] No `v1` / `v2` / `V` / build number in eyebrows, topbar, rail, or footer
- [ ] `min-w-0` on main, content column, grid cells
- [ ] No page-level horizontal overflow at 390 / 768 / 1280
- [ ] Tap targets ≥ 40px in chrome
- [ ] Focus rings visible on keyboard
- [ ] `prefers-reduced-motion` kills bar-grow and enter-up
- [ ] Command palette opens from `⌘K` and the topbar control
- [ ] Section nav sticks below the topbar and tracks intersection
- [ ] Host preview chrome is not covered
- [ ] No emoji, no gradients, no zebra, no second font beyond the three roles
