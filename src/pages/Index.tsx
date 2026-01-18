import { useState } from "react";
import BottomNav from "@/components/layout/BottomNav";
import HomeTab from "@/components/home/HomeTab";
import TravelsTab from "@/components/travels/TravelsTab";
import MapTab from "@/components/map/MapTab";
import ChatsTab from "@/components/chats/ChatsTab";
import ProfileTab from "@/components/profile/ProfileTab";
import { RoutesProvider, SavedRoute, useRoutes } from "@/contexts/RoutesContext";

type TabType = "home" | "travels" | "map" | "chats" | "profile";

const IndexInner = () => {
  const { getRoute } = useRoutes();

  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [viewingRouteId, setViewingRouteId] = useState<string | null>(null);

  const viewingRoute = viewingRouteId ? getRoute(viewingRouteId) ?? null : null;

  const handleViewRoute = (route: SavedRoute) => {
    setViewingRouteId(route.id);
    setActiveTab("map");
  };

  const handleBackFromRoute = () => {
    setViewingRouteId(null);
    setActiveTab("travels");
  };

  const renderTab = () => {
    switch (activeTab) {
      case "home":
        return <HomeTab />;
      case "travels":
        return <TravelsTab onViewRoute={handleViewRoute} />;
      case "map":
        return <MapTab viewingRoute={viewingRoute} onBackFromRoute={handleBackFromRoute} />;
      case "chats":
        return <ChatsTab />;
      case "profile":
        return <ProfileTab />;
      default:
        return <HomeTab />;
    }
  };

  return (
    <div className="min-h-screen bg-background max-w-md mx-auto relative overflow-hidden">
      <div className="relative min-h-screen">
        {renderTab()}
        <BottomNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            if (tab !== "map") {
              setViewingRouteId(null);
            }
          }}
        />
      </div>
    </div>
  );
};

const Index = () => {
  return (
    <RoutesProvider>
      <IndexInner />
    </RoutesProvider>
  );
};

export default Index;
