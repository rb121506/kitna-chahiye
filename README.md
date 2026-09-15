# Kitna Chahiye

The salary your life actually needs, across 62 Indian cities. It updates live as you change any expense.

## Open it
Double-click **`Kitna Chahiye.html`**. It's one self-contained file and needs no install or server. Fonts load from Google Fonts when you're online.

## Change it
```bash
npm install
npm run dev      # live-reloading dev server
npm run build    # writes dist/index.html (single file)
```
After a build, copy `dist/index.html` over `Kitna Chahiye.html`.

## Where things live
| File | What's in it |
|---|---|
| `src/lib/cities.ts` | 62 cities: rents, price indices, fuel/LPG/CNG, deposits, climate; state tariffs & professional tax |
| `src/lib/constants.ts` | Lifestyle presets, school fees, insurance premiums, subscription prices, inflation rates |
| `src/lib/engine.ts` | Expense model and smart scaling between cities; 10-year projection |
| `src/lib/tax.ts` | Salary structure, tax (2026-27 new & old regime), CTC solver |
| `src/lib/insights.ts` | The "What stands out" cards |
| `src/components/*` | UI |

Prices were checked in September 2026. Update them in `cities.ts` / `constants.ts` when they change.
