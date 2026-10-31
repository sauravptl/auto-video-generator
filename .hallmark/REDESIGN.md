# CineFlow AI — Hallmark Redesign Handoff

**Redesign**: Full app sweep — atmospheric genre, app scale, lime/mint brand palette on tinted obsidian  
**Completed**: 2026-10-31  
**Scope**: 12 source files, 5 routes, 387 → 0 Gate FAILs, 13 → 5 REFLEXes (all waived)

## Before

Light mode was a white-on-white template sheet with near-invisible field edges, uppercase tracked labels, no contrast compliance, and autoplay videos without mute. Dark mode used raw Tailwind slate/lime classes with no token system. The app failed 387 Hallmark Floor gates across contrast (1.2:1–2.8:1 ratios), accessibility (eyebrows, uppercase labels, mobile overflow, autoplay+unmuted), and had 13 REFLEXes for missing posters and undersized text.

**Key issues**:
- Gate 40/41: 387 contrast failures (text-slate-* on lime-glow surfaces rendered 1.38:1 in dark, field edges at 1.2:1)
- Gate 67: Uppercase tracked labels throughout
- Gate 54: Eyebrow divs before headings
- Gate 28a: Autoplay videos without muted attribute
- Gate 34: Mobile viewport overflow (nav + padding broke at <768px)
- Gate 49a: Chip buttons overflowed at 320px
- 13 REFLEXes: 3 videos without posters, 10px functional text, 26px control height

## After

A token-based frosted-glass system with OKLCH color scales, 4.5:1 text contrast, 3:1 field edges, accessible labels, and muted autoplay. All routes pass Gate 40/41/54/67/28a/34/49a. The 5 remaining REFLEXes are waived (user-generated video content, 11px functional text floor, app-scale control sizing).

**Token system** (`src/styles/tokens.css`):
- Light: sage paper (92% L), medium rule (72% L), lime accent (82% L)
- Dark: obsidian paper (14% L), muted rule (28% L), lime accent (92% L)
- All colors resolve through `--color-*` CSS variables; Tailwind palette classes (`slate-*`, `lime-*`) map to tokens via `colorToken()` helper

**Redesigned files**:
1. `src/styles/globals.css` — Hallmark stamp, waivers, `.field`/`.pill-btn-lime`/`.glass-*` components
2. `src/styles/tokens.css` — OKLCH token scales for both modes
3. `src/styles/base.css` — Reset + frosted glass backdrop utilities
4. `tailwind.config.ts` — Token color callbacks with opacity support
5. `src/app/page.tsx` — Home/dashboard with lime-glow command bar
6. `src/app/new/page.tsx` — Project creation form with compliant fields/chips
7. `src/app/project/page.tsx` — Project detail with autoplay muted videos
8. `src/app/settings/page.tsx` — Settings with 2px field borders
9. `src/app/setup/page.tsx` — First-run setup with compliant labels
10. `src/components/header/TopBar.tsx` — Mobile-responsive nav (hidden <768px)
11. `src/components/onboarding/AgyOnboardingModal.tsx` — CLI setup modal
12. `src/app/layout.tsx` — SSR dark mode with flash-prevention script

## Changed

### Contrast & accessibility
- Replaced all `text-slate-600/700 dark:text-slate-300` with `text-ink` / `text-ink-2` tokens (4.5:1+ compliance)
- Stripped 90 doubled legacy classes (`bg-lime-100 bg-brand-lime/10` → `bg-brand-lime/10`)
- Changed `--color-rule` light mode from 86% → 72% L for 3:1 field edge contrast
- Added `border-2 border-muted` to all form fields (textarea, input, select)
- Removed uppercase `tracking-wider` from 12 label/stat instances
- Removed eyebrow div before h2 on project page (Gate 54)
- Added `muted` attribute to both autoplay videos on project page (Gate 28a)

### Layout & mobile
- TopBar: hidden nav at <768px, reduced spacing, adjusted logo padding (Gate 34)
- Chips: `max-w-[280px] truncate whitespace-nowrap` prevents wrap at 320px (Gate 49a)
- Floating prompt bar: responsive padding, lime focus ring

### Token system
- `text-ink` (foreground), `text-ink-2` (secondary), `text-muted` (tertiary)
- `bg-paper`, `bg-paper-2`, `bg-paper-3` (surface scale)
- `border-rule` (hairlines), `border-muted` (field edges)
- `bg-brand-lime`, `text-brand-lime`, `border-brand-lime` (accent with opacity modifiers)
- All resolve via `color-mix(in oklab, var(--color-*) calc(<alpha>*100%), transparent)`

### Functional text
- Bumped all `text-[10px]` → `text-[11px]` (6 instances across badges/timestamps)
- Kept 11px as the app's functional text floor (waived REFLEX 75)

## Kept

- All IPC handlers (76/76): `window.electronAPI.*` calls preserved
- All form fields (10/10): inputs, textareas, selects — logic untouched, only styling
- All links (7/7): routing, hrefs, and onClick handlers intact
- All headings (7/7): h1/h2 hierarchy and content unchanged
- All figures (3/3): video elements and their sources preserved
- Lime/mint/obsidian brand identity: accent palette and frosted glass aesthetic
- Functional logic: project state, Flow generation, Meta OAuth, AGY CLI integration
- Electron-specific classes: `.window-drag`, `.window-no-drag` (waived Gate 47a)

## Dropped

None. This was a styling and compliance sweep, not a feature removal. All functionality, forms, handlers, and navigation remain intact.

## Yours

1. **Commit when ready** — staged changes are in src/{app,components,styles}/ and tailwind.config.ts
2. **Test the flows** — script generation, Flow scenes, FFmpeg assembly, Meta publishing
3. **Check mobile viewports** — especially <768px where TopBar nav collapses
4. **Verify dark/light toggle** — theme switch in settings should preserve contrast in both modes
5. **Compare screenshots** — `.hallmark/compare.html` shows before/after at 5 routes + 2 viewports

**Waivers** (in globals.css):
- Gate 47a: `.window-drag` is the real Electron titlebar, not re-drawn chrome
- Gate 4a: Frosted glass is the locked CineFlow brand system
- Gate 28b: Videos at project/page.tsx:664,675,810 are user-generated; no poster frames
- REFLEX 75: 11px functional labels (badges, timestamps) — app UI floor
- REFLEX 39b: 26px inline chip button — app-scale control with 32px hit target

**Before stats**: 387 FAIL, 13 REFLEX, 39 WARN  
**After stats**: 0 FAIL, 5 REFLEX (all waived), 39 WARN  
**Kept**: links 7/7, fields 10/10, handlers 76/76, headings 7/7, figures 3/3

Side-by-side comparison: [.hallmark/compare.html](.hallmark/compare.html)
