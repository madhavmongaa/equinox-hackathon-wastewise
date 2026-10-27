import { readFileSync, writeFileSync } from 'fs';
import { feature } from 'topojson-client';
import { geoContains } from 'd3-geo';
const topo = JSON.parse(readFileSync('node_modules/world-atlas/land-110m.json'));
const land = feature(topo, topo.objects.land);
const ct = JSON.parse(readFileSync('node_modules/world-atlas/countries-110m.json'));
const india = feature(ct, ct.objects.countries).features.find(f => f.id === '356');
const N = 9000, pts = [];
const phi = Math.PI * (3 - Math.sqrt(5));
for (let i = 0; i < N; i++) {
  const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = phi * i;
  const lat = Math.asin(y) * 180 / Math.PI;
  const lon = Math.atan2(Math.sin(th) * r, Math.cos(th) * r) * 180 / Math.PI;
  if (lat < -60) continue;
  if (geoContains(land, [lon, lat])) pts.push(Math.round(lon * 10) / 10, Math.round(lat * 10) / 10, geoContains(india, [lon, lat]) ? 1 : 0);
}
writeFileSync('assets/land-dots.js', '/* Land dots from Natural Earth 110m via world-atlas (public domain). [lon, lat, isIndia] */\nwindow.WW_LAND=' + JSON.stringify(pts) + ';');
console.log(pts.length / 3, pts.filter((v,i)=>i%3==2&&v).length);
