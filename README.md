# Launch Radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/marketzredcuy/makefun-token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/marketzredcuy/makefun-token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token-launch radar: a dashboard that reads a sealed DefiLlama snapshot, finds
the protocols that record no token, ranks them by implied launch value, and
shows what farming each one costs.

## What it is

- `main.ts` reads `input/snapshot.json` (758 protocols, DefiLlama, 2026-11-14),
  scores every protocol with one model, and writes `board.json`, `data.js`,
  `dashboard/` and `dossier.json` to the output directory.
- `dashboard/` is a static page (no network, no build step). It renders the
  board from `data.js`, with a method panel, a scatter of the traded tokens the
  curve is fitted on, filters, sorting, and a detail view per protocol.
- `board.json` holds 198 rows: the 40 watchlist protocols plus 158 early finds
  below the $50M floor. 128 protocols with a live token and 144 pre-token
  protocols set aside by the house rule are kept apart on the page, not ranked.

## The model (radar-comps-3)

Implied value is fitted on the snapshot's own traded tokens, not on a list of
names:

```
log10(market cap) = 3.3823 + 0.4721 x log10(TVL)
```

Each value is then adjusted by its category, 7-day TVL growth, time with no
token, and a 1.30x sibling boost when the protocol shares a distinctive name
word with a token that already trades (same team, one launch behind it).
Leave-one-out median miss is x3.55, against x4.94 for a flat multiple.

Every farm plan is netted on a $1,000 deposit and carries its break-even odds:
the chance the launch is worth enough for the farm to pay, read off the band.
A farm that pays even at the band's low end (P25) is ROBUST; one that pays at
the median is FARM; one that only beats its fees is THIN; one that never beats
its fees is SKIP.

- **Comps:** 119 distinct token families with a live market cap, one record per
  family at its largest TVL, centralised exchanges excluded. A token's market
  cap is its family's cap at its largest-TVL protocol.
- **Category offsets:** a shrunk mean log-residual per category, 8
  pseudo-observations toward zero (Prediction Market +0.313, Basis Trading
  +0.234, RWA +0.060, Dexs +0.039, Lending -0.154, Yield -0.160, Liquid
  Staking -0.204, Staking Pool -0.244).
- **Growth prior:** 1 + 0.75 x clamp(change_7d, -40%, +60%) / 100.
- **Seasoning prior:** 0.55 + 0.45 x min(age_days, 730) / 730; unknown age
  counts as 365 days.
- **Implied value** = 10^(a + b x log10(TVL) + category offset) x growth x
  seasoning.

The growth and seasoning terms are stated assumptions: fitted on the traded
comps they come out negative, because a token that already trades behaves
differently from a protocol that has never launched. The priors are what the
leading entries of this competition use, and they are written on the page.

## Backtest

The model is tested before any row is ranked, by leaving each traded token
out in turn:

| test | this model | flat multiple |
| --- | --- | --- |
| leave-one-out, median miss | x3.55 | x4.94 |
| within 3x of the real cap | 45% | 34% |
| within 10x | 79% | 75% |
| time split (fit 39 pre-2024, test 80 newer) | x3.80 / 44% | x5.44 / 31% |

Blind band from the leave-one-out residuals: P25 0.31x, P75 4.10x, P10 0.06x,
P90 9.55x. The table shows the P25-P75 band; the method panel shows P10-P90.

## What is rankable

A protocol is rankable when it records no token (no gecko_id and no symbol)
**and** it is not a product of one that trades: category not in Bridge,
Canonical Bridge, Liquid Staking, Liquid Restaking, Restaked BTC or CEX; name
not ending in a version marker; no whole word wrapped, staked or staking; name
not starting with an exchange name. That rule sets aside 144 pre-token
protocols (Binance staked ETH, WBTC, Coinbase Bridge and the like), each with
its reason on the Set aside tab.

## Farm economics

The $1,000 slice is $1,000 / TVL x 10% x implied value: the share of the
launch a pro-rata depositor would take if 10% went to depositors. Gas is
charged on the protocol's **cheapest** chain (Solana $0.10 a transaction, most
Layer 2s $0.50, Ethereum $5), four transactions for setup, weekly actions and
the claim. Opportunity cost is the $1,000 at a 4% T-bill for the hold: 60 days
for protocols under 180 days old or of unknown age, 45 days under a year, 30
days older. Hours are a quarter hour to set up plus ten minutes a week.

- **FARM** — the slice beats gas plus the T-bill: 158 rows.
- **THIN** — the slice beats gas only: 21 rows.
- **SKIP** — gas eats the drop: 19 rows.

Best net per hands-on hour: Predict Fun +$80.33/h, Manifest Trade +$67.43/h,
TurboFlow Perps +$49.57/h. Top of the board: Steakhouse Financial $74.1M,
Sentora Curator $69.5M, Gauntlet $60.4M, Polymarket International $51.0M,
Veda $35.6M.

## Running it

```
node main.ts --input <path to snapshot.json>
```

Node 22, standard library only. Set `MAKEFUN_OUTPUT_DIR` to choose the output
directory (default `output/`). The run prints the fitted curve and the
leave-one-out result, and writes `board.json`, `data.js`, `dashboard/`,
`screenshots/` and `dossier.json`.

## Files

- `lib/model.ts` — the whole model: snapshot parsing, the comps fit, the
  category offsets, the validation, the rankable rule, the farm economics,
  the board and the radar data.
- `main.ts` — reads the snapshot, runs the model, writes the output.
- `dashboard/index.html`, `dashboard/app.css`, `dashboard/app.js` — the page.
  It renders from `data.js` and recomputes nothing the model does not already
  carry, so the page, the table and `board.json` agree row for row.
- `screenshots/` — board, detail and filtered views of the page.
- `vendor/makefun-board.ts` — the kit's board library, unedited.

Implied value is a model of what a token would be worth if the protocol
launched one. It is not a price, a promise or investment advice, and a farm
plan is a worked example of the economics, not a guarantee of an airdrop.

---

<sub>Entered on [make.fun](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
