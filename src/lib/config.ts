// Aurelius Subnet 37 Dashboard Configuration

export const SUBNET_ID = 37;
export const SUBNET_NAME = "Aurelius";

// Large transaction threshold in TAO
export const LARGE_TX_THRESHOLD = 25;

// Wallet addresses to monitor
export const WALLETS = {
  bittensor: [
    {
      name: "Aurelius Foundation",
      address: "5GRBbS3aDep7cvR1NRm9Awp5HAF1o4HC7t59Y8HoheLZ6ZaP",
      description: "Foundation wallet / Employee grants (coldkey swapped Sept 2025)",
    },
    {
      name: "Aurelius Labs",
      address: "5EqFekvquc2uZcaq1ZrKuJGTyCagfMg72DgKJj16FSA2rHDx",
      description: "Development company",
    },
    {
      name: "Aurelius Validator",
      address: "5CSrYw5nGquFeZKL1Py8H3vgqcEh2v9pzDaFnrCFySG5m5AY",
      description: "Validator hotkey",
    },
  ],
  ethereum: [
    {
      name: "Aurelius Labs (ETH)",
      address: "0x8BD57fA41f0165a6e76e21676ACa235240e939bB",
      description: "Development company ETH wallet",
    },
  ],
} as const;

// Google Sheets IDs
export const SHEETS = {
  expenses: "1JeLGTukvajSKl-yc6Lbl8EEFLpOjoiK3s5et3k6-uSQ",
  walletTracker: "1WwQftfIbI9s1S35notOxa1KZSpU8eiP4K7KvzG1WjFQ",
} as const;

// API endpoints
export const API_ENDPOINTS = {
  taostats: "https://api.taostats.io/api",
  etherscan: "https://api.etherscan.io/api",
} as const;

// Refresh intervals (in milliseconds) - conservative to avoid rate limits
export const REFRESH_INTERVALS = {
  price: 300_000, // 5 minutes (was 1 minute)
  wallets: 600_000, // 10 minutes
  staking: 600_000, // 10 minutes
  expenses: 3600_000, // 1 hour
} as const;

// Monthly recurring expenses for burn rate projection
export const RECURRING_EXPENSES = {
  // USD-denominated monthly expenses
  usd: [
    { name: "CTO", amount: 10_000, category: "Personnel" },
    { name: "Tensor Media Group", amount: 4_000, category: "Marketing" },
    { name: "Video Creator", amount: 1_000, category: "Marketing" },
  ],
  // Token-denominated monthly expenses (converted to USD at runtime)
  tokens: [
    { name: "Valis (Horizons)", amount: 3_000, token: "AURELIUS", category: "Personnel" },
  ],
} as const;
