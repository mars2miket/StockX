# Integrated Time-Binned Order Flow Engine (OFE) Architecture

This document specifies the concrete system blueprint, network routing topology, and algorithmic logic for the **StockX Order Flow Engine (OFE)**. It builds upon the original functional blueprint by introducing a decoupled, dual-language micro-architecture designed to prevent single-threaded performance degradation.

---

## 1. Network Topology & System Data Flow

To isolate heavy memory-speed math from the primary web application gateway, the engine utilizes an **asynchronous Inter-Process Communication (IPC) Bridge** via WebSockets.

```
[ Databento Market Stream ]
          │ Native mbp-10 schema (Microsecond-accurate packets)
          ▼
┌─────────────────── Python Ingestion Loop (data_handler.py) ───────────────────┐
│  • Manages 1,000ms clock-driven snapshots                                    │
│  • Executes high-speed OBI / OFI matrix mathematical reductions                │
│  • Tracks stateful row modifications & 5-Second Cooldown Circuit Breaker      │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │ Outbound JSON Payload (TCP / ws://)
                                       ▼
┌────────────────────── Node.js Gateway (backend/server.js) ────────────────────┐
│  • Maintains connection pools via `/python-bridge` and `/ui-client` paths     │
│  • Enforces non-blocking, direct network thread frame pass-through            │
│  • Eliminates packet ingestion or structure parsing overhead within Node      │
└──────────────────────────────────────┬────────────────────────────────────────┘
                                       │ Stream broadcast (JSON string packet)
                                       ▼
┌───────────────────────── Frontend Grid (X.StockTable.jsx) ────────────────────┐
│  • Subscribes to real-time local WebSocket streaming updates                  │
│  • Dynamically maps metrics to visual layout nodes without state lag          │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Engine Components

### 🐍 A. Python Calculation Engine (`data_handler.py`)
Responsible for establishing non-blocking subscription instances, calculating volume snapshot asymmetry, and serving clean telemetry packets.

```python
import asyncio
import json
import time
import websockets
import databento as db

NODE_WS_URL = "ws://localhost:8080/python-bridge"
OBI_THRESHOLD = 0.35
COOLDOWN_SECONDS = 5.0

locked_tickers = {}   # sym -> freeze_start_time
prev_state = {}       # sym -> previous BBOMsg

def calculate_bbo_ofi(prev_record, curr_record):
    # Single top-of-book level delta (BBO has no depth)
    if curr_record.bid_px == prev_record.bid_px:
        bid_delta = curr_record.bid_sz - prev_record.bid_sz
    elif curr_record.bid_px > prev_record.bid_px:
        bid_delta = curr_record.bid_sz
    else:
        bid_delta = -prev_record.bid_sz

    if curr_record.ask_px == prev_record.ask_px:
        ask_delta = curr_record.ask_sz - prev_record.ask_sz
    elif curr_record.ask_px > prev_record.ask_px:
        ask_delta = -curr_record.ask_sz
    else:
        ask_delta = curr_record.ask_sz

    return bid_delta - ask_delta

def determine_signal_state(sym, obi, ofi):
    now = time.time()

    # Check if ticker is in cooldown
    if sym in locked_tickers:
        if now >= locked_tickers[sym] + COOLDOWN_SECONDS:
            del locked_tickers[sym]  # release lock
        else:
            return "SPOOF TRAP / FREEZE", "Flashing Amber Alert"

    if obi > OBI_THRESHOLD and ofi > 0:
        return "BUY / LONG", "High-Contrast Green"
    elif obi < -OBI_THRESHOLD and ofi < 0:
        return "SELL / SHORT", "High-Contrast Red"
    elif (obi > OBI_THRESHOLD and ofi < 0) or (obi < -OBI_THRESHOLD and ofi > 0):
        locked_tickers[sym] = now
        return "SPOOF TRAP / FREEZE", "Flashing Amber Alert"
    else:
        return "NO SIGNAL / HOLD", "Neutral Gray"

async def stream_and_calculate():
    async with websockets.connect(NODE_WS_URL) as ws:
        client = db.Live(key="DATABENTO_API_KEY")
        client.subscribe(
            dataset="GLBX.MDP3",
            schema="bbo-1s",
            symbols=["NVDA", "AAPL"]
        )

        while True:
            for record in client.flush():
                if not isinstance(record, db.BBOMsg):
                    continue

                sym = record.hd.instrument_id

                denominator = record.bid_sz + record.ask_sz
                obi = (record.bid_sz - record.ask_sz) / denominator if denominator != 0 else 0.0

                ofi = calculate_bbo_ofi(prev_state[sym], record) if sym in prev_state else 0

                signal, visual = determine_signal_state(sym, obi, ofi)

                payload = {
                    "ticker": sym,
                    "obi": round(obi, 2),
                    "ofi": ofi,
                    "signal": signal,
                    "visual": visual
                }
                await ws.send(json.dumps(payload))
                prev_state[sym] = record

            await asyncio.sleep(1.0)

```

### 🟢 B. Node.js Fast Route Gateway (`backend/server.js`)
Configured to handle connection path logic and map raw telemetry across decoupled target boundaries.

```javascript
const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

let pythonClient = null;
const uiClients = new Set();

