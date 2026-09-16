require('dotenv').config();
console.log('Finnhub key loaded:', process.env.FINNHUB_API_KEY ? 'yes' : 'NO - missing');

const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

app.use(cors());

const yahooProvider = require('./providers/YahooProvider');
//const yahooProvider = require('./providers/MockProvider');
const finnhubProvider = require('./providers/FinnhubProvider');
//const { meetsConditions } = require('./providers/scanFilters');

// ---- Databento live signals (OBI / SIGNAL) ----
// NOTE: DatabentoProvider.js as written only computes OBI + a confidence-gated
// signalStatus - there is no separate OFI (Order Flow Imbalance) calculation
// in that file yet, despite OFI being named in the app summary. OFI FLOW is
// left null/'-' below until that logic is added to DatabentoProvider.js.
const latestSignals = new Map(); // ticker -> { obi, confidence, signalStatus }
const subscribedTickers = new Set();
let databentoProvider = { subscribe: () => {}, unsubscribe: () => {} }; // no-op fallback

try {
  databentoProvider = require('./providers/DatabentoProvider');
  if (process.env.DATABENTO_API_KEY) {
    databentoProvider.start((update) => {
      latestSignals.set(update.ticker, update);
    });
  } else {
    console.log('DATABENTO_API_KEY not set - OBI / SIGNAL columns will be empty.');
  }
} catch (e) {
  // Most likely the 'databento' npm package isn't installed yet - don't let
  // that take down the whole server (it did before this fix).
  console.log('Databento provider unavailable, continuing without it:', e.message);
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/quote/:ticker', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const quote = await yahooProvider.getQuote(ticker);

    if (!subscribedTickers.has(ticker) && process.env.DATABENTO_API_KEY) {
      databentoProvider.subscribe([ticker]);
      subscribedTickers.add(ticker);
    }
    const signal = latestSignals.get(ticker);

    res.json({
      ...quote,
      obi: signal ? signal.obi : null,
      ofi: null,
      signalStatus: signal ? signal.signalStatus : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/profile/:ticker', async (req, res) => {
  try {
    const profile = await yahooProvider.getProfile(req.params.ticker);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/scan', async (req, res) => {
  try {
    const allQuotes = await yahooProvider.scanAll();
    const qualifying = allQuotes;

    // Subscribe any newly-qualifying tickers to the live Databento feed
    const newTickers = qualifying.map(s => s.ticker).filter(t => !subscribedTickers.has(t));
    if (newTickers.length && process.env.DATABENTO_API_KEY) {
      databentoProvider.subscribe(newTickers);
      newTickers.forEach(t => subscribedTickers.add(t));
    }

    const enriched = qualifying.map((stock) => {
      const signal = latestSignals.get(stock.ticker);
      return {
        ...stock,
        obi: signal ? signal.obi : null,
        ofi: null, // not yet computed - see note near databentoProvider.start above
        signalStatus: signal ? signal.signalStatus : null,
      };
    });

    res.json({ total: allQuotes.length, qualifying: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/scan/debug', async (req, res) => {
  try {
    const allQuotes = await yahooProvider.scanAll();
    res.json(allQuotes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/earnings?extras=AAPL,TSLA,MSFT
// Merges MARKET_LEADERS (defined in YahooProvider.js) with any extra tickers
// the frontend's "Add symbol" modal has added.
app.get('/api/earnings', async (req, res) => {
  try {
    const extrasParam = req.query.extras || '';
    const extraTickers = extrasParam
      .split(',')
      .map(t => t.trim().toUpperCase())
      .filter(Boolean);

    const earningsList = await yahooProvider.getEarningsCalendar(extraTickers);

    // Subscribe any newly-seen tickers to the live Databento feed
    const newTickers = earningsList.map(s => s.ticker).filter(t => !subscribedTickers.has(t));
    if (newTickers.length && process.env.DATABENTO_API_KEY) {
      databentoProvider.subscribe(newTickers);
      newTickers.forEach(t => subscribedTickers.add(t));
    }

    const enriched = [];
    for (const stock of earningsList) {
      try {
        const news = await finnhubProvider.getNews(stock.ticker);
        const signal = latestSignals.get(stock.ticker);
        enriched.push({
          ...stock,
          ...news,
          obi: signal ? signal.obi : null,
          ofi: null, // not yet computed - see note near databentoProvider.start above
          signalStatus: signal ? signal.signalStatus : null,
        });
      } catch (e) {
        console.log(`Error fetching news for ${stock.ticker}:`, e.message);
        enriched.push({ ...stock, headline: null, publishedAt: null, articleUrl: null, newsType: null, obi: null, ofi: null, signalStatus: null });
      }
    }

    res.json({ earnings: enriched });
  } catch (err) {
    console.error('Earnings error:', err);
    res.status(500).json({ earnings: [], error: 'Failed to load earnings' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

app.get('/api/search', async (req, res) => {
  try {
    const results = await yahooProvider.searchTickers(req.query.q || '');
    res.json({ results });
  } catch (err) {
    res.status(500).json({ results: [], error: err.message });
  }
});

