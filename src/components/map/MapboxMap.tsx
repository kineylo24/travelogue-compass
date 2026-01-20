import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { useRoutes, RoutePoint, SavedRoute } from "@/contexts/RoutesContext";
import { Destination } from "@/types/routes";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_ACCESS_TOKEN, MAPBOX_STYLES, MAPBOX_PROFILES, TRANSPORT_COLORS } from "@/lib/mapbox";

mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

export interface RoutePreference {
  avoidTolls: boolean;
  useTraffic: boolean;
}

interface MapboxMapProps {
  isRouting: boolean;
  transportType: string;
  onDistanceUpdate: (distance: number) => void;
  onTimeUpdate: (time: number) => void;

  destination?: Destination | null;
  /** Route preferences (avoid tolls, use traffic) */
  routePreference?: RoutePreference;
  /** Returns summary of the selected route */
  onDestinationRouteReady?: (distance: number, duration: number) => void;
  /** Returns list of available route variants (for UI selection) */
  onDestinationRoutesReady?: (routes: { index: number; distance: number; duration: number; label?: string }[]) => void;
  /** Called when destination routing fails */
  onDestinationRouteError?: (message: string) => void;
  selectedDestinationRouteIndex?: number;

  viewingRoute?: SavedRoute | null;
  onPointClick?: (point: RoutePoint) => void;
  /** When set, shows a media preview card above this point (if it has media) */
  highlightPointId?: string | null;
}

export interface MapboxMapRef {
  searchPlaces: (query: string) => Promise<{ name: string; address: string; coordinates: [number, number] }[]>;
  clearDestinationRoute: () => void;
  getRoutePoints: () => RoutePoint[];
  getDestinationRouteGeometry: () => { coordinates: [number, number][]; distance: number; duration: number } | null;
}

