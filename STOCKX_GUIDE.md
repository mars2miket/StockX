# StockX — Self-Serve Update Guide

A map of where things live and how to change them, so most updates don't need a full walkthrough.

## 0. How to use this guide (for the AI reading it)

If a person hands you this file at the start of a session, here's the intended workflow:

1. **Read this guide first** to understand the codebase's shape and existing patterns — don't propose a structure or approach that conflicts with what's already established here.
2. **This guide is a map, not the code.** It won't contain the current, real content of any file. Use §6 ("Quick lookup") to figure out which 1-2 files the requested change actually touches, then ask the person to upload those specific files before writing any diff — don't guess at file contents from this guide alone.
3. **Reuse the established patterns** noted throughout (e.g. `APP_HEADER_HEIGHT` as the single source of truth for header sizing, `border-collapse: separate` for any sticky-header table, the `stocksAreEqual` memo comparator gotcha) rather than reinventing them.
4. **This guide can go stale.** If the change you make alters something this guide describes (a new tab, a new persisted setting, a restructured table, a new backend route), tell the person the relevant section should be updated, and offer to write the update.

## 1. The shape of the app

```
stockx/
├── backend/
│   ├── server.js              ← Express routes (/api/scan, /api/earnings, /api/search)
│   └── providers/
│       ├── YahooProvider.js   ← all Yahoo Finance calls (quotes, screener, profile, search)
│       ├── FinnhubProvider.js ← news
│       ├── MarketDataProvider.js
│       └── scanFilters.js     ← the ≥10% / ≥2x RVOL / ≤20M float scan rules
├── frontend/src/
│   ├── X.constants.js           ← shared config: URLs, tab list, storage keys, sizing constants
│   ├── X.App.jsx                ← top-level layout, polling, tab switching, state that's shared across tabs
│   ├── X.StockTable.jsx         ← the Market Alert table
│   ├── X.EarningsCalendar.jsx   ← the Earnings Schedule tab (table + "Add symbol" modal)
│   └── X.main.jsx                ← app bootstrap only, rarely touched
└── signals/
    └── notifier.py             ← Windows toast/sound alerts (polls the backend independently)
```

**Rule of thumb:** if the change is about *what data* shows up → `backend/`. If it's about *how it's displayed or interacted with* → `frontend/src`.

## 2. `X.constants.js` is the control panel

Before editing a component directly, check if the thing you want to change is already a constant here:

| Constant | Controls |
|---|---|
| `sessions` | The tab list (key + label) shown in the header bar |
| `APP_HEADER_HEIGHT` | Height of the fixed title/tab bar — also the sticky-header offset for both tables. Change this in **one place** if the header ever grows/shrinks. |
| `MAX_FLOAT_KEY`, `FLOAT_DEFAULT`, `FLOAT_UNIT`, `FLOAT_INPUT_MAX` | The float filter's persisted value, default, and units |
| `CUSTOM_TICKERS_KEY`, `MAX_CUSTOM_TICKERS` | Earnings Calendar's custom-ticker watchlist persistence |
| `MARKET_SESSIONS` | Which raw session values (`PRE`/`REGULAR`/`POST`) get grouped into the Market Alert tab |
| `BACKEND_URL` | API base URL |

**Adding a new tab** → add an entry to `sessions` in `X.constants.js`, then add a branch in `X.App.jsx`'s render ternary (near the bottom) for that `activeTab` value.

## 3. `X.App.jsx` — what it owns

- Polls `/api/scan` every 60s → feeds `StockTable`
- Fetches `/api/earnings` once (on custom-ticker changes) → feeds `EarningsCalendar`
- Owns `activeTab`, `sortKey`/`sortDir`, `maxFloatFilter` (persisted), `customTickers` (persisted)
- Renders the fixed header + tab bar, then hands off to whichever tab component is active

**Adding a new piece of shared state** (something more than one tab needs) → goes here, passed down as props. **Tab-local state** (search box text, hover state, etc.) → keep it inside that tab's own component instead.

## 4. `X.StockTable.jsx` / `X.EarningsCalendar.jsx` — the two tables

Both follow the same structure, so a pattern learned in one applies to the other:

- `columns` / `earningsColumns` array at the top defines the column set, in order. **Adding a column** = add an entry here + a matching `<col>` width in the `colgroup` + a matching `<td>` in the row-render — three places, always in sync.
- The `<thead>` always renders, independent of row count — this is intentional (see the comment above `StockTable`) so headers/controls stay usable when a filter zeroes out the rows, and stay visible during loading.
- Each `<th>` spreads `STICKY_TH` for the sticky-header behavior. If you ever see header content bleeding through while scrolling again, check two things first: (1) `APP_HEADER_HEIGHT` in `constants.js` actually matches the fixed header's real height, (2) the table still uses `borderCollapse: 'separate'`, not `'collapse'`.
- Empty/loading state lives in one row inside `<tbody>` — that's the single place to change the "no data" or "loading" message.
- `StockTable` is wrapped in `memo()` with a custom comparator (`stocksAreEqual`) that does a deep-ish compare on `stocks` — this exists purely to stop the News column (and everything else) from flickering on every 60s poll when the data hasn't actually changed. If you add a new prop that should trigger a re-render, **add it to that comparator** or it'll silently be ignored.

## 5. Backend: adding/changing scanner data

- New field on each stock row → add it in `YahooProvider.js`'s `getQuote()` (or `getEarningsCalendar()` for the calendar), then add the matching column on the frontend per §4.
- Changing scan criteria (the 10%/2x/20M thresholds) → `backend/providers/scanFilters.js`.
- Swapping data providers → the provider abstraction means you'd write a new `providers/XProvider.js` matching the same function shapes (`getQuote`, `scanAll`, etc.) and swap the import in `server.js`, without touching the frontend.

## 6. Quick lookup: "I want to..."

| Task | Where |
|---|---|
| Add/rename/remove a tab | `X.constants.js` (`sessions`) + `X.App.jsx` render branch |
| Add a table column | `columns` array + `colgroup` + row `<td>` in the relevant table file |
| Change the scan thresholds | `backend/providers/scanFilters.js` |
| Change polling frequency | The `setInterval(fetchData, 60000)` in `X.App.jsx` |
| Change default float filter | `FLOAT_DEFAULT` in `X.constants.js` |
| Change header height / fix sticky-header bugs | `APP_HEADER_HEIGHT` in `X.constants.js` |
| Add a new persisted setting (like float filter) | Follow the `maxFloatFilter`/`MAX_FLOAT_KEY` pattern in `X.App.jsx` + `X.constants.js` |
| Change styling/colors | Inline `style={{}}` objects throughout — no CSS file/theme system currently, so search-and-replace hex codes (e.g. `#4ade80`) is how theme-wide changes propagate today |

## 7. What to send me for help on future changes

Since I don't have your whole repo, the fastest path when you do want help: upload the one or two files the "Quick lookup" table above points you to, plus a one-line description of the change. That's usually enough context without needing the rest of the codebase.