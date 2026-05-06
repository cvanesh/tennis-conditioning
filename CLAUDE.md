# Tennis Conditioning Pro - Claude Instructions

## Project Overview
PWA for tennis conditioning with encrypted workout data. Target user is an aggressive junior player with a one-handed backhand.

## Repo Layout
```
/                    PWA entry: index.html, manifest.json, sw.js, serve.sh, README.md, CLAUDE.md
/css/                styles.css
/js/                 app code + data-encrypted.js (data.js is the local decrypted form, gitignored)
/docs/               Deployment, security, features, validation docs
/docs/reference/     Source-of-truth conditioning + nutrition plans (markdown)
/dev-tools/          Tracked dev scripts: decrypt-data.js, encrypt-data.html, generate-icons.html, validate-data.js
/dev-tools/artifacts/ Local-only reports, screenshots, and *SUMMARY.md notes (gitignored)
/snapshots/          UI screenshots (gitignored)
```

**Cleanliness rule:** keep the repo root limited to PWA entry points (`index.html`, `manifest.json`, `sw.js`), top-level scripts (`serve.sh`), and `README.md` / `CLAUDE.md` / `.gitignore`. New docs go under `docs/`, new dev scripts under `dev-tools/`, new generated reports under `dev-tools/artifacts/`. Do not add new files to the root unless they are genuinely top-level.

## Key Architecture
- Data is encrypted in `js/data-encrypted.js` (AES-256-GCM, PBKDF2 key derivation)
- Decrypt with `node dev-tools/decrypt-data.js` to produce `js/data.js` for editing
- After editing `js/data.js`, re-encrypt by opening `dev-tools/encrypt-data.html` in the browser (or `node dev-tools/encrypt-data.js <password>`)
- Warmup protocol is in `DATA.warmup` with sections containing exercises
- Each exercise references a key in `DATA.exercises` (the exercise library)

## Data Structure Reference
```
warmup: {
  id: 'warmup',
  name: 'Warm-Up Protocol',
  totalTime: <minutes>,
  sections: [{
    name: 'Section Name',
    timeRange: '0-5 min',
    duration: <minutes>,
    note: 'optional',
    exercises: [{
      exercise: 'exercise_key',  // must exist in DATA.exercises
      sets: N,
      reps: N,
      perSide: true/false,
      duration: N,  // seconds
      rest: N       // seconds
    }]
  }]
}
```

## Design System

Visual layer is split into a base layer at the top of `css/styles.css` and three additive override blocks at the bottom. **Add UI changes to the relevant block (or to the tokens), not by editing legacy rules** — keeps the diff reversible.

- **Tokens (top of `:root`):** spacing scale (`--space-1`..`--space-8`), type scale (`--text-meta`..`--text-display`), motion (`--duration-*`, `--ease-*`), layered shadows (`--shadow-soft-*`), radii (`--radius-card`, `--radius-card-lg`, `--radius-pill`), focus ring (`--shadow-focus`).
- **Pass 1 — visual reset:** header chip, plan-card system, hero typography, focus rings. Plan-card icons are inline SVG (Lucide-style) inside `.plan-icon-wrap`, tinted via `color-mix(in srgb, var(--primary-color) X%, var(--surface))`.
- **Pass 2 — layout:** desktop side rail (`#sideRail`, ≥1024px) in a CSS-grid app shell (`#app` = `[header header / rail main]`). Content max-width 880px. Card variants: `.plan-hero`, `.plan-card.reference`, default `.plan-card`.
- **Pass 3 — polish:** section progress bar driven by `--progress` CSS var on `.section-header-card` (set in JS by `updateSectionProgress` and `updateChecklistSectionProgress`). Dark mode via `prefers-color-scheme: dark` remaps the same tokens.

Type family is Inter (loaded from Google Fonts, falls back to system). Icons should be inline SVG, single-color, `currentColor`-driven — never emoji.

## Theme Behavior
- Default theme is **Wimbledon**. `initTheme` does **not** randomize and does **not** show a load-time toast — don't reintroduce either.
- Theme is user-selectable from the Settings modal (`.theme-btn[data-theme=...]`). Persists in `localStorage` under `tennis-theme`.
- All four Grand Slam themes (`australian-open`, `french-open`, `wimbledon`, `us-open`) have light + dark token sets. Themes tint accents only — they should never repaint full surfaces.

## Side Rail
- `data-rail="<plan-id>"` on each `.rail-item`. Clicks route through the same `handlePlanSelect(plan)` as plan cards.
- `setActiveRail(target)` updates `aria-current="page"` and the `.active` class. Called from `goHome` and `handlePlanSelect` so rail state always reflects the current view.
- `home` and `settings` are special targets (route to `goHome` / `openSettings`).

## Visual Review Workflow
- Local screenshots: `node dev-tools/artifacts/visual-review.mjs` (uses the chromium bundled in `~/.npm/_npx/<hash>/node_modules/playwright`). Outputs to `dev-tools/artifacts/visual/`.
- The MCP playwright server defaults to the `chrome` channel and expects Chrome at `/Applications/Google Chrome.app`. When that isn't installed, fall back to the inline Node script above instead of touching `/Applications`.
