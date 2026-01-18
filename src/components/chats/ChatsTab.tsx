import { useState } from "react";
import { Search, Edit, Check, CheckCheck, Pin, Volume2, ChevronLeft, Send, Smile, Paperclip } from "lucide-react";

interface Chat {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  isPinned?: boolean;
  isMuted?: boolean;
  isChannel?: boolean;
  isRead?: boolean;
}

const chats: Chat[] = [
  { id: 1, name: "Путешественники 🌍", avatar: "🌍", lastMessage: "Алексей: Кто был в Португалии?", time: "14:23", unread: 5, isPinned: true, isChannel: true },
  { id: 2, name: "Марина", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop", lastMessage: "Отправила тебе маршрут!", time: "12:45", unread: 2 },
  { id: 3, name: "Барселона Tips", avatar: "🇪🇸", lastMessage: "Новый пост: Лучшие тапас-бары", time: "11:30", unread: 0, isChannel: true, isRead: true },
  { id: 4, name: "Алексей", avatar: "https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=100&h=100&fit=crop", lastMessage: "Фото просто огонь! 🔥", time: "Вчера", unread: 0, isRead: true },
  { id: 5, name: "Семья", avatar: "👨‍👩‍👧‍👦", lastMessage: "Мама: Как долетели?", time: "Вчера", unread: 0, isMuted: true },
  { id: 6, name: "Japan Travel", avatar: "🇯🇵", lastMessage: "Советы по JR Pass...", time: "Пн", unread: 0, isChannel: true },
];

const messages = [
  { id: 1, text: "Привет! Как тебе Барселона?", time: "10:30", isOwn: false },
  { id: 2, text: "Привет! Просто невероятно! Уже была в Саграда Фамилия и парке Гуэль", time: "10:32", isOwn: true },
  { id: 3, text: "Отправила тебе маршрут!", time: "12:45", isOwn: false },
];

const ChatsTab = () => {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [message, setMessage] = useState("");

  if (selectedChat) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Chat Header */}
        <header className="sticky top-0 bg-background/95 ios-blur z-40 border-b border-border">
          <div className="flex items-center gap-3 px-4 h-14">
            <button onClick={() => setSelectedChat(null)} className="p-1 -ml-1">
              <ChevronLeft size={28} className="text-primary" />
            </button>
            <div className="w-9 h-9 rounded-full overflow-hidden bg-accent flex items-center justify-center">
              {selectedChat.avatar.startsWith("http") ? (
                <img src={selectedChat.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg">{selectedChat.avatar}</span>
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{selectedChat.name}</p>
              <p className="text-xs text-muted-foreground">был(а) недавно</p>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 p-4 space-y-3 overflow-y-auto pb-20">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.isOwn ? "justify-end" : "justify-start"}`}>
              <div className={`chat-bubble ${msg.isOwn ? "chat-bubble-own" : "chat-bubble-other"}`}>
                <p className="text-sm">{msg.text}</p>
                <p className={`text-[10px] mt-1 text-right ${msg.isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {msg.time}
                  {msg.isOwn && <CheckCheck size={12} className="inline ml-1" />}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 ios-blur border-t border-border p-3 pb-20">
          <div className="flex items-center gap-2">
            <button className="p-2">
              <Paperclip size={22} className="text-muted-foreground" />
            </button>
            <div className="flex-1 bg-muted rounded-full px-4 py-2 flex items-center gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Сообщение"
                className="bg-transparent flex-1 outline-none text-foreground placeholder:text-muted-foreground text-sm"
              />
              <button>
                <Smile size={22} className="text-muted-foreground" />
              </button>
            </div>
            <button className="w-10 h-10 gradient-primary rounded-full flex items-center justify-center">
              <Send size={18} className="text-primary-foreground" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-background/95 ios-blur z-40 border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button className="text-primary font-medium">Изменить</button>
          <h1 className="text-xl font-bold">Чаты</h1>
          <button className="p-2 -mr-2">
            <Edit size={22} className="text-primary" />
          </button>
        </div>
        
        {/* Search */}
        <div className="px-4 pb-3">
          <button
            onClick={() => setShowSearch(true)}
            className="w-full bg-muted rounded-xl px-4 py-2.5 flex items-center gap-2"
          >
            <Search size={16} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Поиск</span>
          </button>
        </div>
      </header>

      {/* Chat list */}
      <div className="divide-y divide-border">
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => setSelectedChat(chat)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
          >
            <div className="relative">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-accent flex items-center justify-center">
                {chat.avatar.startsWith("http") ? (
                  <img src={chat.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">{chat.avatar}</span>
                )}
              </div>
              {chat.isChannel && (
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                  <span className="text-[10px] text-primary-foreground">📢</span>
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1">
                {chat.isPinned && <Pin size={12} className="text-muted-foreground" />}
                {chat.isMuted && <Volume2 size={12} className="text-muted-foreground" />}
                <span className="font-semibold text-foreground truncate">{chat.name}</span>
              </div>
              <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
            </div>
            
            <div className="flex flex-col items-end gap-1">
              <span className={`text-xs ${chat.unread > 0 ? "text-primary" : "text-muted-foreground"}`}>
                {chat.time}
              </span>
              {chat.unread > 0 ? (
                <div className="min-w-[20px] h-5 bg-primary rounded-full flex items-center justify-center px-1.5">
                  <span className="text-xs font-medium text-primary-foreground">{chat.unread}</span>
                </div>
              ) : chat.isRead ? (
                <CheckCheck size={16} className="text-primary" />
              ) : (
                <Check size={16} className="text-muted-foreground" />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-background z-50 animate-fade-in">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-muted rounded-xl px-4 py-3 flex items-center gap-2">
                <Search size={18} className="text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Поиск"
                  className="bg-transparent flex-1 outline-none text-foreground placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>
              <button onClick={() => setShowSearch(false)} className="text-primary font-medium">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatsTab;
