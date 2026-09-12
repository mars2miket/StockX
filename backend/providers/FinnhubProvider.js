function classifyNewsType(headline, category) {
  const text = `${headline || ''} ${category || ''}`.toLowerCase();
  if (/(offering|dilut|registered direct|atm offering|public offering|share sale)/.test(text)) return 'Offering';
  if (/\bhalt/.test(text)) return 'Halt';
  if (/(fda|pdufa|phase [123]|clinical)/.test(text)) return 'FDA';
  if (/(earnings|eps|guidance|beats estimates|misses estimates)/.test(text)) return 'Earnings';
  if (/(contract|purchase order|awarded|agreement)/.test(text)) return 'Contract';
  if (/(merger|acqui|buyout|takeover)/.test(text)) return 'M&A';
  if (/(upgrade|downgrade|initiates|price target)/.test(text)) return 'Rating';
  if (category && category.trim() && category.toLowerCase() !== 'company news' && category.toLowerCase() !== 'company') {
    return category.replace(/\b\w/g, c => c.toUpperCase());
  }
  return 'News';
}

// Widened progressively so we always surface the most recent article
// regardless of age, without paying the latency cost for the common case
// (recent news) by always querying a huge window.
const LOOKBACK_WINDOWS_DAYS = [7, 30, 90, 365];

async function fetchArticles(ticker, daysBack) {
  const to = new Date().toISOString().split('T')[0];
  const from = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const url = `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${from}&to=${to}&token=${process.env.FINNHUB_API_KEY}`;
  const res = await fetch(url);
  const articles = await res.json();
  return Array.isArray(articles) ? articles : [];
}

// Deterministic pick: sort by datetime desc, tie-break by id asc, so the
// same underlying data always yields the same "latest" article across polls
// instead of relying on whatever order Finnhub happens to return.
function pickLatest(articles) {
  const sorted = [...articles].sort((a, b) => {
    if (b.datetime !== a.datetime) return b.datetime - a.datetime;
    return (a.id ?? 0) - (b.id ?? 0);
  });
  return sorted[0];
}

async function getNews(ticker) {
  let latest = null;

  for (const daysBack of LOOKBACK_WINDOWS_DAYS) {
    const articles = await fetchArticles(ticker, daysBack);
    if (articles.length > 0) {
      latest = pickLatest(articles);
      break;
    }
  }

  if (!latest) {
    return { headline: null, publishedAt: null, articleUrl: null, newsType: null };
  }

  return {
    headline: latest.headline,
    publishedAt: new Date(latest.datetime * 1000).toISOString(),
    articleUrl: latest.url,
    newsType: classifyNewsType(latest.headline, latest.category),
  };
}

module.exports = { getNews };