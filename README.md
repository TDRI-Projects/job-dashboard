# Thailand Job Posting Dashboard

## Open locally on macOS

1. Keep the dashboard folder together, including `index.html`, `main.csv.gz`, `occupation.csv`, `field_of_study.csv`, and `skill.csv.gz`.
2. Double-click **Start Dashboard.command**. It starts the local server and opens **http://localhost:8765/** in your browser.
3. Keep its Terminal window open while using the dashboard. Press **Control+C** in that window to stop it.

Python 3 is required. Uncompressed CSV files are also supported. The launcher works from its own folder even if you move or rename that folder.

`localhost` is an address on your computer. The files being present does not start the server; if the browser says it cannot connect, run the launcher again. If this dashboard is already running, the launcher opens the existing instance.

## Start from Terminal

Open Terminal in the dashboard folder and run:

```sh
python3 start_dashboard.py
```

If port 8765 is occupied by another application, use:

```sh
python3 start_dashboard.py --port 8766
```

Then open **http://localhost:8766/**. The server only listens on this computer (`127.0.0.1`).


### Region mapping and occupation-specific skills

The dashboard assigns regions from the stated province using the seven reporting regions in the [NSO Statistical Yearbook Thailand 2025](https://www.nso.go.th/public/e-book/Statistical-Yearbook/SYB-2025/53/). This standard places Tak, Nakhon Sawan and Uthai Thani in North; Nakhon Nayok in East; Suphan Buri and Samut Songkhram in West. It includes Bangkok and five surrounding provinces in the metropolitan region.

Normalization runs after parsing or cache retrieval and applies consistently to charts, geographic filters and Custom SQL. Source CSVs remain unchanged. Custom SQL exposes the original label as `region_original`; `region` is the normalized reporting region. Missing or unrecognized provinces never produce a guessed region; a valid supplied region is retained when the province is unavailable.

The period-specific “ทักษะที่ต้องการ” chart is the single occupation/market comparison view. Each sort ranks all skills found in the selected profile before limiting to 12; the top-400 all-period detail tree does not limit these rankings. “เด่นกว่าตลาด” ranks positive percentage-point differences (profile share minus whole-market share), not ratios. Selected/profile and market shares are shown together; hover or keyboard focus exposes counts, denominators and the prevalence ratio. Enter opens Skill Profile. Every measure uses the selected matched period and filters; generated periods retain the illustrative-data badge. Ratios describe relative prevalence, not skill importance or wage returns.

Run the data semantics checks with `node --test tests/data-semantics.test.cjs`. They check the 77-province crosswalk, every source row, immutable cached originals, repeated normalization, and skill selection beyond the existing top-400 display limit.

### Skill map and profile time scope

The Home skill map ranks all available skill IDs by the latest quarter before displaying 60. Its horizontal axis is posting share; its vertical axis is the change in share in percentage points. The reading guide explains both axes, the median divider and the logarithmic scale. The full-range button displays outliers at their actual vertical positions.

Selecting a dot or a name keeps the map open and displays both periods' shares and posting counts. The explicit profile button opens the same quarter comparison. Keyboard users can enter the graph with Tab, move between skills with arrow keys, and select with Enter or Space. The chart carries its own illustrative-data badge.

Profile sidebar counts, minimum-count filters and sorting use the selected profile period. Changes use the same matched-quarter comparison as the profile cards; sidebar scope is the whole market, while profile filters can narrow the detail view. The change card names posting counts explicitly to distinguish its growth percentage from the map's change in share.
