import { useState } from "react";
import { Plus, Cloud, DollarSign, Phone, Smartphone, Map, MoreHorizontal, ChevronRight } from "lucide-react";

type SubTab = "notes" | "maps";

const widgets = [
  { id: 1, type: "weather", icon: Cloud, title: "Погода", value: "24°C", subtitle: "Барселона", color: "bg-widget-weather" },
  { id: 2, type: "currency", icon: DollarSign, title: "Курс", value: "1€ = 98₽", subtitle: "Обменник рядом", color: "bg-widget-currency" },
  { id: 3, type: "emergency", icon: Phone, title: "Экстренные", value: "112", subtitle: "Единый номер", color: "bg-widget-emergency" },
  { id: 4, type: "sim", icon: Smartphone, title: "eSIM", value: "от €5", subtitle: "Airalo, Holafly", color: "bg-widget-sim" },
];

const savedNotes = [
  { id: 1, city: "Барселона", country: "Испания", date: "15 янв 2024", widgets: 4 },
  { id: 2, city: "Токио", country: "Япония", date: "3 дек 2023", widgets: 6 },
];

const savedMaps = [
  { id: 1, name: "Готический квартал", city: "Барселона", points: 12, distance: "4.2 км", image: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=200&h=200&fit=crop" },
  { id: 2, name: "Сибуя и Харадзюку", city: "Токио", points: 8, distance: "3.1 км", image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=200&h=200&fit=crop" },
  { id: 3, name: "Монмартр", city: "Париж", points: 15, distance: "5.8 км", image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=200&h=200&fit=crop" },
];

const TravelsTab = () => {
  const [subTab, setSubTab] = useState<SubTab>("notes");
  const [showNewNote, setShowNewNote] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-background/95 ios-blur z-40 border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-xl font-bold">Путешествия</h1>
          <button onClick={() => setShowNewNote(true)} className="p-2 -mr-2">
            <Plus size={24} className="text-primary" />
          </button>
        </div>
        
        {/* Sub tabs */}
        <div className="flex gap-2 px-4 pb-3">
          <button
            onClick={() => setSubTab("notes")}
            className={`tab-pill ${subTab === "notes" ? "tab-pill-active" : "tab-pill-inactive"}`}
          >
            Заметки
          </button>
          <button
            onClick={() => setSubTab("maps")}
            className={`tab-pill ${subTab === "maps" ? "tab-pill-active" : "tab-pill-inactive"}`}
          >
            Мои Карты
          </button>
        </div>
      </header>

      {/* New Note Modal */}
      {showNewNote && (
        <div className="fixed inset-0 bg-background z-50 animate-fade-in">
          <div className="p-4">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setShowNewNote(false)} className="text-primary font-medium">
                Отмена
              </button>
              <h2 className="text-lg font-semibold">Новая заметка</h2>
              <button className="text-primary font-medium">Создать</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Страна</label>
                <input
                  type="text"
                  placeholder="Введите страну"
                  className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Город</label>
                <input
                  type="text"
                  placeholder="Введите город"
                  className="w-full bg-muted rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Выберите виджеты</label>
                <div className="grid grid-cols-2 gap-3">
                  {widgets.map((widget) => {
                    const Icon = widget.icon;
                    return (
                      <button
                        key={widget.id}
                        className="widget-card flex items-center gap-3 text-left hover:ring-2 hover:ring-primary transition-all"
                      >
                        <div className={`w-10 h-10 ${widget.color} rounded-xl flex items-center justify-center`}>
                          <Icon size={20} className="text-primary-foreground" />
                        </div>
                        <span className="text-sm font-medium text-foreground">{widget.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === "notes" ? (
        <div className="p-4 space-y-4">
          {/* Active widgets demo */}
          <div className="ios-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">Барселона, Испания</h3>
              <button className="text-muted-foreground">
                <MoreHorizontal size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {widgets.map((widget) => {
                const Icon = widget.icon;
                return (
                  <div key={widget.id} className="widget-card">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-8 h-8 ${widget.color} rounded-lg flex items-center justify-center`}>
                        <Icon size={16} className="text-primary-foreground" />
                      </div>
                      <span className="text-xs text-muted-foreground">{widget.title}</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">{widget.value}</p>
                    <p className="text-xs text-muted-foreground">{widget.subtitle}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Saved notes */}
          <h3 className="font-semibold text-foreground pt-2">Сохранённые заметки</h3>
          {savedNotes.map((note) => (
            <button key={note.id} className="ios-card w-full p-4 flex items-center gap-3 text-left">
              <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center">
                <span className="text-xl">📝</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{note.city}, {note.country}</p>
                <p className="text-sm text-muted-foreground">{note.widgets} виджетов • {note.date}</p>
              </div>
              <ChevronRight size={20} className="text-muted-foreground" />
            </button>
          ))}
        </div>
      ) : (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {savedMaps.map((map) => (
              <button key={map.id} className="ios-card overflow-hidden text-left">
                <div className="aspect-square relative">
                  <img src={map.image} alt={map.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-sm font-semibold text-primary-foreground">{map.name}</p>
                    <p className="text-xs text-primary-foreground/80">{map.city}</p>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Map size={12} />
                    <span>{map.points} точек</span>
                    <span>•</span>
                    <span>{map.distance}</span>
                  </div>
                </div>
              </button>
            ))}
            
            {/* Add new map card */}
            <button className="ios-card aspect-square flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border">
              <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
                <Plus size={24} className="text-accent-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Добавить маршрут</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelsTab;
