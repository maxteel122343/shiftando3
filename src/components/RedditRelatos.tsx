import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchRedditPosts, RedditPost, SubredditKey, REDDIT_SUBREDDITS, SUBREDDIT_LABELS } from "../utils/redditApi";
import { Globe, ArrowUp, MessageCircle, RefreshCw, ExternalLink, ChevronDown, ChevronUp, Flame, Zap, TrendingUp, Download, ArrowRight } from "lucide-react";

type SortMode = "hot" | "new" | "top";

function timeAgo(utc: number): string {
  const diff = Math.floor(Date.now() / 1000) - utc;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const SUBREDDIT_BADGE_COLORS: Record<SubredditKey, string> = {
  shiftingrealities: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  realityshifting: "bg-violet-500/15 text-violet-400 border-violet-500/20",
  shiftingscripts: "bg-sky-500/15 text-sky-400 border-sky-500/20",
  shiftingmethods: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
};

function RedditCard({ post, onImport }: { post: RedditPost; onImport: (post: RedditPost) => void; key?: React.Key }) {
  const [expanded, setExpanded] = useState(false);
  const preview = post.selftext.slice(0, 260);
  const hasMore = post.selftext.length > 260;
  const badgeClass = SUBREDDIT_BADGE_COLORS[post.subreddit as SubredditKey] ?? "bg-slate-500/15 text-slate-400 border-slate-500/20";

  return (
    <div className="bg-[#0c0a13]/60 border border-white/5 hover:border-purple-500/20 rounded-2xl p-4 transition-all duration-200 group">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shrink-0">
          <span className="text-white text-[10px] font-bold">r/</span>
        </div>
        <div className="flex flex-col leading-tight min-w-0">
          <span className={`text-[10px] font-semibold border rounded-md px-1.5 py-0.5 w-fit ${badgeClass}`}>
            r/{post.subreddit}
          </span>
          <span className="text-[10px] text-slate-500">u/{post.author} · {timeAgo(post.created_utc)}</span>
        </div>

        <a
          href={`https://reddit.com${post.permalink}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
          title="Ver no Reddit"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Thumbnail */}
      {post.thumbnail_url && (
        <div className="w-full h-28 rounded-xl overflow-hidden mb-3 bg-white/5">
          <img
            src={post.thumbnail_url}
            alt={post.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

      {/* Title */}
      <h3 className="text-sm font-bold text-white leading-snug mb-2 line-clamp-2">{post.title}</h3>

      {/* Content */}
      <p className="text-[13px] text-slate-400 leading-relaxed whitespace-pre-wrap">
        {expanded ? post.selftext : preview}
        {!expanded && hasMore && "..."}
      </p>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 font-semibold transition-colors cursor-pointer"
        >
          {expanded ? <><ChevronUp className="w-3 h-3" /> Ver menos</> : <><ChevronDown className="w-3 h-3" /> Ler mais</>}
        </button>
      )}

      {/* Footer */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
        <span className="flex items-center gap-1 text-[11px] text-slate-500">
          <ArrowUp className="w-3.5 h-3.5 text-orange-400" />
          {post.score.toLocaleString()}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-slate-500">
          <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
          {post.num_comments.toLocaleString()}
        </span>
        <button
          onClick={() => onImport(post)}
          className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 px-2.5 py-1 rounded-full transition-all cursor-pointer"
          title="Importar este relato para o feed"
        >
          <Download className="w-3 h-3" />
          Importar
        </button>
      </div>
    </div>
  );
}

export function RedditRelatos() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState<SortMode>("hot");
  const [subFilter, setSubFilter] = useState<SubredditKey | undefined>(undefined);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchRedditPosts(sort, 8, subFilter);
      setPosts(data);
      if (data.length === 0) setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [sort, subFilter, refreshKey]);

  useEffect(() => { load(); }, [load]);

  const handleImport = (post: RedditPost) => {
    const attribution = `\n\n---\n📡 Relato originalmente publicado por u/${post.author} em r/${post.subreddit} no Reddit.`;
    const params = new URLSearchParams({
      rt: post.title,
      rc: post.selftext + attribution,
      ra: post.author,
      rs: post.subreddit,
      rp: post.permalink,
      ri: post.thumbnail_url || '',
    });
    navigate(`/create?${params.toString()}`);
  };

  const sortIcons: Record<SortMode, React.ReactNode> = {
    hot: <Flame className="w-3.5 h-3.5" />,
    new: <Zap className="w-3.5 h-3.5" />,
    top: <TrendingUp className="w-3.5 h-3.5" />,
  };
  const sortLabels: Record<SortMode, string> = { hot: "Em Alta", new: "Recentes", top: "Top" };

  return (
    <div className="rounded-[24px] bg-[#0f0c19] border border-white/5 overflow-hidden shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-[0_4px_12px_rgba(239,68,68,0.3)]">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Relatos do Universo</h2>
            <p className="text-[10px] text-slate-500">Reddit · comunidades de shifting</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 rounded-lg p-0.5 gap-0.5">
            {(["hot", "new", "top"] as SortMode[]).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                  sort === s ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                {sortIcons[s]}
                {sortLabels[s]}
              </button>
            ))}
          </div>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Atualizar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Subreddit filter chips */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 overflow-x-auto">
        <button
          onClick={() => setSubFilter(undefined)}
          className={`shrink-0 text-[10px] font-semibold px-3 py-1 rounded-full border transition-all cursor-pointer ${
            !subFilter
              ? "bg-purple-600 text-white border-purple-600"
              : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
          }`}
        >
          Todos
        </button>
        {REDDIT_SUBREDDITS.map((sub) => (
          <button
            key={sub}
            onClick={() => setSubFilter(subFilter === sub ? undefined : sub)}
            className={`shrink-0 text-[10px] font-semibold px-3 py-1 rounded-full border transition-all cursor-pointer ${
              subFilter === sub
                ? "bg-purple-600 text-white border-purple-600"
                : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
            }`}
          >
            {SUBREDDIT_LABELS[sub]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 animate-pulse space-y-3">
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-white/10" />
                <div className="space-y-1.5">
                  <div className="h-2.5 w-24 bg-white/10 rounded" />
                  <div className="h-2 w-16 bg-white/5 rounded" />
                </div>
              </div>
              <div className="h-3 w-4/5 bg-white/10 rounded" />
              <div className="h-2 w-full bg-white/5 rounded" />
              <div className="h-2 w-3/4 bg-white/5 rounded" />
            </div>
          ))
        ) : error ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            <Globe className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p>Não foi possível carregar relatos.</p>
            <button
              onClick={() => setRefreshKey((k) => k + 1)}
              className="mt-3 text-purple-400 text-xs hover:underline cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          posts.map((post) => <RedditCard key={post.id} post={post} onImport={handleImport} />)
        )}
      </div>

      {/* Footer */}
      <div className="px-5 pb-4 flex items-center justify-between">
        <a
          href="https://www.reddit.com/r/shiftingrealities/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-orange-400 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Ver mais no Reddit
        </a>
        <button
          onClick={() => navigate('/reddit')}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
        >
          Explorar Universo
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
