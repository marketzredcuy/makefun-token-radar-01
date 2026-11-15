// The token radar's model: radar-comps-1.
//
// One snapshot of the protocol universe in, one ranked board out. The value model is
// fitted from the snapshot itself at runtime: a size curve over the traded tokens
// (one record per token family), category effects shrunk toward zero, then a growth
// prior and a seasoning prior. Nothing is a hardcoded list of names: the same
// function scores every row, and the dashboard reports the fit's own out-of-sample
// error next to the flat multiple it beats.
//
//   log10(mcap) = a + b * log10(tvl) + category_effect     (fitted, OLS, comps)
//   implied     = 10^(a + b*log10(tvl) + effect) * growth * seasoning
//   growth      = 1 + 0.75 * clamp(change_7d, -40, +60) / 100   (prior)
//   seasoning   = 0.55 + 0.45 * min(age_days, 730) / 730         (prior, unknown age 365)
//
// Farm economics are netted to the dollar on a $1,000 plan: the slice is what $1,000
// deposited would take if 10% of the launch went to depositors pro rata; gas is
// charged on the protocol's cheapest chain; the opportunity cost is a 4% T-bill on
// the capital over the hold. FARM pays after fees and the T-bill, THIN beats its
// fees only, SKIP never beats its fees.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-comps-1';

/** Shrinkage pseudo-count for category effects: a one-token category moves the
 *  curve by a ninth of its residual, a fifteen-token one by two thirds. */
export const CATEGORY_PSEUDO = 8;

/** Growth prior: 7-day TVL momentum, clamped, worth 0.75 per point. */
export const GROWTH_WEIGHT = 0.75;
export const GROWTH_FLOOR = -40;
export const GROWTH_CAP = 60;

/** Seasoning prior: 0.55 at launch, rising to 1.00 after two years with no token. */
export const SEASON_FLOOR = 0.55;
export const SEASON_RANGE = 0.45;
export const SEASON_DAYS = 730;
export const UNKNOWN_AGE_DAYS = 365;

/** How many rows the board carries: the 40 watchlist slugs plus the best early finds. */
export const BOARD_ROWS = 198;

/** How many live-token protocols the dashboard's Token trades view carries, by market cap. */
export const LIVE_ROWS = 128;

/** The airdrop share a $1,000 deposit takes if 10% of the launch goes to depositors. */
export const SLICE_SHARE = 0.1;

/** The T-bill rate the farm plan's opportunity cost is charged at. */
export const TBILL_RATE = 0.04;

/** Gas per transaction by chain, in whole dollars (cheapest chain wins the farm). */
export const GAS_PER_TX: Record<string, number> = {
  Solana: 0.1,
  Base: 0.5,
  Polygon: 0.5,
  Optimism: 0.5,
  'BNB Chain': 0.5,
  Ink: 0.5,
  Monad: 0.5,
  BSquared: 0.5,
  Arbitrum: 1,
  Avalanche: 1,
  Tron: 1,
  Ethereum: 5,
};

/** Fallback gas per transaction for a chain the table does not name. */
export const GAS_DEFAULT = 2;

/** Transactions in one farm plan: setup, two weekly actions, claim. */
export const FARM_TXS = 4;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** The fitted size curve and its validation, all computed from the snapshot. */
export interface CompsFit {
  a: number;
  b: number;
  effects: Record<string, number>;
  categories: { category: string; n: number; effect: number }[];
  comps: number;
  loo: { median: number; within3: number; within10: number };
  flat: { median: number; within3: number; within10: number };
  timeSplit: { median: number; within3: number; flatMedian: number; flatWithin3: number; fitN: number; testN: number };
  band: { p10: number; p25: number; p75: number; p90: number };
}

