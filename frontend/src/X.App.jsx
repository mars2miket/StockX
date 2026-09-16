import { useEffect, useState } from 'react';
import {
  BACKEND_URL,
  sessions,
  DEFAULT_TAB,
  ACTIVE_TAB_KEY,
  SORT_KEY,
  CUSTOM_TICKERS_KEY,
  MARKET_CUSTOM_TICKERS_KEY,
  MAX_CUSTOM_TICKERS,
  APP_HEADER_HEIGHT,
  THEME_KEY,
  THEMES,
} from './X.constants';
import EarningsCalendar from './X.EarningsCalendar';
//import WatchList from './X.WatchList';
import StockTable from './X.StockTable';

// ============================================================
// MAIN APP COMPONENT
// ============================================================

function App() {
  // ---- Theme State ----
  const [themeMode, setThemeMode] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return saved || 'dark';
    } catch {
      return 'dark';
    }
  });

  const theme = THEMES[themeMode] || THEMES.dark;

  // ---- Stock Data ----
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---- Tab + Sort (persisted) ----
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_TAB_KEY);
      return sessions.some((s) => s.key === saved) ? saved : DEFAULT_TAB;
    } catch {
      return DEFAULT_TAB;
    }
  });

  const [sort, setSort] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SORT_KEY) || 'null');
      return saved?.key ? saved : { key: 'changePercent', dir: 'desc' };
    } catch {
      return { key: 'changePercent', dir: 'desc' };
    }
  });
  const { key: sortKey, dir: sortDir } = sort;

  function selectTab(key) {
    setActiveTab(key);
    try {
      localStorage.setItem(ACTIVE_TAB_KEY, key);
    } catch {}
  }

  // ---- Market Alert: manually-added tickers ----
  const [marketCustomTickers, setMarketCustomTickers] = useState(() => {
    try {
      const saved = localStorage.getItem(MARKET_CUSTOM_TICKERS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // ---- Earnings Calendar ----
  const [earnings, setEarnings] = useState([]);
  const [loadingCal, setLoadingCal] = useState(true);
  const [customTickers, setCustomTickers] = useState(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_TICKERS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // ---- Theme Toggle ----
  function toggleTheme() {
    const next = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(next);
    localStorage.setItem(THEME_KEY, next);
  }

  // ---- Data Fetching (Market Alert only - suspended while tab hidden) ----
  useEffect(() => {
    if (activeTab !== 'MARKET_ALERT') {
      setLoading(false);
      return;
    }

    let lastResetDate = new Date().toDateString();

    const fetchData = () => {
      fetch(`${BACKEND_URL}/api/scan`)
        .then((res) => res.json())
        .then((data) => {
          const scanQuotes = Array.isArray(data.qualifying) ? data.qualifying : [];

          // Refresh manually-added tickers too, so they stay live like the rest
          const customFetches = marketCustomTickers.map((ticker) =>
            fetch(`${BACKEND_URL}/api/quote/${ticker}`)
              .then((res) => res.json())
              .catch(() => null)
          );

          Promise.all(customFetches).then((customQuotes) => {
            const today = new Date().toDateString();
            setStocks((prev) => {
              const base = today === lastResetDate ? prev : [];
              lastResetDate = today;
              const byTicker = new Map(base.map((s) => [s.ticker, s]));
              for (const quote of scanQuotes) {
                byTicker.set(quote.ticker, quote);
              }
              for (const quote of customQuotes) {
                if (quote && quote.ticker) byTicker.set(quote.ticker, quote);
              }
              return Array.from(byTicker.values());
            });
            setLoading(false);
          });
        })
        .catch(() => setLoading(false));
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [marketCustomTickers, activeTab]);

  function persistMarketCustomTickers(next) {
    setMarketCustomTickers(next);
    localStorage.setItem(MARKET_CUSTOM_TICKERS_KEY, JSON.stringify(next));
  }

  async function handleAddMarketTicker(symbol) {
    if (marketCustomTickers.includes(symbol)) return false;
    if (marketCustomTickers.length >= MAX_CUSTOM_TICKERS) return false;
    try {
      const res = await fetch(`${BACKEND_URL}/api/quote/${symbol}`);
      const quote = await res.json();
      if (!quote || !quote.ticker) return false;
      setStocks((prev) => {
        const byTicker = new Map(prev.map((s) => [s.ticker, s]));
        byTicker.set(quote.ticker, quote);
        return Array.from(byTicker.values());
      });
      persistMarketCustomTickers([...marketCustomTickers, symbol]);
      return true;
    } catch {
      return false;
    }
  }

  // ---- Earnings Fetching ----
  useEffect(() => {
    if (customTickers.length === 0) {
      setLoadingCal(false);
      return;
    }
    fetch(`${BACKEND_URL}/api/earnings?extras=${customTickers.join(',')}`)
      .then((res) => res.json())
      .then((data) => {
        setEarnings(data.earnings || []);
        setLoadingCal(false);
      })
      .catch(() => setLoadingCal(false));
  }, [customTickers]);

  function persistCustomTickers(next) {
    setCustomTickers(next);
    localStorage.setItem(CUSTOM_TICKERS_KEY, JSON.stringify(next));
  }

  async function handleAddTicker(symbol) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/earnings?extras=${symbol}`);
      const data = await res.json();
      const match = (data.earnings || [])[0];
      if (!match) return false;
      setEarnings((prev) => [...prev, match]);
      persistCustomTickers([...customTickers, symbol]);
      return true;
    } catch {
      return false;
    }
  }

  function handleRemoveTicker(symbol) {
    setEarnings((prev) => prev.filter((e) => e.ticker !== symbol));
    persistCustomTickers(customTickers.filter((t) => t !== symbol));
  }

  function handleRemoveMarketTicker(symbol) {
    setStocks((prev) => prev.filter((s) => s.ticker !== symbol));
    persistMarketCustomTickers(marketCustomTickers.filter((t) => t !== symbol));
  }

  function handleSort(key) {
    const next =
      sortKey === key
        ? { key, dir: sortDir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'desc' };
    setSort(next);
    try {
      localStorage.setItem(SORT_KEY, JSON.stringify(next));
    } catch {}
  }

  // ---- Render ----
  return (
    <>
    <style>{`html, body, #root { margin: 0; padding: 0; width: 100%; }`}</style>
    <div
      style={{
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        background: theme.bg,
        minHeight: '100vh',
        color: theme.text,
        padding: '0 0 32px 0',
        transition: 'background 0.3s ease, color 0.3s ease',
      }}
    >
      {/* ====== HEADER ====== */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: theme.headerBg,
          padding: '12px 32px 0 32px',
          borderBottom: `1px solid ${theme.border}`,
          height: APP_HEADER_HEIGHT,
          boxSizing: 'border-box',
          transition: 'background 0.3s ease, border-color 0.3s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: theme.text }}>
            StockX
          </h1>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '22px',
              cursor: 'pointer',
              color: theme.text,
              padding: '4px 8px',
              borderRadius: '8px',
              transition: 'background 0.3s ease, transform 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = theme.border)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            title={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {themeMode === 'dark' ? '🌙' : '☀️'}
            <span style={{ fontSize: '12px', fontWeight: 500 }}>
              {themeMode === 'dark' ? 'Dark' : 'Light'}
            </span>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '4px' }}>
          {sessions.map((s) => (
            <button
              key={s.key}
              onClick={() => selectTab(s.key)}
              style={{
                padding: '10px 20px',
                fontWeight: 600,
                fontSize: '14px',
                background: 'transparent',
                color: activeTab === s.key ? theme.accent : theme.textMuted,
                border: 'none',
                borderBottom: `3px solid ${activeTab === s.key ? '#bb1919' : 'transparent'}`,
                cursor: 'pointer',
                transition: 'color 0.3s ease, border-color 0.2s ease',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: APP_HEADER_HEIGHT }} />

      {/* ====== MAIN CONTENT ====== */}
      {activeTab === 'CALENDAR' ? (
        <div style={{ padding: '0 32px' }}>
          <EarningsCalendar
            earnings={earnings}
            loadingCal={loadingCal}
            onAddTicker={handleAddTicker}
            onRemoveTicker={handleRemoveTicker}
            theme={theme}
            themeMode={themeMode}
          />
        </div>
      ) : (
        // ---- MARKET ALERT TAB ----
        <div style={{ padding: '0 32px' }}>
          <StockTable
            stocks={stocks}
            sessionKey={activeTab}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            loading={loading}
            theme={theme}
            themeMode={themeMode}
            isControlsTab={false}
            onAddTicker={handleAddMarketTicker}
            onRemoveTicker={handleRemoveMarketTicker}
            customTickers={marketCustomTickers}
          />
        </div>
      )}
    </div>
    </>
  );
}

export default App;
