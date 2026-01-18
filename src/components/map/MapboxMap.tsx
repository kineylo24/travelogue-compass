import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { useRoutes, RoutePoint, SavedRoute } from "@/contexts/RoutesContext";
import { Destination } from "@/types/routes";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_ACCESS_TOKEN, MAPBOX_STYLES, MAPBOX_PROFILES, TRANSPORT_COLORS } from "@/lib/mapbox";

mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

interface MapboxMapProps {
  isRouting: boolean;
  transportType: string;
  onDistanceUpdate: (distance: number) => void;
  onTimeUpdate: (time: number) => void;
  destination?: Destination | null;
  onDestinationRouteReady?: (distance: number, duration: number) => void;
  viewingRoute?: SavedRoute | null;
  onPointClick?: (point: RoutePoint) => void;
}

export interface MapboxMapRef {
  searchPlaces: (query: string) => Promise<{ name: string; address: string; coordinates: [number, number] }[]>;
  clearDestinationRoute: () => void;
  getRoutePoints: () => RoutePoint[];
}

const MapboxMap = forwardRef<MapboxMapRef, MapboxMapProps>(({
  isRouting,
  transportType,
  onDistanceUpdate,
  onTimeUpdate,
  destination,
  onDestinationRouteReady,
  viewingRoute,
  onPointClick,
}, ref) => {
  const { addPointToCurrentRoute } = useRoutes();
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const viewingRouteMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const routePointsRef = useRef<RoutePoint[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapError, setMapError] = useState(false);

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
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=5&language=ru`;
      const response = await fetch(url);
      const data = await response.json();
      
      console.log("[MapboxMap] Search results:", data);
      
      const results = data.features?.map((item: any) => ({
        name: item.text || item.place_name.split(",")[0],
        address: item.place_name,
        coordinates: [item.center[0], item.center[1]] as [number, number], // Mapbox returns [lng, lat], keep as is
      })) || [];
      
      console.log("[MapboxMap] Parsed results:", results);
      return results;
    } catch (error) {
      console.error("[MapboxMap] Search error:", error);
      return [];
    }
  }, []);

  // Clear destination route
  const clearDestinationRoute = useCallback(() => {
    if (!mapRef.current) return;
    
    if (destinationMarkerRef.current) {
      destinationMarkerRef.current.remove();
      destinationMarkerRef.current = null;
    }
    
    if (mapRef.current.getLayer('destination-route')) {
      mapRef.current.removeLayer('destination-route');
    }
    if (mapRef.current.getSource('destination-route')) {
      mapRef.current.removeSource('destination-route');
    }
  }, []);

  // Get current route points
  const getRoutePoints = useCallback(() => {
    return routePointsRef.current;
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    searchPlaces,
    clearDestinationRoute,
    getRoutePoints,
  }), [searchPlaces, clearDestinationRoute, getRoutePoints]);

  // Build route to destination using Mapbox Directions API
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded || !destination || !userLocation) return;

    console.log("[MapboxMap] Building route to destination:", destination);
    console.log("[MapboxMap] User location:", userLocation);

    clearDestinationRoute();

    const map = mapRef.current;
    // destination.coordinates is now [lng, lat] from search
    const destCoords: [number, number] = [destination.coordinates[0], destination.coordinates[1]];
    const profile = MAPBOX_PROFILES[transportType] || 'walking';
    const color = TRANSPORT_COLORS[transportType] || '#22c55e';

    console.log("[MapboxMap] Destination coords:", destCoords);

    // Add destination marker
    const el = document.createElement('div');
    el.innerHTML = `<div style="width: 24px; height: 24px; background: #ef4444; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`;
    
    destinationMarkerRef.current = new mapboxgl.Marker(el)
      .setLngLat(destCoords)
      .addTo(map);

    // Fetch route from Mapbox Directions API
    const fetchRoute = async () => {
      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${userLocation[0]},${userLocation[1]};${destCoords[0]},${destCoords[1]}?geometries=geojson&overview=full&access_token=${MAPBOX_ACCESS_TOKEN}`;
        console.log("[MapboxMap] Fetching route:", url);
        
        const response = await fetch(url);
        const data = await response.json();

        console.log("[MapboxMap] Route response:", data);

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const distance = route.distance / 1000; // Convert to km
          const duration = Math.ceil(route.duration / 60); // Convert to minutes

          console.log("[MapboxMap] Route found:", { distance, duration });
          onDestinationRouteReady?.(distance, duration);

          // Add route layer
          if (map.getSource('destination-route')) {
            (map.getSource('destination-route') as mapboxgl.GeoJSONSource).setData({
              type: 'Feature',
              properties: {},
              geometry: route.geometry
            });
          } else {
            map.addSource('destination-route', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: route.geometry
              }
            });

            map.addLayer({
              id: 'destination-route',
              type: 'line',
              source: 'destination-route',
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
          }

          // Fit bounds
          const bounds = new mapboxgl.LngLatBounds();
          route.geometry.coordinates.forEach((coord: [number, number]) => {
            bounds.extend(coord);
          });
          map.fitBounds(bounds, { padding: 80, duration: 1000 });
        } else {
          console.error("[MapboxMap] No routes found:", data);
        }
      } catch (error) {
        console.error("[MapboxMap] Route fetch error:", error);
      }
    };

    fetchRoute();
  }, [destination, userLocation, isMapLoaded, transportType, clearDestinationRoute, onDestinationRouteReady]);

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