/** One row's farm economics on a $1,000 plan, netted to the dollar. */
export interface FarmEconomics {
  slice1k: number;
  gas: number;
  oppCost: number;
  net: number;
  netPerHour: number;
  verdict: 'FARM' | 'THIN' | 'SKIP';
  holdDays: number;
  chain: string;
  hours: number;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    base: number;
    category_effect: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    age_days: number | null;
  };
  band: { p25: number; p75: number };
  farm: FarmEconomics;
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  p25: number;
  p75: number;
  category_effect: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  slice1k: number;
  gas: number;
  oppCost: number;
  net: number;
  netPerHour: number;
  hours: number;
  verdict: 'FARM' | 'THIN' | 'SKIP';
  holdDays: number;
  chain: string;
  farm_steps: string[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** A protocol the house rule set aside: what it is and why it is not ranked. */
export interface SetAsideRow {
  slug: string;
  name: string;
  category: string | null;
  reason: string;
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model_version: string;
  fit: CompsFit;
  watchlist: string[];
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  setaside_size: number;
  verdicts: { FARM: number; THIN: number; SKIP: number };
  bestPerHour: { slug: string; name: string; netPerHour: number; verdict: string }[];
  rows: RadarRow[];
  live: LiveRow[];
  setaside: SetAsideRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Categories the house rule sets aside: wrapped, staked and bridged products of a token that trades. */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** Exchanges whose name at the start of a protocol's name marks it their product. */
const EXCHANGE_PREFIXES = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];

/** A whole word wrapped, staked or staking anywhere in a name. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol is one the board may rank: pre-token and not a wrapped, staked
 *  or bridged product of a token that already trades, by the house rule's own words.
 *  The starter only excluded CEX and versioned names, which lets bridges and wrapped
 *  products (WBTC, Binance staked ETH, Coinbase Bridge) top the board; they are not
 *  protocols waiting on a launch of their own. */
export function isRankable(p: SnapshotProtocol): boolean {
  if (!isPreToken(p)) return false;
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return false;
  if (VERSIONED.test(p.name)) return false;
  if (WRAPPED_WORD.test(p.name)) return false;
  if (EXCHANGE_PREFIXES.some((x) => p.name.startsWith(x))) return false;
  return true;
}

/** Why a protocol is set aside, in the house rule's words, or null when it is rankable. */
export function setAsideReason(p: SnapshotProtocol): string | null {
  if (!isPreToken(p)) return null;
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return `category ${p.category}: a product of a token that already trades`;
  if (VERSIONED.test(p.name)) return 'versioned name: a pool of another protocol';
  if (WRAPPED_WORD.test(p.name)) return 'wrapped or staked product of a token that already trades';
  if (EXCHANGE_PREFIXES.some((x) => p.name.startsWith(x))) return 'an exchange product, not a protocol of its own';
  return null;
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** The comps: one record per traded token family (largest TVL), CEX excluded,
 *  market cap above zero. A family is one token, however many pools carry it. */
export function buildComps(snapshot: Snapshot): SnapshotProtocol[] {
  const byFamily = new Map<string, SnapshotProtocol>();
  for (const p of snapshot.protocols) {
    if (p.mcap_usd === null || p.mcap_usd <= 0) continue;
    if (p.tvl_usd <= 0) continue;
    if (p.gecko_id === null) continue;
    if (p.category === 'CEX') continue;
    const cur = byFamily.get(p.gecko_id);
    if (cur === undefined || p.tvl_usd > cur.tvl_usd) byFamily.set(p.gecko_id, p);
  }
  return [...byFamily.values()];
}

/** Ordinary least squares for y = a + b*x; returns [a, b]. */
function ols(xs: number[], ys: number[]): [number, number] {
  const n = xs.length;
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i]! - mx) * (ys[i]! - my);
    sxx += (xs[i]! - mx) * (xs[i]! - mx);
  }
  const b = sxx === 0 ? 0 : sxy / sxx;
  return [my - b * mx, b];
}

/** Shrunk category effects: each category's mean log residual, pulled toward zero
 *  by CATEGORY_PSEUDO. A category with one token barely moves the curve. */
function categoryEffects(comps: SnapshotProtocol[], a: number, b: number): Record<string, number> {
  const sums = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const p of comps) {
    const r = Math.log10(p.mcap_usd!) - (a + b * Math.log10(p.tvl_usd));
    const c = p.category ?? 'None';
    sums.set(c, (sums.get(c) ?? 0) + r);
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const effects: Record<string, number> = {};
  for (const [c, sum] of sums) effects[c] = sum / ((counts.get(c) ?? 0) + CATEGORY_PSEUDO);
  return effects;
}

