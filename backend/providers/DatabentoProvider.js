// ============================================================
// DATABENTO PROVIDER - Calculates OBI, OFI. See 
// obi_ofi_logic.md file.
// ============================================================

const { Live } = require('databento');

const LAMBDA = 0.35;                     // decay rate for level weighting
const PERSISTENCE_SNAPSHOTS = 3;         // consecutive snapshots required before a signal counts
const OBI_FIRE_THRESHOLD = 0.70;         // |OBI| must clear this to be a candidate signal
const CONFIDENCE_BADGE_THRESHOLD = 80;   // confidence must clear this to actually show a badge
const BASELINE_WINDOW = 200;             // snapshots kept for each symbol's own depth baseline

const state = new Map(); // ticker -> { history, baselineDepth, lastPrice }

function levelWeights(n = 10) {
  return Array.from({ length: n }, (_, i) => Math.exp(-LAMBDA * i));
}
const WEIGHTS = levelWeights(10);

function weightedOBI(bidSizes, askSizes) {
  let bidSum = 0;
  let askSum = 0;
  for (let i = 0; i < 10; i++) {
    bidSum += (bidSizes[i] || 0) * WEIGHTS[i];
    askSum += (askSizes[i] || 0) * WEIGHTS[i];
  }
  const total = bidSum + askSum;
  return total === 0 ? 0 : (bidSum - askSum) / total;
}

function totalDepth(bidSizes, askSizes) {
  return (
    bidSizes.reduce((a, b) => a + (b || 0), 0) +
    askSizes.reduce((a, b) => a + (b || 0), 0)
  );
}

function getSymbolState(ticker) {
  if (!state.has(ticker)) {
    state.set(ticker, { history: [], baselineDepth: [], lastPrice: null });
  }
  return state.get(ticker);
}

// Direction is only valid if the last N snapshots all agree and clear threshold.
function persistedDirection(history) {
  const recent = history.slice(-PERSISTENCE_SNAPSHOTS);
  if (recent.length < PERSISTENCE_SNAPSHOTS) return null;
  if (recent.every((v) => v >= OBI_FIRE_THRESHOLD)) return 'BUY';
  if (recent.every((v) => v <= -OBI_FIRE_THRESHOLD)) return 'SELL';
  return null;
}

// Tier 1 approximation of trade-flow confirmation: recent price direction
// agrees with book imbalance direction. Replace with real Time & Sales
// aggression ratio when upgrading to Tier 2.
function approximateTradeConfirmation(obi, priceDelta) {
  if (obi > 0 && priceDelta > 0) return true;
  if (obi < 0 && priceDelta < 0) return true;
  return false;
}

function computeConfidence(obi, baselineDepth, currentDepth, tradeConfirmed) {
  const strength = Math.min(Math.abs(obi) / OBI_FIRE_THRESHOLD, 1) * 60;
  const avgBaseline = baselineDepth.length
    ? baselineDepth.reduce((a, b) => a + b, 0) / baselineDepth.length
    : currentDepth;
  const depthSignificance =
    avgBaseline > 0 ? (Math.min(currentDepth / avgBaseline, 2) / 2) * 25 : 0;
  const confirmationBonus = tradeConfirmed ? 15 : 0;
  return Math.round(Math.min(strength + depthSignificance + confirmationBonus, 100));
}

function onBookUpdate(ticker, bidSizes, askSizes, lastPrice, onUpdate) {
  const s = getSymbolState(ticker);
  const obi = weightedOBI(bidSizes, askSizes);
  const depth = totalDepth(bidSizes, askSizes);

  s.history.push(obi);
  if (s.history.length > 50) s.history.shift();

  s.baselineDepth.push(depth);
  if (s.baselineDepth.length > BASELINE_WINDOW) s.baselineDepth.shift();

  const priceDelta = s.lastPrice != null ? lastPrice - s.lastPrice : 0;
  s.lastPrice = lastPrice;

  const tradeConfirmed = approximateTradeConfirmation(obi, priceDelta);
  const direction = persistedDirection(s.history);
  const confidence = computeConfidence(obi, s.baselineDepth, depth, tradeConfirmed);
  const badge = direction && tradeConfirmed && confidence >= CONFIDENCE_BADGE_THRESHOLD
    ? direction
    : null;

  onUpdate({
    ticker,
    obi: Number(obi.toFixed(2)),
    confidence,
    signalStatus: badge,
    executeTarget: badge ? lastPrice : null,
    urgencyDecay: badge ? 12 : null, // static window for Tier 1 - refine per §OBI_Tiered_Architecture Tier 2
  });
}

let liveClient = null;
const subscribed = new Set();

function start(onUpdate) {
  liveClient = new Live({ key: process.env.DATABENTO_API_KEY });

  liveClient.on('mbp-10', (record) => {
    const ticker = record.symbol;
    if (!subscribed.has(ticker)) return;
    const bidSizes = record.levels.map((l) => l.bid_sz);
    const askSizes = record.levels.map((l) => l.ask_sz);
    const lastPrice = record.levels[0]?.bid_px ?? null;
    if (lastPrice == null) return;
    onBookUpdate(ticker, bidSizes, askSizes, lastPrice, onUpdate);
  });

  liveClient.start();
}

function subscribe(tickers) {
  const newOnes = tickers.filter((t) => !subscribed.has(t));
  tickers.forEach((t) => subscribed.add(t));
  if (liveClient && newOnes.length) {
    liveClient.subscribe({
      dataset: 'XNAS.ITCH', // set to your venue dataset (e.g. EDGX, MEMX) per OBI_Tiered_Architecture.md
      schema: 'mbp-10',
      symbols: newOnes,
    });
  }
}

function unsubscribe(tickers) {
  tickers.forEach((t) => subscribed.delete(t));
}

module.exports = { start, subscribe, unsubscribe };
