import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchRedditPosts,
  searchRedditPosts,
  RedditPost,
  SubredditKey,
  REDDIT_SUBREDDITS,
  SUBREDDIT_LABELS,
  SUBREDDIT_COLORS,
} from "../utils/redditApi";
import {
  Globe,
  ArrowUp,
  MessageCircle,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Flame,
  Zap,
  TrendingUp,
  Download,
  Search,
  X,
  Sparkles,
} from "lucide-react";

type SortMode = "hot" | "new" | "top";

function timeAgo(utc: number): string {
  const diff = Math.floor(Date.now() / 1000) - utc;
  if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

const COLOR_MAP: Record<string, { badge: string; glow: string; avatar: string }> = {
  orange: {
    badge: "bg-orange-500/15 text-orange-400 border-orange-500/20",
    glow: "shadow-[0_0_20px_rgba(249,115,22,0.15)]",
    avatar: "from-orange-500 to-red-600",
  },
  violet: {
    badge: "bg-violet-500/15 text-violet-400 border-violet-500/20",
    glow: "shadow-[0_0_20px_rgba(139,92,246,0.15)]",
    avatar: "from-violet-500 to-purple-600",
  },
  sky: {
    badge: "bg-sky-500/15 text-sky-400 border-sky-500/20",
    glow: "shadow-[0_0_20px_rgba(14,165,233,0.15)]",
    avatar: "from-sky-500 to-cyan-600",
  },
  emerald: {
    badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    glow: "shadow-[0_0_20px_rgba(16,185,129,0.15)]",
    avatar: "from-emerald-500 to-teal-600",
  },
};

function getColorKey(subreddit: string): string {
  return SUBREDDIT_COLORS[subreddit as SubredditKey] ?? "orange";
}

function RedditUniverseCard({
  post,
  onImport,
}: {
  post: RedditPost;
  onImport: (post: RedditPost) => void;
  key?: React.Key;
}) {
  const [expanded, setExpanded] = useState(false);
  const colorKey = getColorKey(post.subreddit);
  const colors = COLOR_MAP[colorKey];
  const preview = post.selftext.slice(0, 340);
  const hasMore = post.selftext.length > 340;

  return (
    <div
      className={`group bg-[#0f0c19] border border-white/5 hover:border-purple-500/20 rounded-[20px] overflow-hidden transition-all duration-300 hover:-translate-y-0.5 ${colors.glow}`}
    >
      {/* Thumbnail */}
      {post.thumbnail_url && (
        <div className="w-full h-40 bg-white/5 overflow-hidden relative">
          <img
            src={post.thumbnail_url}
            alt={post.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).parentElement!.style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0c19] via-transparent to-transparent" />
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-full bg-gradient-to-br ${colors.avatar} flex items-center justify-center shrink-0 shadow-lg`}
            >
              <span className="text-white text-[10px] font-black">r/</span>
            </div>
            <div className="min-w-0">
              <div
                className={`text-[10px] font-bold border rounded-md px-1.5 py-0.5 w-fit mb-1 ${colors.badge}`}
              >
                r/{post.subreddit}
              </div>
              <p className="text-[10px] text-slate-500 truncate">
                u/{post.author} · {timeAgo(post.created_utc)}
              </p>
            </div>
          </div>
          <a
            href={`https://reddit.com${post.permalink}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white transition-all shrink-0"
            title="Ver no Reddit"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-bold text-white leading-snug mb-3 line-clamp-2 group-hover:text-purple-100 transition-colors">
          {post.title}
        </h3>

        {/* Content */}
        <p className="text-[13px] text-slate-400 leading-relaxed whitespace-pre-wrap">
          {expanded ? post.selftext : preview}
          {!expanded && hasMore && (
            <span className="text-slate-600">...</span>
          )}
        </p>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 font-semibold transition-colors cursor-pointer"
          >
            {expanded ? (
              <><ChevronUp className="w-3 h-3" /> Ver menos</>
            ) : (
              <><ChevronDown className="w-3 h-3" /> Ler relato completo</>
            )}
          </button>
        )}

        {/* Footer */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
          <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
            <ArrowUp className="w-4 h-4 text-orange-400" />
            <span className="font-medium text-slate-300">{post.score.toLocaleString()}</span>
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
            <MessageCircle className="w-4 h-4 text-blue-400" />
            <span className="font-medium text-slate-300">{post.num_comments.toLocaleString()}</span>
          </span>
          <button
            onClick={() => onImport(post)}
            className="ml-auto flex items-center gap-1.5 text-[11px] font-bold text-purple-300 hover:text-white bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 hover:border-purple-500/50 px-3 py-1.5 rounded-full transition-all cursor-pointer group/btn"
            title="Importar este relato para o feed"
          >
            <Download className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
            Importar Relato
          </button>
        </div>
      </div>
    </div>
  );
}

export function RedditUniversePage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState<SortMode>("hot");
  const [subFilter, setSubFilter] = useState<SubredditKey | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchRedditPosts(sort, 20, subFilter);
      setPosts(data);
      if (data.length === 0) setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [sort, subFilter, refreshKey]);

  const doSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        loadPosts();
        return;
      }
      setIsSearching(true);
      setLoading(true);
      setError(false);
      try {
        const subs = subFilter ? [subFilter] : [...REDDIT_SUBREDDITS];
        const data = await searchRedditPosts(q, subs, 20);
        setPosts(data);
        if (data.length === 0) setError(true);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
        setIsSearching(false);
      }
    },
    [subFilter, loadPosts]
  );

  useEffect(() => {
    if (searchQuery.trim()) {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(() => doSearch(searchQuery), 600);
      return () => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
      };
    } else {
      loadPosts();
    }
  }, [searchQuery, sort, subFilter, refreshKey]);

  const handleImport = (post: RedditPost) => {
    const attribution = `\n\n---\n📡 Relato originalmente publicado por u/${post.author} em r/${post.subreddit} no Reddit.`;
    const params = new URLSearchParams({
      rt: post.title,
      rc: post.selftext + attribution,
      ra: post.author,
      rs: post.subreddit,
      rp: post.permalink,
      ri: post.thumbnail_url || "",
    });
    navigate(`/create?${params.toString()}`);
  };

  const sortConfig: { key: SortMode; label: string; icon: React.ReactNode }[] = [
    { key: "hot", label: "Em Alta", icon: <Flame className="w-3.5 h-3.5" /> },
    { key: "new", label: "Recentes", icon: <Zap className="w-3.5 h-3.5" /> },
    { key: "top", label: "Top", icon: <TrendingUp className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="w-full py-8 px-4 relative z-10">
      {/* Page Header */}
      <div className="mb-8 px-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-[0_4px_16px_rgba(239,68,68,0.3)]">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Universo Reddit
            </h1>
            <p className="text-xs text-slate-500">
              Relatos reais de praticantes de shifting ao redor do mundo
            </p>
          </div>
        </div>

        {/* Stats strip */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          {REDDIT_SUBREDDITS.map((sub) => {
            const colorKey = getColorKey(sub);
            const colors = COLOR_MAP[colorKey];
            return (
              <span
                key={sub}
                className={`text-[10px] font-semibold border rounded-full px-2.5 py-1 ${colors.badge}`}
              >
                {SUBREDDIT_LABELS[sub]}
              </span>
            );
          })}
          <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse ml-1" />
          <span className="text-[10px] text-slate-500">Dados em tempo real via API pública do Reddit</span>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6 space-y-3 px-2">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por método, DR, experiência..."
            className="w-full bg-[#15121e] border border-white/5 rounded-full pl-11 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Subreddit chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSubFilter(undefined)}
              className={`shrink-0 text-[11px] font-semibold px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                !subFilter
                  ? "bg-purple-600 text-white border-purple-600 shadow-[0_0_12px_rgba(124,58,237,0.3)]"
                  : "bg-white/5 text-slate-400 border-white/10 hover:text-white hover:border-white/20"
              }`}
            >
              Todos
            </button>
            {REDDIT_SUBREDDITS.map((sub) => {
              const colorKey = getColorKey(sub);
              const colors = COLOR_MAP[colorKey];
              return (
                <button
                  key={sub}
                  onClick={() => setSubFilter(subFilter === sub ? undefined : sub)}
                  className={`shrink-0 text-[11px] font-semibold px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                    subFilter === sub
                      ? "bg-purple-600 text-white border-purple-600 shadow-[0_0_12px_rgba(124,58,237,0.3)]"
                      : `bg-white/5 border-white/10 hover:border-white/20 ${colors.badge}`
                  }`}
                >
                  r/{sub.replace("shifting", "").replace("realities", "realities").replace("reality", "reality")}
                </button>
              );
            })}
          </div>

          {/* Sort tabs */}
          <div className="ml-auto flex bg-white/5 rounded-xl p-1 gap-0.5 shrink-0">
            {sortConfig.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => { setSort(key); setSearchQuery(""); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  sort === key && !searchQuery
                    ? "bg-purple-600 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={() => { setRefreshKey((k) => k + 1); setSearchQuery(""); }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer shrink-0"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-[#0f0c19] border border-white/5 rounded-[20px] p-5 animate-pulse space-y-4"
            >
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-28 bg-white/10 rounded-full" />
                  <div className="h-2 w-16 bg-white/5 rounded-full" />
                </div>
              </div>
              <div className="h-4 w-3/4 bg-white/10 rounded-full" />
              <div className="space-y-1.5">
                <div className="h-2.5 w-full bg-white/5 rounded-full" />
                <div className="h-2.5 w-4/5 bg-white/5 rounded-full" />
                <div className="h-2.5 w-2/3 bg-white/5 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-24 bg-white/[0.02] rounded-[28px] border border-white/5 border-dashed">
          <Globe className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-slate-400 font-medium mb-1">
            {searchQuery ? "Nenhum relato encontrado para essa busca." : "Não foi possível carregar relatos."}
          </p>
          <p className="text-slate-600 text-sm mb-4">
            {searchQuery ? "Tente outras palavras-chave." : "Verifique sua conexão e tente novamente."}
          </p>
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              className="text-purple-400 text-sm hover:underline cursor-pointer"
            >
              Limpar busca
            </button>
          ) : (
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="text-purple-400 text-sm hover:underline cursor-pointer"
            >
              Tentar novamente
            </button>
          )}
        </div>
      ) : (
        <>
          {searchQuery && (
            <div className="mb-4 px-2 flex items-center gap-2 text-[12px] text-slate-500">
              <Search className="w-3.5 h-3.5" />
              <span>
                {posts.length} resultado{posts.length !== 1 ? "s" : ""} para{" "}
                <span className="text-purple-400 font-semibold">"{searchQuery}"</span>
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4">
            {posts.map((post) => (
              <RedditUniverseCard key={post.id} post={post} onImport={handleImport} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <a
              href="https://www.reddit.com/r/shiftingrealities/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-orange-400 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Ver mais relatos diretamente no Reddit
            </a>
          </div>
        </>
      )}
    </div>
  );
}
