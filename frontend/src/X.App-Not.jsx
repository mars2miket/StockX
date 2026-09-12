import { useEffect, useRef, useState } from 'react';
import {
  BACKEND_URL,
  WS_URL,
  sessions,
  CUSTOM_TICKERS_KEY,
  MAX_FLOAT_KEY,
  FLOAT_DEFAULT,
  APP_HEADER_HEIGHT,
  THEME_KEY,
  THEMES,
  PRICE_MIN_KEY,
  PRICE_MAX_KEY,
  CHANGE_MIN_KEY,
} from './X.constants';
import EarningsCalendar from './X.EarningsCalendar';
import StockTable from './X.StockTable';

// ============================================================
// FILTER BAR COMPONENT (inline in App)
// ============================================================

function FilterBar({ filters, onFilterChange, onApply, theme }) {
  const { priceMin, priceMax, changeMin, floatMax } = filters;

  return (
// Filter Bar - Make it sticky
// Inside the FilterBar component style object:
<div
  style={{
    position: 'sticky',
    top: APP_HEADER_HEIGHT,
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '8px 16px', 
    flexWrap: 'nowrap', // Changed from 'wrap' to prevent layout shifts
    overflowX: 'auto', // Allows scrolling on smaller windows instead of pushing elements down
    borderBottom: `1px solid ${theme.border}`,
    marginBottom: '0px',  
    background: theme.surface,
    height: '56px', // Enforce rigid fixed sizing
    maxHeight: '56px',
    boxSizing: 'border-box',
    transition: 'background 0.3s ease, border-color 0.3s ease',
  }}
>

      {/* Price Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ color: theme.textMuted, fontSize: '13px', fontWeight: 600 }}>Price:</span>
        <span style={{ color: theme.textMuted, fontSize: '13px' }}>$</span>
        <input
          type="text"
          inputMode="numeric"
          placeholder="Min"
          value={priceMin === null ? '' : priceMin}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '');
            onFilterChange('priceMin', val === '' ? null : Number(val));
          }}
          style={{
            width: '60px',
            padding: '4px 6px',
            fontSize: '13px',
            color: theme.text,
            background: theme.inputBg,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: '4px',
            outline: 'none',
          }}
        />
        <span style={{ color: theme.textMuted, fontSize: '13px' }}>-</span>
        <span style={{ color: theme.textMuted, fontSize: '13px' }}>$</span>
        <input
          type="text"
          inputMode="numeric"
          placeholder="Max"
          value={priceMax === null ? '' : priceMax}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '');
            onFilterChange('priceMax', val === '' ? null : Number(val));
          }}
          style={{
            width: '60px',
            padding: '4px 6px',
            fontSize: '13px',
            color: theme.text,
            background: theme.inputBg,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: '4px',
            outline: 'none',
          }}
        />
      </div>

      {/* %Chg Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ color: theme.textMuted, fontSize: '13px', fontWeight: 600 }}>%Chg:</span>
        <input
          type="text"
          inputMode="numeric"
          placeholder="Min %"
          value={changeMin === null ? '' : changeMin}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '');
            onFilterChange('changeMin', val === '' ? null : Number(val));
          }}
          style={{
            width: '55px',
            padding: '4px 6px',
            fontSize: '13px',
            color: theme.text,
            background: theme.inputBg,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: '4px',
            outline: 'none',
          }}
        />
        <span style={{ color: theme.textMuted, fontSize: '13px' }}>%</span>
      </div>

      {/* Float Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ color: theme.textMuted, fontSize: '13px', fontWeight: 600 }}>Float:</span>
        <input
          type="text"
          inputMode="numeric"
          placeholder="Max"
          value={floatMax === null ? '' : floatMax}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '');
            onFilterChange('floatMax', val === '' ? null : Number(val));
          }}
          style={{
            width: '55px',
            padding: '4px 6px',
            fontSize: '13px',
            color: theme.text,
            background: theme.inputBg,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: '4px',
            outline: 'none',
          }}
        />
        <span style={{ color: theme.textMuted, fontSize: '13px' }}>mil</span>
      </div>

      {/* Apply Button */}
      <button
        onClick={onApply}
        style={{
          padding: '6px 20px',
          fontSize: '13px',
          fontWeight: 600,
          background: theme.btnBg,
          color: theme.btnText,
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = theme.btnHover)}
        onMouseLeave={(e) => (e.currentTarget.style.background = theme.btnBg)}
      >
        Apply Filters
      </button>

      {/* Reset Link */}
      <button
        onClick={() => {
          onFilterChange('priceMin', null);
          onFilterChange('priceMax', null);
          onFilterChange('changeMin', null);
          onFilterChange('floatMax', 20);
          onApply();
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: theme.textMuted,
          fontSize: '12px',
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        Reset
      </button>
    </div>
  );
}

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
  const [activeTab, setActiveTab] = useState('MARKET_ALERT');
  const [sortKey, setSortKey] = useState('changePercent');
  const [sortDir, setSortDir] = useState('desc');

  // ---- Filter State ----
  const [filters, setFilters] = useState(() => {
    try {
      const savedMin = localStorage.getItem(PRICE_MIN_KEY);
      const savedMax = localStorage.getItem(PRICE_MAX_KEY);
      const savedChange = localStorage.getItem(CHANGE_MIN_KEY);
      const savedFloat = localStorage.getItem(MAX_FLOAT_KEY);
      return {
        priceMin: savedMin !== null ? Number(savedMin) : null,
        priceMax: savedMax !== null ? Number(savedMax) : null,
        changeMin: savedChange !== null ? Number(savedChange) : null,
        floatMax: savedFloat !== null ? Number(savedFloat) : FLOAT_DEFAULT,
      };
    } catch {
      return {
        priceMin: null,
        priceMax: null,
        changeMin: null,
        floatMax: FLOAT_DEFAULT,
      };
    }
  });

  // Applied filters (what's actually used in the table)
  const [appliedFilters, setAppliedFilters] = useState(filters);

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

  // ---- Filter Handlers ----
  function handleFilterChange(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function handleApplyFilters() {
    setAppliedFilters({ ...filters });
    // Persist to localStorage
    localStorage.setItem(PRICE_MIN_KEY, filters.priceMin !== null ? String(filters.priceMin) : '');
    localStorage.setItem(PRICE_MAX_KEY, filters.priceMax !== null ? String(filters.priceMax) : '');
    localStorage.setItem(CHANGE_MIN_KEY, filters.changeMin !== null ? String(filters.changeMin) : '');
    localStorage.setItem(MAX_FLOAT_KEY, String(filters.floatMax ?? FLOAT_DEFAULT));
  }

  // ---- Data Fetching ----
  useEffect(() => {
    let lastResetDate = new Date().toDateString();

    const fetchData = () => {
      fetch(`${BACKEND_URL}/api/scan`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.qualifying)) {
            const today = new Date().toDateString();
            setStocks((prev) => {
              const base = today === lastResetDate ? prev : [];
              lastResetDate = today;
              const byTicker = new Map(base.map((s) => [s.ticker, s]));
              for (const quote of data.qualifying) {
                byTicker.set(quote.ticker, quote);
              }
              return Array.from(byTicker.values());
            });
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };

    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

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

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  // ---- Live OBI (Databento) ----
  const [obiData, setObiData] = useState({});
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'obi') {
          setObiData((prev) => ({ ...prev, [msg.ticker]: msg }));
        }
      } catch {
        // ignore malformed frames
      }
    };
    return () => ws.close();
  }, []);

  // Keep Databento subscriptions in sync with whatever tickers are on screen
  useEffect(() => {
    const tickers = Array.from(
      new Set([...stocks.map((s) => s.ticker), ...earnings.map((e) => e.ticker)])
    );
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN && tickers.length) {
      ws.send(JSON.stringify({ type: 'subscribe', tickers }));
    }
  }, [stocks, earnings]);

  const stocksWithOBI = stocks.map((s) => ({ ...s, ...(obiData[s.ticker] || {}) }));
  const earningsWithOBI = earnings.map((e) => ({ ...e, ...(obiData[e.ticker] || {}) }));

  // ---- Tab Helpers ----
  const activeIndex = sessions.findIndex((s) => s.key === activeTab);
  const tabWidthPercent = 100 / sessions.length;

  // ---- Render ----
  return (
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
        <div style={{ position: 'relative', display: 'flex' }}>
          {sessions.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveTab(s.key)}
              style={{
                flex: 1,
                padding: '10px 0',
                fontWeight: 600,
                fontSize: '14px',
                background: 'transparent',
                color: activeTab === s.key ? theme.accent : theme.textMuted,
                border: 'none',
                borderBottom: `3px solid ${theme.border}`,
                cursor: 'pointer',
                transition: 'color 0.3s ease',
              }}
            >
              {s.label}
            </button>
          ))}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: `${tabWidthPercent}%`,
              height: '3px',
              background: '#bb1919',
              transform: `translateX(${activeIndex * 100}%)`,
              transition: 'transform 0.2s ease',
            }}
          />
        </div>
      </div>

      <div style={{ height: APP_HEADER_HEIGHT }} />

      {/* ====== MAIN CONTENT ====== */}
      {activeTab === 'CALENDAR' ? (
        <div style={{ padding: '0 32px' }}>
          <EarningsCalendar
            earnings={earningsWithOBI}
            loadingCal={loadingCal}
            onAddTicker={handleAddTicker}
            onRemoveTicker={handleRemoveTicker}
            theme={theme}
            themeMode={themeMode}
          />
        </div>
      ) : activeTab === 'CONTROLS' ? (
        // ---- ALERT CONTROLS TAB (same filters + placeholder for future) ----
        <div style={{ padding: '0 32px' }}>
          <div
            style={{
              background: theme.surface,
              borderRadius: '12px',
              padding: '24px',
              border: `1px solid ${theme.border}`,
              marginTop: '16px',
            }}
          >
            <h2 style={{ color: theme.text, marginBottom: '16px', fontSize: '18px' }}>
              🔧 Alert Controls
            </h2>
            <p style={{ color: theme.textMuted, marginBottom: '24px', fontSize: '14px' }}>
              Same filters as the main table — test them here!
            </p>

            {/* Duplicate filter bar for testing */}
            <FilterBar
              filters={filters}
              onFilterChange={handleFilterChange}
              onApply={handleApplyFilters}
              theme={theme}
            />

            <div
              style={{
                marginTop: '24px',
                padding: '16px',
                background: theme.cardBg,
                borderRadius: '8px',
                border: `1px solid ${theme.border}`,
              }}
            >
              <p style={{ color: theme.textMuted, fontSize: '13px' }}>
                💡 Future features for this tab:
              </p>
              <ul style={{ color: theme.textMuted, fontSize: '13px', paddingLeft: '20px' }}>
                <li>Saved filter presets</li>
                <li>Custom watchlists</li>
                <li>Price/volume alerts</li>
                <li>Notification settings</li>
              </ul>
            </div>

            {/* Show filtered stocks preview in Controls tab */}
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ color: theme.text, fontSize: '14px', marginBottom: '12px' }}>
                Preview ({stocks.length} stocks)
              </h3>
              <StockTable
                stocks={stocksWithOBI}
                sessionKey={activeTab}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
                filters={appliedFilters}
                loading={loading}
                theme={theme}
                themeMode={themeMode}
                isControlsTab={true}
              />
            </div>
          </div>
        </div>
      ) : (
        // ---- MARKET ALERT TAB ----
        <div style={{ padding: '0 32px' }}>
          {/* Filter Bar */}
          <FilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
            onApply={handleApplyFilters}
            theme={theme}
          />

          <StockTable
            stocks={stocksWithOBI}
            sessionKey={activeTab}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            filters={appliedFilters}
            loading={loading}
            theme={theme}
            themeMode={themeMode}
            isControlsTab={false}
          />
        </div>
      )}
    </div>
  );
}

export default App;