wss.on('connection', (ws, req) => {
  if (req.url === '/python-bridge') {
    pythonClient = ws;
    ws.on('message', (message) => {
      // Pass-Through Forwarding: No computational decoding overhead
      const rawData = message.toString();
      uiClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(rawData);
        }
      });
    });
  } else if (req.url === '/ui-client') {
    uiClients.add(ws);
    ws.on('close', () => uiClients.delete(ws));
  }
});

server.listen(8080);
```

---

## 3. Mathematical Signal Logic (Every 1,000ms Tick)

### Part A: Order Book Imbalance (OBI)
Evaluates real-time depth volume snapshot asymmetry across the top 5 bid/ask market layers at tick $T_1$:

$$\text{Total\_Bid\_Size} = \sum_{n=1}^{5} \text{Bid\_Size}_n$$
$$\text{Total\_Ask\_Size} = \sum_{n=1}^{5} \text{Ask\_Size}_n$$

$$\text{OBI} = \frac{\text{Total\_Bid\_Size} - \text{Total\_Ask\_Size}}{\text{Total\_Bid\_Size} + \text{Total\_Ask\_Size}}$$

* **Output Boundary:** `[-1.0, +1.0]`

### Part B: Order Flow Imbalance (OFI)
Tracks localized order execution velocity shifts occurring during the historical 1-second window ($T_0 \to T_1$):

```python
def calculate_databento_ofi(prev_record: db.MBP10Msg, curr_record: db.MBP10Msg, depth: int = 5) -> int:
    ofi = 0
    for i in range(depth):
        p_lvl, c_lvl = prev_record.levels[i], curr_record.levels[i]
        
        # Bid Layer Velocity Modification
        if c_lvl.bid_px == p_lvl.bid_px: ofi += (c_lvl.bid_sz - p_lvl.bid_sz)
        elif c_lvl.bid_px > p_lvl.bid_px: ofi += c_lvl.bid_sz
        else: ofi -= p_lvl.bid_sz

        # Ask Layer Velocity Modification
        if c_lvl.ask_px == p_lvl.ask_px: ofi -= (c_lvl.ask_sz - p_lvl.ask_sz)
        elif c_lvl.ask_px > p_lvl.ask_px: ofi += c_lvl.ask_sz
        else: ofi -= p_lvl.ask_sz
    return ofi
```

---

## 4. UI Decision Matrix & State Controls

Signal evaluation runs against structural bounds (Default Threshold: $\text{OBI} = 0.35$).

| OBI Value | OFI Value | UI Text State | Visual Treatment | Market Mapping |
| :--- | :--- | :--- | :--- | :--- |
| $> +0.35$ | Positive ($> 0$) | **BUY / LONG** | High-Contrast Green | Legitimate aggressive buying interest. |
| $< -0.35$ | Negative ($< 0$) | **SELL / SHORT** | High-Contrast Red | Legitimate aggressive liquidating interest. |
| $> +0.35$ | Negative ($< 0$) | **SPOOF TRAP / FREEZE** | Flashing Amber Alert | Deceptive institutional bid layer packing. |
| $< -0.35$ | Positive ($> 0$) | **SPOOF TRAP / FREEZE** | Flashing Amber Alert | Deceptive institutional ask layer packing. |
| *Any other mix* | *Any* | **NO SIGNAL / HOLD** | Neutral Gray | No structural edge / noise. |

### The Spoof-Trap Cooldown Circuit Breaker
1. **Trigger:** If a row meets a spoof profile condition, its backend state sets `Ticker_Status = LOCKED`.
2. **Action:** The system saves the timestamp `Freeze_Start_Time = Current_Time`. The UI alert text freezes on `SPOOF TRAP / FREEZE`.
3. **Execution Ingestion:** Background stream ingestion ticks continue updating trailing book memories ($T_0 \to T_1$), but updating visual notifications for that ticker is explicitly suppressed for **5 seconds**.
4. **Flush Mechanism:** Once `Current_Time >= Freeze_Start_Time + 5.0s`, the engine clears the `LOCKED` state flag and resets local metric variables to eliminate old data contamination.

---

## 5. UI Grid Schema Sync
The frontend browser component maps fields sequentially across these columns:
1. **Ticker** (`string`)
2. **Price** (`float`)
3. **OBI** (`float`, bounded `[-1.00, 1.00]`)
4. **OFI** (`integer`, net share units)
5. **Signal** (`string`, mapped with distinct CSS high-contrast classes)

---

## 6. Future Tuning: Per-Ticker OBI Threshold

Currently `OBI_THRESHOLD = 0.35` is fixed for all tickers. To fine-tune later:

1. Replace the single constant with a per-ticker config:

```python
TICKER_THRESHOLDS = {
    "NVDA": 0.35,
    "TSLA": 0.45,   # more volatile, needs a higher bar
    "AAPL": 0.30,   # calmer, lower bar is fine
}
DEFAULT_THRESHOLD = 0.35

def get_threshold(sym):
    return TICKER_THRESHOLDS.get(sym, DEFAULT_THRESHOLD)
```

2. Use `get_threshold(sym)` in place of `OBI_THRESHOLD` inside `determine_signal_state()`.
3. Adjust values by watching live signals — raise a ticker's threshold if it throws too many false BUY/SELL flags, lower it if it's missing real moves.
4. (Optional, later) Auto-calculate threshold from each ticker's rolling average OBI instead of hardcoding — only worth doing once you have enough live data to justify it.