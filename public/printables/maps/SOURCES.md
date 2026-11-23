# Printable outline maps — sources and licences

Built by `scripts/build-printable-maps.mjs` (mapshaper 0.6.102), downloaded 2026-11-23. No labels; strokes only.

| File | Content | Source | Licence |
|------|---------|--------|---------|
| `india.svg` | India outline on the official boundary (incl. PoK, Gilgit-Baltistan, Aksai Chin, Arunachal Pradesh) | DataMeet `Country/india-composite.geojson` — https://github.com/datameet/maps/tree/master/Country | CC0 |
| `india-states.svg` | Same outline + boundaries of the 28 states and 8 UTs (Ladakh UT, merged Dadra & Nagar Haveli and Daman & Diu) | Outline as above; states: DataMeet `States/Admin2` — https://github.com/datameet/maps/tree/master/States | CC0 / CC BY 4.0 — credit "DataMeet India community" |
| `india-rivers.svg` | Outline + major rivers clipped to it | Outline as above; rivers: Natural Earth 10m rivers & lake centerlines — https://www.naturalearthdata.com | CC0 / public domain |
| `mp.svg` | Madhya Pradesh outline | DataMeet `States/Admin2` | CC BY 4.0 |
| `asia.svg` | Countries in and around Asia (projected rectangle, about 40°E–150°E, 10°S–80°N) | Natural Earth 10m admin-0 countries, India point of view (`ne_10m_admin_0_countries_ind`) | public domain |
| `world.svg` | World countries, Robinson projection | Natural Earth 10m admin-0 countries, India point of view | public domain |

Checks made when building: the DataMeet states layer's Ladakh spans 72.5°E–80.3°E, 32.3°N–37.1°N (≈168,000 km²,
includes Gilgit-Baltistan and Aksai Chin); J&K ≈55,000 km² (includes PoK); India total ≈3.28 million km².

Survey of India's own outline maps are not bundled: their reuse licence is unclear.
Each sheet prints a one-line credit at its foot (see `src/lib/printables.ts`).
