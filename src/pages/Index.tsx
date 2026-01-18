import { useState } from "react";
import BottomNav from "@/components/layout/BottomNav";
import HomeTab from "@/components/home/HomeTab";
import TravelsTab from "@/components/travels/TravelsTab";
import MapTab from "@/components/map/MapTab";
import ChatsTab from "@/components/chats/ChatsTab";
import ProfileTab from "@/components/profile/ProfileTab";
import { RoutesProvider, SavedRoute } from "@/contexts/RoutesContext";

type TabType = "home" | "travels" | "map" | "chats" | "profile";

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [viewingRoute, setViewingRoute] = useState<SavedRoute | null>(null);

  const handleViewRoute = (route: SavedRoute) => {
    setViewingRoute(route);
    setActiveTab("map");
  };

  const handleBackFromRoute = () => {
    setViewingRoute(null);
    setActiveTab("travels");
  };

  const renderTab = () => {
    switch (activeTab) {
      case "home":
        return <HomeTab />;
      case "travels":
        return <TravelsTab onViewRoute={handleViewRoute} />;
      case "map":
        return (
          <MapTab 
            viewingRoute={viewingRoute} 
            onBackFromRoute={handleBackFromRoute}
          />
        );
      case "chats":
        return <ChatsTab />;
      case "profile":
        return <ProfileTab />;
      default:
        return <HomeTab />;
    }
  };

  return (
    <RoutesProvider>
      <div className="min-h-screen bg-background max-w-md mx-auto relative overflow-hidden">
        <div className="relative min-h-screen">
          {renderTab()}
          <BottomNav activeTab={activeTab} onTabChange={(tab) => {
            setActiveTab(tab);
            if (tab !== "map") {
              setViewingRoute(null);
            }
          }} />
        </div>
      </div>
    </RoutesProvider>
  );
};

export default Index;
