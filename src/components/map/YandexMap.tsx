import { useEffect, useRef, useState, useCallback } from "react";

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
}

const YANDEX_API_KEY = "499a1ddf-9da3-4fee-bf16-5aca0630d9dc";

const YandexMap = ({ isRouting, transportType, onDistanceUpdate, onTimeUpdate }: YandexMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const routeLineRef = useRef<any>(null);
  const userPlacemarkRef = useRef<any>(null);
  const routePointsRef = useRef<[number, number][]>([]);
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

    // Get user's current location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
        setUserLocation(coords);
        
        mapRef.current = new window.ymaps.Map(mapContainerRef.current, {
          center: coords,
          zoom: 15,
          controls: ["zoomControl"],
        });

        // Add user placemark
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
        // Default to Moscow if geolocation fails
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

  // Calculate distance between two points
  const calculateDistance = useCallback((points: [number, number][]) => {
    if (points.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      const [lat1, lon1] = points[i - 1];
      const [lat2, lon2] = points[i];
      
      const R = 6371; // Earth's radius in km
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

  // Handle route recording
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    if (isRouting) {
      // Start recording route
      routePointsRef.current = [];
      startTimeRef.current = Date.now();

      // Create polyline for route
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

      // Start watching position
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          
          // Update user placemark
          if (userPlacemarkRef.current) {
            userPlacemarkRef.current.geometry.setCoordinates(coords);
          }

          // Add point to route
          routePointsRef.current.push(coords);
          
          // Update polyline
          if (routeLineRef.current) {
            routeLineRef.current.geometry.setCoordinates(routePointsRef.current);
          }

          // Center map on user
          mapRef.current.setCenter(coords, mapRef.current.getZoom(), {
            duration: 300,
          });

          // Update distance
          const distance = calculateDistance(routePointsRef.current);
          onDistanceUpdate(distance);

          // Update time
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
      // Stop recording
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      // Keep the route line visible but stop updating
      startTimeRef.current = null;
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isRouting, transportType, isMapLoaded, calculateDistance, onDistanceUpdate, onTimeUpdate]);

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

      {/* Center on user button */}
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
};

export default YandexMap;
