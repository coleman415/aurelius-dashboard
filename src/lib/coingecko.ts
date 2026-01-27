// CoinGecko API client for Aurelius (SN37) token price

import type { PriceData, PricePoint } from "./types";

const API_BASE = "https://api.coingecko.com/api/v3";
const AURELIUS_ID = "finetuning"; // CoinGecko ID for Aurelius (SN37)

// Simple in-memory cache
const cache: Map<string, { data: unknown; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchCoinGecko(endpoint: string): Promise<unknown> {
  const cacheKey = endpoint;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      accept: "application/json",
    },
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    // Return cached data if available (even if stale)
    if (cached) {
      console.warn(`CoinGecko API error ${response.status}, using stale cache`);
      return cached.data;
    }
    throw new Error(`CoinGecko API error: ${response.status}`);
  }

  const data = await response.json();
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}

export async function getSN37Price(): Promise<PriceData> {
  try {
    // Fetch current price data
    const coinData = await fetchCoinGecko(
      `/coins/${AURELIUS_ID}?localization=false&tickers=false&community_data=false&developer_data=false`
    ) as {
      market_data?: {
        current_price?: { usd?: number };
        price_change_percentage_24h?: number;
        price_change_percentage_7d?: number;
        total_volume?: { usd?: number };
        market_cap?: { usd?: number };
      };
    };

    const marketData = coinData?.market_data;
    const current = marketData?.current_price?.usd ?? 0;
    const change24h = marketData?.price_change_percentage_24h ?? 0;
    const change7d = marketData?.price_change_percentage_7d ?? 0;
    const volume24h = marketData?.total_volume?.usd ?? 0;
    const marketCap = marketData?.market_cap?.usd ?? 0;

    // Fetch price history (7 days)
    const historyData = await fetchCoinGecko(
      `/coins/${AURELIUS_ID}/market_chart?vs_currency=usd&days=7`
    ) as {
      prices?: [number, number][];
    };

    const history: PricePoint[] = (historyData?.prices ?? []).map(([timestamp, price]) => ({
      timestamp,
      price,
    }));

    return {
      current,
      change24h,
      change7d,
      volume24h,
      marketCap,
      history,
    };
  } catch (error) {
    console.error("Error fetching SN37 price:", error);
    return {
      current: 0,
      change24h: 0,
      change7d: 0,
      volume24h: 0,
      marketCap: 0,
      history: [],
    };
  }
}

// Simplified TAO price fetch for the ticker (just current price)
export async function getTaoPriceTicker(): Promise<{ price: number; change24h: number }> {
  try {
    const data = await fetchCoinGecko(
      `/simple/price?ids=bittensor&vs_currencies=usd&include_24hr_change=true`
    ) as {
      bittensor?: {
        usd?: number;
        usd_24h_change?: number;
      };
    };

    return {
      price: data?.bittensor?.usd ?? 0,
      change24h: data?.bittensor?.usd_24h_change ?? 0,
    };
  } catch (error) {
    console.error("Error fetching TAO price ticker:", error);
    return { price: 0, change24h: 0 };
  }
}
