# Aurelius Dashboard

CFO-level financial dashboard for Bittensor Subnet 37 (Aurelius).

## Features

- **Treasury Overview**: Total holdings across TAO and ETH wallets with USD valuations
- **Token Price**: Real-time TAO price with historical charts
- **Wallet Flows**: Track inflows/outflows across all monitored wallets
- **Large Transaction Alerts**: Highlights transactions of 100+ TAO
- **Staking Performance**: Delegated stake, staker count, and historical trends
- **Burn Rate & Runway**: Expense tracking and runway calculations from Google Sheets
- **Auto-refresh**: Data updates every minute

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your API keys:

```bash
cp .env.example .env.local
```

Required:
- `TAOSTATS_API_KEY`: Get one at [dash.taostats.io](https://dash.taostats.io)

Optional:
- `ETHERSCAN_API_KEY`: Get one at [etherscan.io/apis](https://etherscan.io/apis) (for ETH wallet tracking)

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to [Vercel](https://vercel.com/new)
3. Add environment variables in Vercel dashboard
4. Deploy

### Manual build

```bash
npm run build
npm start
```

## Configuration

Edit `src/lib/config.ts` to modify:

- Wallet addresses to monitor
- Large transaction threshold (default: 100 TAO)
- Google Sheets IDs for expense tracking
- Refresh intervals

## Data Sources

| Data | Source |
|------|--------|
| TAO price, balances, staking, transactions | [Taostats API](https://docs.taostats.io) |
| ETH wallet balances | [Etherscan API](https://etherscan.io/apis) |
| Expenses | Google Sheets (public CSV export) |

## Adding Discord Alerts (Future)

When ready, add `DISCORD_WEBHOOK_URL` to your environment variables. The webhook can be created in Discord: Channel Settings → Integrations → Webhooks.
