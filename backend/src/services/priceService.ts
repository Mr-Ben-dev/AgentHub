// ============================================================================
// AgentHub Backend - Price Service
// Fetches real BTC/ETH prices from CryptoCompare API
// ============================================================================

export interface CryptoPrice {
  symbol: string;
  price: number;
  formatted?: string;
  timestamp: number;
}

const CRYPTOCOMPARE_URL = 'https://min-api.cryptocompare.com/data/price';

// Cache prices for 10 seconds to avoid rate limits
const cache: Map<string, { price: CryptoPrice; timestamp: number }> = new Map();
const CACHE_TTL = 10_000; // 10 seconds

export async function getPrice(symbol: string): Promise<CryptoPrice> {
  const upperSymbol = symbol.toUpperCase();
  
  // Check cache
  const cached = cache.get(upperSymbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.price;
  }

  try {
    const url = new URL(CRYPTOCOMPARE_URL);
    url.searchParams.set('fsym', upperSymbol);
    url.searchParams.set('tsyms', 'USD');
    
    // Add API key if available (optional, works without but with rate limits)
    const apiKey = process.env.CRYPTOCOMPARE_API_KEY;
    if (apiKey) {
      url.searchParams.set('api_key', apiKey);
    }

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`CryptoCompare API error: ${response.status}`);
    }

    const data = await response.json() as { USD?: number };
    
    if (!data.USD) {
      throw new Error(`No price data for ${upperSymbol}`);
    }

    // Price in cents (multiply by 100)
    const priceInCents = Math.round(data.USD * 100);
    
    const price: CryptoPrice = {
      symbol: upperSymbol,
      price: priceInCents,
      formatted: formatPrice(priceInCents),
      timestamp: Date.now(),
    };

    // Update cache
    cache.set(upperSymbol, { price, timestamp: Date.now() });

    return price;
  } catch (error) {
    console.error(`Failed to fetch price for ${upperSymbol}:`, error);
    
    // Return cached value if available (even if stale)
    const stale = cache.get(upperSymbol);
    if (stale) {
      console.log(`Using stale cache for ${upperSymbol}`);
      return stale.price;
    }
    
    // Return fallback price (for resilience)
    return {
      symbol: upperSymbol,
      price: 0,
      formatted: '$0.00',
      timestamp: Date.now(),
    };
  }
}

export async function getBTCPrice(): Promise<CryptoPrice> {
  return getPrice('BTC');
}

export async function getETHPrice(): Promise<CryptoPrice> {
  return getPrice('ETH');
}

export async function getAllPrices(): Promise<{ btc: CryptoPrice; eth: CryptoPrice }> {
  const [btc, eth] = await Promise.all([getBTCPrice(), getETHPrice()]);
  return { btc, eth };
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
