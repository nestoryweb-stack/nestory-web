#!/usr/bin/env python3
"""
Top 10 Stock Analysts by Return Performance (2023-2025)
Data source: TipRanks annual rankings via CNBC
Methodology: analysts ranked by average return per rating + success rate,
measured across all their stock recommendations in the given year.
"""

# ── 2025 rankings (TipRanks / CNBC, January 2026) ────────────────────────────
TOP_2025 = [
    {"rank": 1,  "name": "Sam Slutsky",        "firm": "LifeSci Capital",      "success": 67.74, "avg_return": 62.4},
    {"rank": 2,  "name": "Joseph Stringer",    "firm": "Needham",              "success": 79.17, "avg_return": 38.2},
    {"rank": 3,  "name": "Richard Shannon",    "firm": "Craig-Hallum",         "success": 61.87, "avg_return": 36.9},
    {"rank": 4,  "name": "Myles Minter",       "firm": "William Blair",        "success": 66.93, "avg_return": 28.8},
    {"rank": 5,  "name": "Nick McKay",         "firm": "Wedbush",              "success": 88.00, "avg_return": 83.9},  # top-1% all-time
    {"rank": 6,  "name": "Hans Mosesmann",     "firm": "Rosenblatt Securities","success": 63.00, "avg_return": 27.0},
    {"rank": 7,  "name": "Mark Mahaney",       "firm": "Evercore ISI",         "success": 80.00, "avg_return": 14.0},
    {"rank": 8,  "name": "Mark Palmer",        "firm": "Benchmark",            "success": 75.00, "avg_return": 23.3},
    {"rank": 9,  "name": "Michael Grondahl",   "firm": "Northland Securities", "success": 70.00, "avg_return": 23.4},
    {"rank": 10, "name": "Gerard Cassidy",     "firm": "RBC Capital",          "success": 88.00, "avg_return": 11.5},
]

# ── 2024 rankings (TipRanks, Oct 2023 – Sep 2024) ────────────────────────────
TOP_2024 = [
    {"rank": 1,  "name": "Gerard Cassidy",         "firm": "RBC Capital",               "success": 88.0, "avg_return": 11.5},
    {"rank": 2,  "name": "Chris Kotowski",          "firm": "Oppenheimer",               "success": 88.0, "avg_return": 14.0},
    {"rank": 3,  "name": "Ebrahim Poonawala",       "firm": "Bank of America Securities","success": 82.0, "avg_return": 10.2},
    {"rank": 4,  "name": "Mark Palmer",             "firm": "Benchmark",                 "success": 75.0, "avg_return": 23.3},
    {"rank": 5,  "name": "Mark Mahaney",            "firm": "Evercore ISI",              "success": 80.0, "avg_return": 14.0},
    {"rank": 6,  "name": "Brent Thielman",          "firm": "D.A. Davidson",             "success": 79.0, "avg_return": 13.3},
    {"rank": 7,  "name": "Christopher Allen",       "firm": "Citi",                      "success": 85.0, "avg_return": 13.8},
    {"rank": 8,  "name": "Daniel Fannon",           "firm": "Jefferies",                 "success": 85.0, "avg_return": 11.1},
    {"rank": 9,  "name": "Mike Mayo",               "firm": "Wells Fargo",               "success": 80.0, "avg_return":  8.2},
    {"rank": 10, "name": "Michael Grondahl",        "firm": "Northland Securities",      "success": 70.0, "avg_return": 23.4},
]


def print_table(title: str, analysts: list[dict]) -> None:
    print(f"\n{'=' * 68}")
    print(f"  {title}")
    print(f"{'=' * 68}")
    print(f"{'#':<4} {'שם האנליסט':<24} {'חברה':<28} {'הצלחה':>7} {'תשואה':>8}")
    print(f"{'-' * 68}")
    for a in analysts:
        print(
            f"{a['rank']:<4} {a['name']:<24} {a['firm']:<28} "
            f"{a['success']:>6.1f}% {a['avg_return']:>7.1f}%"
        )
    print(f"{'=' * 68}")


if __name__ == "__main__":
    print("\n📊  Top 10 אנליסטי מניות לפי תשואה — מקור: TipRanks / CNBC")
    print("     מתודולוגיה: דירוג לפי תשואה ממוצעת להמלצה + שיעור הצלחה")

    print_table("🏆  דירוג 2025  (TipRanks – ינואר 2026)", TOP_2025)
    print_table("🥇  דירוג 2024  (TipRanks – אוקט 2023 – ספט 2024)", TOP_2024)

    print("""
📌  הסברים:
  • תשואה ממוצעת  = ממוצע % רווח/הפסד של המניה בשנה לאחר כל המלצה
  • שיעור הצלחה   = % ההמלצות שהניבו תשואה חיובית (Buy=מניה עלתה)
  • מקורות: CNBC (25 Jan 2026), NBC News, TipRanks Expert Center
""")
