// ============================================================
// STOCKX - CONSTANTS
// ============================================================

export const BACKEND_URL = 'http://localhost:3001';

// Header height - single source of truth
export const APP_HEADER_HEIGHT = 110;
export const FILTER_BAR_HEIGHT = 56;  // Fixed height of filter bar
export const STICKY_OFFSET = APP_HEADER_HEIGHT + FILTER_BAR_HEIGHT;  // 166px

// ============================================================
// TABS
// ============================================================

export const sessions = [
  { key: 'MARKET_ALERT', label: 'Market Alert' },
  { key: 'CALENDAR', label: 'Earnings Schedule' },
  { key: 'CONTROLS', label: 'Alert Controls' },
];

export const MARKET_SESSIONS = ['PRE', 'REGULAR', 'POST'];

// ============================================================
// LOCAL STORAGE KEYS
// ============================================================

export const CUSTOM_TICKERS_KEY = 'stockx_custom_earnings_tickers';
export const MAX_CUSTOM_TICKERS = 30;

export const MAX_FLOAT_KEY = 'stockx_max_float_filter';
export const FLOAT_UNIT = 1_000_000;
export const FLOAT_INPUT_MAX = 99_999;
export const FLOAT_DEFAULT = 20;

export const THEME_KEY = 'stockx_theme';

// Filter keys
export const PRICE_MIN_KEY = 'stockx_price_min';
export const PRICE_MAX_KEY = 'stockx_price_max';
export const CHANGE_MIN_KEY = 'stockx_change_min';

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
  top,  // 166px (header + filter bar) by default; pass APP_HEADER_HEIGHT for tables with no filter bar above them
  zIndex: 10,
  background: theme.surfaceAlt === '#1f1f1f' ? '#1f1f1f' : '#f8f9fa', // Forces a completely solid color layer
  opacity: 1, // Guarantees text behind cannot show through
  boxShadow: `0 1px 0 ${theme.border}, inset 0 -1px 0 ${theme.border}`, // Simulates missing borders in separate mode
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