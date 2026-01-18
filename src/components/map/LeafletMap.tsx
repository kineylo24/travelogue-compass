import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { useRoutes, RoutePoint, SavedRoute } from "@/contexts/RoutesContext";
import { Destination } from "@/types/routes";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet with Vite
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface LeafletMapProps {
  isRouting: boolean;
  transportType: string;
  onDistanceUpdate: (distance: number) => void;
  onTimeUpdate: (time: number) => void;
  destination?: Destination | null;
  onDestinationRouteReady?: (distance: number, duration: number) => void;
  viewingRoute?: SavedRoute | null;
  onPointClick?: (point: RoutePoint) => void;
}

export interface LeafletMapRef {
  searchPlaces: (query: string) => Promise<{ name: string; address: string; coordinates: [number, number] }[]>;
  clearDestinationRoute: () => void;
  getRoutePoints: () => RoutePoint[];
}

const routeColors: Record<string, string> = {
  walk: "#22c55e",
  bike: "#f59e0b",
  car: "#3b82f6",
  transit: "#8b5cf6",
};

const LeafletMap = forwardRef<LeafletMapRef, LeafletMapProps>(({
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
  const mapRef = useRef<L.Map | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const destinationMarkerRef = useRef<L.Marker | null>(null);
  const destinationLineRef = useRef<L.Polyline | null>(null);
  const routePointsRef = useRef<RoutePoint[]>([]);
  const viewingRouteObjectsRef = useRef<L.Layer[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
        setUserLocation(coords);
        initMap(coords);
      },
      () => {
        const defaultCoords: [number, number] = [55.751574, 37.573856]; // Moscow
        setUserLocation(defaultCoords);
        initMap(defaultCoords);
      },
      { enableHighAccuracy: true }
    );

    function initMap(coords: [number, number]) {
      if (!mapContainerRef.current) return;
      
      mapRef.current = L.map(mapContainerRef.current, {
        center: coords,
        zoom: 15,
        zoomControl: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapRef.current);

      L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);

      // User location marker
      const userIcon = L.divIcon({
        className: "user-location-marker",
        html: `<div style="width: 20px; height: 20px; background: #0ea5e9; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      userMarkerRef.current = L.marker(coords, { icon: userIcon }).addTo(mapRef.current);
      setIsMapLoaded(true);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Search places using Nominatim
  const searchPlaces = useCallback(async (query: string): Promise<{ name: string; address: string; coordinates: [number, number] }[]> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=ru`
      );
      const data = await response.json();
      
      return data.map((item: any) => ({
        name: item.name || item.display_name.split(",")[0],
        address: item.display_name,
        coordinates: [parseFloat(item.lat), parseFloat(item.lon)] as [number, number],
      }));
    } catch (error) {
      console.error("Search error:", error);
      return [];
    }
  }, []);

  // Clear destination route
  const clearDestinationRoute = useCallback(() => {
    if (destinationLineRef.current && mapRef.current) {
      mapRef.current.removeLayer(destinationLineRef.current);
      destinationLineRef.current = null;
    }
    if (destinationMarkerRef.current && mapRef.current) {
      mapRef.current.removeLayer(destinationMarkerRef.current);
      destinationMarkerRef.current = null;
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

  // Build route to destination
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded || !destination || !userLocation) return;

    clearDestinationRoute();

    // Add destination marker
    destinationMarkerRef.current = L.marker(destination.coordinates, {
      icon: L.divIcon({
        className: "destination-marker",
        html: `<div style="width: 24px; height: 24px; background: #ef4444; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    }).addTo(mapRef.current);

    // Draw line to destination
    destinationLineRef.current = L.polyline(
      [userLocation, destination.coordinates],
      {
        color: routeColors[transportType] || "#22c55e",
        weight: 4,
        opacity: 0.8,
        dashArray: "10, 10",
      }
    ).addTo(mapRef.current);

    // Calculate distance and estimated time
    const distance = calculateDistance([userLocation, destination.coordinates]);
    const speeds: Record<string, number> = { walk: 5, bike: 15, car: 40, transit: 25 };
    const speed = speeds[transportType] || 5;
    const duration = Math.ceil((distance / speed) * 60);

    onDestinationRouteReady?.(distance, duration);

    // Fit bounds
    mapRef.current.fitBounds(
      L.latLngBounds([userLocation, destination.coordinates]),
      { padding: [50, 50] }
    );

  }, [destination, userLocation, isMapLoaded, transportType, clearDestinationRoute, onDestinationRouteReady]);

  // Display viewing route
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    // Clear previous viewing route objects
    viewingRouteObjectsRef.current.forEach((layer) => {
      mapRef.current?.removeLayer(layer);
    });
    viewingRouteObjectsRef.current = [];

    if (!viewingRoute || viewingRoute.points.length < 2) return;

    const coordinates = viewingRoute.points.map((p) => p.coordinates);

    // Create polyline
    const polyline = L.polyline(coordinates, {
      color: routeColors[viewingRoute.transportType] || "#22c55e",
      weight: 4,
      opacity: 0.8,
    }).addTo(mapRef.current);
    viewingRouteObjectsRef.current.push(polyline);

    // Add markers for each point
    viewingRoute.points.forEach((point, index) => {
      const hasMedia = point.media && point.media.length > 0;
      const marker = L.marker(point.coordinates, {
        icon: L.divIcon({
          className: "route-point-marker",
          html: `<div style="width: ${hasMedia ? 28 : 16}px; height: ${hasMedia ? 28 : 16}px; background: ${hasMedia ? "#3b82f6" : routeColors[viewingRoute.transportType]}; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">${hasMedia ? "📷" : ""}</div>`,
          iconSize: [hasMedia ? 28 : 16, hasMedia ? 28 : 16],
          iconAnchor: [hasMedia ? 14 : 8, hasMedia ? 14 : 8],
        }),
      }).addTo(mapRef.current!);

      marker.on("click", () => {
        onPointClick?.(point);
      });

      viewingRouteObjectsRef.current.push(marker);
    });

    // Fit bounds
    mapRef.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });

  }, [viewingRoute, isMapLoaded, onPointClick]);

  // Handle route recording
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    if (isRouting) {
      routePointsRef.current = [];
      startTimeRef.current = Date.now();

      routeLineRef.current = L.polyline([], {
        color: routeColors[transportType] || "#22c55e",
        weight: 4,
        opacity: 0.8,
      }).addTo(mapRef.current);

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          
          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng(coords);
          }

          const newPoint: RoutePoint = {
            id: `point-${Date.now()}`,
            coordinates: coords,
            timestamp: Date.now(),
          };

          routePointsRef.current.push(newPoint);
          addPointToCurrentRoute(newPoint);
          
          if (routeLineRef.current) {
            routeLineRef.current.setLatLngs(
              routePointsRef.current.map((p) => p.coordinates)
            );
          }

          mapRef.current?.setView(coords, mapRef.current.getZoom(), {
            animate: true,
            duration: 0.3,
          });

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
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isRouting, transportType, isMapLoaded, onDistanceUpdate, onTimeUpdate, addPointToCurrentRoute]);

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

  // Update route color when transport type changes
  useEffect(() => {
    if (!routeLineRef.current || !isRouting) return;
    routeLineRef.current.setStyle({ color: routeColors[transportType] || "#22c55e" });
  }, [transportType, isRouting]);

  const centerOnUser = useCallback(() => {
    if (!mapRef.current) return;
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
        mapRef.current?.setView(coords, 16, { animate: true, duration: 0.5 });
        
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng(coords);
        }
      },
      () => {
        if (userLocation) {
          mapRef.current?.setView(userLocation, 16, { animate: true, duration: 0.5 });
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

LeafletMap.displayName = "LeafletMap";

export default LeafletMap;