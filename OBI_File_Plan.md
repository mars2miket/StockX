# OBI Signal — File Update Plan

## Backend
- `backend/providers/DatabentoProvider.js` — **new**. Streams MBP-10 (Tier 1) or MBO/L3 (Tier 2 later); computes OBI, confidence, signal status.
- `backend/server.js` — wire in the provider; add a WebSocket (or SSE) route for streaming book updates instead of 60s polling.
- `backend/providers/scanFilters.js` — maybe: add OBI/confidence as an optional scan-qualifying condition, if you want alerts gated on it.

## Frontend
- `frontend/src/X.StockTable.jsx` — already has OBI/Confidence/Signal/Target/Decay columns from mock build; swap mock fields for live WebSocket data.
- `frontend/src/X.EarningsCalendar.jsx` — same swap.
- `frontend/src/X.constants.js` — add OBI thresholds, WebSocket URL, any new persisted settings.
- `frontend/src/X.App.jsx` — own the WebSocket connection/subscription lifecycle (shared state across tabs), same pattern as existing polling.

## New (resilience layer)
- Signal audit log (table or file) — records each signal + eventual outcome for hit-rate tracking.
- Simple degrade flag per symbol — falls back to Tier 1 calc if Tier 2 data is unavailable/stale.