const MapboxMap = forwardRef<MapboxMapRef, MapboxMapProps>(({
  isRouting,
  transportType,
  onDistanceUpdate,
  onTimeUpdate,
  destination,
  routePreference,
  onDestinationRouteReady,
  onDestinationRoutesReady,
  onDestinationRouteError,
  selectedDestinationRouteIndex,
  viewingRoute,
  onPointClick,
  highlightPointId,
}, ref) => {
  const { addPointToCurrentRoute } = useRoutes();
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const viewingRouteMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const highlightCardMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const routePointsRef = useRef<RoutePoint[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapError, setMapError] = useState(false);
  const [destinationRoutes, setDestinationRoutes] = useState<any[]>([]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const defaultCoords: [number, number] = [37.573856, 55.751574]; // Moscow [lng, lat]
    
    try {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: MAPBOX_STYLES.streets,
        center: defaultCoords,
        zoom: 14,
        pitch: 45,
        bearing: -17.6,
      });

      map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
      map.addControl(new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true
      }), 'bottom-right');

      map.on('load', () => {
        setIsMapLoaded(true);

        // Add 3D buildings layer
        const layers = map.getStyle()?.layers;
        if (layers) {
          const labelLayerId = layers.find(
            (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
          )?.id;

          map.addLayer(
            {
              id: '3d-buildings',
              source: 'composite',
              'source-layer': 'building',
              filter: ['==', 'extrude', 'true'],
              type: 'fill-extrusion',
              minzoom: 15,
              paint: {
                'fill-extrusion-color': '#aaa',
                'fill-extrusion-height': ['get', 'height'],
                'fill-extrusion-base': ['get', 'min_height'],
                'fill-extrusion-opacity': 0.6
              }
            },
            labelLayerId
          );
        }
      });

      map.on('error', () => {
        setMapError(true);
      });

      mapRef.current = map;

      // Get user location
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords: [number, number] = [position.coords.longitude, position.coords.latitude];
            setUserLocation(coords);
            map.flyTo({ center: coords, zoom: 15, duration: 1000 });
            
            // Add user marker
            const el = document.createElement('div');
            el.className = 'user-marker';
            el.innerHTML = `<div style="width: 20px; height: 20px; background: #0ea5e9; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`;
            
            userMarkerRef.current = new mapboxgl.Marker(el)
              .setLngLat(coords)
              .addTo(map);
          },
          (err) => {
            console.warn("[MapboxMap] Geolocation error:", err);
            setUserLocation(defaultCoords);
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 2000 }
        );
      } else {
        setUserLocation(defaultCoords);
      }
    } catch (err) {
      console.error("[MapboxMap] Init error:", err);
      setMapError(true);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Search places using Mapbox Geocoding API
  const searchPlaces = useCallback(async (query: string): Promise<{ name: string; address: string; coordinates: [number, number] }[]> => {
    try {
      console.log("[MapboxMap] Searching for:", query);
      
      // Get user location for proximity search (important for POI results)
      let proximityParam = "";
      let bboxParam = "";
      
      if (userLocation) {
        proximityParam = `&proximity=${userLocation[0]},${userLocation[1]}`;
      }
      
      // First try Mapbox Search Box API (better for POI)
      // If user is searching for food-related terms, use category search
      const foodTerms = ['кафе', 'ресторан', 'еда', 'поесть', 'завтрак', 'обед', 'ужин', 'макдональдс', 'mcdonald', 'kfc', 'бургер', 'пицца', 'суши', 'бар', 'coffee', 'кофе', 'столовая'];
      const isFoodSearch = foodTerms.some(term => query.toLowerCase().includes(term));
      
      // Use Mapbox Geocoding with types parameter prioritizing POI
      // For food searches, use poi type first; otherwise include all types
      const typesParam = isFoodSearch 
        ? 'types=poi' 
        : 'types=poi,address,place,locality';
      
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=10&language=ru&${typesParam}${proximityParam}&country=ru,by,kz,uz,ua,ge,am,az`;
      
      console.log("[MapboxMap] Search URL:", url);
      const response = await fetch(url);
      const data = await response.json();
      
      console.log("[MapboxMap] Search results:", data);
      
      // If no POI results, fallback to general search
      let results = data.features?.map((item: any) => ({
        name: item.text || item.place_name.split(",")[0],
        address: item.place_name,
        coordinates: [item.center[0], item.center[1]] as [number, number],
        category: item.properties?.category || null,
        type: item.place_type?.[0] || 'unknown',
      })) || [];
      
      // If searching for food but got no POI results, try without type restriction
      if (isFoodSearch && results.length === 0) {
        console.log("[MapboxMap] No POI results, retrying without type restriction");
        const fallbackUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=10&language=ru${proximityParam}`;
        const fallbackResponse = await fetch(fallbackUrl);
        const fallbackData = await fallbackResponse.json();
        
        results = fallbackData.features?.map((item: any) => ({
          name: item.text || item.place_name.split(",")[0],
          address: item.place_name,
          coordinates: [item.center[0], item.center[1]] as [number, number],
          category: item.properties?.category || null,
          type: item.place_type?.[0] || 'unknown',
        })) || [];
      }
      
      console.log("[MapboxMap] Parsed results:", results);
      return results;
    } catch (error) {
      console.error("[MapboxMap] Search error:", error);
      return [];
    }
  }, [userLocation]);

  // Clear destination route
  const clearDestinationRoute = useCallback(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    setDestinationRoutes([]);

    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }

    // Important: remove ALL layers that use the source before removing the source.
    // Otherwise Mapbox throws: "Source ... cannot be removed while layer ... is using it".
    const safeRemoveLayer = (id: string) => {
      try {
        if (map.getLayer(id)) map.removeLayer(id);
      } catch (e) {
        console.warn("[MapboxMap] Failed to remove layer", id, e);
      }
    };

    const safeRemoveSource = (id: string) => {
      try {
        if (map.getSource(id)) map.removeSource(id);
      } catch (e) {
        console.warn("[MapboxMap] Failed to remove source", id, e);
      }
    };

    safeRemoveLayer("destination-route");
    safeRemoveLayer("destination-route-casing");
    safeRemoveSource("destination-route");
  }, []);

  // Get current route points
  const getRoutePoints = useCallback(() => {
    return routePointsRef.current;
  }, []);

  /**
   * Directions API sometimes returns a full route geometry (route.geometry),
   * but in some cases we only reliably have step geometries.
   * This helper always returns a single LineString if possible.
   */
  const extractRouteGeometry = useCallback((route: any): GeoJSON.LineString | null => {
    const g = route?.geometry;
    if (g?.type === "LineString" && Array.isArray(g.coordinates) && g.coordinates.length > 1) {
      return g as GeoJSON.LineString;
    }

    const steps = route?.legs?.[0]?.steps;
    if (!Array.isArray(steps) || steps.length === 0) return null;

    const coords: [number, number][] = [];
    for (const step of steps) {
      const sg = step?.geometry;
      if (sg?.type !== "LineString" || !Array.isArray(sg.coordinates)) continue;

      for (const c of sg.coordinates as [number, number][]) {
        const last = coords[coords.length - 1];
        if (!last || last[0] !== c[0] || last[1] !== c[1]) {
          coords.push(c);
        }
      }
    }

    if (coords.length < 2) return null;
    return { type: "LineString", coordinates: coords } as GeoJSON.LineString;
  }, []);

  // Get destination route geometry (for saving directions routes)
  const getDestinationRouteGeometry = useCallback((): { coordinates: [number, number][]; distance: number; duration: number } | null => {
    if (destinationRoutes.length === 0) return null;
    
    const idx = Math.min(
      Math.max(selectedDestinationRouteIndex ?? 0, 0),
      destinationRoutes.length - 1
    );
    
    const route = destinationRoutes[idx];
    const geometry = extractRouteGeometry(route);
    
    if (!geometry) return null;
    
    return {
      coordinates: geometry.coordinates as [number, number][],
      distance: route.distance / 1000, // km
      duration: Math.ceil(route.duration / 60), // minutes
    };
  }, [destinationRoutes, selectedDestinationRouteIndex, extractRouteGeometry]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    searchPlaces,
    clearDestinationRoute,
    getRoutePoints,
    getDestinationRouteGeometry,
  }), [searchPlaces, clearDestinationRoute, getRoutePoints, getDestinationRouteGeometry]);

  // Calculate approximate distance between two [lng, lat] points in km
  const getApproxDistanceKm = useCallback((from: [number, number], to: [number, number]) => {
    const R = 6371; // Earth radius in km
    const dLat = ((to[1] - from[1]) * Math.PI) / 180;
    const dLon = ((to[0] - from[0]) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((from[1] * Math.PI) / 180) *
        Math.cos((to[1] * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Fetch route variants to destination using Mapbox Directions API
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded || !destination || !userLocation) return;

    console.log("[MapboxMap] Building routes to destination:", destination);
    console.log("[MapboxMap] User location:", userLocation);

    clearDestinationRoute();

    const map = mapRef.current;
    const destCoords: [number, number] = [destination.coordinates[0], destination.coordinates[1]]; // [lng, lat]
    
    // Auto-select profile: walking/cycling have distance limits (~100km walking, ~300km cycling)
    // For long distances, fallback to driving
    const approxDistKm = getApproxDistanceKm(userLocation, destCoords);
    let profile = MAPBOX_PROFILES[transportType] || "walking";
    
    const WALKING_LIMIT_KM = 100;
    const CYCLING_LIMIT_KM = 300;
    
    if (profile === "walking" && approxDistKm > WALKING_LIMIT_KM) {
      console.log(`[MapboxMap] Distance ${approxDistKm.toFixed(0)}km exceeds walking limit, switching to driving`);
      profile = "driving";
    } else if (profile === "cycling" && approxDistKm > CYCLING_LIMIT_KM) {
      console.log(`[MapboxMap] Distance ${approxDistKm.toFixed(0)}km exceeds cycling limit, switching to driving`);
      profile = "driving";
    }

    // Add destination marker
    const el = document.createElement("div");
    el.innerHTML = `<div style="width: 24px; height: 24px; background: #ef4444; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`;

    destinationMarkerRef.current = new mapboxgl.Marker(el).setLngLat(destCoords).addTo(map);

    const fetchRoutes = async (useProfile: string, allowAlternatives: boolean, excludeTolls: boolean) => {
      const alternativesParam = allowAlternatives ? "&alternatives=true" : "";
      const excludeParam = excludeTolls ? "&exclude=toll" : "";
      return fetch(
        `https://api.mapbox.com/directions/v5/mapbox/${useProfile}/${userLocation[0]},${userLocation[1]};${destCoords[0]},${destCoords[1]}?geometries=geojson&overview=full&steps=true${alternativesParam}${excludeParam}&access_token=${MAPBOX_ACCESS_TOKEN}`
      );
    };

    const avoidTolls = routePreference?.avoidTolls ?? false;
    const useTraffic = routePreference?.useTraffic ?? false;

    // Use driving-traffic for real-time traffic when car is selected
    if ((profile === "driving" || profile === "driving-traffic") && useTraffic) {
      profile = "driving-traffic";
    } else if (profile === "driving-traffic" && !useTraffic) {
      profile = "driving";
    }

    const load = async () => {
      try {
        let response = await fetchRoutes(profile, true, avoidTolls);
        let data = await response.json();

        // Some profiles (e.g. driving-traffic) may not support alternatives reliably
        if ((!data?.routes || data.routes.length === 0) && response.ok) {
          response = await fetchRoutes(profile, false, avoidTolls);
          data = await response.json();
        }

        // If still failing with distance error, try driving as fallback
        if (!response.ok && data?.code === "InvalidInput" && profile !== "driving") {
          console.log("[MapboxMap] Profile failed, falling back to driving");
          response = await fetchRoutes("driving", true, avoidTolls);
          data = await response.json();
          if ((!data?.routes || data.routes.length === 0) && response.ok) {
            response = await fetchRoutes("driving", false, avoidTolls);
            data = await response.json();
          }
        }

        if (!response.ok) {
          const msg = data?.message || data?.error || "Не удалось построить маршрут";
          console.error("[MapboxMap] Directions error:", data);
          onDestinationRouteError?.(msg);
          return;
        }

        if (!data.routes || data.routes.length === 0) {
          const msg = data?.message || "Маршрут не найден";
          console.error("[MapboxMap] No routes found:", data);
          onDestinationRouteError?.(msg);
          return;
        }

        setDestinationRoutes(data.routes);

        const meta = data.routes.map((r: any, index: number) => ({
          index,
          distance: r.distance / 1000,
          duration: Math.ceil(r.duration / 60),
          label: index === 0 ? "Рекомендуемый" : `Маршрут ${index + 1}`,
        }));
        onDestinationRoutesReady?.(meta);

      } catch (error: any) {
        console.error("[MapboxMap] Route fetch error:", error);
        onDestinationRouteError?.("Ошибка сети при построении маршрута");
      }
    };

    load();
  }, [destination, userLocation, isMapLoaded, transportType, routePreference, clearDestinationRoute, onDestinationRoutesReady, onDestinationRouteError, getApproxDistanceKm]);

  // Draw selected destination route
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    const map = mapRef.current;

    const ROUTE_SOURCE_ID = "destination-route";
    const ROUTE_LAYER_ID = "destination-route";
    const ROUTE_CASING_LAYER_ID = "destination-route-casing";

    const clear = () => {
      if (map.getLayer(ROUTE_LAYER_ID)) map.removeLayer(ROUTE_LAYER_ID);
      if (map.getLayer(ROUTE_CASING_LAYER_ID)) map.removeLayer(ROUTE_CASING_LAYER_ID);
      if (map.getSource(ROUTE_SOURCE_ID)) map.removeSource(ROUTE_SOURCE_ID);
    };

    // If no destination or no routes, clear the layer
    if (!destination || destinationRoutes.length === 0) {
      clear();
      return;
    }

    const idx = Math.min(
      Math.max(selectedDestinationRouteIndex ?? 0, 0),
      destinationRoutes.length - 1
    );

    const route = destinationRoutes[idx];
    const geometry = extractRouteGeometry(route);

    if (!geometry) {
      console.warn("[MapboxMap] Unable to extract route geometry:", route);
      return;
    }

    const distance = route.distance / 1000;
    const duration = Math.ceil(route.duration / 60);
    onDestinationRouteReady?.(distance, duration);

    const color = TRANSPORT_COLORS[transportType] || "#22c55e";

    const draw = () => {
      try {
        clear();

        map.addSource(ROUTE_SOURCE_ID, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry,
          },
        });

        // Casing (outline) for better visibility like Yandex/Google
        map.addLayer({
          id: ROUTE_CASING_LAYER_ID,
          type: "line",
          source: ROUTE_SOURCE_ID,
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#0b0b0b",
            "line-width": 10,
            "line-opacity": 0.35,
          },
        });

        map.addLayer({
          id: ROUTE_LAYER_ID,
          type: "line",
          source: ROUTE_SOURCE_ID,
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": color,
            "line-width": 6,
            "line-opacity": 0.95,
          },
        });

        const bounds = new mapboxgl.LngLatBounds();
        geometry.coordinates.forEach((coord: [number, number]) => bounds.extend(coord));
        map.fitBounds(bounds, { padding: 120, duration: 900 });

        console.log("[MapboxMap] Route drawn:", geometry.coordinates.length, "points");
      } catch (e) {
        console.error("[MapboxMap] Failed to draw route layer:", e);
      }
    };

    // Ensure style is ready (prevents silent addLayer failures)
    if (!map.isStyleLoaded()) {
      map.once("idle", draw);
      return;
    }

    draw();
  }, [destinationRoutes, selectedDestinationRouteIndex, isMapLoaded, destination, transportType, onDestinationRouteReady, extractRouteGeometry]);

  // Display viewing route
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    const map = mapRef.current;

    // Clear previous viewing route objects
    viewingRouteMarkersRef.current.forEach((marker) => marker.remove());
    viewingRouteMarkersRef.current = [];

    if (map.getLayer('viewing-route')) {
      map.removeLayer('viewing-route');
    }
    if (map.getSource('viewing-route')) {
      map.removeSource('viewing-route');
    }

    if (!viewingRoute || viewingRoute.points.length < 2) return;

    const coordinates = viewingRoute.points.map((p) => [p.coordinates[1], p.coordinates[0]] as [number, number]);
    const color = TRANSPORT_COLORS[viewingRoute.transportType] || '#22c55e';

    // Add route line
    map.addSource('viewing-route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates
        }
      }
    });

    map.addLayer({
      id: 'viewing-route',
      type: 'line',
      source: 'viewing-route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': color,
        'line-width': 5,
        'line-opacity': 0.8
      }
    });

    // Add markers for each point
    viewingRoute.points.forEach((point) => {
      const hasMedia = point.media && point.media.length > 0;
      const el = document.createElement('div');
      el.innerHTML = `<div style="width: ${hasMedia ? 28 : 16}px; height: ${hasMedia ? 28 : 16}px; background: ${hasMedia ? '#3b82f6' : color}; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold; cursor: pointer;">${hasMedia ? '📷' : ''}</div>`;
      
      const marker = new mapboxgl.Marker(el)
        .setLngLat([point.coordinates[1], point.coordinates[0]])
        .addTo(map);

      el.addEventListener('click', () => {
        onPointClick?.(point);
      });

      viewingRouteMarkersRef.current.push(marker);
    });

    // Fit bounds
    const bounds = new mapboxgl.LngLatBounds();
    coordinates.forEach((coord) => bounds.extend(coord));
    map.fitBounds(bounds, { padding: 80, duration: 1000 });

  }, [viewingRoute, isMapLoaded, onPointClick]);


  // Show a media preview card above a point after upload
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    if (highlightCardMarkerRef.current) {
      highlightCardMarkerRef.current.remove();
      highlightCardMarkerRef.current = null;
    }

    if (!viewingRoute || !highlightPointId) return;

    const point = viewingRoute.points.find((p) => p.id === highlightPointId);
    const media = point?.media?.[0];
    if (!point || !media) return;

    const map = mapRef.current;

    const card = document.createElement("div");
    card.style.cssText = [
      "width: 160px",
      "border-radius: 14px",
      "overflow: hidden",
      "border: 1px solid hsl(var(--border))",
      "background: hsl(var(--card))",
      "color: hsl(var(--card-foreground))",
      "box-shadow: 0 14px 40px hsl(var(--foreground) / 0.18)",
    ].join(";");

    const caption = (media.caption || "").trim();
    const captionHtml = caption
      ? `<div style="padding: 8px 10px; font-size: 12px; line-height: 1.2;">${caption.replace(/</g, "&lt;")}</div>`
      : "";

    if (media.type === "photo") {
      card.innerHTML = `
        <img src="${media.url}" alt="${caption || "Фото"}" style="width: 100%; height: 110px; object-fit: cover; display: block;" loading="lazy" />
        ${captionHtml}
      `;
    } else {
      card.innerHTML = `
        <div style="width: 100%; height: 110px; display: flex; align-items: center; justify-content: center; background: hsl(var(--muted)); color: hsl(var(--muted-foreground)); font-weight: 600;">
          Видео
        </div>
        ${captionHtml}
      `;
    }

    highlightCardMarkerRef.current = new mapboxgl.Marker({
      element: card,
      anchor: "bottom",
      offset: [0, -30],
    })
      .setLngLat([point.coordinates[1], point.coordinates[0]])
      .addTo(map);
  }, [highlightPointId, viewingRoute, isMapLoaded]);

  // Handle route recording
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    const map = mapRef.current;

    if (isRouting) {
      routePointsRef.current = [];
      startTimeRef.current = Date.now();

      // Initialize recording route source and layer
      if (!map.getSource('recording-route')) {
        map.addSource('recording-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: []
            }
          }
        });

        map.addLayer({
          id: 'recording-route',
          type: 'line',
          source: 'recording-route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': TRANSPORT_COLORS[transportType] || '#22c55e',
            'line-width': 5,
            'line-opacity': 0.8
          }
        });
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const coords: [number, number] = [position.coords.longitude, position.coords.latitude];
          const latLngCoords: [number, number] = [position.coords.latitude, position.coords.longitude];
          
          if (userMarkerRef.current) {
            userMarkerRef.current.setLngLat(coords);
          }

          const newPoint: RoutePoint = {
            id: `point-${Date.now()}`,
            coordinates: latLngCoords,
            timestamp: Date.now(),
          };

          routePointsRef.current.push(newPoint);
          addPointToCurrentRoute(newPoint);

          // Update route line
          const routeCoordinates = routePointsRef.current.map((p) => [p.coordinates[1], p.coordinates[0]]);
          (map.getSource('recording-route') as mapboxgl.GeoJSONSource)?.setData({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: routeCoordinates
            }
          });

          map.flyTo({ center: coords, duration: 300 });

          const distance = calculateDistance(routePointsRef.current.map((p) => p.coordinates));
          onDistanceUpdate(distance);

          if (startTimeRef.current) {
            const elapsedMinutes = Math.floor((Date.now() - startTimeRef.current) / 60000);
            onTimeUpdate(elapsedMinutes);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 5000,
        }
      );
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      startTimeRef.current = null;

      // Clean up recording route
      if (map.getLayer('recording-route')) {
        map.removeLayer('recording-route');
      }
      if (map.getSource('recording-route')) {
        map.removeSource('recording-route');
      }
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isRouting, transportType, isMapLoaded, onDistanceUpdate, onTimeUpdate, addPointToCurrentRoute]);

  // Update route color when transport type changes
  useEffect(() => {
    if (!mapRef.current || !isRouting) return;
    
    const map = mapRef.current;
    if (map.getLayer('recording-route')) {
      map.setPaintProperty('recording-route', 'line-color', TRANSPORT_COLORS[transportType] || '#22c55e');
    }
  }, [transportType, isRouting]);

  // Calculate distance between points
  const calculateDistance = useCallback((points: [number, number][]) => {
    if (points.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      const [lat1, lon1] = points[i - 1];
      const [lat2, lon2] = points[i];
      
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDistance += R * c;
    }
    
    return totalDistance;
  }, []);

  const centerOnUser = useCallback(() => {
    if (!mapRef.current) return;
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [position.coords.longitude, position.coords.latitude];
        mapRef.current?.flyTo({ center: coords, zoom: 16, duration: 500 });
        
        if (userMarkerRef.current) {
          userMarkerRef.current.setLngLat(coords);
        }
      },
      () => {
        if (userLocation) {
          mapRef.current?.flyTo({ center: userLocation, zoom: 16, duration: 500 });
        }
      },
      { enableHighAccuracy: true }
    );
  }, [userLocation]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="absolute inset-0" />

      {!isMapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Загрузка карты...</span>
          </div>
        </div>
      )}

      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 ios-blur">
          <div className="ios-card-lg p-4 max-w-[320px] text-center">
            <p className="font-semibold text-foreground">Не удалось загрузить карту</p>
            <p className="text-sm text-muted-foreground mt-1">
              Проверьте подключение к интернету и попробуйте снова.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-medium"
            >
              Повторить
            </button>
          </div>
        </div>
      )}

      <button
        onClick={centerOnUser}
        className="absolute bottom-24 right-4 z-[1000] w-12 h-12 bg-card rounded-full shadow-lg flex items-center justify-center hover:bg-muted transition-colors"
        aria-label="Моё местоположение"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        </svg>
      </button>
    </div>
  );
});

MapboxMap.displayName = "MapboxMap";

export default MapboxMap;
