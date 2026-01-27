import { WALLETS } from "./config";
import type { WalletBalance } from "./types";

const ETHERSCAN_API = "https://api.etherscan.io/api";
const USDC_CONTRACT = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

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

async function getUSDCBalance(address: string): Promise<number> {
  try {
    const data = await fetchEtherscan({
      module: "account",
      action: "tokenbalance",
      contractaddress: USDC_CONTRACT,
      address: address,
      tag: "latest",
    });

    const balanceRaw = data?.result ?? "0";
    // USDC has 6 decimals
    return parseFloat(balanceRaw) / 1e6 || 0;
  } catch (error) {
    console.error(`Error fetching USDC balance for ${address}:`, error);
    return 0;
  }
}

export async function getEthWalletBalances(): Promise<WalletBalance[]> {
  const balances: WalletBalance[] = [];
  const ethPrice = await getEthPrice();

  for (const wallet of WALLETS.ethereum) {
    try {
      // Fetch ETH balance
      const ethData = await fetchEtherscan({
        module: "account",
        action: "balance",
        address: wallet.address,
        tag: "latest",
      });

      const balanceWei = ethData?.result ?? "0";
      const balanceEth = parseFloat(balanceWei) / 1e18 || 0;
      const ethUSD = (balanceEth * ethPrice) || 0;

      // Fetch USDC balance
      const usdcBalance = await getUSDCBalance(wallet.address);

      // Add ETH balance entry
      balances.push({
        name: wallet.name,
        address: wallet.address,
        network: "ethereum",
        balance: balanceEth,
        balanceUSD: ethUSD,
        token: "ETH",
      });

      // Add USDC balance entry (only if > 0)
      if (usdcBalance > 0) {
        balances.push({
          name: wallet.name.replace(" (ETH)", "") + " (USDC)",
          address: wallet.address,
          network: "ethereum",
          balance: usdcBalance,
          balanceUSD: usdcBalance, // USDC is 1:1 with USD
          token: "USDC",
        });
      }
    } catch (error) {
      console.error(`Error fetching balances for ${wallet.name}:`, error);
      balances.push({
        name: wallet.name,
        address: wallet.address,
        network: "ethereum",
        balance: 0,
        balanceUSD: 0,
        token: "ETH",
      });
    }
  }

  return balances;
}
