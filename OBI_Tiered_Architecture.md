# OBI Signal — Tiered Architecture Plan

## Recommendation
Ship Tier 1 now on mock/live MBP-10 data. Upgrade to Tier 2 (MBO/L3) only after Tier 1 is validated and Databento L3 cost/access is confirmed. UI (columns, badges) is shared across both tiers — no rebuild needed when upgrading.

## Tier 1 — Depth-Weighted OBI + Persistence Filter
- Exponential-decay-weighted OBI across MBP-10 levels (closer-to-touch levels weighted more).
- Persistence filter: imbalance must hold across N consecutive snapshots (500ms–1s) before counting — filters obvious single-snapshot spoofs.
- Per-symbol rolling baseline instead of a fixed global threshold.
- Trade-flow (time & sales) confirmation before firing BUY/SELL.
- Output: 0–100 Confidence Score, badge only above a set cutoff.
- **Effort:** days. Straightforward math + polling; fits existing provider pattern.

## Tier 2 — MBO/L3 Anti-Spoofing Upgrade (later)
- Databento MBO (order-ID level) tracking: verify large resting orders are absorbed (real wall) vs. canceled (spoof).
- Iceberg/hidden-liquidity detection at inside market.
- Aggression Ratio from Time & Sales (aggressive buy vol / aggressive sell vol).
- Composite Confidence Score requires OBI + persistence + aggression alignment, badge only above ~80.
- **Effort:** weeks-to-months. Real quant/HFT engineering; success not guaranteed even after building it — needs backtesting before trusting live.
- **Caveat:** single-venue MBO (e.g. EDGX/MEMX) doesn't see full NBBO — signal is venue-limited, not full-tape.

## Resilience layer (build regardless of tier)
- **Tiered degrade:** if MBO/L3 unavailable/too costly/too latent for a symbol, fall back to Tier 1 rather than showing nothing.
- **Signal expiry:** auto-invalidate a badge if it doesn't resolve within its urgency window.
- **Self-audit loop:** log every signal + actual outcome, track rolling hit-rate, auto-mute a signal type that degrades below threshold.
- **Backtest-first:** validate on historical data before trusting any tier live.
