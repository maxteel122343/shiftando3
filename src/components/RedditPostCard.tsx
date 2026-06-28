import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUp, MessageCircle, ExternalLink, ChevronDown, ChevronUp,
  Download, Globe
} from 'lucide-react';
import { RedditPost, SubredditKey, SUBREDDIT_COLORS } from '../utils/redditApi';

function timeAgo(utc: number): string {
  const diff = Math.floor(Date.now() / 1000) - utc;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  const d = Math.floor(diff / 86400);
  return `${d} ${d === 1 ? 'dia' : 'dias'} atrás`;
}

const COLOR_STYLES: Record<string, {
  badge: string;
  border: string;
  glow: string;
  avatarFrom: string;
  avatarTo: string;
  score: string;
}> = {
  orange: {
    badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    border: 'hover:border-orange-500/20',
    glow: 'hover:shadow-[0_0_20px_rgba(249,115,22,0.08)]',
    avatarFrom: 'from-orange-500', avatarTo: 'to-red-600',
    score: 'text-orange-400',
  },
  violet: {
    badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    border: 'hover:border-violet-500/20',
    glow: 'hover:shadow-[0_0_20px_rgba(139,92,246,0.08)]',
    avatarFrom: 'from-violet-500', avatarTo: 'to-purple-600',
    score: 'text-violet-400',
  },
  sky: {
    badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    border: 'hover:border-sky-500/20',
    glow: 'hover:shadow-[0_0_20px_rgba(14,165,233,0.08)]',
    avatarFrom: 'from-sky-500', avatarTo: 'to-cyan-600',
    score: 'text-sky-400',
  },
  emerald: {
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    border: 'hover:border-emerald-500/20',
    glow: 'hover:shadow-[0_0_20px_rgba(16,185,129,0.08)]',
    avatarFrom: 'from-emerald-500', avatarTo: 'to-teal-600',
    score: 'text-emerald-400',
  },
};

interface RedditPostCardProps {
  post: RedditPost;
}

export function RedditPostCard({ post }: RedditPostCardProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const colorKey = SUBREDDIT_COLORS[post.subreddit as SubredditKey] ?? 'orange';
  const c = COLOR_STYLES[colorKey];

  const PREVIEW_LEN = 320;
  const preview = post.selftext.slice(0, PREVIEW_LEN);
  const hasMore = post.selftext.length > PREVIEW_LEN;

  const handleImport = () => {
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

  return (
    <div
      className={`
        group relative rounded-[24px] overflow-hidden
        bg-[#13101e] border border-white/[0.06]
        ${c.border} ${c.glow}
        transition-all duration-300
      `}
    >
      {/* Reddit source ribbon */}
      <div className={`flex items-center gap-2 px-5 py-3 border-b border-white/[0.04] bg-white/[0.02]`}>
        <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${c.avatarFrom} ${c.avatarTo} flex items-center justify-center shrink-0 shadow`}>
          <span className="text-white text-[9px] font-black">r/</span>
        </div>
        <span className={`text-[11px] font-bold ${c.badge.split(' ')[1]}`}>
          r/{post.subreddit}
        </span>
        <span className="text-[10px] text-slate-600 mx-1">·</span>
        <span className="text-[10px] text-slate-500">u/{post.author}</span>
        <span className="text-[10px] text-slate-600 mx-1">·</span>
        <span className="text-[10px] text-slate-500">{timeAgo(post.created_utc)}</span>
        <a
          href={`https://reddit.com${post.permalink}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg text-slate-500 hover:text-white"
          title="Ver no Reddit"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Card body */}
      <div className="px-5 pt-4 pb-5">
        {/* Thumbnail */}
        {post.thumbnail_url && (
          <div className="w-full h-44 rounded-2xl overflow-hidden mb-4 bg-white/5">
            <img
              src={post.thumbnail_url}
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              referrerPolicy="no-referrer"
              onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
            />
          </div>
        )}

        {/* Title */}
        <h2 className="text-[16px] font-bold text-white leading-snug mb-3 group-hover:text-purple-50 transition-colors">
          {post.title}
        </h2>

        {/* Content */}
        <p className="text-[13.5px] text-slate-400 leading-relaxed whitespace-pre-wrap">
          {expanded ? post.selftext : preview}
          {!expanded && hasMore && <span className="text-slate-600">…</span>}
        </p>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 font-semibold transition-colors cursor-pointer"
          >
            {expanded
              ? <><ChevronUp className="w-3 h-3" /> Ver menos</>
              : <><ChevronDown className="w-3 h-3" /> Ler relato completo</>}
          </button>
        )}

        {/* Footer */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/[0.05]">
          <span className={`flex items-center gap-1.5 text-[12px] font-medium ${c.score}`}>
            <ArrowUp className="w-4 h-4" />
            {post.score.toLocaleString('pt-BR')}
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
            <MessageCircle className="w-4 h-4 text-slate-600" />
            {post.num_comments.toLocaleString('pt-BR')}
          </span>

          {/* Source label */}
          <span className="flex items-center gap-1 text-[10px] text-slate-600">
            <Globe className="w-3 h-3" />
            Reddit
          </span>

          {/* Import CTA */}
          <button
            onClick={handleImport}
            className={`
              ml-auto flex items-center gap-1.5 text-[11px] font-bold px-3.5 py-1.5 rounded-full
              border transition-all cursor-pointer
              text-purple-300 hover:text-white
              bg-purple-600/10 hover:bg-purple-600/30
              border-purple-500/20 hover:border-purple-500/50
              shadow-[0_0_0_0] hover:shadow-[0_0_12px_rgba(124,58,237,0.3)]
            `}
          >
            <Download className="w-3.5 h-3.5" />
            Importar Relato
          </button>
        </div>
      </div>
    </div>
  );
}
