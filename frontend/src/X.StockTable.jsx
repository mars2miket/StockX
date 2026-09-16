import { memo, useEffect, useRef, useState } from 'react';
import { BACKEND_URL, FLOAT_UNIT, MARKET_SESSIONS, MAX_CUSTOM_TICKERS, STICKY_TH } from './X.constants';


// ============================================================
// SESSION BADGE
// ============================================================

const SESSION_BADGE = {
  PRE: { label: 'PRE', color: '#facc15' },
  REGULAR: { label: 'REG', color: '#4ade80' },
  POST: { label: 'POST', color: '#60a5fa' },
};

// ============================================================
// SIGNAL BADGE
// NOTE: DatabentoProvider.js (as written) only returns 'BUY' / 'SELL' / null.
// There is no SPOOF TRAP detection logic in that file yet, so that state is
// not reachable here - mapped in case it's added later.
// ============================================================

const SIGNAL_BADGE = {
  BUY: { label: 'BUY / LONG', color: '#4ade80' },
  SELL: { label: 'SELL / SHORT', color: '#f87171' },
  SPOOF: { label: 'SPOOF TRAP / FREEZE', color: '#facc15' },
};

// ============================================================
// COLUMNS - Market Alert only (Volume merged into RVOL-only,
// Country/News removed per CR; OBI/OFI/Signal added per CR)
// ============================================================

const columns = [
  { key: 'ticker', label: 'Ticker' },
  { key: 'price', label: 'Price' },
  { key: 'changePercent', label: '%Chg' },
  { key: 'rvol', label: 'RVOL' },
  { key: 'float', label: 'Float (M)' },
  { key: 'obi', label: 'OBI' },
  { key: 'ofi', label: 'OFI' },
  { key: 'signalStatus', label: 'Signal' },
];

// ============================================================
// FORMATTING HELPERS
// ============================================================

function formatFloat(float) {
  if (float === null || float === undefined) return '—';
  return (float / FLOAT_UNIT).toFixed(1);
}

function formatSignedNumber(n) {
  if (n === null || n === undefined) return '—';
  return n.toFixed(2);
}

// ============================================================
// MAIN TABLE COMPONENT
// ============================================================

