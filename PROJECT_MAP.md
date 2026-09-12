# StockX — Project Map

Reference this before making any change. Read `X.constants.js`, `X.App.jsx`, and whichever component the task touches before writing a diff — don't assume file contents from this map alone; it describes structure and conventions, not current code.

## Stack
- Frontend: React + Vite, `localhost:5173`, no CSS/theme system — inline `style={{}}` objects everywhere
- Backend: Express, `localhost:3001`
- Signals: Python venv (`signals/`), Windows toast/sound notifier, polls backend independently
- Data: Yahoo Finance (`yahoo-finance2`, unofficial/free) via provider abstraction; Finnhub for news

## File tree

```
backend/
├── server.js                  Express routes: /api/scan, /api/earnings, /api/search
└── providers/
    ├── YahooProvider.js       All Yahoo calls: getQuote, scanAll, getEarningsCalendar, searchTickers
    ├── FinnhubProvider.js     News
    ├── MarketDataProvider.js
    └── scanFilters.js         Scan thresholds (%chg ≥10, RVOL ≥2x, float ≤20M)

frontend/src/
├── constants.js                Single source of truth — check here before hardcoding anything
├── App.jsx                     Shared state, polling, tab routing
├── StockTable.jsx              Market Alert tab (consolidated PRE/REGULAR/POST)
├── EarningsCalendar.jsx        Earnings Schedule tab + Add-symbol modal
└── main.jsx                    Bootstrap only

signals/
└── notifier.py                 Toast/sound alerts, independent 60s poll
```

## Tab model
Tabs are driven entirely by `sessions` in `X.constants.js` — `{ key, label }` pairs. `X.App.jsx` routes on `activeTab` via a single ternary near the bottom of its render. Adding a tab = add to `sessions` + add a render branch. Do not hardcode tab logic elsewhere.

`MARKET_ALERT` is one tab that shows PRE/REGULAR/POST data together (previously three separate tabs). The underlying per-stock `session` field (`PRE`/`REGULAR`/`POST`) still exists in the data and drives the small session badge next to each ticker — `MARKET_SESSIONS` in `X.constants.js` lists which raw values count as "Market Alert".

## Established conventions — follow these, don't reinvent

- **`APP_HEADER_HEIGHT`** (constants.js) is the single source of truth for the fixed header's height, the page spacer, and both tables' sticky-header offset. If these three ever get out of sync, headers visually break during scroll (content bleeds through). Never hardcode this value in more than one place.
- **Sticky headers**: applied per-`<th>` via a shared `STICKY_TH` style object (not on `<thead>`/`<tr>`) for cross-browser reliability. Tables using sticky headers MUST use `borderCollapse: 'separate', borderSpacing: 0` — `'collapse'` + sticky causes scroll-time bleed-through. Don't wrap a sticky table's container in `overflow: hidden` either — can break sticky positioning in some browsers.
- **Tables always render their full shell** (colgroup + thead) regardless of loading state or row count — only the `<tbody>` swaps between real rows and a single empty/loading-state row. Never gate an entire table component behind a top-level `loading ? <Spinner /> : <Table />` — that hides the header too, which is the opposite of the intended UX.
- **`StockTable` is wrapped in `memo()`** with a custom comparator (`stocksAreEqual`) that deep-compares `stocks` via `JSON.stringify` and explicitly checks a few scalar props — this exists to stop flicker on every 60s poll when data hasn't changed. **Any new prop added to `StockTable` that should trigger a re-render must be added to this comparator**, or it will silently be ignored.
- **Polling merges, it doesn't replace**: `X.App.jsx`'s scan-poll handler upserts incoming stocks by `ticker` into existing state rather than overwriting the array. A thin/empty poll (rate limiting, a quiet moment) must never wipe tickers already accumulated in the session. The accumulated list only resets on a calendar-day rollover (tracked via `toDateString()` comparison), not on every poll and not on component remount alone.
- **Persisted client state** (float filter, custom tickers) follows one pattern: a `useState` initializer reading from `localStorage` wrapped in try/catch, a `KEY` constant in `X.constants.js`, and a `commitX`/`persistX` setter that writes through to `localStorage` on change. Reuse this pattern for any new persisted setting — don't invent a new one.
- **Provider abstraction**: all external data calls go through `backend/providers/*Provider.js` files exposing the same function shapes (`getQuote`, `scanAll`, etc.). Swapping a data source means writing a new provider matching that shape and changing one import in `server.js` — never call a data API directly from `server.js` or from the frontend.

## Known limitations (by design, not bugs)
- Yahoo's `day_gainers` screener is regular-hours oriented; pre/post-market discovery is thin by nature of the free data source.
- Because polling upserts rather than replaces, a row can show stale numbers if that ticker drops off the live scan mid-session but was seen earlier — this is intentional (accumulate-for-the-session behavior), not a live-data guarantee.
- Controls tab is a placeholder — no logic behind it yet.

## Quick task → location index
| Task | File(s) |
|---|---|
| Add/rename/remove a tab | `X.constants.js` (`sessions`) + `X.App.jsx` render branch |
| Add a table column | `columns`/`earningsColumns` array + `colgroup` `<col>` + row `<td>` — three places, keep in sync |
| Change scan thresholds | `backend/providers/scanFilters.js` |
| Change polling interval | `setInterval(fetchData, 60000)` in `X.App.jsx` |
| Change/add a persisted setting | `X.constants.js` (KEY + default) + `X.App.jsx` (state + setter), mirroring `maxFloatFilter` |
| Swap a data provider | New `backend/providers/XProvider.js` matching existing function shapes + one import change in `server.js` |
| Fix sticky-header scroll bugs | Check `APP_HEADER_HEIGHT` sync first, then `borderCollapse` mode |

## Before shipping a change
1. Confirm which file(s) above actually own the behavior — don't guess.
2. Check whether the change interacts with an established convention above; follow it rather than introducing a parallel approach.
3. If the change alters anything this map describes (new tab, new persisted key, new provider, changed thresholds), update this file in the same change.
