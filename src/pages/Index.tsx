import { useState } from "react";
import BottomNav from "@/components/layout/BottomNav";
import HomeTab from "@/components/home/HomeTab";
import TravelsTab from "@/components/travels/TravelsTab";
import MapTab from "@/components/map/MapTab";
import ChatsTab from "@/components/chats/ChatsTab";
import ProfileTab from "@/components/profile/ProfileTab";

type TabType = "home" | "travels" | "map" | "chats" | "profile";

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabType>("home");

  const renderTab = () => {
    switch (activeTab) {
      case "home":
        return <HomeTab />;
      case "travels":
        return <TravelsTab />;
      case "map":
        return <MapTab />;
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
      {/* iPhone-style container */}
      <div className="relative min-h-screen">
        {renderTab()}
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
};

export default Index;
