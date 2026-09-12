//const THRESHOLDS = {
//  minChangePercent: 10,   // %Chg >= 10%
//  minRvol: 2,              // RVOL >= 2x
//  maxFloat: 20_000_000,    // Float <= 20M shares
//};

const THRESHOLDS = {
  minChangePercent: 10,     // temporarily lowered from 10 for testing
  minRvol: 1,             // temporarily lowered from 2 for testing
  maxFloat: 500_000_000,  // temporarily raised from 20M for testing
};

function meetsConditions(stock) {
  if (stock.changePercent == null || stock.changePercent < THRESHOLDS.minChangePercent) return false;
  if (stock.rvol == null || stock.rvol < THRESHOLDS.minRvol) return false;
  if (stock.float == null || stock.float > THRESHOLDS.maxFloat) return false;
  return true;
}

module.exports = { meetsConditions, THRESHOLDS };

function calculateSqueezeScore(stock) {
  let score = 0;
  
  // RVOL: Higher is better (2x+ = more unusual)
  score += (stock.rvol || 0) * 15;
  
  // % Change: Bigger gaps get more attention
  score += (stock.changePercent || 0) * 1.5;
  
  // Float: Smaller = more explosive
  const floatInMillions = (stock.float || 100_000_000) / 1_000_000;
  score += Math.max(0, 20 - (floatInMillions / 5));
  
  // Volume: More volume = more interest
  const volumeInMillions = (stock.volume || 0) / 1_000_000;
  score += Math.min(10, volumeInMillions / 2);
  
  return Math.min(100, Math.round(score));
}

// Export it
module.exports = { meetsConditions, THRESHOLDS, calculateSqueezeScore };