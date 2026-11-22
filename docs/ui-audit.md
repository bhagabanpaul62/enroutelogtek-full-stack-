# Landing page UI audit (22 Nov 2026)

Scope: the public home page (`frontend/src/features/marketing/ui/HomePage.jsx` and its parts) plus the shared public nav and footer links. Brand comes from `features/marketing/styles/tokens.css`: Enroute gold as the one accent, Space Grotesk with Geist Mono, square corners, dark only.

## Fixed

| Area | Finding | Fix |
| --- | --- | --- |
| Tokens | Raw hex and oklch values in the truck and scene styles | Named drawing tokens in the `.hm` block (`--hm-box*`, `--hm-rim`, `--hm-lamp`, `--hm-shade`); everything else uses `--color-*` |
| Spacing | Off-scale padding, margins and offsets (6, 7, 11, 72, 84, 120 px) | Moved onto the `--space-*` scale |
| Radii | Rounded rects in a square system | Removed |
| Duplicates | Two "How it works" links in the hero; repeated truck and scene fills; one dead rule | Card link is now "See a live trip" (goes to `#m-trips`); fills merged; dead rule deleted |
| Copy | Scene showed offers A, B, D | Now A, B, C; the caption says the prices are examples |
| Headings | "What you can do" section had no h2 | Visually hidden h2 added |
| Contrast | `ink-4` (3.4:1) on small text: step numbers, side menu, figure captions, grid ticks, card arrows | Switched to `ink-3` (7.2:1) |
| Contrast | Step text faded to 35% before you scrolled to it | The fade now applies only to the number and the rule line |
| Screen readers | Scene drawings held the only copy of prices, cities and steps | Each scene has `role="img"` and a description |
| Screen readers | Counters read out their moving digits | The moving digits are hidden from screen readers; the final value sits in a visually hidden span |
| Keyboard | Hover-only effects on links and company cards | Every hover effect now also shows on keyboard focus |
| Touch | Hero link, card button, nav and footer links were under 44 px | Raised to 44 px minimum |
| Motion | Scroll-linked truck ignored reduced motion | CSS pins it to the finished state; Motion's `reducedMotion="user"` covers the entrances |
| Layout | Hero squeezed at 1024; globe dots blew up at 768 | Below 1200 px the hero stacks (truck full width, cards side by side); the globe has a fixed size |
| SEO | Title and description still used freight jargon | Plain title and description |

## Motion

Uses Framer Motion (the `motion` package, `motion/react`). It drives the headline line reveal, the hero counters and labels, the hero truck drive-in and scroll drift, fade-and-rise section reveals, the spring-smoothed scroll progress for the how-it-works truck, and the counters. Entrances are fade plus a short rise only, never zoom or bounce.

## Verified

- Headless Chromium at 1440, 1024, 768 and 360, plus 1440 with reduced motion. Motion finished every entrance, the counters landed, the scroll progress moved, nothing scrolled sideways, and the console showed no errors apart from the backend API being offline locally.
- Lint is clean on the changed files.
- Contrast ratios computed from the tokens by the accessibility auditor; I spot-checked them.

## Not verified

- Lighthouse scores (not installed).
- A light theme (the marketing pages are dark only by design).
- A real screen-reader pass.
- The Solution, About, Pricing and Support pages, beyond the shared nav and footer.
