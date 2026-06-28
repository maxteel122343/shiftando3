import React, { useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, User as UserIcon, Sparkles, Search, Bookmark, LogIn, Sun, Moon, Bot, TrendingUp, Globe } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { User, Post } from '../types';
import { cn } from '../utils';

interface SidebarProps {
  currentUser: User;
  onOpenAuth: () => void;
  appTheme: 'dark' | 'light';
  onToggleTheme: () => void;
  posts: Post[];
  onHashtagClick: (tag: string) => void;
}

export function Sidebar({ currentUser, onOpenAuth, appTheme, onToggleTheme, posts, onHashtagClick }: SidebarProps) {
  const navigate = useNavigate();
  const [isTrendsOpen, setIsTrendsOpen] = useState(false);

  const links = [
    { name: 'Feed', to: '/', icon: Home },
    { name: 'AI Guide', to: '/chat', icon: Bot },
    { name: 'Saved', to: '/saved', icon: Bookmark },
  ];

  const trendingHashtags = useMemo(() => {
    const counts: Record<string, number> = {};
    if (Array.isArray(posts)) {
      posts.forEach(post => {
        if (Array.isArray(post.hashtags)) {
          post.hashtags.forEach(tag => {
            const trimmed = tag.trim();
            if (trimmed) {
              counts[trimmed] = (counts[trimmed] || 0) + 1;
            }
          });
        }
      });
    }

    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
      .slice(0, 5);
  }, [posts]);

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-[260px] border-r border-white/5 h-screen sticky top-0 bg-[#0c0a13] flex-col items-stretch px-6 py-8 z-20 shrink-0">
        <div className="flex items-center gap-3 px-2 mb-8 shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xl bg-gradient-to-r from-purple-400 via-pink-500 to-purple-300 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(168,85,247,0.4)] app-light-mode:bg-none app-light-mode:text-purple-700 app-light-mode:drop-shadow-none tracking-tight">
              Dreamscape
            </span>
            <span className="text-[9px] text-slate-500 font-medium tracking-normal mt-0.5">
              Alcançando 10.000 Sonhos
            </span>
          </div>
        </div>
        
        <nav className="flex flex-col space-y-1.5 flex-1 w-full overflow-y-auto custom-scrollbar pr-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => cn(
                "flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all w-full group",
                isActive 
                  ? "bg-purple-600/15 text-purple-400 font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              )}
              title={link.name}
            >
              <link.icon className="w-[20px] h-[20px] transition-transform group-hover:scale-110" strokeWidth={2} />
              <span className="text-sm tracking-wide font-medium">{link.name}</span>
            </NavLink>
          ))}

          {/* Trending Hashtags Section inside Navigation */}
          <div className="mt-8 pt-6 border-t border-white/5 w-full">
            <div className="flex items-center gap-2 px-4 mb-3 text-slate-500 dark:text-slate-400">
              <TrendingUp className="w-4 h-4" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Assuntos em Alta</span>
            </div>
            <div className="space-y-0.5">
              {trendingHashtags.map(({ tag, count }) => (
                <button
                  key={tag}
                  onClick={() => {
                    onHashtagClick(tag);
                    navigate('/search');
                  }}
                  className="flex flex-col text-left w-full group hover:bg-white/5 px-4 py-2.5 rounded-2xl transition-all cursor-pointer"
                >
                  <span className="text-sm font-semibold text-purple-400 dark:text-purple-300 group-hover:text-purple-300 transition-colors">
                    {tag}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">
                    {count} {count === 1 ? 'relato' : 'relatos'}
                  </span>
                </button>
              ))}
              {trendingHashtags.length === 0 && (
                <div className="px-4 py-2 text-xs text-slate-500 italic">
                  Nenhuma hashtag ainda
                </div>
              )}
            </div>
          </div>
        </nav>
        
        <div className="mt-auto pt-6 border-t border-white/5 flex flex-col gap-4 shrink-0">
          {/* Quick Actions Container */}
          <div className="flex items-center justify-between px-2">
            {/* Auth Button */}
            <button 
              onClick={onOpenAuth}
              className="p-3 rounded-2xl text-slate-500 hover:text-purple-400 hover:bg-white/5 transition-all cursor-pointer"
              title="Entrar ou Cadastrar"
            >
              <LogIn className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          {/* User Profile Summary Card */}
          <NavLink 
            to={`/profile/${currentUser.id}`} 
            className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5"
          >
            <div className="w-10 h-10 rounded-full border border-purple-500/20 p-0.5 shrink-0">
              <img 
                src={currentUser.avatar} 
                onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/9.x/notionists/svg?seed=${currentUser.username}`; }}
                alt="Me" 
                className="w-full h-full rounded-full bg-slate-800 object-cover" 
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-200 dark:text-slate-200 app-light-mode:text-slate-800 truncate">
                {currentUser.displayName}
              </span>
              <span className="text-[10px] text-slate-500 truncate">
                @{currentUser.username}
              </span>
            </div>
          </NavLink>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div
        className="flex lg:hidden fixed bottom-0 left-0 right-0 bg-[#0c0a13]/95 backdrop-blur-lg border-t border-white/5 px-4 pt-2 items-center justify-around z-40 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
      >
        {/* Feed Link */}
        <NavLink
          to="/"
          className={({ isActive }) => cn(
            "p-2 rounded-xl transition-all flex flex-col items-center justify-center",
            isActive 
              ? "bg-purple-600/20 text-purple-400 font-bold" 
              : "text-slate-500 hover:text-slate-300"
          )}
          title="Feed"
        >
          <Home className="w-6 h-6" strokeWidth={1.5} />
        </NavLink>

        {/* Trends Button */}
        <button 
          onClick={() => setIsTrendsOpen(true)}
          className={cn(
            "p-2 rounded-xl transition-all flex flex-col items-center justify-center cursor-pointer",
            isTrendsOpen 
              ? "bg-purple-600/20 text-purple-400 font-bold" 
              : "text-slate-500 hover:text-slate-300"
          )}
          title="Assuntos em Alta"
        >
          <TrendingUp className="w-6 h-6" strokeWidth={1.5} />
        </button>

        {/* AI Guide Link */}
        <NavLink
          to="/chat"
          className={({ isActive }) => cn(
            "p-2 rounded-xl transition-all flex flex-col items-center justify-center",
            isActive 
              ? "bg-purple-600/20 text-purple-400 font-bold" 
              : "text-slate-500 hover:text-slate-300"
          )}
          title="AI Guide"
        >
          <Bot className="w-6 h-6" strokeWidth={1.5} />
        </NavLink>

        {/* Saved Link */}
        <NavLink
          to="/saved"
          className={({ isActive }) => cn(
            "p-2 rounded-xl transition-all flex flex-col items-center justify-center",
            isActive 
              ? "bg-purple-600/20 text-purple-400 font-bold" 
              : "text-slate-500 hover:text-slate-300"
          )}
          title="Saved"
        >
          <Bookmark className="w-6 h-6" strokeWidth={1.5} />
        </NavLink>
        
        {/* Auth Button */}
        <button 
          onClick={onOpenAuth}
          className="p-2 rounded-xl text-slate-500 hover:text-purple-400 transition-colors cursor-pointer flex flex-col items-center justify-center"
          title="Login"
        >
          <LogIn className="w-6 h-6" strokeWidth={1.5} />
        </button>

        {/* Profile Link */}
        <NavLink 
          to={`/profile/${currentUser.id}`} 
          className="w-7 h-7 rounded-full border border-purple-500/30 p-0.5 hover:scale-105 transition-transform shrink-0 flex items-center justify-center"
        >
          <img 
            src={currentUser.avatar} 
            onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/9.x/notionists/svg?seed=${currentUser.username}`; }}
            alt="Me" 
            className="w-full h-full rounded-full bg-slate-800 object-cover" 
          />
        </NavLink>
      </div>

      {/* Mobile Trends Bottom Sheet Drawer */}
      <AnimatePresence>
        {isTrendsOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTrendsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
            />

            {/* Bottom Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 max-h-[70vh] bg-[#110e19] border-t border-white/10 rounded-t-[32px] z-50 lg:hidden flex flex-col shadow-[0_-10px_30px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              {/* Drag Handle Indicator */}
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto my-3 shrink-0" />

              {/* Header */}
              <div className="px-6 pb-4 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-2 text-slate-200">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  <span className="font-bold tracking-wide">Assuntos em Alta</span>
                </div>
                <button
                  onClick={() => setIsTrendsOpen(false)}
                  className="p-1 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar space-y-2 pb-8">
                {trendingHashtags.map(({ tag, count }) => (
                  <button
                    key={tag}
                    onClick={() => {
                      onHashtagClick(tag);
                      navigate('/search');
                      setIsTrendsOpen(false);
                    }}
                    className="flex items-center justify-between w-full p-4 rounded-2xl bg-white/[0.02] hover:bg-purple-600/10 border border-white/5 hover:border-purple-500/20 transition-all text-left group cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-purple-400 dark:text-purple-300 group-hover:text-purple-300 transition-colors">
                        {tag}
                      </span>
                      <span className="text-xs text-slate-500 mt-1">
                        {count} {count === 1 ? 'relato' : 'relatos'}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-purple-600/20 flex items-center justify-center text-slate-400 group-hover:text-purple-300 transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                ))}
                {trendingHashtags.length === 0 && (
                  <div className="py-8 text-center text-slate-500 italic text-sm">
                    Nenhuma hashtag em alta no momento.
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

