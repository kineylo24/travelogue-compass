import { useState } from "react";
import { Plus, Settings, Grid3X3, Play, Map, MapPin, Calendar, Camera } from "lucide-react";

type ProfileSubTab = "posts" | "reels" | "routes" | "map";

const highlights = [
  { id: 1, name: "Испания", emoji: "🇪🇸" },
  { id: 2, name: "Япония", emoji: "🇯🇵" },
  { id: 3, name: "Франция", emoji: "🇫🇷" },
  { id: 4, name: "Италия", emoji: "🇮🇹" },
];

const posts = [
  "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=300&h=300&fit=crop",
  "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=300&h=300&fit=crop",
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=300&h=300&fit=crop",
  "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=300&h=300&fit=crop",
  "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=300&h=300&fit=crop",
  "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=300&h=300&fit=crop",
];

const visitedCountries = [
  { code: "ES", name: "Испания", x: 35, y: 45 },
  { code: "JP", name: "Япония", x: 85, y: 40 },
  { code: "FR", name: "Франция", x: 40, y: 42 },
  { code: "IT", name: "Италия", x: 45, y: 45 },
  { code: "PT", name: "Португалия", x: 32, y: 47 },
];

const ProfileTab = () => {
  const [subTab, setSubTab] = useState<ProfileSubTab>("posts");
  const [showAddMenu, setShowAddMenu] = useState(false);
  const daysSinceRegistration = 247;

  const tabs = [
    { id: "posts" as ProfileSubTab, icon: Grid3X3 },
    { id: "reels" as ProfileSubTab, icon: Play },
    { id: "routes" as ProfileSubTab, icon: Map },
    { id: "map" as ProfileSubTab, icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-background/95 ios-blur z-40 border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => setShowAddMenu(true)} className="p-2 -ml-2">
            <Plus size={24} className="text-foreground" />
          </button>
          <h1 className="text-xl font-bold">anna_traveler</h1>
          <button className="p-2 -mr-2">
            <Settings size={24} className="text-foreground" />
          </button>
        </div>
      </header>

      {/* Add menu modal */}
      {showAddMenu && (
        <div className="fixed inset-0 bg-foreground/50 z-50" onClick={() => setShowAddMenu(false)}>
          <div 
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-6" />
            <h3 className="text-lg font-semibold text-foreground mb-4">Создать</h3>
            <div className="grid grid-cols-4 gap-4">
              {[
                { icon: "📷", label: "История" },
                { icon: "📝", label: "Запись" },
                { icon: "🗺️", label: "Маршрут" },
                { icon: "🎬", label: "Reels" },
              ].map((item, i) => (
                <button key={i} className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center text-2xl">
                    {item.icon}
                  </div>
                  <span className="text-xs text-foreground">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Profile info */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar with plus button */}
          <div className="relative">
            <button className="story-ring rounded-full">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-background">
                <img 
                  src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop" 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              </div>
            </button>
            <button className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center border-2 border-background">
              <Camera size={14} className="text-primary-foreground" />
            </button>
          </div>

          {/* Name and location */}
          <div className="flex-1 pt-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-foreground">Анна Иванова</h2>
              {/* Days counter calendar */}
              <div className="flex items-center gap-1 bg-accent px-2 py-1 rounded-lg animate-calendar-flip">
                <Calendar size={12} className="text-accent-foreground" />
                <span className="text-xs font-semibold text-accent-foreground">{daysSinceRegistration} дн</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">🌍 5 стран • 📍 Барселона</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-around mt-6 py-3 border-y border-border">
          <div className="profile-stat">
            <span className="profile-stat-value">48</span>
            <span className="profile-stat-label">Постов</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-value">1.2K</span>
            <span className="profile-stat-label">Подписчиков</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-value">892</span>
            <span className="profile-stat-label">Подписок</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-value">12</span>
            <span className="profile-stat-label">Маршрутов</span>
          </div>
        </div>

        {/* Highlights - Stories */}
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Актуальное</h3>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {highlights.map((highlight) => (
              <div key={highlight.id} className="flex flex-col items-center gap-1 min-w-[68px]">
                <div className="w-16 h-16 rounded-full border-2 border-border flex items-center justify-center bg-muted text-2xl">
                  {highlight.emoji}
                </div>
                <span className="text-xs text-foreground">{highlight.name}</span>
              </div>
            ))}
            <div className="flex flex-col items-center gap-1 min-w-[68px]">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-border flex items-center justify-center">
                <Plus size={24} className="text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">Добавить</span>
            </div>
          </div>
        </div>

        {/* Highlights - Maps */}
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Избранные маршруты</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[
              { name: "Готический квартал", image: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=150&h=150&fit=crop" },
              { name: "Сибуя", image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=150&h=150&fit=crop" },
            ].map((route, i) => (
              <div key={i} className="min-w-[120px]">
                <div className="w-full aspect-video rounded-xl overflow-hidden">
                  <img src={route.image} alt={route.name} className="w-full h-full object-cover" />
                </div>
                <p className="text-xs text-foreground mt-1 truncate">{route.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sub tabs */}
      <div className="flex border-t border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`flex-1 py-3 flex justify-center border-b-2 transition-colors ${
                isActive ? "border-foreground" : "border-transparent"
              }`}
            >
              <Icon size={22} className={isActive ? "text-foreground" : "text-muted-foreground"} />
            </button>
          );
        })}
      </div>

      {/* Content based on subtab */}
      {subTab === "posts" && (
        <div className="grid grid-cols-3 gap-0.5">
          {posts.map((post, i) => (
            <div key={i} className="aspect-square">
              <img src={post} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {subTab === "reels" && (
        <div className="grid grid-cols-3 gap-0.5">
          {posts.slice(0, 3).map((post, i) => (
            <div key={i} className="aspect-[9/16] relative">
              <img src={post} alt="" className="w-full h-full object-cover" />
              <div className="absolute bottom-2 left-2 flex items-center gap-1 text-primary-foreground">
                <Play size={14} fill="currentColor" />
                <span className="text-xs font-medium">{Math.floor(Math.random() * 50 + 10)}K</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === "routes" && (
        <div className="p-4 grid grid-cols-2 gap-3">
          {[
            { name: "Готический квартал", city: "Барселона", image: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=200&h=200&fit=crop" },
            { name: "Сибуя", city: "Токио", image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=200&h=200&fit=crop" },
            { name: "Монмартр", city: "Париж", image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=200&h=200&fit=crop" },
          ].map((route, i) => (
            <div key={i} className="ios-card overflow-hidden">
              <div className="aspect-video">
                <img src={route.image} alt={route.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-3">
                <p className="font-medium text-foreground text-sm">{route.name}</p>
                <p className="text-xs text-muted-foreground">{route.city}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === "map" && (
        <div className="p-4">
          <div className="ios-card p-4">
            <h3 className="font-semibold text-foreground mb-3">Карта путешествий</h3>
            {/* Simplified world map */}
            <div className="relative w-full aspect-[2/1] bg-accent rounded-xl overflow-hidden">
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 500'%3E%3Cpath fill='%23666' d='M200 150 L400 100 L450 200 L350 250 L200 200 Z M500 100 L700 80 L750 180 L600 220 L480 150 Z M100 300 L200 280 L180 350 L100 340 Z M700 200 L900 180 L920 350 L750 380 L680 280 Z M400 250 L550 230 L580 350 L450 380 L380 320 Z'/%3E%3C/svg%3E")`,
                }}
              />
              {visitedCountries.map((country) => (
                <div
                  key={country.code}
                  className="absolute w-4 h-4"
                  style={{ left: `${country.x}%`, top: `${country.y}%` }}
                >
                  <div className="w-full h-full bg-primary rounded-full animate-pulse shadow-lg" />
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {visitedCountries.map((country) => (
                <span key={country.code} className="text-xs bg-muted px-2 py-1 rounded-full text-foreground">
                  {country.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileTab;
