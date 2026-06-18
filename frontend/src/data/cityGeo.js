// ─── CITY GEO-COORDINATES (for impossible-travel detection) ──────────────────
// Approximate latitude/longitude for the cities that appear in the digital-
// session feed. Used by the digital detector to compute the required travel
// SPEED between two consecutive logins (great-circle distance ÷ elapsed time)
// and flag physically impossible journeys — a far stronger signal than a fixed
// "different city within N minutes" rule, which ignores how far apart the cities
// actually are. Coordinates are city-centroid approximations (degrees).
//
// Coverage is intentionally explicit: an unknown city yields no geo-velocity
// signal (the detector falls back to the time-window heuristic) rather than a
// wrong distance. Extend this table as new login cities appear in the data.
// Keys are lower-cased and trimmed at lookup time.

export const CITY_GEO = {
  // ── Sri Lanka ──
  colombo: { lat: 6.9271, lon: 79.8612 },
  'sri jayawardenepura kotte': { lat: 6.8881, lon: 79.9187 },
  dehiwala: { lat: 6.8511, lon: 79.8653 },
  moratuwa: { lat: 6.7730, lon: 79.8816 },
  negombo: { lat: 7.2083, lon: 79.8358 },
  kandy: { lat: 7.2906, lon: 80.6337 },
  galle: { lat: 6.0535, lon: 80.2210 },
  jaffna: { lat: 9.6615, lon: 80.0255 },
  trincomalee: { lat: 8.5874, lon: 81.2152 },
  batticaloa: { lat: 7.7102, lon: 81.6924 },
  anuradhapura: { lat: 8.3114, lon: 80.4037 },
  kurunegala: { lat: 7.4863, lon: 80.3647 },
  ratnapura: { lat: 6.6828, lon: 80.3992 },
  matara: { lat: 5.9549, lon: 80.5550 },
  badulla: { lat: 6.9934, lon: 81.0550 },
  gampaha: { lat: 7.0917, lon: 79.9999 },
  kalutara: { lat: 6.5854, lon: 79.9607 },
  nuwaraeliya: { lat: 6.9497, lon: 80.7891 },
  'nuwara eliya': { lat: 6.9497, lon: 80.7891 },
  // ── Regional / international hubs that show up in fraud sessions ──
  chennai: { lat: 13.0827, lon: 80.2707 },
  mumbai: { lat: 19.0760, lon: 72.8777 },
  'new delhi': { lat: 28.6139, lon: 77.2090 },
  delhi: { lat: 28.6139, lon: 77.2090 },
  bangalore: { lat: 12.9716, lon: 77.5946 },
  bengaluru: { lat: 12.9716, lon: 77.5946 },
  male: { lat: 4.1755, lon: 73.5093 },
  dubai: { lat: 25.2048, lon: 55.2708 },
  'abu dhabi': { lat: 24.4539, lon: 54.3773 },
  doha: { lat: 25.2854, lon: 51.5310 },
  riyadh: { lat: 24.7136, lon: 46.6753 },
  singapore: { lat: 1.3521, lon: 103.8198 },
  'kuala lumpur': { lat: 3.1390, lon: 101.6869 },
  bangkok: { lat: 13.7563, lon: 100.5018 },
  'hong kong': { lat: 22.3193, lon: 114.1694 },
  london: { lat: 51.5074, lon: -0.1278 },
  'new york': { lat: 40.7128, lon: -74.0060 },
  sydney: { lat: -33.8688, lon: 151.2093 },
  melbourne: { lat: -37.8136, lon: 144.9631 },
  toronto: { lat: 43.6532, lon: -79.3832 },
  frankfurt: { lat: 50.1109, lon: 8.6821 },
};

// Look up a city by free-text name (case/space-insensitive). Returns {lat,lon} or null.
export function cityCoords(name) {
  const k = String(name || '').trim().toLowerCase();
  return CITY_GEO[k] || null;
}