/** The curve's prediction for one protocol, before the growth and seasoning priors. */
function curveValue(p: SnapshotProtocol, a: number, b: number, effects: Record<string, number>): number {
  const e = effects[p.category ?? 'None'] ?? 0;
  return Math.pow(10, a + b * Math.log10(p.tvl_usd) + e);
}

/** Median of a sorted array. */
function median(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  return n % 2 === 1 ? sorted[(n - 1) / 2]! : (sorted[n / 2 - 1]! + sorted[n / 2]!) / 2;
}

/** The error factor of a prediction against the real market cap: how many times off. */
function missFactor(pred: number, actual: number): number {
  return Math.max(pred, actual) / Math.min(pred, actual);
}

/** Leave-one-out validation of the curve on the comps, and of the flat multiple
 *  beside it. Returns the median miss and the shares within 3x and 10x. */
function looValidation(comps: SnapshotProtocol[]): { median: number; within3: number; within10: number } {
  const errs: number[] = [];
  for (let i = 0; i < comps.length; i++) {
    const rest = comps.filter((_, j) => j !== i);
    const [a, b] = ols(rest.map((p) => Math.log10(p.tvl_usd)), rest.map((p) => Math.log10(p.mcap_usd!)));
    const eff = categoryEffects(rest, a, b);
    const pred = curveValue(comps[i]!, a, b, eff);
    errs.push(missFactor(pred, comps[i]!.mcap_usd!));
  }
  errs.sort((x, y) => x - y);
  return {
    median: median(errs),
    within3: errs.filter((e) => e <= 3).length / errs.length,
    within10: errs.filter((e) => e <= 10).length / errs.length,
  };
}

/** The flat multiple's leave-one-out error, for the same comps: median mcap/TVL. */
function flatValidation(comps: SnapshotProtocol[]): { median: number; within3: number; within10: number } {
  const errs: number[] = [];
  for (let i = 0; i < comps.length; i++) {
    const rest = comps.filter((_, j) => j !== i);
    const ratios = rest.map((p) => p.mcap_usd! / p.tvl_usd).sort((x, y) => x - y);
    const k = median(ratios);
    errs.push(missFactor(k * comps[i]!.tvl_usd, comps[i]!.mcap_usd!));
  }
  errs.sort((x, y) => x - y);
  return {
    median: median(errs),
    within3: errs.filter((e) => e <= 3).length / errs.length,
    within10: errs.filter((e) => e <= 10).length / errs.length,
  };
}

/** Time-split validation: fit on tokens listed before 2024, test on the rest. */
function timeSplitValidation(comps: SnapshotProtocol[]): { median: number; within3: number; flatMedian: number; flatWithin3: number; fitN: number; testN: number } {
  const fit = comps.filter((p) => p.listed_at !== null && p.listed_at < '2024-01-01');
  const test = comps.filter((p) => p.listed_at === null || p.listed_at >= '2024-01-01');
  const [a, b] = ols(fit.map((p) => Math.log10(p.tvl_usd)), fit.map((p) => Math.log10(p.mcap_usd!)));
  const eff = categoryEffects(fit, a, b);
  const errs = test.map((p) => missFactor(curveValue(p, a, b, eff), p.mcap_usd!)).sort((x, y) => x - y);
  const flatK = median(fit.map((p) => p.mcap_usd! / p.tvl_usd).sort((x, y) => x - y));
  const flatErrs = test.map((p) => missFactor(flatK * p.tvl_usd, p.mcap_usd!)).sort((x, y) => x - y);
  return {
    median: median(errs),
    within3: errs.filter((e) => e <= 3).length / Math.max(1, errs.length),
    flatMedian: median(flatErrs),
    flatWithin3: flatErrs.filter((e) => e <= 3).length / Math.max(1, flatErrs.length),
    fitN: fit.length,
    testN: test.length,
  };
}

/** The uncertainty band from the leave-one-out residuals: P10, P25, P75, P90 multipliers. */
function looBand(comps: SnapshotProtocol[], a: number, b: number, effects: Record<string, number>): { p10: number; p25: number; p75: number; p90: number } {
  const residuals: number[] = [];
  for (let i = 0; i < comps.length; i++) {
    const rest = comps.filter((_, j) => j !== i);
    const [a2, b2] = ols(rest.map((p) => Math.log10(p.tvl_usd)), rest.map((p) => Math.log10(p.mcap_usd!)));
    const eff2 = categoryEffects(rest, a2, b2);
    const pred = curveValue(comps[i]!, a2, b2, eff2);
    residuals.push(Math.log10(comps[i]!.mcap_usd! / pred));
  }
  residuals.sort((x, y) => x - y);
  const n = residuals.length;
  const at = (q: number): number => Math.pow(10, residuals[Math.min(n - 1, Math.max(0, Math.floor(q * n)))]!);
  return { p10: at(0.1), p25: at(0.25), p75: at(0.75), p90: at(0.9) };
}

