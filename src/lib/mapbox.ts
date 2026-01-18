// Mapbox configuration
export const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1Ijoia2luZXlsbyIsImEiOiJjbWtrM2ZvM3QwbWFwM2NzNnhsMWRyMzE4In0.dOlNxVEOl9Ng5aOPt4DIcw';

export const MAPBOX_STYLES = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
};

// Transport profile mapping for Mapbox Directions API
export const MAPBOX_PROFILES: Record<string, string> = {
  walk: 'walking',
  bike: 'cycling',
  car: 'driving',
  transit: 'driving-traffic', // Mapbox doesn't have transit, use driving with traffic
};

export const TRANSPORT_COLORS: Record<string, string> = {
  walk: '#22c55e',
  bike: '#f59e0b',
  car: '#3b82f6',
  transit: '#8b5cf6',
};
