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
| X Pulse and research snapshots | `x-pulse-data` branch, read at visit time |

## Refreshing X Pulse data

Daily refreshes commit JSON on the `x-pulse-data` branch only. The site reads the public files and revalidates about every 15 minutes. Do not redeploy, and do not commit the refresh onto the app branch.

- https://raw.githubusercontent.com/coleman415/aurelius-dashboard/x-pulse-data/x-pulse.json
- https://raw.githubusercontent.com/coleman415/aurelius-dashboard/x-pulse-data/research.json

Publication requires a fresh pair from the same approved invocation. Use an existing provisioned absolute `RESEARCH_PYTHON`, a reviewed full `RESEARCH_SHA`, an absolute nonempty local `X_INPUT`, and `RUN_STARTED_AT` recorded before the actual X fetch. Transfer the producer artifact unchanged from the Grok Bot host to the Mac; a remote box path is not a local input. The scheduled trigger is unverified. Live exports remain paused until authenticated operator setup and approval of the actual execution.

The operator must supply an owner-managed `GITHUB_TOKEN` in the environment of `scripts/refresh-research.sh`. The script checks presence only, never prints the token, and does not provision credentials. Presence does not establish validity or remaining API quota. Unauthenticated GitHub requests can exhaust the shared 60/hour budget.

After execution approval, invoke `/bin/bash scripts/refresh-research.sh` with those environment variables. It checks paths and dependencies before network access, clones research at the reviewed SHA, and exports six sources. `validate-research.mjs` requires healthy `source_status` and nonempty output for arxiv, huggingface, github, lesswrong, goodfire, and neuronpedia; legitimate zero is reported separately from fetch failure and also blocks publication. `validate-pair.mjs` requires valid current-run research and X timestamps. Only after both pass does the script clone the data branch and commit both JSON files together. Export, validation, or push failure preserves the previous public pair; do not force-push or restamp old data. Roll back by restoring a chosen last-good pair in a new commit on the current data branch, or reverting the bad pair commit.

Current research exports carry `score` and its `relevance` alias on 0–10; `score` wins unchanged (7.4 displays as 7.4). Legacy relevance-only snapshots use a 0–100 scale and are divided by ten. Bundled `src/data/` snapshots remain page-fetch fallbacks.

## Adding Discord Alerts (Future)

When ready, add `DISCORD_WEBHOOK_URL` to your environment variables. The webhook can be created in Discord: Channel Settings → Integrations → Webhooks.