/** Fit the whole model from the snapshot: curve, effects, and every validation. */
export function fitModel(snapshot: Snapshot): CompsFit {
  const comps = buildComps(snapshot);
  const [a, b] = ols(comps.map((p) => Math.log10(p.tvl_usd)), comps.map((p) => Math.log10(p.mcap_usd!)));
  const effects = categoryEffects(comps, a, b);
  const counts = new Map<string, number>();
  for (const p of comps) {
    const c = p.category ?? 'None';
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const categories = Object.entries(effects)
    .map(([category, effect]) => ({ category, n: counts.get(category) ?? 0, effect: Math.round(effect * 1e4) / 1e4 }))
    .sort((x, y) => y.effect - x.effect);
  return {
    a,
    b,
    effects,
    categories,
    comps: comps.length,
    loo: looValidation(comps),
    flat: flatValidation(comps),
    timeSplit: timeSplitValidation(comps),
    band: looBand(comps, a, b, effects),
  };
}

/** The three multipliers and the implied value one protocol gets under the fit. */
export function impliedValue(p: SnapshotProtocol, asOf: string, fit: CompsFit): { implied: number; base: number; growthMult: number; maturityMult: number; age: number | null; catEffect: number } {
  const age = ageDays(asOf, p.listed_at);
  const rawGrowth = finite(p.change_7d, 0);
  const growthPct = Math.min(GROWTH_CAP, Math.max(GROWTH_FLOOR, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * GROWTH_WEIGHT;
  const ageForModel = age ?? UNKNOWN_AGE_DAYS;
  const maturityMult = SEASON_FLOOR + (Math.min(Math.max(ageForModel, 0), SEASON_DAYS) / SEASON_DAYS) * SEASON_RANGE;
  const catEffect = fit.effects[p.category ?? 'None'] ?? 0;
  const base = Math.pow(10, fit.a + fit.b * Math.log10(p.tvl_usd) + catEffect);
  const implied = Math.max(1, Math.round(base * growthMult * maturityMult));
  return { implied, base, growthMult, maturityMult, age, catEffect };
}

/** The protocol's cheapest chain to farm on, and its gas per transaction. */
export function cheapestChain(p: SnapshotProtocol): { chain: string; gas: number } {
  const chains = p.chains.length > 0 ? p.chains : ['Ethereum'];
  let best = chains[0]!;
  let bestGas = GAS_PER_TX[best] ?? GAS_DEFAULT;
  for (const c of chains) {
    const g = GAS_PER_TX[c] ?? GAS_DEFAULT;
    if (g < bestGas) {
      best = c;
      bestGas = g;
    }
  }
  return { chain: best, gas: bestGas };
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 60;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/** One row's farm economics on a $1,000 plan, netted to the dollar. */
export function farmEconomics(p: SnapshotProtocol, implied: number, age: number | null): FarmEconomics {
  const slice1k = (1000 / p.tvl_usd) * SLICE_SHARE * implied;
  const { chain, gas: gasPerTx } = cheapestChain(p);
  const gas = gasPerTx * FARM_TXS;
  const holdDays = holdDaysFor(age);
  const oppCost = 1000 * TBILL_RATE * (holdDays / 365);
  const hours = 0.25 + 0.17 * (holdDays / 7) + 0.17;
  const net = slice1k - gas - oppCost;
  const netPerHour = net / hours;
  const verdict: 'FARM' | 'THIN' | 'SKIP' = net > 0 ? 'FARM' : slice1k > gas ? 'THIN' : 'SKIP';
  return { slice1k, gas, oppCost, net, netPerHour, verdict, holdDays, chain, hours };
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** The category's one action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name}.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/**
 * A protocol's farm plan: six steps, each an action with a cost and a time. The plan
 * is derived from the protocol's own record (category, chains, TVL, age) and its
 * economics (capital, cheapest chain, hold), never from a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, econ: FarmEconomics, capital: number): FarmStep[] {
  const action = actionFor(p, capital, econ.chain);
  const gasEach = econ.gas / FARM_TXS;
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: action,
      cost: `$${capital} of capital and about $${gasEach.toFixed(2)} of gas on ${econ.chain}`,
      time: '15 minutes to set up',
    },
    {
      text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.`,
      cost: `about $${gasEach.toFixed(2)} of gas a week on ${econ.chain}`,
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${econ.holdDays} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${econ.holdDays} days`,
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
  ];
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, fit: CompsFit): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const chosen = new Map<string, SnapshotProtocol>();
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: rankable pre-token protocols the watchlist leaves out, by TVL.
  // The watchlist is a floor, never a ceiling: a protocol above the floor that the
  // list leaves out (Sentora, Polymarket) is no worse a subject than one on it.
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p))
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .slice(0, Math.max(0, BOARD_ROWS - chosen.size));
  for (const p of early) chosen.set(p.slug, p);

  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, fit);
    const econ = farmEconomics(p, v.implied, v.age);
    return { p, v, econ };
  });
  scored.sort((a, b) => b.v.implied - a.v.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.v.age,
    implied_value_usd: s.v.implied,
    model: {
      base: Math.round(s.v.base),
      category_effect: Math.round(s.v.catEffect * 1e4) / 1e4,
      growth_multiplier: Math.round(s.v.growthMult * 1e4) / 1e4,
      maturity_multiplier: Math.round(s.v.maturityMult * 1e4) / 1e4,
      age_days: s.v.age,
    },
    band: {
      p25: Math.max(1, Math.round(s.v.implied * fit.band.p25)),
      p75: Math.max(1, Math.round(s.v.implied * fit.band.p75)),
    },
    farm: {
      slice1k: Math.round(s.econ.slice1k * 100) / 100,
      gas: Math.round(s.econ.gas * 100) / 100,
      oppCost: Math.round(s.econ.oppCost * 100) / 100,
      net: Math.round(s.econ.net * 100) / 100,
      netPerHour: Math.round(s.econ.netPerHour * 100) / 100,
      verdict: s.econ.verdict,
      holdDays: s.econ.holdDays,
      chain: s.econ.chain,
      hours: Math.round(s.econ.hours * 100) / 100,
    },
    farm_steps: farmSteps(s.p, s.econ, capitalFor(s.p)).map(stepText),
  }));
}

