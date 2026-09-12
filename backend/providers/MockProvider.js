// ============================================================
// MOCK PROVIDER - reads from backend/mock-data/stockx_mock.db
// Matches the same function shapes as YahooProvider.js so it can
// be swapped in/out via the import in server.js (see guide §5).
//
// Requires: npm install better-sqlite3
// ============================================================

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'mock-data', 'stockx_mock.db');
const db = new Database(DB_PATH, { readonly: true, fileMustExist: true });

// ---- Market Alert scan (feeds /api/scan -> StockTable) ----
function scanAll() {
  const rows = db.prepare('SELECT * FROM market_alert').all();
  return rows.map((r) => ({
    ticker: r.ticker,
    price: r.price,
    changePercent: r.changePercent,
    volume: r.volume,
    rvol: r.rvol,
    float: r.float,
    country: r.country,
    session: r.session, // 'PRE' | 'REGULAR' | 'POST'
    companyName: null,
    headline: r.headline,
    articleUrl: r.articleUrl,
    publishedAt: r.publishedAt,
    newsType: r.newsType,
    obi: r.obi,
    confidence: r.confidence,
    signalStatus: r.signalStatus, // 'BUY' | 'SELL' | null
    executeTarget: r.executeTarget,
    urgencyDecay: r.urgencyDecay,
  }));
}

// ---- Earnings Calendar (feeds /api/earnings -> EarningsCalendar) ----
function getEarningsCalendar(extras = '') {
  const rows = db.prepare('SELECT * FROM earnings_calendar').all();
  let mapped = rows.map((r) => ({
    ticker: r.ticker,
    expectedDate: r.expectedDate,
    price: r.price,
    changePercent: r.changePercent,
    volume: r.volume,
    rvol: r.rvol,
    float: r.float,
    country: r.country,
    headline: r.headline,
    articleUrl: r.articleUrl,
    publishedAt: r.publishedAt,
    newsType: r.newsType,
    obi: r.obi,
    confidence: r.confidence,
    signalStatus: r.signalStatus,
    executeTarget: r.executeTarget,
    urgencyDecay: r.urgencyDecay,
  }));

  // extras arrives as an array of extra tickers to include (see server.js).
  // Our mock table already represents the full combined watchlist, so we
  // just return everything rather than filtering down to extras only.
  return mapped;
}

// ---- Enrichment step server.js calls per-stock after the initial quote ----
// Mock data already has everything inline, so this is a no-op passthrough.
async function enrichWithProfile(stock) {
  return stock;
}

// ---- Single quote (used by /api/search-style lookups if needed) ----
function getQuote(ticker) {
  const row = db
    .prepare('SELECT * FROM market_alert WHERE ticker = ?')
    .get(String(ticker).toUpperCase());
  if (!row) return null;
  return {
    ticker: row.ticker,
    price: row.price,
    changePercent: row.changePercent,
    volume: row.volume,
    rvol: row.rvol,
    float: row.float,
    country: row.country,
  };
}

module.exports = { scanAll, getEarningsCalendar, getQuote, enrichWithProfile };
