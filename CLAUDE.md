# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CFO-level financial dashboard for **Aurelius (Bittensor Subnet 37)**. Built for Coleman, the subnet owner, to monitor token economics, treasury, and expenses.

## Current Status (Jan 27, 2026)

- **Build**: Complete and passing (`npm run build` succeeds)
- **Deployment**: User is deploying to Vercel via Claude Cowork
- **API Keys**: Configured in `.env.local` (Taostats + Etherscan)
- **Discord Alerts**: Not yet implemented (waiting for webhook URL)

## Commands

```bash
npm run dev      # Start development server on localhost:3000
npm run build    # Production build
npm run start    # Run production build
npm run lint     # ESLint
```

## Architecture

```
src/
├── app/
│   ├── api/dashboard/route.ts   # Main API endpoint - aggregates all data sources
│   ├── page.tsx                 # Main page with header/footer
│   └── layout.tsx               # Root layout with metadata
├── components/
│   ├── Dashboard.tsx            # Main dashboard with auto-refresh (1 min)
│   ├── TreasuryOverview.tsx     # Wallet balances table + totals
│   ├── PriceChart.tsx           # TAO price with Recharts line chart
│   ├── StakingPerformance.tsx   # Delegated stake with area chart
│   ├── BurnRate.tsx             # Expenses pie chart + runway calc
│   ├── Transactions.tsx         # Transaction table with large tx alerts
│   └── Card.tsx, LoadingSkeleton.tsx
└── lib/
    ├── config.ts                # Wallet addresses, thresholds, sheet IDs
    ├── types.ts                 # TypeScript interfaces
    ├── taostats.ts              # Taostats API client (price, balances, staking, txs)
    ├── etherscan.ts             # Etherscan API client (ETH wallet)
    └── sheets.ts                # Google Sheets CSV parser (expenses)
```

## Key Configuration (src/lib/config.ts)

**Monitored Wallets:**
- Aurelius Foundation: `5DXqqdrvu5FK3dASRVTCdGPZKx4Q9nkAZZSmibKG6PEEeW4j` (Bittensor)
- Aurelius Labs: `5EqFekvquc2uZcaq1ZrKuJGTyCagfMg72DgKJj16FSA2rHDx` (Bittensor)
- Aurelius Labs: `0x8BD57fA41f0165a6e76e21676ACa235240e939bB` (Ethereum)
- Aurelius Validator: `5CSrYw5nGquFeZKL1Py8H3vgqcEh2v9pzDaFnrCFySG5m5AY` (Bittensor)

**Thresholds:**
- Large transaction: 100+ TAO

**Google Sheets:**
- Expenses: `1JeLGTukvajSKl-yc6Lbl8EEFLpOjoiK3s5et3k6-uSQ`
- Wallet Tracker: `1WwQftfIbI9s1S35notOxa1KZSpU8eiP4K7KvzG1WjFQ`

## Data Sources

| Data | Source | API Base |
|------|--------|----------|
| TAO price, wallets, staking, txs | Taostats | `https://api.taostats.io/api` |
| ETH wallet balance | Etherscan | `https://api.etherscan.io/api` |
| Expenses | Google Sheets | Public CSV export |

## Environment Variables

```
TAOSTATS_API_KEY=     # Required - from dash.taostats.io
ETHERSCAN_API_KEY=    # Optional - from etherscan.io/apis
DISCORD_WEBHOOK_URL=  # Future - for alerts
```

## Pending Features

1. **Discord Alerts** - Code structure ready, needs webhook URL from user
   - Large transaction alerts (100+ TAO)
   - Price movement alerts
   - Would add to `src/lib/discord.ts` and call from API route

2. **Additional Staking Metrics** - APY calculation, validator rank (needs more API calls)

3. **Historical Treasury Tracking** - Track treasury value over time

## Owner Context

- **Owner**: Coleman
- **Organization**: Aurelius Labs (development company for Subnet 37)
- **Team Members**: Austin, Coleman (expense payors)
- **Twitter**: @AureliusSubnet
- **Taostats**: https://taostats.io/subnets/37
