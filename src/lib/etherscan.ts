import { WALLETS } from "./config";
import type { WalletBalance } from "./types";

const ETHERSCAN_API = "https://api.etherscan.io/api";

async function fetchEtherscan(params: Record<string, string>) {
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
    console.warn("ETHERSCAN_API_KEY not set, ETH balances will be 0");
    return null;
  }

  const searchParams = new URLSearchParams({ ...params, apikey: apiKey });
  const response = await fetch(`${ETHERSCAN_API}?${searchParams}`, {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Etherscan API error: ${response.status}`);
  }

  return response.json();
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
