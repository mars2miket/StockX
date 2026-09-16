import { useEffect, useState, useRef } from 'react';
import { BACKEND_URL, MAX_CUSTOM_TICKERS, STICKY_TH, NEWS_TYPE_COLOR, APP_HEADER_HEIGHT } from './X.constants';

// ============================================================
// COLUMNS (RVOL REMOVED - merged into Volume)
// ============================================================

const earningsColumns = [
  { key: 'ticker', label: 'Ticker' },
  { key: 'expectedDate', label: 'Earnings' },
  { key: 'price', label: 'Price' },
  { key: 'changePercent', label: '%Chg' },
  { key: 'rvol', label: 'RVOL' },
  { key: 'float', label: 'Float (M)' },
  { key: 'obi', label: 'OBI' },
  { key: 'ofi', label: 'OFI' },
  { key: 'signalStatus', label: 'Signal' },
];



// ============================================================
// SIGNAL BADGE
// NOTE: DatabentoProvider.js (as written) only returns 'BUY' / 'SELL' / null.
// There is no SPOOF TRAP detection logic in that file yet.
// ============================================================

const SIGNAL_BADGE = {
  BUY: { label: 'BUY / LONG', color: '#4ade80' },
  SELL: { label: 'SELL / SHORT', color: '#f87171' },
  SPOOF: { label: 'SPOOF TRAP / FREEZE', color: '#facc15' },
};

// ============================================================
// FORMATTING HELPERS
// ============================================================

function formatFloat(float) {
  if (float === null || float === undefined) return '—';
  return (float / 1_000_000).toFixed(1);
}

