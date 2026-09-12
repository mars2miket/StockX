# MISSION: Continue Development of StockX Scanner

## Objective
StockX is a Ross Cameron-style day-trading scanner (React + Express + Python) already in production use. Your goal is to extend it through its next planned phases without breaking the established patterns it already runs on — this is not a greenfield build, it's a continuation.

## Context & Map References
Before writing any code, you must read:
- Read `[Map/PROJECT_MAP.md]` → For the file structure, tab model, and every established convention (sticky headers, the memo comparator, the upsert-polling pattern, the persisted-state pattern, provider abstraction). Do not introduce a parallel approach to something already covered there.
- Read `[frontend/src/X.constants.js]` → For the current tab list, storage keys, and sizing constants before adding any new ones.
- Read whichever component/provider file the current phase touches (see table below) → This map describes structure, not current code; do not guess file contents from it.

## Step-by-Step Instructions
Execute these phases in order. Each phase should update `PROJECT_MAP.md` if it introduces a new convention.

1. **Phase 1 (Controls Tab):** Replace the current placeholder in `X.App.jsx`'s `CONTROLS` branch with real functionality — user-added tickers tracked outside the scan/earnings flows, persisted the same way `customTickers` already is in `X.constants.js`/`X.App.jsx`.
2. **Phase 2 (Signal Logic):** Build entry/exit signal detection in `signals/` (MACD / VWAP / pullback pattern, Python) — scope is signal detection only, no order execution and no backtesting engine.
3. **Phase 3 (Caching Layer):** Add caching for float/sector/country data in `backend/providers/YahooProvider.js` so repeated lookups for the same ticker across polls don't re-hit Yahoo every 60s.
4. **Phase 4 (Discovery Automation):** Fold the existing `getGainers.py` (TradingView scraper via Playwright) into the PowerShell launcher so it starts automatically alongside the frontend, backend, and notifier.
5. **Phase 5 (Scale Beyond Top 20):** Revisit `getScreenerTickers()` in `YahooProvider.js` and the `.slice(0, 20)` limits in `X.StockTable.jsx`/`X.EarningsCalendar.jsx` if scanning needs to cover more than the current top-20-gainers window.

| Phase | Primary file(s) |
|---|---|
| 1 | `frontend/src/X.App.jsx`, `frontend/src/constants.js`, new `Watchlist.jsx` |
| 2 | `signals/notifier.py`, new signal-logic module |
| 3 | `backend/providers/YahooProvider.js` |
| 4 | `start-stockX.ps1`, `signals/getGainers.py` |
| 5 | `backend/providers/YahooProvider.js`, `X.StockTable.jsx`, `X.EarningsCalendar.jsx` |

## Output Rules
- Follow every convention in `PROJECT_MAP.md` — the sticky-header/`border-collapse` pairing, the `stocksAreEqual` comparator rule, the upsert-not-replace polling pattern, and the `localStorage`-backed persisted-state pattern all apply to any new UI state you add.
- New data sources still go through the provider abstraction (`backend/providers/*Provider.js`) — never call an external API directly from `server.js` or the frontend.
- Code should be modular and commented, matching the existing style (short, purpose-explaining comments above non-obvious logic, not line-by-line narration).
- Deliver each phase as edits to the existing project files at their real paths (see table above) — not as new standalone scripts, except where a phase explicitly calls for a new file (e.g. `Watchlist.jsx`, the signal-logic module).
- If a phase changes anything `PROJECT_MAP.md` describes, update that file in the same change.
