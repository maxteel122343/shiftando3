import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Globe, Sun, Moon } from 'lucide-react';
import { PostCard } from './PostCard';
import { RedditPostCard } from './RedditPostCard';
import { Post, User } from '../types';
import { LibraryHighlights } from './LibraryHighlights';
import { fetchRedditPosts, RedditPost } from '../utils/redditApi';

interface FeedProps {
  posts: Post[];
  users: User[];
  onLike: (postId: string) => void;
  onComment: (postId: string, content: string) => void;
  savedPostIds?: string[];
  onToggleSave?: (postId: string) => void;
  onRepost?: (postId: string) => void;
  currentUser: User;
  onPublishEBookPost: (title: string, authorName: string, coverImage: string, description: string, ebookId: string) => void;
  onDeletePost?: (postId: string) => void;
  appTheme: 'dark' | 'light';
  onToggleTheme: () => void;
}

/**
 * Build an interleaved feed:
 * [user0, reddit0, user1, reddit1, user2, reddit2, ...]
 *
 * Reddit posts rotate from a pool; if pool runs out, it cycles back.
 */
function buildInterleavedFeed(
  userPosts: Post[],
  redditPosts: RedditPost[]
): Array<{ type: 'user'; post: Post; index: number } | { type: 'reddit'; post: RedditPost; index: number }> {
  const result: Array<{ type: 'user'; post: Post; index: number } | { type: 'reddit'; post: RedditPost; index: number }> = [];
  const rLen = redditPosts.length;

  userPosts.forEach((post, i) => {
    result.push({ type: 'user', post, index: i });
    // Insert one Reddit post after every user post (cycling the pool)
    if (rLen > 0) {
      const rPost = redditPosts[i % rLen];
      result.push({ type: 'reddit', post: rPost, index: i });
    }
  });

  return result;
}