function StockTable({
  stocks,
  sessionKey,
  sortKey,
  sortDir,
  onSort,
  loading,
  theme,
  themeMode,
  isControlsTab = false,
  onAddTicker,
  onRemoveTicker,
  customTickers = [],
}) {
  // ---- Add-ticker search modal (Market Alert only) ----
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

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
    if (customTickers.includes(symbol)) {
      setAddError('Ticker already in the list');
      return;
    }
    if (customTickers.length >= MAX_CUSTOM_TICKERS) {
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

  // ---- Filter Logic ----
  const filteredRows = stocks
    .filter((s) => {
      // Session filter
      if (sessionKey === 'MARKET_ALERT') {
        if (!MARKET_SESSIONS.includes(s.session)) return false;
      } else if (sessionKey === 'CONTROLS') {
        // In Controls tab, show all sessions for preview
        // No session filter
      } else {
        if (s.session !== sessionKey) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    })
    .slice(0, 20);

  const stickyTh = STICKY_TH(theme);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <>
    <div
      style={{
        borderRadius: '12px',
        borderTop: `1px solid ${theme.border}`,
        borderBottom: `1px solid ${theme.border}`,
        width: '100%',
        overflow: 'visible',
        transition: 'border-color 0.3s ease, background 0.3s ease',
      }}
    >
      <table /* table below filter controls of Market Alert*/
        style={{
          borderCollapse: 'separate',
          borderSpacing: 0,
          width: '100%',
          tableLayout: 'auto',
          background: theme.tableBg,
          color: theme.text,
          transition: 'background 0.3s ease, color 0.3s ease',
        }}
      >
        {/* ====== THEAD ====== */}
        <thead>
          <tr style={{ background: theme.surfaceAlt }}>
            {columns.map((col, i) => (
              <th
                key={col.key}
                onClick={() => onSort(col.key)}
                style={{
                  ...stickyTh,
                  padding: '10px 10px',
                  textAlign: 'left',
                  color: theme.accent,
                  fontSize: '13px',
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                  borderRight: i < columns.length - 1 ? `1px solid ${theme.border}` : 'none',
                  transition: 'color 0.3s ease, background 0.3s ease, border-color 0.3s ease',
                }}
              >
                {col.key === 'ticker' ? (
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1px',
                    }}
                  >
                    <span>
                      {col.label} {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
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
                    {col.label} {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </>
                )}
              </th>
            ))}
          </tr>
        </thead>

        {/* ====== TBODY ====== */}
        <tbody>
          {filteredRows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: '48px', textAlign: 'center', color: theme.textMuted }}>
                {loading ? 'Loading scanner data...' : 'No stocks to display.'}
              </td>
            </tr>
          ) : (
            filteredRows.map((s, i) => {
              const isEven = i % 2 === 0;
              const rowBg = isEven ? theme.stripeEven : theme.stripeOdd;
              const signalBadge = s.signalStatus ? SIGNAL_BADGE[s.signalStatus] : null;

              return (
                <tr
                  key={s.ticker}
                  style={{
                    background: rowBg,
                    transition: 'background 0.3s ease',
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
                      borderBottom: `1px solid ${theme.border}`,
                    }}
                  >
                    <span title={s.companyName || ''}>{s.ticker}</span>
                    {customTickers.includes(s.ticker) ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveTicker && onRemoveTicker(s.ticker);
                        }}
                        title="Remove"
                        style={{
                          marginLeft: '4px',
                          background: 'transparent',
                          border: 'none',
                          color: theme.textMuted,
                          fontSize: '13px',
                          cursor: 'pointer',
                          lineHeight: 1,
                          padding: '0 2px',
                        }}
                      >
                        ✕
                      </button>
                    ) : null}
                    {sessionKey === 'MARKET_ALERT' && SESSION_BADGE[s.session] ? (
                      <span
                        style={{
                          marginLeft: '6px',
                          fontSize: '10px',
                          fontWeight: 700,
                          color: SESSION_BADGE[s.session].color,
                          border: `1px solid ${SESSION_BADGE[s.session].color}`,
                          borderRadius: '4px',
                          padding: '1px 4px',
                          verticalAlign: 'middle',
                        }}
                      >
                        {SESSION_BADGE[s.session].label}
                      </span>
                    ) : null}
                  </td>

                  {/* Price */}
                  <td
                    style={{
                      padding: '6px 10px',
                      fontSize: '13px',
                      whiteSpace: 'nowrap',
                      borderRight: `1px solid ${theme.border}`,
                      borderBottom: `1px solid ${theme.border}`,
                    }}
                  >
                    ${s.price}
                  </td>

                  {/* %Chg */}
                  <td
                    style={{
                      padding: '6px 10px',
                      fontSize: '13px',
                      whiteSpace: 'nowrap',
                      color: s.changePercent >= 0 ? theme.accent : theme.accentDanger,
                      borderRight: `1px solid ${theme.border}`,
                      borderBottom: `1px solid ${theme.border}`,
                      transition: 'color 0.3s ease',
                    }}
                  >
                    {s.changePercent?.toFixed(2)}%
                  </td>

                  {/* RVOL */}
                  <td
                    style={{
                      padding: '6px 10px',
                      fontSize: '13px',
                      whiteSpace: 'nowrap',
                      borderRight: `1px solid ${theme.border}`,
                      borderBottom: `1px solid ${theme.border}`,
                    }}
                  >
                    {s.rvol !== null ? `${s.rvol}x` : '—'}
                  </td>

                  {/* Float */}
                  <td
                    style={{
                      padding: '6px 10px',
                      fontSize: '13px',
                      whiteSpace: 'nowrap',
                      borderRight: `1px solid ${theme.border}`,
                      borderBottom: `1px solid ${theme.border}`,
                    }}
                  >
                    {formatFloat(s.float)}
                  </td>

                  {/* OBI */}
                  <td
                    style={{
                      padding: '6px 10px',
                      fontSize: '13px',
                      whiteSpace: 'nowrap',
                      color: s.obi > 0 ? theme.accent : s.obi < 0 ? theme.accentDanger : theme.text,
                      borderRight: `1px solid ${theme.border}`,
                      borderBottom: `1px solid ${theme.border}`,
                    }}
                  >
                    {formatSignedNumber(s.obi)}
                  </td>

                  {/* OFI Flow - not yet computed by DatabentoProvider.js */}
                  <td
                    style={{
                      padding: '6px 10px',
                      fontSize: '13px',
                      whiteSpace: 'nowrap',
                      color: theme.textMuted,
                      borderRight: `1px solid ${theme.border}`,
                      borderBottom: `1px solid ${theme.border}`,
                    }}
                  >
                    {formatSignedNumber(s.ofi)}
                  </td>

                  {/* Signal */}
                  <td
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      whiteSpace: 'nowrap',
                      borderBottom: `1px solid ${theme.border}`,
                    }}
                  >
                    {signalBadge ? (
                      <span
                        style={{
                          fontWeight: 700,
                          color: signalBadge.color,
                          border: `1px solid ${signalBadge.color}`,
                          borderRadius: '4px',
                          padding: '1px 6px',
                        }}
                      >
                        {signalBadge.label}
                      </span>
                    ) : (
                      <span style={{ color: theme.textMuted }}>NO SIGNAL / HOLD</span>
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

// ============================================================
// MEMO COMPARATOR
// ============================================================

function stocksAreEqual(prevProps, nextProps) {
  return (
    prevProps.sessionKey === nextProps.sessionKey &&
    prevProps.sortKey === nextProps.sortKey &&
    prevProps.sortDir === nextProps.sortDir &&
    prevProps.loading === nextProps.loading &&
    prevProps.isControlsTab === nextProps.isControlsTab &&
    JSON.stringify(prevProps.stocks) === JSON.stringify(nextProps.stocks)
  );
}

export default memo(StockTable, stocksAreEqual);