/** The live-token protocols, by market cap, for the dashboard's Token trades view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** The protocols the house rule set aside, with the reason each one is not ranked. */
export function setAsideRows(snapshot: Snapshot): SetAsideRow[] {
  const rows: SetAsideRow[] = [];
  for (const p of snapshot.protocols) {
    const reason = setAsideReason(p);
    if (reason !== null) rows.push({ slug: p.slug, name: p.name, category: p.category, reason });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    p25: row.band.p25,
    p75: row.band.p75,
    category_effect: row.model.category_effect,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    slice1k: row.farm.slice1k,
    gas: row.farm.gas,
    oppCost: row.farm.oppCost,
    net: row.farm.net,
    netPerHour: row.farm.netPerHour,
    hours: row.farm.hours,
    verdict: row.farm.verdict,
    holdDays: row.farm.holdDays,
    chain: row.farm.chain,
    farm_steps: row.farm_steps,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, fit: CompsFit): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, fit);
  const live = liveRows(snapshot);
  const setaside = setAsideRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const verdicts = { FARM: 0, THIN: 0, SKIP: 0 };
  for (const r of board) verdicts[r.farm.verdict]++;
  const bestPerHour = [...board]
    .sort((a, b) => b.farm.netPerHour - a.farm.netPerHour)
    .slice(0, 3)
    .map((r) => ({ slug: r.slug, name: r.name, netPerHour: r.farm.netPerHour, verdict: r.farm.verdict }));
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model_version: MODEL_VERSION,
    fit,
    watchlist: snapshot.watchlist,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    setaside_size: setaside.length,
    verdicts,
    bestPerHour,
    rows: board.map(radarRow),
    live,
    setaside,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
