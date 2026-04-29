export interface GpsCity {
  id: string;
  label: string;
  lat: number;
  lon: number;
}

export const GPS_CITIES: GpsCity[] = [
  // North America
  { id: "new_york",      label: "New York",      lat: 40.7128,  lon: -74.006 },
  { id: "los_angeles",   label: "Los Angeles",   lat: 34.0522,  lon: -118.2437 },
  { id: "miami",         label: "Miami",          lat: 25.7617,  lon: -80.1918 },
  { id: "chicago",       label: "Chicago",        lat: 41.8781,  lon: -87.6298 },
  { id: "houston",       label: "Houston",        lat: 29.7604,  lon: -95.3698 },
  { id: "atlanta",       label: "Atlanta",        lat: 33.749,   lon: -84.388 },
  { id: "toronto",       label: "Toronto",        lat: 43.6532,  lon: -79.3832 },
  // Europe
  { id: "paris",         label: "Paris",          lat: 48.8566,  lon: 2.3522 },
  { id: "london",        label: "London",         lat: 51.5074,  lon: -0.1278 },
  { id: "rome",          label: "Rome",           lat: 41.9028,  lon: 12.4964 },
  { id: "berlin",        label: "Berlin",         lat: 52.52,    lon: 13.405 },
  { id: "madrid",        label: "Madrid",         lat: 40.4168,  lon: -3.7038 },
  { id: "amsterdam",     label: "Amsterdam",      lat: 52.3676,  lon: 4.9041 },
  { id: "lisbon",        label: "Lisbon",         lat: 38.7223,  lon: -9.1393 },
  // Middle East
  { id: "dubai",         label: "Dubai",          lat: 25.2048,  lon: 55.2708 },
  { id: "istanbul",      label: "Istanbul",       lat: 41.0082,  lon: 28.9784 },
  { id: "riyadh",        label: "Riyadh",         lat: 24.7136,  lon: 46.6753 },
  // Asia
  { id: "tokyo",         label: "Tokyo",          lat: 35.6762,  lon: 139.6503 },
  { id: "seoul",         label: "Seoul",          lat: 37.5665,  lon: 126.978 },
  { id: "singapore",     label: "Singapore",      lat: 1.3521,   lon: 103.8198 },
  { id: "bangkok",       label: "Bangkok",        lat: 13.7563,  lon: 100.5018 },
  { id: "sydney",        label: "Sydney",         lat: -33.8688, lon: 151.2093 },
  // Latin America
  { id: "mexico_city",   label: "Mexico City",    lat: 19.4326,  lon: -99.1332 },
  { id: "sao_paulo",     label: "São Paulo",      lat: -23.5505, lon: -46.6333 },
  { id: "buenos_aires",  label: "Buenos Aires",   lat: -34.6037, lon: -58.3816 },
  // Africa
  { id: "lagos",         label: "Lagos",          lat: 6.5244,   lon: 3.3792 },
  { id: "cairo",         label: "Cairo",          lat: 30.0444,  lon: 31.2357 },
];
