// ============================================================
// STOCKX - CONSTANTS
// ============================================================

export const BACKEND_URL = 'http://localhost:3001';

// Header height - single source of truth
export const APP_HEADER_HEIGHT = 110;
export const STICKY_OFFSET = APP_HEADER_HEIGHT;

// ============================================================
// TABS
// ============================================================

export const sessions = [
  { key: 'CALENDAR', label: 'Watchlist' },
  // { key: 'MARKET_ALERT', label: 'Market Alert' }, // hidden - polling suspended
];

export const DEFAULT_TAB = 'CALENDAR';

export const MARKET_SESSIONS = ['PRE', 'REGULAR', 'POST'];

// ============================================================
// LOCAL STORAGE KEYS
// ============================================================

export const CUSTOM_TICKERS_KEY = 'stockx_custom_earnings_tickers';
export const MARKET_CUSTOM_TICKERS_KEY = 'stockx_custom_market_tickers';
export const MAX_CUSTOM_TICKERS = 30;

export const ACTIVE_TAB_KEY = 'stockx_active_tab';
export const SORT_KEY = 'stockx_sort';

export const FLOAT_UNIT = 1_000_000;

export const THEME_KEY = 'stockx_theme';

// ============================================================
// THEME COLORS
// ============================================================

export const THEMES = {
  dark: {
    // Backgrounds
    bg: '#1a1a1a',
    surface: '#242424',
    surfaceAlt: '#1f1f1f',
    headerBg: '#1a1a1a',
    tableBg: '#242424',
    cardBg: '#1f1f1f',

    // Text
    text: '#e0e0e0',
    textMuted: '#888',
    textLight: '#999',

    // Accents
    accent: '#4ade80',
    accentDanger: '#f87171',
    accentBlue: '#60a5fa',
    accentYellow: '#facc15',

    // Borders
    border: '#333',
    borderLight: '#444',

    // Inputs
    inputBg: '#121212',
    inputBorder: '#444',

    // Table
    stripeEven: '#242424',
    stripeOdd: '#1f1f1f',

    // Button
    btnBg: '#bb1919',
    btnHover: '#d43a3a',
    btnText: '#ffffff',

    // Shadows
    shadow: 'rgba(0,0,0,0.6)',
  },
  light: {
    // Backgrounds
    bg: '#f0f2f5',
    surface: '#ffffff',
    surfaceAlt: '#f8f9fa',
    headerBg: '#ffffff',
    tableBg: '#ffffff',
    cardBg: '#ffffff',

    // Text
    text: '#1a1a1a',
    textMuted: '#666',
    textLight: '#888',

    // Accents
    accent: '#16a34a',
    accentDanger: '#dc2626',
    accentBlue: '#2563eb',
    accentYellow: '#ca8a04',

    // Borders
    border: '#d1d5db',
    borderLight: '#e5e7eb',

    // Inputs
    inputBg: '#f9fafb',
    inputBorder: '#d1d5db',

    // Table
    stripeEven: '#ffffff',
    stripeOdd: '#f8f9fa',

    // Button
    btnBg: '#bb1919',
    btnHover: '#d43a3a',
    btnText: '#ffffff',

    // Shadows
    shadow: 'rgba(0,0,0,0.15)',
  },
};

// ============================================================
// STICKY HEADER STYLES (reused across tables)
// ============================================================

export const STICKY_TH = (theme, top = STICKY_OFFSET) => ({
  position: 'sticky',
  top,
  zIndex: 10,
  background: theme.surfaceAlt === '#1f1f1f' ? '#1f1f1f' : '#f8f9fa',
  opacity: 1,
  boxShadow: `0 1px 0 ${theme.border}, inset 0 -1px 0 ${theme.border}`,
});

// ============================================================
// NEWS TYPE COLORS (shared across tables)
// ============================================================

export const NEWS_TYPE_COLOR = {
  Offering: '#f87171',
  Halt: '#f87171',
  FDA: '#4ade80',
  Contract: '#4ade80',
  Earnings: '#60a5fa',
  'M&A': '#60a5fa',
  Rating: '#e0e0e0',
  News: '#999',
};
