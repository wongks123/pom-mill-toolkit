# Project: PEPC Palm Oil Mill Toolkit

## Purpose
A teaching and calculation web app for palm oil mill (POM) engineers and beginners.
Primary reference: MPOB Palm Oil Mill Pocketbook (Engineering & Processing Division), in /reference.

## Tech stack
- React + TypeScript + Vite
- Tailwind CSS
- React Router
- Vitest for unit tests
- vite-plugin-pwa so the app works offline (mills often have weak signal)
- No backend. Everything runs in the browser. Deploy as a static site (Vercel / Netlify / GitHub Pages).

## Architecture rules
1. All calculation logic lives in src/engine/ as PURE functions with typed inputs and outputs. No UI code there.
2. Every calculator has a unit test in src/engine/__tests__/ using the test cases in docs/test-cases.md.
3. Reference data (tables, densities, limits) lives in src/data/*.json, never hard-coded in components.
4. Every calculator page shows: inputs (with defaults and units), result, the formula used, a step-by-step working, and a source note ("MPOB Pocketbook p.XX" or "Corrected from p.XX").
5. Use SI units internally. Convert only at the input/output layer.
6. Validate inputs: reject negatives and zero divisors; warn when a value is outside typical mill ranges.
7. Mobile-first layout. Engineers will use this on a phone on the mill floor.

## Known errata in the pocketbook (use the CORRECTED values)
- p.25 De-stoner: air density 1.777 is wrong; use 1.1777 kg/m3 at 27°C.
- p.24 Separating column: 24,000 / 36,000 = 0.667 m2 (not 0.816); side = 816 mm.
- p.22 Fruit elevator: divide by load factor (c = TP / (b·v·LF)), do not multiply.
- p.26 Sludge tank: 50% of crude oil, not 50% of FFB.
- p.20 Steam pipe: mean specific volume is 0.4785 m3/kg; steam demand unit is kg/t FFB.
- p.11 Power factor table: 0.55 -> 0.95 multiplier is 1.190 (not 1.490). Better: compute it as tan(acos(pf1)) - tan(acos(pf2)).
- p.31 Arachidic acid is C20:0, not C18:2.
- p.12-13 Pump formulas use IMPERIAL gallons (constant 3,300). For US gallons the constant is 3,960. Let the user choose.

## Code map
- src/engine/        pure calculators (each returns values + steps + warnings)
- src/calculators/   UI definitions per calculator (inputs, defaults, typical ranges, formula, source)
- src/data/          JSON reference tables. Items with "review": true are drafts not yet checked against the pocketbook.
- src/pages/         route pages; src/components/ shared UI
