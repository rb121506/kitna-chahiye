# Kitna Chahiye

The salary your life actually needs, across 62 Indian cities — updates live as you change any expense. Plus a set of standalone money tools: net worth, debt payoff, emergency fund, and financial freedom.

## Live
- **Web:** https://kitna-chahiye-app.vercel.app — auto-deploys from this repo's `main` branch.
- **Double-click:** `Kitna Chahiye.html`. One self-contained file, no install or server. Fonts load from Google Fonts when online.

## Change it
```bash
npm install
npm run dev      # live-reloading dev server
npm run build    # writes dist/index.html (single file)
```
After a build, copy `dist/index.html` over `Kitna Chahiye.html`, then commit and push — Vercel redeploys automatically.

## What's in it
**Salary planner:** city + lifestyle + household → required CTC, live. Dual-income splitting, goal-based savings, health/term/critical-illness/spouse-term insurance, EMIs, subscriptions. A Quick Estimate landing card and progressive disclosure (advanced sections collapsed by default) keep the form from feeling huge. Tabs: expense breakdown, city comparison, all-62-city ranking, 5/10/15/20/30-year projections, offer checker (+ "which lifestyle fits your salary"), and a "can I afford it?" EMI checker.

**Money tools** (independent of the planner, borrow its numbers as sensible defaults): net worth tracker, debt payoff calculator (avalanche/snowball simulation), emergency fund planner, financial-freedom (FIRE) calculator with a savings-rate benchmark.

## Where things live
| File | What's in it |
|---|---|
| `src/lib/cities.ts` | 62 cities: rents, price indices, fuel/LPG/CNG, deposits, climate; state tariffs & professional tax |
| `src/lib/constants.ts` | Lifestyle presets, school fees, insurance premiums, subscription prices, inflation rates, goal/FI defaults |
| `src/lib/engine.ts` | Expense model, smart city-scaling, dual-income solver, 30-year projection |
| `src/lib/tax.ts` | Salary structure, tax (2026-27 new & old regime), CTC solver |
| `src/lib/tools.ts` | Standalone calculators: debt payoff simulation, financial freedom, emergency fund, net worth, savings-rate benchmark |
| `src/lib/insights.ts` | "What stands out" cards, biggest-expense/biggest-lever (computed by re-solving, not guessed) |
| `src/components/*` | UI — `Sidebar.tsx` is the full planner form, `QuickEstimate.tsx` the 4-field entry point, the rest are one component per tab/tool |

Prices were checked in September 2026. Update them in `cities.ts` / `constants.ts` when they change. When adding a new place that prints a CTC, use `lpaFull()` from `format.ts` (not raw `lpa()` + a hardcoded "L") — CTCs at Premium/Luxury tier or combined dual-income routinely cross ₹1 Cr.
