import { Home, Compass, Map, MessageCircle, User } from "lucide-react";

type TabType = "home" | "travels" | "map" | "chats" | "profile";

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  const tabs = [
    { id: "home" as TabType, icon: Home, label: "Дом" },
    { id: "travels" as TabType, icon: Compass, label: "Путешествия" },
    { id: "map" as TabType, icon: Map, label: "Карта" },
    { id: "chats" as TabType, icon: MessageCircle, label: "Чаты" },
    { id: "profile" as TabType, icon: User, label: "Профиль" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-nav-bg/95 ios-blur border-t border-nav-border safe-area-inset-bottom z-50">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`nav-item ${isActive ? "nav-item-active" : "nav-item-inactive"}`}
            >
              <Icon 
                size={24} 
                strokeWidth={isActive ? 2.5 : 2}
                className="transition-all duration-200"
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
