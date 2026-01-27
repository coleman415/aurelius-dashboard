// Dashboard data types

export interface WalletBalance {
  name: string;
  address: string;
  network: "bittensor" | "ethereum";
  balance: number;
  balanceUSD: number;
}

export interface TreasuryOverview {
  totalTAO: number;
  totalETH: number;
  totalUSD: number;
  change24h: number;
  change7d: number;
  change30d: number;
  wallets: WalletBalance[];
}

export interface PriceData {
  current: number;
  change24h: number;
  change7d: number;
  volume24h: number;
  marketCap: number;
  history: PricePoint[];
}

export interface PricePoint {
  timestamp: number;
  price: number;
}

export interface Transaction {
  hash: string;
  timestamp: number;
  from: string;
  to: string;
  amount: number;
  amountUSD: number;
  type: "send" | "receive";
  isLarge: boolean;
  wallet: string;
}

export interface StakingData {
  totalDelegated: number;
  totalDelegatedUSD: number;
  stakerCount: number;
  validatorRank: number;
  apy: number;
  stakeHistory: StakePoint[];
}

export interface StakePoint {
  timestamp: number;
  amount: number;
}

export interface Expense {
  date: string;
  payor: string;
  item: string;
  cost: number;
  recurring: boolean;
  annualized?: number;
}

export interface BurnRateData {
  monthlyBurn: number;
  monthlyBurnUSD: number;
  runwayMonths: number;
  expensesByCategory: CategoryExpense[];
  expensesByPayor: PayorExpense[];
  recentExpenses: Expense[];
}

export interface CategoryExpense {
  category: string;
  amount: number;
  percentage: number;
}

export interface PayorExpense {
  payor: string;
  amount: number;
  percentage: number;
}

export interface DashboardData {
  treasury: TreasuryOverview;
  price: PriceData;
  staking: StakingData;
  burnRate: BurnRateData;
  transactions: Transaction[];
  lastUpdated: number;
}
