import { Search, Play, Heart, MessageCircle, Send, Bookmark } from "lucide-react";
import { useState } from "react";

const stories = [
  { id: 1, name: "Ваша история", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop", isOwn: true },
  { id: 2, name: "Марина", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop", hasNew: true },
  { id: 3, name: "Алексей", avatar: "https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=100&h=100&fit=crop", hasNew: true },
  { id: 4, name: "Анна", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop", hasNew: true },
  { id: 5, name: "Дмитрий", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop", hasNew: false },
];

const posts = [
  {
    id: 1,
    author: "marina_travel",
    authorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    location: "Барселона, Испания",
    image: "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=600&h=600&fit=crop",
    likes: 1243,
    caption: "Магия Саграда Фамилия ✨ Гауди был гением!",
    comments: 89,
  },
  {
    id: 2,
    author: "alex_adventures",
    authorAvatar: "https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=100&h=100&fit=crop",
    location: "Токио, Япония",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&h=600&fit=crop",
    likes: 2891,
    caption: "Ночной Токио — это отдельная вселенная 🌃",
    comments: 156,
  },
];

const HomeTab = () => {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 bg-background/95 ios-blur z-40 border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => setShowSearch(true)} className="p-2 -ml-2">
            <Search size={24} className="text-foreground" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Travelgram</h1>
          <button className="p-2 -mr-2">
            <Play size={24} className="text-foreground" fill="currentColor" />
          </button>
        </div>
      </header>

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
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Недавние</h3>
              <div className="space-y-3">
                {["Барселона", "Токио", "Париж"].map((item) => (
                  <div key={item} className="flex items-center gap-3 py-2">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                      <Search size={16} className="text-muted-foreground" />
                    </div>
                    <span className="text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stories */}
      <div className="px-4 py-3 border-b border-border overflow-x-auto">
        <div className="flex gap-4">
          {stories.map((story) => (
            <div key={story.id} className="flex flex-col items-center gap-1 min-w-[68px]">
              <div className={`relative ${story.hasNew ? "story-ring rounded-full" : ""}`}>
                <div className="w-16 h-16 rounded-full overflow-hidden bg-muted border-2 border-background">
                  <img src={story.avatar} alt={story.name} className="w-full h-full object-cover" />
                </div>
                {story.isOwn && (
                  <div className="absolute bottom-0 right-0 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                    <span className="text-primary-foreground text-xs font-bold">+</span>
                  </div>
                )}
              </div>
              <span className="text-xs text-foreground truncate w-full text-center">
                {story.isOwn ? "Ваша история" : story.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Posts */}
      <div className="divide-y divide-border">
        {posts.map((post) => (
          <article key={post.id} className="animate-slide-up">
            {/* Post Header */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-full overflow-hidden">
                <img src={post.authorAvatar} alt={post.author} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{post.author}</p>
                <p className="text-xs text-muted-foreground">{post.location}</p>
              </div>
              <button className="p-2">
                <span className="text-foreground">•••</span>
              </button>
            </div>

            {/* Post Image */}
            <div className="aspect-square bg-muted">
              <img src={post.image} alt="" className="w-full h-full object-cover" />
            </div>

            {/* Post Actions */}
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                  <button className="hover:opacity-70 transition-opacity">
                    <Heart size={26} className="text-foreground" />
                  </button>
                  <button className="hover:opacity-70 transition-opacity">
                    <MessageCircle size={26} className="text-foreground" />
                  </button>
                  <button className="hover:opacity-70 transition-opacity">
                    <Send size={26} className="text-foreground" />
                  </button>
                </div>
                <button className="hover:opacity-70 transition-opacity">
                  <Bookmark size={26} className="text-foreground" />
                </button>
              </div>
              <p className="text-sm font-semibold text-foreground">{post.likes.toLocaleString()} отметок «Нравится»</p>
              <p className="text-sm text-foreground mt-1">
                <span className="font-semibold">{post.author}</span> {post.caption}
              </p>
              <button className="text-sm text-muted-foreground mt-1">
                Посмотреть все комментарии ({post.comments})
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default HomeTab;
