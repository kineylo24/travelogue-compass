import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { useRoutes, RoutePoint, SavedRoute } from "@/contexts/RoutesContext";
import { Destination } from "@/types/routes";

declare global {
  interface Window {
    ymaps: any;
  }
}

interface YandexMapProps {
  isRouting: boolean;
  transportType: string;
  onDistanceUpdate: (distance: number) => void;
  onTimeUpdate: (time: number) => void;
  destination?: Destination | null;
  onDestinationRouteReady?: (distance: number, duration: number) => void;
  viewingRoute?: SavedRoute | null;
  onPointClick?: (point: RoutePoint) => void;
}

export interface YandexMapRef {
  searchPlaces: (query: string) => Promise<{ name: string; address: string; coordinates: [number, number] }[]>;
  clearDestinationRoute: () => void;
  getRoutePoints: () => RoutePoint[];
}

const YANDEX_API_KEY = "499a1ddf-9da3-4fee-bf16-5aca0630d9dc";

const YandexMap = forwardRef<YandexMapRef, YandexMapProps>(({
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
  const mapRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);
  const userPlacemarkRef = useRef<any>(null);
  const destinationPlacemarkRef = useRef<any>(null);
  const destinationRouteRef = useRef<any>(null);
  const routePointsRef = useRef<RoutePoint[]>([]);
  const viewingRouteObjectsRef = useRef<any[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Load Yandex Maps API
  useEffect(() => {
    if (window.ymaps) {
      setIsMapLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YANDEX_API_KEY}&lang=ru_RU`;
    script.async = true;
    script.onload = () => {
      window.ymaps.ready(() => {
        setIsMapLoaded(true);
      });
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isMapLoaded || !mapContainerRef.current || mapRef.current) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
        setUserLocation(coords);
        
        mapRef.current = new window.ymaps.Map(mapContainerRef.current, {
          center: coords,
          zoom: 15,
          controls: ["zoomControl"],
        });

        userPlacemarkRef.current = new window.ymaps.Placemark(
          coords,
          {},
          {
            preset: "islands#geolocationIcon",
            iconColor: "#0ea5e9",
          }
        );
        mapRef.current.geoObjects.add(userPlacemarkRef.current);
      },
      () => {
        const defaultCoords: [number, number] = [55.751574, 37.573856];
        setUserLocation(defaultCoords);
        
        mapRef.current = new window.ymaps.Map(mapContainerRef.current, {
          center: defaultCoords,
          zoom: 12,
          controls: ["zoomControl"],
        });
      },
      { enableHighAccuracy: true }
    );

    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [isMapLoaded]);

  // Search places
  const searchPlaces = useCallback(async (query: string): Promise<{ name: string; address: string; coordinates: [number, number] }[]> => {
    if (!isMapLoaded || !window.ymaps) return [];
    
    return new Promise((resolve) => {
      const geocoder = window.ymaps.geocode(query, { results: 5 });
      geocoder.then((result: any) => {
        const places: { name: string; address: string; coordinates: [number, number] }[] = [];
        result.geoObjects.each((geoObject: any) => {
          const coords = geoObject.geometry.getCoordinates();
          places.push({
            name: geoObject.properties.get("name") || query,
            address: geoObject.properties.get("description") || "",
            coordinates: [coords[0], coords[1]],
          });
        });
        resolve(places);
      }).catch(() => resolve([]));
    });
  }, [isMapLoaded]);

  // Clear destination route
  const clearDestinationRoute = useCallback(() => {
    if (destinationRouteRef.current && mapRef.current) {
      mapRef.current.geoObjects.remove(destinationRouteRef.current);
      destinationRouteRef.current = null;
    }
    if (destinationPlacemarkRef.current && mapRef.current) {
      mapRef.current.geoObjects.remove(destinationPlacemarkRef.current);
      destinationPlacemarkRef.current = null;
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

    const routingModes: Record<string, string> = {
      walk: "pedestrian",
      bike: "pedestrian",
      car: "auto",
      transit: "masstransit",
    };

    const routeColors: Record<string, string> = {
      walk: "#22c55e",
      bike: "#f59e0b",
      car: "#3b82f6",
      transit: "#8b5cf6",
    };

    // Add destination placemark
    destinationPlacemarkRef.current = new window.ymaps.Placemark(
      destination.coordinates,
      {
        balloonContent: destination.name,
        hintContent: destination.address,
      },
      {
        preset: "islands#redDotIcon",
      }
    );
    mapRef.current.geoObjects.add(destinationPlacemarkRef.current);

    // Build route
    const multiRoute = new window.ymaps.multiRouter.MultiRoute(
      {
        referencePoints: [userLocation, destination.coordinates],
        params: {
          routingMode: routingModes[transportType] || "pedestrian",
        },
      },
      {
        boundsAutoApply: true,
        routeActiveStrokeWidth: 4,
        routeActiveStrokeColor: routeColors[transportType] || "#22c55e",
      }
    );

    multiRoute.events.add("update", () => {
      const activeRoute = multiRoute.getActiveRoute();
      if (activeRoute) {
        const distance = activeRoute.properties.get("distance");
        const duration = activeRoute.properties.get("duration");
        onDestinationRouteReady?.(
          distance?.value ? distance.value / 1000 : 0,
          duration?.value ? Math.ceil(duration.value / 60) : 0
        );
      }
    });

    destinationRouteRef.current = multiRoute;
    mapRef.current.geoObjects.add(multiRoute);

  }, [destination, userLocation, isMapLoaded, transportType, clearDestinationRoute, onDestinationRouteReady]);

  // Display viewing route
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    // Clear previous viewing route objects
    viewingRouteObjectsRef.current.forEach((obj) => {
      mapRef.current.geoObjects.remove(obj);
    });
    viewingRouteObjectsRef.current = [];

    if (!viewingRoute) return;

    const coordinates = viewingRoute.points.map((p) => p.coordinates);
    
    if (coordinates.length < 2) return;

    // Create polyline
    const routeColors: Record<string, string> = {
      walk: "#22c55e",
      bike: "#f59e0b",
      car: "#3b82f6",
      transit: "#8b5cf6",
    };

    const polyline = new window.ymaps.Polyline(
      coordinates,
      {},
      {
        strokeColor: routeColors[viewingRoute.transportType] || "#22c55e",
        strokeWidth: 4,
        strokeOpacity: 0.8,
      }
    );
    mapRef.current.geoObjects.add(polyline);
    viewingRouteObjectsRef.current.push(polyline);

    // Add placemarks for each point
    viewingRoute.points.forEach((point, index) => {
      const hasMedia = point.media && point.media.length > 0;
      const placemark = new window.ymaps.Placemark(
        point.coordinates,
        {
          balloonContent: hasMedia 
            ? `<div>Точка ${index + 1}<br/>${point.media?.length} медиа</div>` 
            : `Точка ${index + 1}`,
        },
        {
          preset: hasMedia ? "islands#bluePhotoIcon" : "islands#circleDotIcon",
          iconColor: hasMedia ? "#3b82f6" : routeColors[viewingRoute.transportType],
        }
      );

      placemark.events.add("click", () => {
        onPointClick?.(point);
      });

      mapRef.current.geoObjects.add(placemark);
      viewingRouteObjectsRef.current.push(placemark);
    });

    // Fit bounds to show entire route
    const bounds = polyline.geometry.getBounds();
    if (bounds) {
      mapRef.current.setBounds(bounds, { checkZoomRange: true, zoomMargin: 50 });
    }

  }, [viewingRoute, isMapLoaded, onPointClick]);

  // Handle route recording
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    if (isRouting) {
      routePointsRef.current = [];
      startTimeRef.current = Date.now();

      const routeColors: Record<string, string> = {
        walk: "#22c55e",
        bike: "#f59e0b",
        car: "#3b82f6",
        transit: "#8b5cf6",
      };

      routeLineRef.current = new window.ymaps.Polyline(
        [],
        {},
        {
          strokeColor: routeColors[transportType] || "#22c55e",
          strokeWidth: 4,
          strokeOpacity: 0.8,
        }
      );
      mapRef.current.geoObjects.add(routeLineRef.current);

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          
          if (userPlacemarkRef.current) {
            userPlacemarkRef.current.geometry.setCoordinates(coords);
          }

          const newPoint: RoutePoint = {
            id: `point-${Date.now()}`,
            coordinates: coords,
            timestamp: Date.now(),
          };

          routePointsRef.current.push(newPoint);
          addPointToCurrentRoute(newPoint);
          
          if (routeLineRef.current) {
            routeLineRef.current.geometry.setCoordinates(
              routePointsRef.current.map((p) => p.coordinates)
            );
          }

          mapRef.current.setCenter(coords, mapRef.current.getZoom(), {
            duration: 300,
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

    const routeColors: Record<string, string> = {
      walk: "#22c55e",
      bike: "#f59e0b",
      car: "#3b82f6",
      transit: "#8b5cf6",
    };

    routeLineRef.current.options.set("strokeColor", routeColors[transportType] || "#22c55e");
  }, [transportType, isRouting]);

  const centerOnUser = useCallback(() => {
    if (!mapRef.current || !userLocation) return;
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
        mapRef.current.setCenter(coords, 16, { duration: 500 });
        
        if (userPlacemarkRef.current) {
          userPlacemarkRef.current.geometry.setCoordinates(coords);
        }
      },
      () => {
        mapRef.current.setCenter(userLocation, 16, { duration: 500 });
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
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Загрузка карты...</span>
          </div>
        </div>
      )}

      <button 
        onClick={centerOnUser}
        className="absolute bottom-24 right-4 z-10 w-12 h-12 bg-card rounded-full shadow-lg flex items-center justify-center hover:bg-muted transition-colors"
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

YandexMap.displayName = "YandexMap";

export default YandexMap;
