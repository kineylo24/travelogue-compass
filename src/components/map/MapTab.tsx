import { useState, useRef, useCallback } from "react";
import { Search, Navigation, Car, Footprints, Bike, Bus, X, MapPin, Flag, Check, ArrowLeft, Camera, Play, Image as ImageIcon, Trash2, Edit2 } from "lucide-react";
import MapboxMap, { MapboxMapRef } from "./MapboxMap";
import { useRoutes, SavedRoute, RoutePoint } from "@/contexts/RoutesContext";
import { Destination } from "@/types/routes";
import { toast } from "@/components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TransportType = "walk" | "bike" | "car" | "transit";

interface MapTabProps {
  onViewRoute?: (route: SavedRoute) => void;
  viewingRoute?: SavedRoute | null;
  onBackFromRoute?: () => void;
}

const MapTab = ({ onViewRoute, viewingRoute, onBackFromRoute }: MapTabProps) => {
  const [isRouting, setIsRouting] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [transportType, setTransportType] = useState<TransportType>("walk");
  const [distance, setDistance] = useState(0);
  const [time, setTime] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ name: string; address: string; coordinates: [number, number] }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [destination, setDestination] = useState<Destination | null>(null);
  const [destinationInfo, setDestinationInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [destinationRoutes, setDestinationRoutes] = useState<{ index: number; distance: number; duration: number }[]>([]);
  const [selectedDestinationRouteIndex, setSelectedDestinationRouteIndex] = useState(0);

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [routeName, setRouteName] = useState("");
  const [routeCity, setRouteCity] = useState("");

  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [showMediaDialog, setShowMediaDialog] = useState(false);
  const [mediaCaption, setMediaCaption] = useState("");
  const [highlightPointId, setHighlightPointId] = useState<string | null>(null);
  const mapRef = useRef<MapboxMapRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedPoint = viewingRoute?.points.find((p) => p.id === selectedPointId) ?? null;
  const transportOptions = [
    { id: "walk" as TransportType, icon: Footprints, label: "Пешком" },
    { id: "bike" as TransportType, icon: Bike, label: "Велосипед" },
    { id: "car" as TransportType, icon: Car, label: "Авто" },
    { id: "transit" as TransportType, icon: Bus, label: "Транспорт" },
  ];

  const { stopRecording, startRecording, addMediaToPoint, updateRoute } = useRoutes();

  const handleStartRoute = () => {
    console.log("[MapTab] start recording");
    startRecording();
    setIsRouting(true);
    setDistance(0);
    setTime(0);
    setDestination(null);
    setDestinationInfo(null);
  };

  const handleEndRoute = () => {
    console.log("[MapTab] end recording (open save dialog)");
    setIsRouting(false);
    setShowSaveDialog(true);
  };

  const handleSaveRoute = () => {
    console.log("[MapTab] save recording");
    const savedRoute = stopRecording();

    if (!savedRoute) {
      toast("Маршрут не сохранён", {
        description: "Нужно минимум 2 GPS-точки. Нажмите «Начать маршрут», пройдите немного и попробуйте снова.",
      });
      setShowSaveDialog(false);
      setRouteName("");
      setRouteCity("");
      return;
    }

    updateRoute(savedRoute.id, {
      name: routeName || savedRoute.name,
      city: routeCity || savedRoute.city,
      transportType,
    });

    setShowSaveDialog(false);
    setRouteName("");
    setRouteCity("");
  };

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim() || !mapRef.current) return;

    setIsSearching(true);
    const results = await mapRef.current.searchPlaces(query);
    setSearchResults(results);
    setIsSearching(false);
  }, []);

  const handleSelectDestination = (result: { name: string; address: string; coordinates: [number, number] }) => {
    setDestination({
      name: result.name,
      address: result.address,
      coordinates: result.coordinates,
    });
    setDestinationInfo(null);
    setDestinationRoutes([]);
    setSelectedDestinationRouteIndex(0);

    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleDestinationRoutesReady = (routes: { index: number; distance: number; duration: number }[]) => {
    setDestinationRoutes(routes);
    setSelectedDestinationRouteIndex(0);
  };

  const handleDestinationRouteReady = (dist: number, dur: number) => {
    setDestinationInfo({ distance: dist, duration: dur });
  };

  const handleDestinationRouteError = (message: string) => {
    setDestinationInfo(null);
    setDestinationRoutes([]);
    toast("Не удалось построить маршрут", { description: message });
  };

  const handleClearDestination = () => {
    setDestination(null);
    setDestinationInfo(null);
    setDestinationRoutes([]);
    setSelectedDestinationRouteIndex(0);
    mapRef.current?.clearDestinationRoute();
  };

  const handlePointClick = (point: RoutePoint) => {
    setSelectedPointId(point.id);
    setShowMediaDialog(true);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPointId || !viewingRoute) return;

    const url = URL.createObjectURL(file);
    const type = file.type.startsWith("video") ? "video" : "photo";

    addMediaToPoint(viewingRoute.id, selectedPointId, {
      type,
      url,
      caption: mediaCaption,
    });

    // show preview card above the marker on the map
    setHighlightPointId(selectedPointId);

    setMediaCaption("");
    setShowMediaDialog(false);
    setSelectedPointId(null);

    // clear the file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.accept = "image/*,video/*";
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] bg-background relative overflow-hidden pb-safe">
      <MapboxMap
        ref={mapRef}
        isRouting={isRouting}
        transportType={transportType}
        onDistanceUpdate={setDistance}
        onTimeUpdate={setTime}
        destination={destination}
        onDestinationRoutesReady={handleDestinationRoutesReady}
        onDestinationRouteReady={handleDestinationRouteReady}
        onDestinationRouteError={handleDestinationRouteError}
        selectedDestinationRouteIndex={selectedDestinationRouteIndex}
        viewingRoute={viewingRoute}
        onPointClick={handlePointClick}
        highlightPointId={highlightPointId}
      />

      {/* Back button when viewing route */}
      {viewingRoute && (
        <div className="absolute top-4 left-4 z-[1100]">
          <button
            onClick={onBackFromRoute}
            className="map-button flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            <span>Назад</span>
          </button>
        </div>
      )}

      {/* Viewing route info */}
      {viewingRoute && (
        <div className="absolute bottom-8 left-4 right-4 z-[1100]">
          <div className="ios-card-lg p-4">
            <h3 className="font-semibold text-foreground mb-1">{viewingRoute.name}</h3>
            <p className="text-sm text-muted-foreground mb-3">{viewingRoute.city} • {viewingRoute.date}</p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Расстояние</span>
              <span className="font-semibold text-foreground">{viewingRoute.distance} км</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-muted-foreground">Время</span>
              <span className="font-semibold text-foreground">{viewingRoute.duration} мин</span>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Нажмите на точку маршрута, чтобы добавить фото или видео
            </p>
          </div>
        </div>
      )}

      {/* Floating search bar */}
      {!viewingRoute && (
        <div className="absolute top-4 left-4 right-4 safe-area-inset-top z-[1100]">
          <button
            onClick={() => setShowSearch(true)}
            className="w-full map-button flex items-center gap-3"
          >
            <Search size={18} className="text-muted-foreground" />
            <span className="text-muted-foreground">
              {destination ? destination.name : "Куда вы хотите пойти?"}
            </span>
            {destination && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleClearDestination(); }}
                className="ml-auto p-1"
              >
                <X size={16} className="text-muted-foreground" />
              </button>
            )}
          </button>
        </div>
      )}

      {/* Destination info card */}
      {destination && destinationInfo && !isRouting && !viewingRoute && (
        <div className="absolute top-20 left-4 right-4 z-[1100]">
          <div className="ios-card-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-foreground">{destination.name}</h3>
                <p className="text-sm text-muted-foreground">{destination.address}</p>
              </div>
              <button
                onClick={handleClearDestination}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {destinationRoutes.length > 1 && (
              <div className="mb-3">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {destinationRoutes.map((r) => {
                    const isActive = r.index === selectedDestinationRouteIndex;
                    return (
                      <button
                        key={r.index}
                        onClick={() => {
                          setSelectedDestinationRouteIndex(r.index);
                          setDestinationInfo({ distance: r.distance, duration: r.duration });
                        }}
                        className={`shrink-0 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        Маршрут {r.index + 1} • {r.distance.toFixed(1)} км
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-4 text-sm mb-3">
              <div>
                <span className="text-muted-foreground">Расстояние: </span>
                <span className="font-semibold text-foreground">{destinationInfo.distance.toFixed(1)} км</span>
              </div>
              <div>
                <span className="text-muted-foreground">Время: </span>
                <span className="font-semibold text-foreground">{destinationInfo.duration} мин</span>
              </div>
            </div>
            <div className="flex gap-2">
              {transportOptions.map((option) => {
                const Icon = option.icon;
                const isActive = transportType === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => setTransportType(option.id)}
                    className={`flex-1 py-2 rounded-xl flex flex-col items-center gap-1 transition-all ${
                      isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon size={18} />
                    <span className="text-xs">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Start/End route button */}
      {!viewingRoute && (
        <div className="absolute top-20 right-4 z-[1100]">
          {!destination && (
            !isRouting ? (
              <button
                onClick={handleStartRoute}
                className="map-button gradient-primary text-primary-foreground flex items-center gap-2"
              >
                <Navigation size={18} />
                <span>Начать маршрут</span>
              </button>
            ) : (
              <button
                onClick={handleEndRoute}
                className="map-button bg-destructive text-destructive-foreground flex items-center gap-2"
              >
                <Flag size={18} />
                <span>Завершить</span>
              </button>
            )
          )}
        </div>
      )}

      {/* Transport type selector when routing */}
      {isRouting && (
        <div className="absolute bottom-8 left-4 right-4 z-[1100] animate-slide-up">
          <div className="ios-card-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-sm font-medium text-foreground">Маршрут записывается...</span>
            </div>
            <div className="flex gap-2">
              {transportOptions.map((option) => {
                const Icon = option.icon;
                const isActive = transportType === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => setTransportType(option.id)}
                    className={`flex-1 py-2.5 rounded-xl flex flex-col items-center gap-1 transition-all ${
                      isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-xs">{option.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Пройдено</span>
                <span className="font-semibold text-foreground">{distance.toFixed(2)} км</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Время</span>
                <span className="font-semibold text-foreground">{time} мин</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-background z-50 animate-fade-in">
          <div className="p-4 safe-area-inset-top">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-muted rounded-xl px-4 py-3 flex items-center gap-2">
                <Search size={18} className="text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Поиск места"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value.length > 2) {
                      handleSearch(e.target.value);
                    }
                  }}
                  className="bg-transparent flex-1 outline-none text-foreground placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>
              <button onClick={() => { setShowSearch(false); setSearchQuery(""); setSearchResults([]); }} className="p-2">
                <X size={24} className="text-foreground" />
              </button>
            </div>
            
            <div className="mt-6">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((result, i) => (
                    <button 
                      key={i}
                      onClick={() => handleSelectDestination(result)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors"
                    >
                      <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
                        <MapPin size={18} className="text-accent-foreground" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-foreground">{result.name}</p>
                        <p className="text-sm text-muted-foreground">{result.address}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Популярные места</h3>
                  <div className="space-y-2">
                    {[
                      { name: "Красная площадь", address: "Москва, Россия", coordinates: [37.6208, 55.7539] as [number, number] },
                      { name: "Эрмитаж", address: "Санкт-Петербург, Россия", coordinates: [30.3146, 59.9398] as [number, number] },
                      { name: "Парк Горького", address: "Москва, Россия", coordinates: [37.6032, 55.7312] as [number, number] },
                    ].map((place, i) => (
                      <button 
                        key={i}
                        onClick={() => handleSelectDestination(place)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors"
                      >
                        <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
                          <MapPin size={18} className="text-accent-foreground" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-foreground">{place.name}</p>
                          <p className="text-sm text-muted-foreground">{place.address}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save route dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Сохранить маршрут</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Название маршрута</label>
              <input
                type="text"
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                placeholder="Например: Прогулка по центру"
                className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Город</label>
              <input
                type="text"
                value={routeCity}
                onChange={(e) => setRouteCity(e.target.value)}
                placeholder="Например: Москва"
                className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 py-3 rounded-xl bg-muted text-foreground font-medium"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveRoute}
                className="flex-1 py-3 rounded-xl gradient-primary text-primary-foreground font-medium flex items-center justify-center gap-2"
              >
                <Check size={18} />
                Сохранить
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Media dialog for route point */}
      <Dialog open={showMediaDialog} onOpenChange={setShowMediaDialog}>
        <DialogContent className="sm:max-w-md max-h-[70vh] overflow-y-auto z-[10000]">
          <DialogHeader>
            <DialogTitle>Медиа для точки маршрута</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {selectedPoint?.media && selectedPoint.media.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Прикреплённые медиа</h4>
                <div className="grid grid-cols-3 gap-2">
                  {selectedPoint.media.map((m, idx) => (
                    <div key={idx} className="aspect-square rounded-lg overflow-hidden relative">
                      {m.type === "photo" ? (
                        <img src={m.url} alt={m.caption || ""} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Play size={24} className="text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Добавить подпись</label>
              <input
                type="text"
                value={mediaCaption}
                onChange={(e) => setMediaCaption(e.target.value)}
                placeholder="Описание фото или видео"
                className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary mb-3"
              />
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div className="flex gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-3 rounded-xl bg-accent text-accent-foreground font-medium flex items-center justify-center gap-2"
              >
                <Camera size={18} />
                Добавить фото
              </button>
              <button
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = "video/*";
                    fileInputRef.current.click();
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-accent text-accent-foreground font-medium flex items-center justify-center gap-2"
              >
                <Play size={18} />
                Добавить видео
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MapTab;
