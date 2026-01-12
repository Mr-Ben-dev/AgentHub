// ============================================================================
// AgentHub Backend - Price Service
// Fetches real BTC/ETH prices with fallback strategy
// Primary: CryptoCompare (reliable, no geo restrictions)
// Fallback: Binance US API
// ============================================================================

export interface CryptoPrice {
  symbol: string;
  price: number;
  formatted?: string;
  timestamp: number;
}

// API URLs - using APIs that work globally
const CRYPTOCOMPARE_API_URL = 'https://min-api.cryptocompare.com/data';
const BINANCE_US_API_URL = 'https://api.binance.us/api/v3';

// Cache to avoid rate limiting
let priceCache: { btc: number; eth: number; timestamp: number } | null = null;
const CACHE_TTL = 5000; // 5 seconds

// Fallback prices if all APIs fail
const FALLBACK_PRICES = {
  BTC: 9500000,  // $95,000
  ETH: 330000,   // $3,300
};

/**
 * Fetch prices from CryptoCompare (most reliable, no geo restrictions)
 * Uses the pricemulti endpoint to get both BTC and ETH in one call
 */
async function fetchFromCryptoCompare(): Promise<{ btc: number; eth: number }> {
  const response = await fetch(
    `${CRYPTOCOMPARE_API_URL}/pricemulti?fsyms=BTC,ETH&tsyms=USD`
  );
  
  if (!response.ok) {
    throw new Error(`CryptoCompare API error: ${response.status}`);
  }
  
  const data = await response.json() as { BTC?: { USD: number }; ETH?: { USD: number } };
  
  if (!data.BTC?.USD || !data.ETH?.USD) {
    throw new Error('Invalid CryptoCompare response');
  }
  
  return {
    btc: Math.round(data.BTC.USD * 100),
    eth: Math.round(data.ETH.USD * 100),
  };
}

/**
 * Fetch prices from Binance US (fallback)
 */
async function fetchFromBinanceUS(): Promise<{ btc: number; eth: number }> {
  const [btcRes, ethRes] = await Promise.all([
    fetch(`${BINANCE_US_API_URL}/ticker/price?symbol=BTCUSD`),
    fetch(`${BINANCE_US_API_URL}/ticker/price?symbol=ETHUSD`),
  ]);
  
  if (!btcRes.ok || !ethRes.ok) {
    throw new Error('Binance US API error');
  }
  
  const btcData = await btcRes.json() as { price: string };
  const ethData = await ethRes.json() as { price: string };
  
  return {
    btc: Math.round(parseFloat(btcData.price) * 100),
    eth: Math.round(parseFloat(ethData.price) * 100),
  };
}

/**
 * Fetch all prices with caching and fallback
 */
async function fetchAllPrices(): Promise<{ btc: number; eth: number }> {
  // Check cache first
  if (priceCache && Date.now() - priceCache.timestamp < CACHE_TTL) {
    return { btc: priceCache.btc, eth: priceCache.eth };
  }
  
  // Try CryptoCompare first (most reliable)
  try {
    const prices = await fetchFromCryptoCompare();
    priceCache = { ...prices, timestamp: Date.now() };
    console.log(`✅ CryptoCompare: BTC=$${prices.btc/100}, ETH=$${prices.eth/100}`);
    return prices;
  } catch (ccError) {
    console.warn('⚠️ CryptoCompare failed, trying Binance US:', ccError);
  }
  
  // Fallback to Binance US
  try {
    const prices = await fetchFromBinanceUS();
    priceCache = { ...prices, timestamp: Date.now() };
    console.log(`✅ Binance US: BTC=$${prices.btc/100}, ETH=$${prices.eth/100}`);
    return prices;
  } catch (binanceError) {
    console.warn('⚠️ Binance US also failed:', binanceError);
    
    // Return cached price if available (even if stale)
    if (priceCache) {
      console.warn('Using stale cached prices');
      return { btc: priceCache.btc, eth: priceCache.eth };
    }
    
    // Return fallback prices as last resort
    console.warn('Using fallback prices');
    return { btc: FALLBACK_PRICES.BTC, eth: FALLBACK_PRICES.ETH };
  }
}

export async function getPrice(symbol: string): Promise<CryptoPrice> {
  const upperSymbol = symbol.toUpperCase();
  const prices = await fetchAllPrices();
  
  const priceInCents = upperSymbol === 'BTC' ? prices.btc : prices.eth;
  
  return {
    symbol: upperSymbol,
    price: priceInCents,
    formatted: formatPrice(priceInCents),
    timestamp: Date.now(),
  };
}

export async function getBTCPrice(): Promise<CryptoPrice> {
  return getPrice('BTC');
}

export async function getETHPrice(): Promise<CryptoPrice> {
  return getPrice('ETH');
}

export async function getAllPrices(): Promise<{ btc: CryptoPrice; eth: CryptoPrice }> {
  const prices = await fetchAllPrices();
  return {
    btc: {
      symbol: 'BTC',
      price: prices.btc,
      formatted: formatPrice(prices.btc),
      timestamp: Date.now(),
    },
    eth: {
      symbol: 'ETH',
      price: prices.eth,
      formatted: formatPrice(prices.eth),
      timestamp: Date.now(),
    },
  };
}

// Extract asset symbol from base_market (e.g., "BTC-USD" -> "BTC")
export function extractAssetFromMarket(baseMarket: string): string | null {
  const parts = baseMarket.split('-');
  if (parts.length >= 1) {
    const asset = parts[0].toUpperCase();
    if (asset === 'BTC' || asset === 'ETH') {
      return asset;
    }
  }
  return null;
}

function formatPrice(priceInCents: number): string {
  const dollars = priceInCents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

// Export service object for compatibility with Linera-Arcade style
export const priceService = {
  getPrice,
  getBTCPrice,
  getETHPrice,
  getAllPrices,
  formatPrice,
};
