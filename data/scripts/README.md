# data/scripts

Placeholder for the data-preparation pipeline (Python + pandas).

Planned:
- pull raw SPC (Pacific Community) tables into `data/raw/`
- clean, align by country/year, and export the shape consumed by `src/main.js` (`DATA.tourism`, `DATA.ghg`, `DATA.affected`, `DATA.sst`, `DATA.renewshare`, `DATA.gentotal`) into `data/processed/paradise-data.json`