function formatSignedNumber(n) {
  if (n === null || n === undefined) return '—';
  return n.toFixed(2);
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  const target = new Date(dateStr);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function EarningsCalendar({
//export default function WatchList({
  earnings,
  loadingCal,
  onAddTicker,
  onRemoveTicker,
  theme,
  themeMode,
}) {
  const [sortKey, setSortKey] = useState('expectedDate');
  const [sortDir, setSortDir] = useState('asc');
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const [hoveredTicker, setHoveredTicker] = useState(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // No filter bar above this table, so stick to just the fixed header height
  const stickyTh = STICKY_TH(theme, APP_HEADER_HEIGHT);

  // ---- Search Logic ----
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') closeSearch();
    }
    if (showSearch) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showSearch]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      fetch(`${BACKEND_URL}/api/search?q=${encodeURIComponent(query.trim())}`)
        .then((res) => res.json())
        .then((data) => {
          setSearchResults(data.results || []);
          setSearching(false);
        })
        .catch(() => {
          setSearchResults([]);
          setSearching(false);
        });
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // ---- Sort ----
  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  // ---- Search Modal ----
  function openSearch() {
    setShowSearch(true);
    setQuery('');
    setSearchResults([]);
    setAddError('');
  }

  function closeSearch() {
    setShowSearch(false);
    setQuery('');
    setSearchResults([]);
    setAddError('');
  }

  async function handleSelectResult(symbol) {
    if (earnings.some((e) => e.ticker === symbol)) {
      setAddError('Ticker already in the list');
      return;
    }
    if (earnings.length >= MAX_CUSTOM_TICKERS) {
      setAddError(`Maximum of ${MAX_CUSTOM_TICKERS} tickers reached`);
      return;
    }
    setAdding(true);
    setAddError('');
    const ok = await onAddTicker(symbol);
    setAdding(false);
    if (ok) {
      setQuery('');
      setSearchResults([]);
      inputRef.current?.focus();
    } else {
      setAddError(`Couldn't load data for ${symbol}`);
    }
  }

  // ---- Sort Data ----
  const sorted = [...(earnings || [])].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (typeof aVal === 'string') {
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
      <div
        style={{
          borderRadius: '12px',
          border: `1px solid ${theme.border}`,
          overflow: 'visible',
          transition: 'border-color 0.3s ease, background 0.3s ease',
        }}
      >
        <table
          style={{
            borderCollapse: 'separate',
            borderSpacing: 0,
            width: '100%',
            minWidth: '1000px',
            tableLayout: 'fixed',
            background: theme.tableBg,
            color: theme.text,
            transition: 'background 0.3s ease, color 0.3s ease',
          }}
        >
          <colgroup>
            <col style={{ width: '9%' }} /> //ticker
            <col style={{ width: '9%' }} /> //earnings
            <col style={{ width: '7%' }} /> //price
            <col style={{ width: '7%' }} /> //chg
            <col style={{ width: '7%' }} /> //rvol
            <col style={{ width: '9%' }} /> //float
            <col style={{ width: '6%' }} /> //obi
            <col style={{ width: '6%' }} /> //ofi
            <col style={{ width: '12%' }} /> //signal
            <col style={{ width: '28%' }} /> //news
          </colgroup>

          {/* ====== THEAD ====== */}
          <thead>
            <tr style={{ background: theme.surfaceAlt }}>
              {earningsColumns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  style={{
                    ...stickyTh,
                    padding: '10px 10px',
                    fontSize: '13px',
                    textAlign: 'left',
                    color: theme.accent,
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                    borderRight: `1px solid ${theme.border}`,
                    transition: 'color 0.3s ease, background 0.3s ease, border-color 0.3s ease',
                  }}
                >
                  {col.key === 'ticker' ? (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                      }}
                    >
                      <span>
                        {col.label}{' '}
                        {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openSearch();
                        }}
                        title="Add symbol"
                        style={{
                          background: 'transparent',
                          border: `1px solid ${theme.accent}`,
                          color: theme.accent,
                          borderRadius: '4px',
                          width: '22px',
                          height: '22px',
                          fontSize: '16px',
                          lineHeight: '1',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                          flexShrink: 0,
                          transition: 'border-color 0.3s ease, color 0.3s ease',
                        }}
                      >
                        +
                      </button>
                    </span>
                  ) : (
                    <>
                      {col.label}{' '}
                      {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    </>
                  )}
                </th>
              ))}
              <th
                style={{
                  ...stickyTh,
                  padding: '10px 10px',
                  color: theme.accent,
                  fontSize: '13px',
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.3s ease, background 0.3s ease',
                }}
              >
                News
              </th>
            </tr>
          </thead>

          {/* ====== TBODY ====== */}
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ padding: '48px', textAlign: 'center', color: theme.textMuted }}>
                  {loadingCal ? 'Loading...' : 'Click + to add a ticker'}
                </td>
              </tr>
            ) : (
              sorted.map((e, i) => {
                const days = daysUntil(e.expectedDate);
                const isToday = days === -1;
                const isSoon = days !== null && days > 0 && days <= 7;
                const isHovered = hoveredTicker === e.ticker;
                const isEven = i % 2 === 0;
                const rowBg = isEven ? theme.stripeEven : theme.stripeOdd;

                return (
                  <tr
                    key={e.ticker}
                    onMouseEnter={() => setHoveredTicker(e.ticker)}
                    onMouseLeave={() => setHoveredTicker(null)}
                    style={{
                      background: rowBg,
                      borderTop: `1px solid ${theme.border}`,
                      transition: 'background 0.3s ease, border-color 0.3s ease',
                    }}
                  >
                    {/* Ticker */}
                    <td
                      style={{
                        padding: '6px 10px',
                        fontSize: '13px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        borderRight: `1px solid ${theme.border}`,
                      }}
                    >
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                        }}
                      >
                        <span title={e.companyName || ''}>{e.ticker}</span>
                        {isHovered && (
                          <button
                            onClick={() => onRemoveTicker(e.ticker)}
                            title={`Remove ${e.ticker}`}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: theme.accentDanger,
                              cursor: 'pointer',
                              fontSize: '14px',
                              padding: '2px 4px',
                              lineHeight: 1,
                              flexShrink: 0,
                              transition: 'color 0.3s ease',
                            }}
                          >
                            🗑
                          </button>
                        )}
                      </span>
                    </td>

                    {/* Earnings Call Date */}
                    <td
                      style={{
                        padding: '6px 10px',
                        fontSize: '13px',
                        whiteSpace: 'nowrap',
                        borderRight: `1px solid ${theme.border}`,
                        color: isToday ? '#767bff' : isSoon ? theme.accentDanger : theme.text,
                        fontWeight: isToday || isSoon ? '800' : 'normal',
                      }}
                    >
                      {e.expectedDate || 'N/A'}
                    </td>

                    {/* Price */}
                    <td
                      style={{
                        padding: '6px 10px',
                        fontSize: '13px',
                        whiteSpace: 'nowrap',
                        borderRight: `1px solid ${theme.border}`,
                      }}
                    >
                      ${e.price}
                    </td>

                    {/* %Chg */}
                    <td
                      style={{
                        padding: '6px 10px',
                        fontSize: '13px',
                        whiteSpace: 'nowrap',
                        borderRight: `1px solid ${theme.border}`,
                        color: e.changePercent >= 0 ? theme.accent : theme.accentDanger,
                        transition: 'color 0.3s ease',
                      }}
                    >
                      {e.changePercent != null ? `${e.changePercent.toFixed(2)}%` : 'N/A'}
                    </td>

                    {/* RVOL */}
                    <td
                      style={{
                        padding: '6px 10px',
                        fontSize: '13px',
                        whiteSpace: 'nowrap',
                        borderRight: `1px solid ${theme.border}`,
                      }}
                    >
                      {e.rvol != null ? `${e.rvol}x` : '—'}
                    </td>

                    {/* Float */}
                    <td
                      style={{
                        padding: '6px 10px',
                        fontSize: '13px',
                        whiteSpace: 'nowrap',
                        borderRight: `1px solid ${theme.border}`,
                      }}
                    >
                      {formatFloat(e.float)}
                    </td>

                    {/* OBI */}
                    <td
                      style={{
                        padding: '6px 10px',
                        fontSize: '13px',
                        whiteSpace: 'nowrap',
                        color: e.obi > 0 ? theme.accent : e.obi < 0 ? theme.accentDanger : theme.text,
                        borderRight: `1px solid ${theme.border}`,
                      }}
                    >
                      {formatSignedNumber(e.obi)}
                    </td>

                    {/* OFI Flow - not yet computed by DatabentoProvider.js */}
                    <td
                      style={{
                        padding: '6px 10px',
                        fontSize: '13px',
                        whiteSpace: 'nowrap',
                        color: theme.textMuted,
                        borderRight: `1px solid ${theme.border}`,
                      }}
                    >
                      {formatSignedNumber(e.ofi)}
                    </td>

                    {/* Signal */}
                    <td
                      style={{
                        padding: '6px 10px',
                        fontSize: '12px',
                        whiteSpace: 'nowrap',
                        borderRight: `1px solid ${theme.border}`,
                      }}
                    >
                      {SIGNAL_BADGE[e.signalStatus] ? (
                        <span
                          style={{
                            fontWeight: 700,
                            color: SIGNAL_BADGE[e.signalStatus].color,
                            border: `1px solid ${SIGNAL_BADGE[e.signalStatus].color}`,
                            borderRadius: '4px',
                            padding: '1px 6px',
                          }}
                        >
                          {SIGNAL_BADGE[e.signalStatus].label}
                        </span>
                      ) : (
                        <span style={{ color: theme.textMuted }}>NO SIGNAL / HOLD</span>
                      )}
                    </td>

                    {/* News */}
                    <td style={{ padding: '6px 10px', fontSize: '13px' }}>
                      {e.headline ? (
                        <span>
                          <a
                            href={e.articleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={e.headline}
                            style={{ color: theme.accentBlue, textDecoration: 'none' }}
                          >
                            {e.headline.length > 40 ? e.headline.slice(0, 40) + '...' : e.headline}
                          </a>
                          <br />
                          <small style={{ color: theme.accentDanger }}>
                            {e.publishedAt ? new Date(e.publishedAt).toLocaleString() : ''}
                            {e.newsType ? (
                              <span style={{ color: NEWS_TYPE_COLOR[e.newsType] || theme.textMuted }}>
                                {' · '}
                                {e.newsType}
                              </span>
                            ) : null}
                          </small>
                        </span>
                      ) : (
                        <span style={{ color: theme.textMuted }}>No recent news</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ====== SEARCH MODAL ====== */}
      {showSearch && (
        <div
          onClick={closeSearch}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: theme.shadow,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.3s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '360px',
              maxWidth: '90vw',
              background: theme.surface,
              border: `1px solid ${theme.border}`,
              borderRadius: '12px',
              boxShadow: `0 20px 50px ${theme.shadow}`,
              overflow: 'hidden',
              transition: 'background 0.3s ease, border-color 0.3s ease',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderBottom: `1px solid ${theme.border}`,
              }}
            >
              <span style={{ fontSize: '15px', fontWeight: 600, color: theme.text }}>
                Add symbol
              </span>
              <button
                onClick={closeSearch}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: theme.textMuted,
                  fontSize: '18px',
                  cursor: 'pointer',
                  lineHeight: 1,
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                if (adding || searching || searchResults.length === 0) return;
                handleSelectResult(searchResults[0].symbol);
              }}
              placeholder="Search ticker or company..."
              autoFocus
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '14px',
                background: theme.inputBg,
                border: 'none',
                borderBottom: `1px solid ${theme.border}`,
                color: theme.text,
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'background 0.3s ease, color 0.3s ease, border-color 0.3s ease',
              }}
            />

            {addError && (
              <p style={{ color: theme.accentDanger, fontSize: '12px', margin: '10px 16px 0 16px' }}>
                {addError}
              </p>
            )}

            <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
              {adding ? (
                <p style={{ padding: '14px 16px', color: theme.textMuted, fontSize: '13px', margin: 0 }}>
                  Adding...
                </p>
              ) : searching ? (
                <p style={{ padding: '14px 16px', color: theme.textMuted, fontSize: '13px', margin: 0 }}>
                  Searching...
                </p>
              ) : query && searchResults.length === 0 ? (
                <p style={{ padding: '14px 16px', color: theme.textMuted, fontSize: '13px', margin: 0 }}>
                  No matches
                </p>
              ) : (
                searchResults.map((r) => (
                  <div
                    key={r.symbol}
                    onClick={() => handleSelectResult(r.symbol)}
                    style={{
                      padding: '10px 16px',
                      cursor: 'pointer',
                      borderBottom: `1px solid ${theme.border}`,
                      transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={(ev) => (ev.currentTarget.style.background = theme.surfaceAlt)}
                    onMouseLeave={(ev) => (ev.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 600, color: theme.text }}>
                      {r.symbol}
                      {r.exchange && (
                        <span style={{ color: theme.textMuted, fontWeight: 400 }}>
                          {' · '}
                          {r.exchange}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: theme.textMuted,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {r.name}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}