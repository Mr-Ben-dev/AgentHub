// ============================================================================
// AgentHub Backend - Price Service
// Fetches real BTC/ETH prices with fallback strategy
// Primary: CoinGecko (most reliable, free, no API key)
// Fallback 1: CryptoCompare
// Fallback 2: Binance US API
// ============================================================================

export interface CryptoPrice {
  symbol: string;
  price: number;
  formatted?: string;
  timestamp: number;
}

// API URLs - using APIs that work globally
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';
const CRYPTOCOMPARE_API_URL = 'https://min-api.cryptocompare.com/data';
const BINANCE_US_API_URL = 'https://api.binance.us/api/v3';

// Cache to avoid rate limiting
let priceCache: { btc: number; eth: number; timestamp: number } | null = null;
const CACHE_TTL = 10000; // 10 seconds (CoinGecko rate limit friendly)

// Fallback prices if all APIs fail
const FALLBACK_PRICES = {
  BTC: 9500000,  // $95,000
  ETH: 330000,   // $3,300
};

/**
 * Fetch prices from CoinGecko (most reliable, free)
 */
async function fetchFromCoinGecko(): Promise<{ btc: number; eth: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  
  try {
    const response = await fetch(
      `${COINGECKO_API_URL}/simple/price?ids=bitcoin,ethereum&vs_currencies=usd`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json() as { bitcoin?: { usd: number }; ethereum?: { usd: number } };
    
    if (!data.bitcoin?.usd || !data.ethereum?.usd) {
      throw new Error('Invalid CoinGecko response');
    }
    
    return {
      btc: Math.round(data.bitcoin.usd * 100),
      eth: Math.round(data.ethereum.usd * 100),
    };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/**
 * Fetch prices from CryptoCompare (most reliable, no geo restrictions)
 * Uses the pricemulti endpoint to get both BTC and ETH in one call
 */
async function fetchFromCryptoCompare(): Promise<{ btc: number; eth: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  
  try {
    const response = await fetch(
      `${CRYPTOCOMPARE_API_URL}/pricemulti?fsyms=BTC,ETH&tsyms=USD`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`CryptoCompare API error: ${response.status}`);
    }
    
    const data = await response.json() as Record<string, Record<string, number>>;
    
    // Handle different response formats
    const btcPrice = data?.BTC?.USD || data?.btc?.usd || data?.btc?.USD;
    const ethPrice = data?.ETH?.USD || data?.eth?.usd || data?.eth?.USD;
    
    if (!btcPrice || !ethPrice) {
      throw new Error('Invalid CryptoCompare response');
    }
    
    return {
      btc: Math.round(btcPrice * 100),
      eth: Math.round(ethPrice * 100),
    };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/**
 * Fetch prices from Binance US (fallback)
 */
async function fetchFromBinanceUS(): Promise<{ btc: number; eth: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  
  try {
    const [btcRes, ethRes] = await Promise.all([
      fetch(`${BINANCE_US_API_URL}/ticker/price?symbol=BTCUSD`, { signal: controller.signal }),
      fetch(`${BINANCE_US_API_URL}/ticker/price?symbol=ETHUSD`, { signal: controller.signal }),
    ]);
    
    clearTimeout(timeout);
    
    if (!btcRes.ok || !ethRes.ok) {
      throw new Error('Binance US API error');
    }
    
    const btcData = await btcRes.json() as { price: string };
    const ethData = await ethRes.json() as { price: string };
    
    return {
      btc: Math.round(parseFloat(btcData.price) * 100),
      eth: Math.round(parseFloat(ethData.price) * 100),
    };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

/**
 * Fetch all prices with caching and fallback
 * NEVER throws - always returns prices (cached, live, or fallback)
 */
async function fetchAllPrices(): Promise<{ btc: number; eth: number }> {
  // Check cache first
  if (priceCache && Date.now() - priceCache.timestamp < CACHE_TTL) {
    return { btc: priceCache.btc, eth: priceCache.eth };
  }
  
  // Try all sources, return first success
  const sources = [
    { name: 'CoinGecko', fn: fetchFromCoinGecko },
    { name: 'CryptoCompare', fn: fetchFromCryptoCompare },
    { name: 'Binance US', fn: fetchFromBinanceUS },
  ];
  
  for (const source of sources) {
    try {
      const prices = await source.fn();
      if (prices.btc > 0 && prices.eth > 0) {
        priceCache = { ...prices, timestamp: Date.now() };
        console.log(`✅ ${source.name}: BTC=$${prices.btc/100}, ETH=$${prices.eth/100}`);
        return prices;
      }
    } catch (err) {
      // Silent continue to next source
    }
  }
  
  // Return cached price if available (even if stale)
  if (priceCache) {
    console.warn('📦 Using cached prices (all APIs failed)');
    return { btc: priceCache.btc, eth: priceCache.eth };
  }
  
  // Return fallback prices as last resort
  console.warn('🔄 Using fallback prices');
  return { btc: FALLBACK_PRICES.BTC, eth: FALLBACK_PRICES.ETH };
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