export function Feed({
  posts,
  users,
  onLike,
  onComment,
  savedPostIds = [],
  onToggleSave,
  onRepost,
  currentUser,
  onPublishEBookPost,
  onDeletePost,
  appTheme,
  onToggleTheme
}: FeedProps) {
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const [redditPosts, setRedditPosts] = useState<RedditPost[]>([]);
  const [redditLoaded, setRedditLoaded] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Fetch Reddit posts once on mount
  useEffect(() => {
    fetchRedditPosts('hot', 150)
      .then((data) => {
        setRedditPosts(data);
        setRedditLoaded(true);
      })
      .catch((err) => {
        console.error("Erro crítico ao carregar posts do Reddit no Feed:", err);
        setRedditLoaded(true);
      });
  }, []);

  // Filter by hashtag
  const filteredPosts = selectedHashtag
    ? posts.filter(post => post.hashtags.some(tag => tag.toLowerCase() === selectedHashtag.toLowerCase()))
    : posts;

  const sortedPosts = [...filteredPosts].sort((a, b) => b.createdAt - a.createdAt);

  // Reset multiplier when hashtag filter changes
  useEffect(() => { setMultiplier(1); }, [selectedHashtag]);

  // Build user feed & interleave dynamically across all multiplier levels to avoid duplicating reddit posts
  const allItems = useMemo(() => {
    const list: Array<{
      type: 'user' | 'reddit';
      post: Post | RedditPost;
      uniqueKey: string;
    }> = [];

    const uLen = sortedPosts.length;
    const rLen = redditPosts.length;

    if (uLen === 0 && rLen > 0) {
      // Se não houver nenhum post local, mostra apenas posts do Reddit
      redditPosts.slice(0, 15 * multiplier).forEach((redditPost, idx) => {
        list.push({
          type: 'reddit',
          post: redditPost,
          uniqueKey: `reddit_${redditPost.id}_s${idx}`
        });
      });
      return list;
    }

    if (uLen === 0) return list;

    // Total slots de posts locais que queremos renderizar
    const totalUserPostSlots = uLen * multiplier;
    let redditIndex = 0;

    for (let slotIdx = 0; slotIdx < totalUserPostSlots; slotIdx++) {
      // Post do usuário (repete ciclicamente)
      const userPost = sortedPosts[slotIdx % uLen];
      const multIdx = Math.floor(slotIdx / uLen);
      
      list.push({
        type: 'user',
        post: userPost,
        uniqueKey: `user_${userPost.id}_m${multIdx}_s${slotIdx}`
      });

      // Insere múltiplos posts do Reddit por post local para rotacionar o conteúdo rapidamente
      // Se a plataforma tem poucos posts, colocamos 3 posts do Reddit para cada 1 do usuário
      const redditRatio = uLen < 5 ? 3 : 1; 

      if (rLen > 0) {
        for (let r = 0; r < redditRatio; r++) {
          const redditPost = redditPosts[redditIndex % rLen];
          list.push({
            type: 'reddit',
            post: redditPost,
            uniqueKey: `reddit_${redditPost.id}_s${slotIdx}_r${r}`
          });
          redditIndex++;
        }
      }
    }

    return list;
  }, [sortedPosts, redditPosts, multiplier]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && sortedPosts.length > 0) {
        setMultiplier(prev => prev + 1);
      }
    }, { threshold: 0.1 });

    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => { if (el) observer.unobserve(el); };
  }, [sortedPosts]);

  // LibraryHighlights insertion points — by absolute allItems index
  const librarySlots: { idx: number; title: string; startIndex: number; themeColor: 'purple' | 'indigo' | 'emerald' | 'amber' }[] = [
    { idx: 2,  title: 'Biblioteca de Shifting', startIndex: 0, themeColor: 'purple' },
    { idx: 8,  title: 'Recomendações e Descobertas', startIndex: 1, themeColor: 'indigo' },
    { idx: 16, title: 'Práticas de Realidade Desejada', startIndex: 2, themeColor: 'emerald' },
    { idx: 26, title: 'Explorando as Frequências de Shifting', startIndex: 3, themeColor: 'amber' },
  ];

  return (
    <div className="w-full py-8 px-4 relative z-10">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Home</h1>
          <Link
            to="/search"
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Pesquisar relatos"
          >
            <Search className="w-4.5 h-4.5" />
          </Link>
          <Link
            to="/reddit"
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Explorar o Universo"
          >
            <Globe className="w-4.5 h-4.5" />
          </Link>
          <button 
            onClick={onToggleTheme}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer flex items-center justify-center"
            title={appTheme === 'light' ? 'Ativar Modo Escuro' : 'Ativar Modo Claro Temático'}
          >
            {appTheme === 'light' ? (
              <Moon className="w-4.5 h-4.5 text-amber-500" strokeWidth={2} />
            ) : (
              <Sun className="w-4.5 h-4.5 text-yellow-400 animate-pulse" strokeWidth={2} />
            )}
          </button>
        </div>
        {selectedHashtag && (
          <div className="flex items-center gap-2 self-start bg-purple-500/10 border border-purple-500/30 text-purple-300 px-3 py-1.5 rounded-full text-xs font-mono">
            <span>Filtrando por: <strong>{selectedHashtag}</strong></span>
            <button
              onClick={() => setSelectedHashtag(null)}
              className="hover:text-white transition-colors ml-1 bg-purple-500/20 hover:bg-purple-500/40 p-0.5 rounded-full"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {sortedPosts.length === 0 && selectedHashtag ? (
          <div className="text-center py-20 bg-white/[0.02] rounded-[28px] border border-white/5 border-dashed">
            <p className="text-slate-500 font-medium text-[15px]">Nenhum post encontrado com essa hashtag.</p>
            <button onClick={() => setSelectedHashtag(null)} className="mt-4 text-purple-400 font-medium text-sm hover:underline">
              Limpar Filtro
            </button>
          </div>
        ) : (
          allItems.map((item, absoluteIdx) => {
            // Check if a LibraryHighlights should be inserted before this index
            const librarySlot = !selectedHashtag ? librarySlots.find(s => s.idx === absoluteIdx) : undefined;

            if (item.type === 'user') {
              const post = item.post as Post;
              const author = users.find(u => u.id === post.userId) || users.find(u => u.id === 'user_me') || users[0] || {
                id: post.userId || 'unknown',
                username: 'shifter',
                displayName: 'Visitante',
                avatar: 'https://api.dicebear.com/9.x/notionists/svg?seed=default',
                bio: '',
                followers: [],
                following: []
              };
              return (
                <React.Fragment key={item.uniqueKey}>
                  {librarySlot && (
                    <LibraryHighlights
                      currentUser={currentUser}
                      onPublishEBookPost={onPublishEBookPost}
                      title={librarySlot.title}
                      startIndex={librarySlot.startIndex}
                      themeColor={librarySlot.themeColor}
                    />
                  )}
                  <PostCard
                    post={post}
                    author={author}
                    onLike={onLike}
                    onComment={onComment}
                    isSaved={savedPostIds.includes(post.id)}
                    onToggleSave={onToggleSave}
                    onRepost={onRepost}
                    onHashtagClick={(tag) => setSelectedHashtag(tag)}
                    onDelete={onDeletePost}
                    currentUser={currentUser}
                  />
                </React.Fragment>
              );
            }

            // Reddit post — only show when not filtering by hashtag
            if (item.type === 'reddit' && !selectedHashtag) {
              const rPost = item.post as RedditPost;
              return (
                <React.Fragment key={item.uniqueKey}>
                  {librarySlot && (
                    <LibraryHighlights
                      currentUser={currentUser}
                      onPublishEBookPost={onPublishEBookPost}
                      title={librarySlot.title}
                      startIndex={librarySlot.startIndex}
                      themeColor={librarySlot.themeColor}
                    />
                  )}
                  <RedditPostCard post={rPost} />
                </React.Fragment>
              );
            }

            // Reddit item but hashtag filter active — skip Reddit posts
            return null;
          })
        )}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-10 w-full flex items-center justify-center mt-4">
        {sortedPosts.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-slate-500 font-mono">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
            Carregando mais posts...
          </div>
        )}
      </div>
    </div>
  );
}
