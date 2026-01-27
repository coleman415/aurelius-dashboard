import { WALLETS } from "./config";
import type { WalletBalance } from "./types";

const ETHERSCAN_API = "https://api.etherscan.io/api";

// Simple cache for Etherscan data
const ethCache: Map<string, { data: unknown; timestamp: number }> = new Map();
const ETH_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function fetchEtherscan(params: Record<string, string>) {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    console.warn("ETHERSCAN_API_KEY not set, ETH balances will be 0");
    return null;
  }

  // Check cache first
  const cacheKey = JSON.stringify(params);
  const cached = ethCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < ETH_CACHE_TTL) {
    return cached.data;
  }

  const searchParams = new URLSearchParams({ ...params, apikey: apiKey });
  const response = await fetch(`${ETHERSCAN_API}?${searchParams}`, {
    next: { revalidate: 600 }, // Cache for 10 minutes
  });

  if (!response.ok) {
    // Return cached data if available
    if (cached) {
      console.warn(`Etherscan API error, using cached data`);
      return cached.data;
    }
    throw new Error(`Etherscan API error: ${response.status}`);
  }

  const data = await response.json();
  ethCache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}

async function getEthPrice(): Promise<number> {
  try {
    const data = await fetchEtherscan({
      module: "stats",
      action: "ethprice",
    });
    return parseFloat(data?.result?.ethusd ?? "0");
  } catch (error) {
    console.error("Error fetching ETH price:", error);
    return 0;
  }
}

export async function getEthWalletBalances(): Promise<WalletBalance[]> {
  const balances: WalletBalance[] = [];
  const ethPrice = await getEthPrice();

  for (const wallet of WALLETS.ethereum) {
    try {
      const data = await fetchEtherscan({
        module: "account",
        action: "balance",
        address: wallet.address,
        tag: "latest",
      });

      const balanceWei = data?.result ?? "0";
      const balanceEth = parseFloat(balanceWei) / 1e18;

      balances.push({
        name: wallet.name,
        address: wallet.address,
        network: "ethereum",
        balance: balanceEth,
        balanceUSD: balanceEth * ethPrice,
      });
    } catch (error) {
      console.error(`Error fetching ETH balance for ${wallet.name}:`, error);
      balances.push({
        name: wallet.name,
        address: wallet.address,
        network: "ethereum",
        balance: 0,
        balanceUSD: 0,
      });
    }
  }

  return balances;
}
