import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

export interface RoutePoint {
  id: string;
  coordinates: [number, number];
  timestamp: number;
  media?: {
    type: "photo" | "video";
    url: string;
    caption?: string;
  }[];
}

export interface SavedRoute {
  id: string;
  name: string;
  city: string;
  date: string;
  transportType: "walk" | "bike" | "car" | "transit";
  points: RoutePoint[];
  distance: number; // in km
  duration: number; // in minutes
  thumbnail?: string;
  
  // New fields for route types and bundles
  kind?: "segment" | "bundle";
  source?: "recorded" | "directions";
  parentBundleId?: string; // if segment is part of a bundle
  childrenIds?: string[]; // for bundles: array of segment ids
  isFavorite?: boolean;
  createdAt?: number; // timestamp for filtering
}

interface RoutesContextType {
  routes: SavedRoute[];
  currentRoute: RoutePoint[];
  isRecording: boolean;
  addRoute: (route: SavedRoute) => void;
  deleteRoute: (id: string) => void;
  updateRoute: (id: string, updates: Partial<SavedRoute>) => void;
  addPointToCurrentRoute: (point: RoutePoint) => void;
  clearCurrentRoute: () => void;
  startRecording: () => void;
  stopRecording: () => SavedRoute | null;
  addMediaToPoint: (routeId: string, pointId: string, media: { type: "photo" | "video"; url: string; caption?: string }) => void;
  getRoute: (id: string) => SavedRoute | undefined;
}

const RoutesContext = createContext<RoutesContextType | null>(null);

const STORAGE_KEY = "travelogue.routes.v1";

function safeParseRoutes(raw: string | null): SavedRoute[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

// Don't save blob: URLs (they die after page reload)
function sanitizeRoutesForStorage(routes: SavedRoute[]): SavedRoute[] {
  return routes.map((r) => ({
    ...r,
    points: r.points.map((p) => ({
      ...p,
      media: p.media?.filter((m) => !m.url.startsWith("blob:")),
    })),
  }));
}

// Demo routes
const initialRoutes: SavedRoute[] = [
  {
    id: "demo-1",
    name: "Готический квартал",
    city: "Барселона",
    date: "15 янв 2024",
    transportType: "walk",
    points: [
      { id: "p1", coordinates: [41.3851, 2.1734], timestamp: Date.now() - 3600000 },
      { id: "p2", coordinates: [41.3825, 2.1769], timestamp: Date.now() - 3000000 },
      { id: "p3", coordinates: [41.3808, 2.1752], timestamp: Date.now() - 2400000 },
    ],
    distance: 4.2,
    duration: 65,
    thumbnail: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=200&h=200&fit=crop",
  },
  {
    id: "demo-2",
    name: "Сибуя и Харадзюку",
    city: "Токио",
    date: "3 дек 2023",
    transportType: "walk",
    points: [
      { id: "p1", coordinates: [35.6595, 139.7004], timestamp: Date.now() - 7200000 },
      { id: "p2", coordinates: [35.6684, 139.7030], timestamp: Date.now() - 6000000 },
    ],
    distance: 3.1,
    duration: 48,
    thumbnail: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=200&h=200&fit=crop",
  },
  {
    id: "demo-3",
    name: "Монмартр",
    city: "Париж",
    date: "20 окт 2023",
    transportType: "walk",
    points: [
      { id: "p1", coordinates: [48.8867, 2.3431], timestamp: Date.now() - 10800000 },
      { id: "p2", coordinates: [48.8844, 2.3404], timestamp: Date.now() - 9000000 },
      { id: "p3", coordinates: [48.8861, 2.3388], timestamp: Date.now() - 7200000 },
    ],
    distance: 5.8,
    duration: 92,
    thumbnail: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=200&h=200&fit=crop",
  },
];

export const RoutesProvider = ({ children }: { children: ReactNode }) => {
  const [routes, setRoutes] = useState<SavedRoute[]>(() => {
    const fromStorage = safeParseRoutes(localStorage.getItem(STORAGE_KEY));
    return fromStorage ?? initialRoutes;
  });
  const [currentRoute, setCurrentRoute] = useState<RoutePoint[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);

  // Save routes to localStorage whenever they change
  useEffect(() => {
    const safe = sanitizeRoutesForStorage(routes);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
  }, [routes]);

  const addRoute = useCallback((route: SavedRoute) => {
    setRoutes((prev) => [route, ...prev]);
  }, []);

  const deleteRoute = useCallback((id: string) => {
    setRoutes((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateRoute = useCallback((id: string, updates: Partial<SavedRoute>) => {
    setRoutes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  }, []);

  const addPointToCurrentRoute = useCallback((point: RoutePoint) => {
    setCurrentRoute((prev) => [...prev, point]);
  }, []);

  const clearCurrentRoute = useCallback(() => {
    setCurrentRoute([]);
  }, []);

  const startRecording = useCallback(() => {
    setIsRecording(true);
    setCurrentRoute([]);
    setRecordingStartTime(Date.now());
  }, []);

  const stopRecording = useCallback((): SavedRoute | null => {
    setIsRecording(false);
    
    if (currentRoute.length < 2) {
      setCurrentRoute([]);
      setRecordingStartTime(null);
      return null;
    }

    const duration = recordingStartTime
      ? Math.floor((Date.now() - recordingStartTime) / 60000)
      : 0;

    // Calculate distance
    let distance = 0;
    for (let i = 1; i < currentRoute.length; i++) {
      const [lat1, lon1] = currentRoute[i - 1].coordinates;
      const [lat2, lon2] = currentRoute[i].coordinates;
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
      distance += R * c;
    }

    const newRoute: SavedRoute = {
      id: `route-${Date.now()}`,
      name: `Маршрут ${new Date().toLocaleDateString("ru-RU")}`,
      city: "Текущее местоположение",
      date: new Date().toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      transportType: "walk",
      points: [...currentRoute],
      distance: Math.round(distance * 100) / 100,
      duration,
    };

    addRoute(newRoute);
    setCurrentRoute([]);
    setRecordingStartTime(null);
    
    return newRoute;
  }, [currentRoute, recordingStartTime, addRoute]);

  const addMediaToPoint = useCallback(
    (routeId: string, pointId: string, media: { type: "photo" | "video"; url: string; caption?: string }) => {
      setRoutes((prev) =>
        prev.map((route) => {
          if (route.id !== routeId) return route;
          return {
            ...route,
            points: route.points.map((point) => {
              if (point.id !== pointId) return point;
              return {
                ...point,
                media: [...(point.media || []), { ...media }],
              };
            }),
          };
        })
      );
    },
    []
  );

  const getRoute = useCallback(
    (id: string) => routes.find((r) => r.id === id),
    [routes]
  );

  return (
    <RoutesContext.Provider
      value={{
        routes,
        currentRoute,
        isRecording,
        addRoute,
        deleteRoute,
        updateRoute,
        addPointToCurrentRoute,
        clearCurrentRoute,
        startRecording,
        stopRecording,
        addMediaToPoint,
        getRoute,
      }}
    >
      {children}
    </RoutesContext.Provider>
  );
};

export const useRoutes = () => {
  const context = useContext(RoutesContext);
  if (!context) {
    throw new Error("useRoutes must be used within a RoutesProvider");
  }
  return context;
};
