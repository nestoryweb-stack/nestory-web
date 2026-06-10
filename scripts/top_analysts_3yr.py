#!/usr/bin/env python3
"""
Top 10 Analyst Firms — 3-Year Cumulative Return (2023-2026)

Data source : Finnhub (free API key — no credit card needed)
              Sign up at https://finnhub.io/register → copy your key
              then run:  FINNHUB_KEY=<your_key> python3 scripts/top_analysts_3yr.py

Methodology :
  For every upgrade/downgrade on each stock in the last 3 years:
    1. Record the closing price on recommendation date
    2. Record the closing price ~1 year later (or today if < 1 yr ago)
    3. Score = +pct_change  if analyst said Buy/Outperform/Upgrade
               -pct_change  if analyst said Sell/Underperform/Downgrade
  Average score per firm → rank top 10.

Rate limits: Finnhub free tier = 60 requests/min (script respects this).
"""

import os
import time
import requests
from datetime import datetime, timedelta, date
from collections import defaultdict

# ── Config ─────────────────────────────────────────────────────────────────────
API_KEY = os.environ.get("FINNHUB_KEY", "")
if not API_KEY:
    print(
        "\n⚠️  No Finnhub API key found.\n"
        "   1. Sign up free (no credit card) at https://finnhub.io/register\n"
        "   2. Copy your API key from the dashboard\n"
        "   3. Run:  FINNHUB_KEY=<your_key> python3 scripts/top_analysts_3yr.py\n"
    )
    raise SystemExit(1)

BASE = "https://finnhub.io/api/v1"
HEADERS = {"X-Finnhub-Token": API_KEY}

# S&P 500 sample — enough for statistically meaningful results
TICKERS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "JPM", "JNJ",
    "V",    "PG",   "UNH",   "HD",   "MA",   "XOM",  "LLY",  "CVX", "ABBV",
    "BAC",  "KO",   "PFE",   "COST", "MRK",  "TMO",  "WMT",  "MCD", "CSCO",
    "ORCL", "ADBE", "CRM",   "NFLX", "INTC", "AMD",  "QCOM", "TXN", "GS",
    "MS",   "BLK",  "SPGI",  "CAT",  "DE",   "NEE",  "DUK",  "SO",  "RTX",
]

BUY  = {"buy", "strong buy", "outperform", "overweight", "positive",
        "market outperform", "sector outperform", "add", "accumulate",
        "top pick", "conviction buy"}
SELL = {"sell", "strong sell", "underperform", "underweight", "negative",
        "reduce", "market underperform", "sector underperform"}

THREE_YRS_AGO = (date.today() - timedelta(days=3 * 365)).isoformat()
TODAY         = date.today().isoformat()

# ── Helpers ────────────────────────────────────────────────────────────────────
_price_cache: dict[tuple, float | None] = {}

def get_close(symbol: str, on_date: str) -> float | None:
    """Return the closing price on or just after `on_date` (YYYY-MM-DD)."""
    key = (symbol, on_date)
    if key in _price_cache:
        return _price_cache[key]

    try:
        dt = datetime.strptime(on_date, "%Y-%m-%d")
        # fetch a 5-day window to handle weekends / holidays
        d_from = int(dt.timestamp())
        d_to   = int((dt + timedelta(days=5)).timestamp())
        r = requests.get(
            f"{BASE}/stock/candle",
            params={"symbol": symbol, "resolution": "D",
                    "from": d_from, "to": d_to},
            headers=HEADERS, timeout=10,
        )
        data = r.json()
        price = float(data["c"][0]) if data.get("s") == "ok" else None
    except Exception:
        price = None

    _price_cache[key] = price
    return price


_req_times: list[float] = []

def rate_limit() -> None:
    """Stay under 60 requests / minute for the free tier."""
    now = time.monotonic()
    _req_times[:] = [t for t in _req_times if now - t < 60]
    if len(_req_times) >= 58:
        sleep_for = 61 - (now - _req_times[0])
        if sleep_for > 0:
            time.sleep(sleep_for)
    _req_times.append(time.monotonic())


def get_upgrades(symbol: str) -> list[dict]:
    rate_limit()
    try:
        r = requests.get(
            f"{BASE}/stock/upgrade-downgrade",
            params={"symbol": symbol, "from": THREE_YRS_AGO, "to": TODAY},
            headers=HEADERS, timeout=10,
        )
        return r.json() if isinstance(r.json(), list) else []
    except Exception:
        return []


# ── Main loop ──────────────────────────────────────────────────────────────────
firm_scores: dict[str, list[float]] = defaultdict(list)
total = len(TICKERS)

print(f"\n📡  Fetching upgrade/downgrade history for {total} stocks "
      f"({THREE_YRS_AGO} → {TODAY})...\n")

for i, ticker in enumerate(TICKERS, 1):
    print(f"  [{i:>2}/{total}] {ticker:<6}", end=" ", flush=True)
    upgrades = get_upgrades(ticker)
    processed = 0

    for rec in upgrades:
        grade     = str(rec.get("toGrade", "")).lower().strip()
        firm      = str(rec.get("company", "")).strip()
        rec_ts    = rec.get("gradeTime", 0)
        if not firm or not rec_ts:
            continue

        is_buy  = grade in BUY
        is_sell = grade in SELL
        if not is_buy and not is_sell:
            continue

        rec_date  = datetime.utcfromtimestamp(rec_ts).strftime("%Y-%m-%d")
        exit_date = (datetime.utcfromtimestamp(rec_ts) + timedelta(days=365)).strftime("%Y-%m-%d")
        # cap exit at today
        if exit_date > TODAY:
            exit_date = TODAY

        price_in  = get_close(ticker, rec_date)
        price_out = get_close(ticker, exit_date)

        if not price_in or not price_out or price_in == 0:
            continue

        pct = (price_out - price_in) / price_in * 100
        score = pct if is_buy else -pct
        firm_scores[firm].append(score)
        processed += 1

    print(f"→ {processed} calls scored")

# ── Rank ───────────────────────────────────────────────────────────────────────
MIN_CALLS = 5   # ignore firms with fewer data points
results = {
    firm: {"avg_return": sum(v) / len(v), "calls": len(v), "wins": sum(s > 0 for s in v)}
    for firm, v in firm_scores.items()
    if len(v) >= MIN_CALLS
}

top10 = sorted(results.items(), key=lambda x: x[1]["avg_return"], reverse=True)[:10]

print(f"\n{'=' * 70}")
print("  🏆  Top 10 מחלקות אנליסטים — תשואה מצטברת ל-3 שנים (Finnhub)")
print(f"{'=' * 70}")
print(f"{'#':<4} {'חברה':<30} {'תשואה ממוצעת':>14} {'הצלחה':>8} {'המלצות':>9}")
print(f"{'-' * 70}")
for rank, (firm, d) in enumerate(top10, 1):
    win_rate = d["wins"] / d["calls"] * 100
    print(f"{rank:<4} {firm:<30} {d['avg_return']:>12.1f}% {win_rate:>7.1f}% {d['calls']:>9}")
print(f"{'=' * 70}")
print(f"\n  📌  מבוסס על {sum(d['calls'] for _, d in top10)} המלצות מתוך {len(TICKERS)} מניות")
print(f"  📌  מקור: Finnhub free API  |  תשואה = ממוצע לכל המלצה (שנה קדימה)")
print(f"  ⚠️   הערה: Finnhub מספק שם הבנק/חברה — לא שם האנליסט הבודד.")
print(f"         לנתוני אנליסט פרטני: TipRanks Premium / Benzinga API\n")
