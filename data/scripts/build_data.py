#!/usr/bin/env python3
"""Build src/data.js and data/processed/paradise_nested.json from the
filtered CSV (data/raw/paradise_data_filtered.csv).

- Normalises CSV country names onto the globe's island keys (main.js ISLANDS).
- Emits DATA in exactly the shape main.js consumes (tourism/ghg/affected/
  renewshare as {island:{year:value}}, sst as per-year arrays + sstStart),
  plus DATA.byIsland = {island:{year:{indicator:value}}}.
- gentotal comes from the POWER_GEN indicator (Gigawatt-hour) in the SDMX
  export data/raw/climate_change.csv.
"""
import csv, json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CSV_PATH = ROOT / "data/raw/paradise_data_filtered.csv"
CLIMATE_CSV = ROOT / "data/raw/climate_change.csv"
DATA_JS = ROOT / "src/data.js"
NESTED_JSON = ROOT / "data/processed/paradise_nested.json"

# island keys as used in main.js ISLANDS (first column)
ISLAND_KEYS = [
    "Guam", "Northern Mariana Islands", "Palau",
    "Micronesia, Federated State of", "Marshall Islands", "Kiribati",
    "Nauru", "Papua New Guinea", "Solomon Islands", "Tuvalu", "Vanuatu",
    "New Caledonia", "Fiji", "Wallis and Futuna", "Tokelau", "Tonga",
    "Samoa", "American Samoa", "Niue", "Cook Islands", "French Polynesia",
]

# explicit mapping CSV "Country" -> island key (identity where names match)
COUNTRY_MAP = {k: k for k in ISLAND_KEYS}
COUNTRY_MAP["Micronesia (Federated States of)"] = "Micronesia, Federated State of"

# GEO_PICT codes (SDMX export) -> island key
GEO_MAP = {
    "GU": "Guam", "MP": "Northern Mariana Islands", "PW": "Palau",
    "FM": "Micronesia, Federated State of", "MH": "Marshall Islands",
    "KI": "Kiribati", "NR": "Nauru", "PG": "Papua New Guinea",
    "SB": "Solomon Islands", "TV": "Tuvalu", "VU": "Vanuatu",
    "NC": "New Caledonia", "FJ": "Fiji", "WF": "Wallis and Futuna",
    "TK": "Tokelau", "TO": "Tonga", "WS": "Samoa", "AS": "American Samoa",
    "NU": "Niue", "CK": "Cook Islands", "PF": "French Polynesia",
}

INDICATOR_MAP = {
    "Tourism Arrivals": "tourism",
    "Sea Surface Temperature anomalies": "sst",
    "Greenhouse gaz emission per capita": "ghg",
    "7.2.1 Renewable energy share in the total final energy consumption": "renewshare",
    "1.5.1 and 11.5.1 Number of directly affected persons attributed to disasters": "affected",
    "11.5.2 Direct economic loss attributed to disasters (current United States dollars)": "econloss",
}

SST_START = 1900  # main.js reads DATA.sstStart; layer yearRange is 1900-2025
SST_END = 2025

def main():
    rows = []
    unmapped_countries = set()
    unmapped_indicators = set()
    dupes = []
    seen = {}

    with open(CSV_PATH, newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            country = COUNTRY_MAP.get(r["Country"].strip())
            if country is None:
                unmapped_countries.add(r["Country"].strip())
                continue
            ind = INDICATOR_MAP.get(r["Indicator"].strip())
            if ind is None:
                unmapped_indicators.add(r["Indicator"].strip())
                continue
            year = int(r["Year"])
            value = float(r["Value"])
            key = (country, ind, year)
            if key in seen:
                dupes.append((key, seen[key], value))
                continue  # keep first occurrence
            seen[key] = value
            rows.append((country, ind, year, value))

    # Power generation (GWh) -> gentotal, from the SDMX climate-change export
    with open(CLIMATE_CSV, newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            if r["CLIMATE_CHANGE_INDICATORS"].strip() != "POWER_GEN":
                continue
            country = GEO_MAP.get(r["GEO_PICT"].strip())
            if country is None:
                unmapped_countries.add(r["GEO_PICT"].strip())
                continue
            if r["OBS_VALUE"].strip() == "":
                continue
            year = int(r["TIME_PERIOD"])
            value = float(r["OBS_VALUE"])
            key = (country, "gentotal", year)
            if key in seen:
                dupes.append((key, seen[key], value))
                continue
            seen[key] = value
            rows.append((country, "gentotal", year, value))

    # flat per-indicator dicts {island:{year:value}}
    flat = defaultdict(lambda: defaultdict(dict))
    for country, ind, year, value in rows:
        flat[ind][country][year] = value

    # nested {island:{year:{indicator:value}}}
    nested = defaultdict(lambda: defaultdict(dict))
    for country, ind, year, value in rows:
        nested[country][year][ind] = value
    nested = {c: {y: nested[c][y] for y in sorted(nested[c])} for c in sorted(nested)}

    # sst -> arrays 1900..2025 aligned to sstStart
    sst_arrays = {}
    for c, series in flat["sst"].items():
        sst_arrays[c] = [series.get(y) for y in range(SST_START, SST_END + 1)]

    def by_year(d):  # sort year keys, stringify for stable JSON
        return {c: {str(y): d[c][y] for y in sorted(d[c])} for c in sorted(d)}

    data = {
        "tourism": by_year(flat["tourism"]),
        "ghg": by_year(flat["ghg"]),
        "affected": by_year(flat["affected"]),
        "sst": dict(sorted(sst_arrays.items())),
        "sstStart": SST_START,
        "renewshare": by_year(flat["renewshare"]),
        "econloss": by_year(flat["econloss"]),
        "gentotal": by_year(flat["gentotal"]),
        "byIsland": nested,
    }

    js = ("// Generated by data/scripts/build_data.py from "
          "data/raw/paradise_data_filtered.csv — do not edit by hand.\n"
          "// gentotal = POWER_GEN (GWh) from data/raw/climate_change.csv.\n"
          "const DATA = " + json.dumps(data, separators=(",", ":")) + ";\n")
    DATA_JS.write_text(js, encoding="utf-8")
    NESTED_JSON.write_text(json.dumps(nested, indent=1), encoding="utf-8")

    # ---- summary ----
    inds = sorted([*INDICATOR_MAP.values(), "gentotal"])
    print(f"rows used: {len(rows)}  islands: {len(nested)}  indicators: {len(inds)}")
    print(f"unmapped countries: {sorted(unmapped_countries) or 'none'}")
    print(f"unmapped indicators: {sorted(unmapped_indicators) or 'none'}")
    if dupes:
        print(f"duplicate (country,indicator,year) rows dropped (kept first): {len(dupes)}")
        for (c, i, y), kept, dropped in dupes:
            print(f"  {c} / {i} / {y}: kept {kept}, dropped {dropped}")
    print("\ncoverage (islands with data / years):")
    for ind in inds:
        cs = flat[ind]
        if not cs:
            print(f"  {ind:10s}: NO DATA"); continue
        years = sorted({y for s in cs.values() for y in s})
        n = sum(len(s) for s in cs.values())
        print(f"  {ind:10s}: {len(cs):2d}/21 islands, {years[0]}-{years[-1]}, {n} values")
        missing = [k for k in ISLAND_KEYS if k not in cs]
        if missing:
            print(f"  {'':10s}  missing: {', '.join(missing)}")

if __name__ == "__main__":
    main()
