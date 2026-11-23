#!/usr/bin/env node
/**
 * Builds the outline maps used by the Printables page into public/printables/maps/*.svg.
 * Run once, by hand, when a source changes; the SVGs are committed. See public/printables/maps/SOURCES.md.
 *
 *   node scripts/build-printable-maps.mjs <source-dir>
 *
 * <source-dir> must hold (downloaded by hand from the sources listed in SOURCES.md):
 *   india-composite.geojson                       DataMeet  Country/india-composite.geojson  (CC0)
 *   Admin2.shp/.shx/.dbf/.prj                     DataMeet  States/Admin2.*                  (CC BY 4.0)
 *   ne_ind/ne_10m_admin_0_countries_ind.shp       Natural Earth 10m countries, India POV    (public domain)
 *   ne_riv/ne_10m_rivers_lake_centerlines.shp     Natural Earth 10m rivers                   (public domain)
 *
 * Uses mapshaper through npx (a build-time tool only, not an app dependency).
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const src = process.argv[2];
if (!src) {
  console.error("usage: node scripts/build-printable-maps.mjs <source-dir>");
  process.exit(1);
}
const out = path.resolve("public/printables/maps");
mkdirSync(out, { recursive: true });

const MAPSHAPER = "npx -y mapshaper@0.6.102";
const q = (p) => JSON.stringify(path.resolve(src, p));
const outline = q("india-composite.geojson");
const states = q("Admin2.shp");
const countries = q("ne_ind/ne_10m_admin_0_countries_ind.shp");
const rivers = q("ne_riv/ne_10m_rivers_lake_centerlines.shp");

/** India-wide Lambert conformal conic (standard parallels 12°N and 28°N, central meridian 80°E). */
const INDIA_PROJ = "+proj=lcc +lat_1=12 +lat_2=28 +lat_0=22 +lon_0=80 +datum=WGS84";
const MP_PROJ = "+proj=lcc +lat_1=22 +lat_2=25 +lat_0=23.5 +lon_0=78 +datum=WGS84";
const ASIA_PROJ = "+proj=laea +lat_0=35 +lon_0=88 +datum=WGS84";
const WORLD_PROJ = "+proj=robin +lon_0=10 +datum=WGS84";

const thin = "stroke='#000' stroke-width=1.1 fill='none'";
const bold = "stroke='#000' stroke-width=2.4 fill='none'";

function run(name, args, target) {
  const file = path.join(out, `${name}.svg`);
  execSync(`${MAPSHAPER} ${args} -o ${JSON.stringify(file)} format=svg width=1000 margin=2 precision=0.1${target ? ` target=${target}` : ""}`, { stdio: "inherit" });
  // mapshaper writes a fixed pixel width/height; drop them so the page can size the map to fit.
  const svg = readFileSync(file, "utf8").replace(/<svg([^>]*?)\s(width|height)="[^"]*"/g, "<svg$1").replace(/<svg([^>]*?)\s(width|height)="[^"]*"/g, "<svg$1");
  writeFileSync(file, svg);
  console.log(`${name}.svg  ${(statSync(file).size / 1024).toFixed(0)} KB`);
}

// India – official outline only.
run("india", `-i ${outline} -proj ${JSON.stringify(INDIA_PROJ)} -simplify interval=1500 keep-shapes -filter-islands min-area=0.3km2 -style ${bold}`);

// India – states and UTs inside the official outline.
run(
  "india-states",
  `-i combine-files ${states} ${outline} -proj ${JSON.stringify(INDIA_PROJ)} -simplify interval=1500 keep-shapes target=* ` +
    `-filter-islands min-area=0.3km2 target=* -innerlines target=Admin2 + name=inner -style ${thin} target=inner ` +
    `-style ${bold} target=india-composite`,
  "inner,india-composite",
);

// India – outline with the major rivers (Natural Earth, clipped to the outline).
run(
  "india-rivers",
  `-i combine-files ${rivers} ${outline} -proj ${JSON.stringify(INDIA_PROJ)} target=* ` +
    `-filter \"scalerank <= 8\" target=ne_10m_rivers_lake_centerlines -clip india-composite target=ne_10m_rivers_lake_centerlines ` +
    `-simplify interval=1500 keep-shapes target=* -filter-islands min-area=0.3km2 target=india-composite ` +
    `-style stroke='#000' stroke-width=1.2 fill='none' target=ne_10m_rivers_lake_centerlines -style ${bold} target=india-composite`,
  "india-composite,ne_10m_rivers_lake_centerlines",
);

// Madhya Pradesh – state outline.
run("mp", `-i ${states} -filter \"ST_NM == 'Madhya Pradesh'\" -proj ${JSON.stringify(MP_PROJ)} -simplify interval=300 keep-shapes -style ${bold}`);

// Asia – countries in and around Asia (rectangle in the projected plane, about 40°E–150°E, 10°S–80°N), India's official boundary from the India-POV file.
run(
  "asia",
  `-i ${countries} -filter-islands min-area=200km2 -proj ${JSON.stringify(ASIA_PROJ)} -clip bbox=-5600000,-4400000,5800000,5000000 -simplify interval=6000 keep-shapes -style ${thin}`,
);

// World – countries, Robinson projection.
run("world", `-i ${countries} -filter-islands min-area=300km2 -proj ${JSON.stringify(WORLD_PROJ)} -simplify interval=12000 keep-shapes -style ${thin}`);
