# StockX - High-Level Application Architecture Summary

This document provides a concise structural summary of the **StockX** stock market scanning and monitoring application, including its soon to be integrated with the **Time-Binned Order Flow Engine** - see OFE.md.

---

## 1. System Overview
StockX is a lightweight, responsive web-based analysis platform designed to track volatile market tickers across multiple sessions (**Pre-Market**, **Regular**, and **Post-Market**). It pairs broad scanner parameters with real-time, microsecond-accurate order flow analysis to alert users of aggressive price moves or deceptive institutional market behavior.

---

## 2. Main Functional Capabilities

### 📊 Real-Time Market Scanning Table
* Displays highly volatile market tickers inside a layout engineered to remain structurally flexible across variable column additions.
* Focuses on live **Relative Volume (RVOL)** over raw static metrics to instantly spotlight liquidity spikes.
* Evaluates real-time price ranges and percentage velocity shifts using fully dynamic user-specified control inputs.

### ⏱️ Time-Binned Order Flow Analysis
* Processes incoming 10-level Market-By-Price (MBP-10) depth packets at a rigid **1,000ms clock speed**.
* Computes two critical indicators every second:
  1. **Order Book Imbalance (OBI):** Measures resting snapshot depth asymmetry between the top 5 bid and ask layers (bounded between `-1.0` and `+1.0`).
  2. **Order Flow Imbalance (OFI Flow):** Quantifies contract volume velocity based on sequential price layer updates.

### 🚨 UI Text Signal Decision Matrix
Current UI has OBI, OBI, & SIGNAL columns as placeholders. Transforms complex microstructural volume flow into four highly distinct visual text labels per row:
* **`BUY / LONG`** (High-Contrast Green) – True buying pressure present.
* **`SELL / SHORT`** (High-Contrast Red) – True selling pressure present.
* **`SPOOF TRAP / FREEZE`** (Flashing Amber Alert) – Deceptive quote activity; triggers a strict **5-Second Circuit Breaker Cooldown** that locks the UI alert text and resets local memory baselines.
* **`NO SIGNAL / HOLD`** (Neutral Gray) – Balanced or noisy order book.

### 📅 Corporate Action & Catalysts
* **Earnings Schedule Tab:** Allows for quick multi-ticker queries and tracking of upcoming quarterly reporting timelines.
* **Intelligent Data Bandwidth Strategy:** Moves non-volatile properties (Float, Country, Company Name) to daily polling routines, and isolates News catalyst extraction strictly to ticker creation cycles.

---

## 3. Technology Stack Alignment
* **Frontend UI Layer:** Built using structural React elements utilizing fluid tabular calculations (`tableLayout: "auto"`) with defensive overflow protection wrappers (`overflowX: "auto"`).
* **High-Speed Backend Loops:** Structured to operate via asynchronous, non-blocking Python infrastructure (`asyncio`) communicating over rapid WebSocket or optimized 1s polling channels.
* **Market Feed Provider:** Specifically tailored to consume native `mbp-10` schema data wrappers from Databento streams.

The shape of the app is as follows which is open to recommendations for improvement.

stockx/
├── backend/
│   ├── server.js                 ← Express routes (/api/scan, /api/earnings, /api/search)
│   └── providers/
│       ├── DatabentoProvider.js  ← not yet wired to calculate OBI, OFI
│       ├── YahooProvider.js      ← all Yahoo Finance calls (quotes, screener, profile, search)
│       ├── FinnhubProvider.js `  ← news
├── frontend/src/
│   ├── X.constants.js            ← shared config: URLs, tab list, storage keys, sizing constants
│   ├── X.App.jsx                 ← top-level layout, polling, tab switching, state that's shared across tabs
│   ├── X.StockTable.jsx          ← the Market Alert table
│   ├── X.EarningsCalendar.jsx    ← the Earnings Schedule tab (table + "Add symbol" modal)
│   └── main.jsx                  ← app bootstrap only, rarely touched
└── signals/
    └── notifier.py               ← Windows toast/sound alerts (polls the backend independently) - this function is no longer used


## 4. UI Components
Watchlist
  Table Column Headers
    TICKER + // the + symbol opens a modal window to search for tickers that can be added to the UI. when the Enter button is clicked, the first ticker that is at the top of the modal search box is added to the UI. user has option to search another before closing modal box.
    EARNINGS - this is the date of the next or latest earnings call.
    PRICE - current price.
    %CHG - percent changed.
    RVOL - relative volume.
    FLOAT (M) - total float of shares in millions.
    OBI - data to be added (see OFE.md)
    OFI - data to be added (see OFE.md)
    SIGNAL - data to be added (see OFE.md)
    NEWS - latest news release along w/the published date, time, & news type.


## 5. File Roles
/signals/notifier.py - has set intervals, checks for qualifying tickers, audible/visible Windows 11 alert when a ticker meets the conditions.
/providers/YahooProvider.js - gives the Price, %Chg, ticker symbol, companyName, session (Pre, Regular, After Hours), volume, avgVolume, rvol, float, hod (high of day).
/providers/FinnhubProvider.js - gives News, date of news, time of publishing.
/providers/scanFilters.js - gives filter threshold parameters such as minChangePercent: 2, minRvol: 1, maxFloat: 500_000_000 stock shares. Filter conditions subject to change.
/providers/DatabentoProvider.js - will provide L1, L2 data for OBI, OFI calculations. This feature is not yet connected to the API.
/frontend/src/X.App.jsx - the root components of the application.
/frontend/src/X.constants.js - contains the sticky header styles.
/frontend/src/X.EarningsCalendar.jsx - controls most of earnings calendar table data. The table contains TICKER, EARNINGS (date), PRICE, %CHG, VOLUME / RVOL, FLOAT (M), COUNTRY, NEWS. This list is a watchlist to track when earnings calls are scheduled for decision making purposes. 
/frontend/src/main.jsx - import for the X.App.jsx file.
/frontend/src/X.StockTable.jsx - controls how data is displayed in both tables (Market Alert & Earnings Schedule)


## 5. Basic process flow
The app has a + symbol next to TICKER column header. User clicks to search for tickers, presses Enter or clicks on the desired ticker which is brought into the UI on Watchlist tab. Data for the company should be displayed as shown in #4 UI Components. It should show OBI, OFI & Signal data (see OFE.md)