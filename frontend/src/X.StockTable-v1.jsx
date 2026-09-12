import { memo } from 'react';
import { FLOAT_UNIT, MARKET_SESSIONS, STICKY_TH, NEWS_TYPE_COLOR } from './X.constants';


// ============================================================
// SESSION BADGE
// ============================================================

const SESSION_BADGE = {
  PRE: { label: 'PRE', color: '#facc15' },
  REGULAR: { label: 'REG', color: '#4ade80' },
  POST: { label: 'POST', color: '#60a5fa' },
};

// ============================================================
// COLUMNS (RVOL REMOVED - merged into Volume)
// ============================================================

const columns = [
  { key: 'ticker', label: 'Ticker' },
  { key: 'price', label: 'Price' },
  { key: 'changePercent', label: '%Chg' },
  { key: 'volume', label: 'Volume / RVOL' },
  { key: 'float', label: 'Float (M)' },
  { key: 'country', label: 'Country' },
];

// ============================================================
// FORMATTING HELPERS
// ============================================================

function formatVolume(volume) {
  if (volume === null || volume === undefined) return '—';
  if (volume >= 1_000_000_000) return (volume / 1_000_000_000).toFixed(1) + 'B';
  if (volume >= 1_000_000) return (volume / 1_000_000).toFixed(1) + 'M';
  if (volume >= 1_000) return (volume / 1_000).toFixed(1) + 'K';
  return String(volume);
}

function formatFloat(float) {
  if (float === null || float === undefined) return '—';
  return (float / FLOAT_UNIT).toFixed(1);
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
  filters,
  loading,
  theme,
  themeMode,
  isControlsTab = false,
}) {
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

      // Price filter
      if (filters.priceMin !== null && s.price < filters.priceMin) return false;
      if (filters.priceMax !== null && s.price > filters.priceMax) return false;

      // %Chg filter
      if (filters.changeMin !== null && (s.changePercent === null || s.changePercent < filters.changeMin)) return false;

      // Float filter
      if (filters.floatMax !== null && (s.float === null || s.float / FLOAT_UNIT > filters.floatMax)) return false;

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
    <div
      style={{
        borderRadius: '12px',
        border: `1px solid ${theme.border}`,
        minHeight: '500px',
        overflow: 'visible',
        transition: 'border-color 0.3s ease, background 0.3s ease',
      }}
    >
<table
  style={{
    borderCollapse: 'separate',
    borderSpacing: 0,
    width: '100%',
    tableLayout: 'fixed',
    background: theme.tableBg,
    color: theme.text,
    transition: 'background 0.3s ease, color 0.3s ease',
  }}
>
        <colgroup>
          <col style={{ width: '9%' }} /> // TICKER
          <col style={{ width: '8%' }} /> // PRICE
          <col style={{ width: '8%' }} /> // %CHG
          <col style={{ width: '14%' }} /> // Volume / RVOL
          <col style={{ width: '11%' }} /> // FLOAT (M)
          <col style={{ width: '14%' }} /> // COUNTRY
          <col style={{ width: '36%' }} /> // NEWS
        </colgroup>

        {/* ====== THEAD ====== */}
        <thead>
          <tr style={{ background: theme.surfaceAlt }}>
            {columns.map((col) => (
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
                  borderRight: `1px solid ${theme.border}`,
                  transition: 'color 0.3s ease, background 0.3s ease, border-color 0.3s ease',
                }}
              >
                {col.label} {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
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
          {filteredRows.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: theme.textMuted }}>
                {loading ? 'Loading scanner data...' : 'No stocks match your filters.'}
              </td>
            </tr>
          ) : (
            filteredRows.map((s, i) => {
              const isEven = i % 2 === 0;
              const rowBg = isEven ? theme.stripeEven : theme.stripeOdd;

              return (
// Inside the filteredRows.map loop inside the <tbody>:
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

                  {/* Volume / RVOL (merged) */}
                  <td
                    style={{
                      padding: '6px 10px',
                      fontSize: '13px',
                      whiteSpace: 'nowrap',
                      borderRight: `1px solid ${theme.border}`,
                      borderBottom: `1px solid ${theme.border}`,
                    }}
                  >
                    <div>Vol: {formatVolume(s.volume)}</div>
                    <div style={{ fontSize: '11px', color: theme.textMuted }}>
                      RVOL: {s.rvol !== null ? `${s.rvol}x` : '—'}
                    </div>
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

                  {/* Country */}
                  <td
                    style={{
                      padding: '6px 10px',
                      fontSize: '13px',
                      whiteSpace: 'nowrap',
                      borderRight: `1px solid ${theme.border}`,
                      borderBottom: `1px solid ${theme.border}`,
                    }}
                  >
                    {s.country || '—'}
                  </td>

                  {/* News */}
                  <td style={{ padding: '6px 10px', fontSize: '13px', borderBottom: `1px solid ${theme.border}` }}>
                    {s.headline ? (
                      <span>
                        <a
                          href={s.articleUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={s.headline}
                          style={{ color: theme.accentBlue, textDecoration: 'none' }}
                        >
                          {s.headline.length > 40 ? s.headline.slice(0, 40) + '...' : s.headline}
                        </a>
                        <br />
                        <small style={{ color: theme.accentDanger }}>
                          {s.publishedAt ? new Date(s.publishedAt).toLocaleString() : ''}
                          {s.newsType ? (
                            <span style={{ color: NEWS_TYPE_COLOR[s.newsType] || theme.textMuted }}>
                              {' · '}
                              {s.newsType}
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
    JSON.stringify(prevProps.filters) === JSON.stringify(nextProps.filters) &&
    JSON.stringify(prevProps.stocks) === JSON.stringify(nextProps.stocks)
  );
}

export default memo(StockTable, stocksAreEqual);