// Aurelius Subnet 37 Dashboard Configuration

export const SUBNET_ID = 37;
export const SUBNET_NAME = "Aurelius";

// Large transaction threshold in TAO
export const LARGE_TX_THRESHOLD = 100;

// Wallet addresses to monitor
export const WALLETS = {
  bittensor: [
    {
      name: "Aurelius Foundation",
      address: "5DXqqdrvu5FK3dASRVTCdGPZKx4Q9nkAZZSmibKG6PEEeW4j",
      description: "Foundation wallet / Employee grants",
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

// Refresh intervals (in milliseconds)
export const REFRESH_INTERVALS = {
  price: 60_000, // 1 minute
  wallets: 300_000, // 5 minutes
  staking: 300_000, // 5 minutes
  expenses: 3600_000, // 1 hour
} as const;
