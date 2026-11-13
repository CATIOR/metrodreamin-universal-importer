# MetroDreamin' — Universal Map Importer (GeoJSON / KML / GPX)

> [!TIP]
> Доступен [README.ru.md](README.ru.md) на русском языке.

A browser userscript for [MetroDreamin'](https://metrodreamin.com/) that imports transit lines, stations, curve waypoints, and pedestrian interchanges directly from **GeoJSON**, **KML**, and **GPX** files into the MetroDreamin' editor.

Works with exports from **Google My Maps**, **QGIS**, **uMap**, **OpenStreetMap / Overpass Turbo**, **GeoJSON.io**, **Yandex Maps Constructor**, **Strava / Garmin GPX**, and any standard GIS software.

> **UI Languages:** English (default) & Russian (`🌐 EN → RU` toggle inside the modal).

---

## Features

- **Multi-format parsing:**
  - **GeoJSON (`.geojson`, `.json`)**: `Point`, `MultiPoint`, `LineString`, `MultiLineString`, `GeometryCollection` (recursive), bare geometries, `simplestyle-spec`, uMap (`_umap_options`), and OSM (`colour`, `route`, `railway`) tags.
  - **KML (`.kml`)**: `Placemark`, `Point`, `LineString`, `MultiGeometry`, Google Earth `<gx:Track>`, `Style` / `StyleMap` (`AABBGGRR` → `#RRGGBB`), and `ExtendedData`.
  - **GPX (`.gpx`)**: waypoints (`<wpt>`), tracks (`<trk>` / `<trkseg>`), routes (`<rte>`), and Garmin/extension colors.
- **Smart Geometry Builder:**
  - Snaps point features (stations) onto line segments within a configurable radius (`Snap (m)`).
  - Replaces nearby line vertices (`Vertex (m)`) with named stations and keeps intermediate curve points as MetroDreamin' **Waypoints**.
  - Deduplicates overlapping stations (`Merge (m)`), trims short line tails past terminal stations, and detects closed loops.
  - Automatically generates **Interchanges** between different lines within `Interchange (m)` — including linking newly imported lines to existing stations in **Append** mode.
- **Transit Mode Auto-Detection:** detects `RAPID`, `TRAM`, `LIGHT`, `BRT`, `BUS`, `COMMUTER`, `GONDOLA`, and `FERRY` from OSM/GIS properties or multilingual line names.
- **Two Import Modes:**
  - **Replace:** replaces the current map (cleans stale `lineGroups`).
  - **Append:** merges new lines, stations, and interchanges into an already-open map without ID collisions.
- **Live React Injection + Slot Management:** updates editor state directly in React (no fragile DOM clicking) and helps manage `systemNumStr` slots when creating new maps.
- **Privacy-friendly & Self-contained:** 100% client-side, no external servers, no network/fetch interception.

---

## Installation

1. Install a userscript manager for your browser:
   - **Chrome / Edge / Brave:** [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/)
   - **Firefox:** [Violentmonkey](https://violentmonkey.github.io/) or [Tampermonkey](https://www.tampermonkey.net/)
2. Install the script:
   - From **Greasy Fork**: [Install on Greasy Fork](https://greasyfork.org/scripts/605209-metrodreamin-universal-map-importer-geojson-kml-gpx)
   - Or directly from **GitHub Raw**: [Install from GitHub Raw](https://raw.githubusercontent.com/CATIOR/metrodreamin-universal-importer/main/metrodreamin-universal-importer.user.js)

---

## How to Use

1. Open the MetroDreamin' editor (`/edit/new` or any existing map under `/edit/...`).
2. Click **`📥 Import Map`** in the top-right header.
3. Select your `.geojson`, `.json`, `.kml`, or `.gpx` file.
4. Adjust options if needed (transit mode, vertex handling, snap/merge/interchange radii, Replace vs. Append).
5. Click **`⚡ Live Import (React)`** (or **`🔄 Reload & Import`** if the editor hasn't finished initializing a fresh session).
6. Close the modal and click the **Save (floppy disk)** icon in MetroDreamin' to save your map.

### Troubleshooting

- **Save error on `/edit/new` (slot conflict):** click **`+1 slot`** in the modal to increment `systemNumStr` and try saving again (the script also auto-bumps on collision detection).
- **Large files / blank map:** try **`🔄 Reload & Import`**, or export the generated schema via **`💾 Export JSON`** / **`🐞 Debug Log`** and open an Issue.

---

## Disclaimer

This is an unofficial community tool and is not affiliated with MetroDreamin'. Use reasonable file sizes and verify your imported map before saving.

## License

[MIT](LICENSE)
