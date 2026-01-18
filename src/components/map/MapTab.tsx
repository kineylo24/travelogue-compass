import { useState } from "react";
import { Search, Navigation, Car, Footprints, Bike, Bus, X, MapPin, Flag } from "lucide-react";
import YandexMap from "./YandexMap";

type TransportType = "walk" | "bike" | "car" | "transit";

const MapTab = () => {
  const [isRouting, setIsRouting] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [transportType, setTransportType] = useState<TransportType>("walk");
  const [distance, setDistance] = useState(0);
  const [time, setTime] = useState(0);

  const transportOptions = [
    { id: "walk" as TransportType, icon: Footprints, label: "Пешком" },
    { id: "bike" as TransportType, icon: Bike, label: "Велосипед" },
    { id: "car" as TransportType, icon: Car, label: "Авто" },
    { id: "transit" as TransportType, icon: Bus, label: "Транспорт" },
  ];

  const handleStartRoute = () => {
    setIsRouting(true);
    setDistance(0);
    setTime(0);
  };

  const handleEndRoute = () => {
    setIsRouting(false);
    // Here you could save the route to "My Maps"
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Yandex Map */}
      <YandexMap
        isRouting={isRouting}
        transportType={transportType}
        onDistanceUpdate={setDistance}
        onTimeUpdate={setTime}
      />

      {/* Floating search bar */}
      <div className="absolute top-4 left-4 right-4 safe-area-inset-top z-10">
        <button
          onClick={() => setShowSearch(true)}
          className="w-full map-button flex items-center gap-3"
        >
          <Search size={18} className="text-muted-foreground" />
          <span className="text-muted-foreground">Куда вы хотите пойти?</span>
        </button>
      </div>

      {/* Start/End route button */}
      <div className="absolute top-20 right-4 z-10">
        {!isRouting ? (
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
        )}
      </div>

      {/* Transport type selector when routing */}
      {isRouting && (
        <div className="absolute bottom-24 left-4 right-4 z-10 animate-slide-up">
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
                  className="bg-transparent flex-1 outline-none text-foreground placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>
              <button onClick={() => setShowSearch(false)} className="p-2">
                <X size={24} className="text-foreground" />
              </button>
            </div>
            
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Популярные места</h3>
              <div className="space-y-2">
                {[
                  { name: "Саграда Фамилия", address: "Carrer de Mallorca, 401" },
                  { name: "Парк Гуэль", address: "Carrer d'Olot, s/n" },
                  { name: "Дом Бальо", address: "Passeig de Gràcia, 43" },
                ].map((place, i) => (
                  <button 
                    key={i}
                    onClick={() => setShowSearch(false)}
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
            </div>
          </div>
        </div>
      )}

      {/* Map markers - removed since we have real user location now */}
    </div>
  );
};

export default MapTab;
