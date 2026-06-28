import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, MoreVertical, Bookmark, Repeat2, BookOpen, ChevronDown, Eye, ArrowRight, Headphones, Forward, Trash2 } from 'lucide-react';
import { Post, User, EBook } from '../types';
import { MOCK_EBOOKS } from '../data/ebooks';
import { CURRENT_USER, getStoredData } from '../store';
import { cn } from '../utils';
import { ImmersivePostReader } from './ImmersivePostReader';

const formatConciseTime = (dateInput: Date | string | number) => {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "1 min";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSecs = Math.max(0, Math.floor(diffMs / 1000));
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return "1 min";
    }
    if (diffMins < 60) {
      return `${diffMins} min`;
    }
    if (diffHours < 24) {
      return `${diffHours} h`;
    }
    if (diffDays < 30) {
      return `${diffDays} d`;
    }
    return d.toLocaleDateString();
  } catch (e) {
    return "1 min";
  }
};


interface PostCardProps {
  key?: React.Key | string;
  post: Post;
  author: User;
  onLike: (postId: string) => void;
  onComment: (postId: string, content: string) => void;
  isSaved?: boolean;
  onToggleSave?: (postId: string) => void;
  onRepost?: (postId: string) => void;
  onHashtagClick?: (tag: string) => void;
  onDelete?: (postId: string) => void;
  currentUser?: User;
}

export function PostCard({ 
  post, 
  author, 
  onLike, 
  onComment, 
  isSaved = false, 
  onToggleSave, 
  onRepost, 
  onHashtagClick,
  onDelete,
  currentUser
}: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [imageError, setImageError] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isReaderOpen, setIsReaderOpen] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [isHeaderFooterBlurred, setIsHeaderFooterBlurred] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Resolve related eBook ID (either stored explicitly or inferred from title)
  const resolvedEBookId = useMemo(() => {
    if (post.relatedEBookId) return post.relatedEBookId;

    if (post.title && post.title.includes('NOVO E-BOOK PUBLICADO:')) {
      const match = post.title.match(/NOVO E-BOOK PUBLICADO:\s*(.+?)(?:!|$)/i);
      if (match) {
        const ebookTitle = match[1].trim().toUpperCase();
        
        const stored = localStorage.getItem('shifting_ebooks');
        let allEbooksList: EBook[] = [];
        try {
          const customList = stored ? JSON.parse(stored) : [];
          allEbooksList = [...customList, ...MOCK_EBOOKS];
        } catch (e) {
          allEbooksList = MOCK_EBOOKS;
        }

        const found = allEbooksList.find(b => {
          const bTitle = b.title.trim().toUpperCase();
          return bTitle === ebookTitle || ebookTitle.includes(bTitle) || bTitle.includes(ebookTitle);
        });
        if (found) return found.id;
      }
    }
    return null;
  }, [post.relatedEBookId, post.title]);
  
  const activeUser = currentUser || CURRENT_USER;
  const isLikedByMe = post.likes.includes(activeUser.id);
  const isPostOwner = post.userId === activeUser.id || author.id === activeUser.id;

  const likingUsers = useMemo(() => {
    const { users } = getStoredData();
    return post.likes
      .map(id => users.find(u => u.id === id))
      .filter((u): u is User => !!u);
  }, [post.likes]);

  const repostingUsers = useMemo(() => {
    const { posts, users } = getStoredData();
    const reposts = posts.filter(p => p.repostOf === post.id);
    return reposts
      .map(p => users.find(u => u.id === p.userId))
      .filter((u): u is User => !!u);
  }, [post.id]);

  const commentingUsers = useMemo(() => {
    const { users } = getStoredData();
    const uniqueUserIds = Array.from(new Set(post.comments.map(c => c.userId)));
    return uniqueUserIds
      .map(id => users.find(u => u.id === id))
      .filter((u): u is User => !!u);
  }, [post.comments]);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      onComment(post.id, commentText);
      setCommentText('');
    }
  };

  const handleShare = () => {
    const textToCopy = `${window.location.origin}/profile/${post.userId}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      setToast('Link copiado para a área de transferência! 🔗');
      setTimeout(() => setToast(null), 3000);
    }).catch(() => {
      // Fallback
      const input = document.createElement('input');
      input.value = textToCopy;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setToast('Link copiado! 🔗');
      setTimeout(() => setToast(null), 3000);
    });
  };

  const handleRepostClick = () => {
    if (onRepost) {
      onRepost(post.id);
      setToast('Post repostado com sucesso! 🔄');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // If the click is on an interactive element (button, anchor, or custom controls), do not trigger expansion
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('textarea') || target.closest('.no-card-click')) {
      return;
    }

    if (!isContentExpanded) {
      setIsContentExpanded(true);
      setIsHeaderFooterBlurred(true);
    } else {
      setIsHeaderFooterBlurred(!isHeaderFooterBlurred);
    }
  };

  const shouldBlur = isContentExpanded && isHeaderFooterBlurred;

  return (
    <div 
      onClick={handleCardClick}
      className="group/card shifting-card cursor-pointer rounded-none sm:rounded-[28px] overflow-hidden mb-px sm:mb-5 relative border-0 sm:border border-white/[0.06] border-t-white/[0.12] dark:border-white/[0.06] dark:border-t-white/[0.12] app-light-mode:border-slate-200/50 app-light-mode:border-t-white/90 shadow-none sm:shadow-[0_20px_50px_rgba(0,0,0,0.25),0_4px_12px_rgba(126,58,242,0.02)] dark:shadow-none dark:sm:shadow-[0_20px_50px_rgba(0,0,0,0.25),0_4px_12px_rgba(126,58,242,0.02)] app-light-mode:shadow-none app-light-mode:sm:shadow-[0_16px_36px_-8px_rgba(0,0,0,0.05)] hover:sm:translate-y-[-3px] transition-all duration-300 ease-out border-b border-white/[0.04] sm:border-b-0"
    >
      {post.repostedBy && (
        <div className="flex items-center gap-1.5 px-5 sm:px-7 pt-4 text-[12px] font-medium text-purple-400">
          <Repeat2 className="w-3.5 h-3.5" />
          <span>{post.repostedBy} repostou</span>
        </div>
      )}

      <div className="py-5 px-5 sm:py-6.5 sm:px-8 flex flex-col justify-between min-h-[440px] sm:min-h-[480px] flex-1 relative overflow-hidden">
        {/* Soft subtle gradient glow behind the top of the text block */}
        <div className="absolute top-0 right-0 w-48 h-24 bg-gradient-to-b from-purple-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* 1. HEADER SECTION (Full Width Flex Row) */}
        <div className={cn(
          "flex items-center justify-between w-full mb-4.5 transition-all duration-500 ease-in-out origin-center",
          shouldBlur && "blur-[5px] scale-[0.96] opacity-35 hover:blur-none hover:scale-100 hover:opacity-100"
        )}>
          {/* User Info Group (Avatar + Name) */}
          <div className="flex items-center gap-3">
            <Link to={`/profile/${author.id}`} className="block relative group shrink-0">
              <img 
                src={author.avatar} 
                alt={author.username} 
                onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/9.x/notionists/svg?seed=${author.username}`; }}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#1e1a2b] object-cover ring-2 ring-purple-500/10 group-hover:ring-purple-500/50 transition-all duration-300"
              />
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#151224] dark:border-[#151224] app-light-mode:border-white shadow-sm" />
            </Link>

            <Link to={`/profile/${author.id}`} className="group flex flex-col items-start leading-tight">
              <span className="font-bold text-slate-100 dark:text-slate-100 app-light-mode:text-[#110c22] text-[15px] sm:text-[16.5px] group-hover:text-purple-400 transition-colors tracking-tight">
                {author.displayName}
              </span>
              <span className="text-[11.5px] sm:text-[12.5px] text-slate-400 dark:text-slate-400 app-light-mode:text-slate-400 font-medium">
                @{author.username}
              </span>
            </Link>
          </div>

          {/* Post Utilities & Time */}
          <div className="flex items-center space-x-2 text-slate-400 dark:text-slate-400 app-light-mode:text-slate-400 text-xs sm:text-[13px]">
            <span>{formatConciseTime(post.createdAt)}</span>
            
            <div className="flex items-center space-x-1.5 ml-1">
              <button 
                onClick={() => onToggleSave && onToggleSave(post.id)}
                className={cn(
                  "text-slate-400 hover:text-purple-400 dark:text-slate-400 app-light-mode:text-slate-400 transition-all p-1 rounded-lg hover:bg-purple-600/10 flex items-center",
                  isSaved ? "text-purple-400 dark:text-purple-300" : ""
                )}
                title={isSaved ? "Remover dos salvos" : "Salvar relato"}
              >
                <Bookmark className={cn("w-4 h-4", isSaved && "fill-current text-purple-400 dark:text-purple-300")} />
              </button>
              <button 
                onClick={() => setIsReaderOpen(true)}
                className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 dark:border-purple-500/30 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-200 flex items-center justify-center transition-all duration-300 shadow-sm"
                title="Sintonizar Leitura Imersiva"
              >
                <Headphones className="w-3.5 h-3.5 animate-pulse" />
              </button>
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDropdown(!showDropdown);
                  }}
                  className="text-slate-400 hover:text-purple-600 dark:hover:text-purple-300 app-light-mode:hover:text-purple-600 transition-colors p-1 rounded-lg hover:bg-white/5 flex items-center justify-center cursor-pointer"
                  title="Opções do Relato"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-30 cursor-default" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDropdown(false);
                      }}
                    />
                    <div className="absolute right-0 mt-1 w-48 bg-[#1a1725] border border-white/10 rounded-xl shadow-2xl py-1.5 z-40 animate-in fade-in slide-in-from-top-2 duration-150 no-card-click">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDropdown(false);
                          handleShare();
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-purple-600/20 transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Copiar link</span>
                      </button>
                      {isPostOwner && onDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDropdown(false);
                            if (window.confirm("Deseja realmente excluir este relato?")) {
                              onDelete(post.id);
                            }
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors flex items-center gap-2 border-t border-white/5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir relato</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2. CONTENT SECTION (Spans Full width & Flex-grows to push Interaction Bar) */}
        <div className="flex-1 flex flex-col justify-start w-full mb-5">
          {/* Hashtags */}
          {post.hashtags && post.hashtags.length > 0 && (
            <div className={cn(
              "flex flex-row flex-wrap items-center gap-3.5 mb-3.5 transition-all duration-500 ease-in-out origin-left",
              shouldBlur && "blur-[5px] scale-[0.96] opacity-35 hover:blur-none hover:scale-100 hover:opacity-100"
            )}>
              {post.hashtags.map((tag, index) => (
                <button 
                  key={index} 
                  onClick={() => onHashtagClick && onHashtagClick(tag)}
                  className="text-[12.5px] sm:text-[13.5px] font-bold text-purple-400 dark:text-purple-300/95 hover:text-purple-300 dark:hover:text-purple-100 transition-all cursor-pointer whitespace-nowrap font-sans tracking-wide hover:underline decoration-purple-400/30 underline-offset-4"
                >
                  {tag.startsWith('#') ? tag : `#${tag}`}
                </button>
              ))}
            </div>
          )}

          {/* Subtitle / Post Title */}
          {post.title && (
            <h3 className="text-[18px] sm:text-[21px] font-extrabold text-white dark:text-white app-light-mode:text-[#110c22] mb-3 tracking-tight leading-snug">
              {post.title}
            </h3>
          )}

          {/* Body Content with premium fade/blur */}
          <div className="mb-4">
            {(post.content.length > 200 || (post.content.match(/\n/g) || []).length > 2) && !isContentExpanded ? (
              <div className="relative">
                <div className="max-h-[160px] overflow-hidden relative">
                  <p className="text-slate-100 dark:text-slate-100 app-light-mode:text-[#2d264d] text-[15px] sm:text-[16.5px] leading-[1.8] whitespace-pre-wrap break-words font-sans tracking-wide">
                    {post.content}
                  </p>
                  <div className="absolute bottom-0 left-0 right-0 h-24 post-fade-overlay pointer-events-none flex items-end justify-center pb-2 z-20">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsContentExpanded(true);
                        setIsHeaderFooterBlurred(true);
                      }}
                      className="font-serif-elegant italic text-[15px] sm:text-[16.5px] font-bold text-white bg-purple-600/80 dark:bg-purple-500/80 app-light-mode:bg-purple-500/90 hover:bg-purple-600 dark:hover:bg-purple-400 hover:scale-105 px-6 py-1.5 rounded-full shadow-[0_4px_15px_rgba(255,77,109,0.25)] transition-all cursor-pointer pointer-events-auto backdrop-blur-md border border-white/10 dark:border-white/10 app-light-mode:border-purple-500/10 z-30"
                      title="Expandir relato para leitura imersiva"
                    >
                      Leia mais
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-100 dark:text-slate-100 app-light-mode:text-[#2d264d] text-[15px] sm:text-[16.5px] leading-[1.8] whitespace-pre-wrap break-words font-sans tracking-wide animate-fade-in duration-300">
                {post.content}
              </p>
            )}
          </div>

          {post.image && !imageError && (
            <div className={cn(
              "mb-4 rounded-xl overflow-hidden bg-black/10 dark:bg-black/40 border border-slate-200 dark:border-white/5 relative group/imgContainer",
              post.focusOnText ? "max-h-[160px] max-w-[280px] mx-auto opacity-75 hover:opacity-100 transition-opacity" : ""
            )}>
              <img 
                src={post.image} 
                alt="Post attachment" 
                className="w-full h-auto object-contain max-h-[450px]"
                onError={() => setImageError(true)}
              />
              
              {resolvedEBookId && (
                <div className="absolute inset-0 bg-black/35 flex items-center justify-center opacity-100 transition-opacity duration-300">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const element = document.querySelector(`[data-ebook-id="${resolvedEBookId}"]`) as HTMLElement;
                      if (element) {
                        // 1. Scroll window to center vertically
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        
                        // 2. Scroll horizontal container to center horizontally
                        const container = element.parentElement;
                        if (container) {
                          const containerWidth = container.clientWidth;
                          const cardWidth = element.clientWidth;
                          const cardLeft = element.offsetLeft;
                          const targetScrollLeft = cardLeft - (containerWidth / 2) + (cardWidth / 2);
                          
                          container.scrollTo({
                            left: targetScrollLeft,
                            behavior: 'smooth'
                          });
                        }
                        
                        element.classList.add('highlight-pulse-effect');
                        setTimeout(() => {
                          element.classList.remove('highlight-pulse-effect');
                        }, 3000);
                      }
                    }}
                    className="px-6 py-3 bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_4px_15px_rgba(5,150,105,0.4)] flex items-center gap-1.5 cursor-pointer scale-90 sm:scale-100 active:scale-95 no-card-click"
                  >
                    <BookOpen className="w-4 h-4 text-white" />
                    <span>Acessar E-book</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. INTERACTION BAR (Anchored at the bottom) */}
        <div className={cn(
          "flex items-end justify-between pt-4 mt-2 border-t border-white/[0.04] dark:border-white/[0.04] app-light-mode:border-slate-200/20 text-slate-400 transition-all duration-500 ease-in-out origin-center",
          shouldBlur && "blur-[5px] scale-[0.96] opacity-35 hover:blur-none hover:scale-100 hover:opacity-100"
        )}>
          <div className="flex items-center gap-7 sm:gap-9">
            {/* Like action: Heart + overlapping avatars, "Curtir" label below */}
            <button 
              onClick={() => onLike(post.id)}
              className="flex flex-col items-center gap-1 group transition-all"
            >
              <div className="flex items-center gap-2 h-7.5">
                <Heart strokeWidth={1.6} className={cn("w-5.5 h-5.5 transition-transform group-hover:scale-110", isLikedByMe ? "fill-white text-white shadow-[0_0_12px_rgba(255,255,255,0.4)]" : "text-slate-300 dark:text-slate-300 app-light-mode:text-slate-600")} />
                {likingUsers.length > 0 && (
                  <div className="flex -space-x-2.5 overflow-hidden select-none ml-0.5">
                    {likingUsers.slice(0, 3).map((user) => (
                      <img
                        key={user.id}
                        className="inline-block h-5.5 w-5.5 rounded-full ring-2 ring-[#151224] dark:ring-[#151224] app-light-mode:ring-white object-cover"
                        src={user.avatar}
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/9.x/notionists/svg?seed=${user.username}`; }}
                        alt={user.displayName}
                      />
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[11px] font-bold tracking-wide text-slate-400 dark:text-slate-400 app-light-mode:text-slate-500 group-hover:text-purple-400 transition-colors">
                Curtir
              </span>
            </button>

            {/* Comment action: Message icon + overlapping avatars, space/count below */}
            <button 
              onClick={() => setShowComments(!showComments)}
              className="flex flex-col items-center gap-1 group transition-all"
            >
              <div className="flex items-center gap-2 h-7.5">
                <MessageCircle strokeWidth={1.6} className="w-5.5 h-5.5 text-slate-300 dark:text-slate-300 app-light-mode:text-slate-600 transition-transform group-hover:scale-110" />
                {commentingUsers.length > 0 && (
                  <div className="flex -space-x-2.5 overflow-hidden select-none ml-0.5">
                    {commentingUsers.slice(0, 3).map((user, idx) => (
                      <img
                        key={user.id || idx}
                        className="inline-block h-5.5 w-5.5 rounded-full ring-2 ring-[#151224] dark:ring-[#151224] app-light-mode:ring-white object-cover"
                        src={user.avatar}
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/9.x/notionists/svg?seed=${user.username}`; }}
                        alt={user.displayName}
                      />
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[11px] font-bold tracking-wide text-slate-400 dark:text-slate-400 app-light-mode:text-slate-500 group-hover:text-purple-400 transition-colors h-[16px] block">
                {post.comments.length > 0 ? `${post.comments.length}` : 'Comentar'}
              </span>
            </button>

            {/* Repost/Share action: Curved arrow / repost + overlapping avatars, count below */}
            <button 
              onClick={handleRepostClick}
              className="flex flex-col items-center gap-1 group transition-all"
            >
              <div className="flex items-center gap-2 h-7.5">
                <Forward strokeWidth={1.6} className="w-5.5 h-5.5 text-slate-300 dark:text-slate-300 app-light-mode:text-slate-600 transition-transform group-hover:scale-110" />
                {repostingUsers.length > 0 && (
                  <div className="flex -space-x-2.5 overflow-hidden select-none ml-0.5">
                    {repostingUsers.slice(0, 3).map((user) => (
                      <img
                        key={user.id}
                        className="inline-block h-5.5 w-5.5 rounded-full ring-2 ring-[#151224] dark:ring-[#151224] app-light-mode:ring-white object-cover"
                        src={user.avatar}
                        onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/9.x/notionists/svg?seed=${user.username}`; }}
                        alt={user.displayName}
                      />
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[11px] font-bold tracking-wide text-slate-400 dark:text-slate-400 app-light-mode:text-slate-500 group-hover:text-purple-400 transition-colors">
                {repostingUsers.length > 0 ? `${repostingUsers.length}` : 'Repostar'}
              </span>
            </button>

            {/* Share/Link action */}
            <button 
              onClick={handleShare}
              className="flex flex-col items-center gap-1 group transition-all"
              title="Compartilhar Link"
            >
              <div className="flex items-center gap-2 h-7.5">
                <Share2 strokeWidth={1.6} className="w-5 h-5 text-slate-300 dark:text-slate-300 app-light-mode:text-slate-600 transition-transform group-hover:scale-110" />
              </div>
              <span className="text-[11px] font-bold tracking-wide text-slate-400 dark:text-slate-400 app-light-mode:text-slate-500 group-hover:text-purple-400 transition-colors h-[16px] block">
                Enviar
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Visual feedback Toast inside the card */}
      {toast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-purple-900/95 backdrop-blur-lg border border-purple-500/30 px-4 py-2 rounded-full text-white text-xs font-medium z-50 shadow-2xl flex items-center gap-2 animate-fade-in duration-300">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
          {toast}
        </div>
      )}

      {showComments && (
        <div className="bg-white/[0.02] p-5 sm:p-6 border-t border-white/5">
          <div className="space-y-4 mb-5 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {post.comments.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No comments yet. Be the first to reply!</p>
            ) : (
              post.comments.map(comment => (
                <div key={comment.id} className="flex space-x-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 shrink-0 overflow-hidden border border-white/10">
                      <img 
                        src={
                          comment.userId === activeUser.id 
                            ? activeUser.avatar 
                            : (getStoredData().users.find(u => u.id === comment.userId)?.avatar || `https://api.dicebear.com/9.x/notionists/svg?seed=${comment.userId}`)
                        } 
                        onError={(e) => { 
                          const username = comment.userId === activeUser.id 
                            ? activeUser.username 
                            : (getStoredData().users.find(u => u.id === comment.userId)?.username || comment.userId);
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/9.x/notionists/svg?seed=${username}`; 
                        }}
                        alt="avatar" 
                      />
                  </div>
                  <div className="bg-[#1a1725] p-3.5 rounded-2xl rounded-tl-none border border-white/5 flex-1">
                    <span className="text-[11px] font-semibold text-purple-400 block mb-1">
                      {(() => {
                        const commenter = comment.userId === activeUser.id 
                          ? activeUser 
                          : getStoredData().users.find(u => u.id === comment.userId);
                        return commenter?.displayName || `Viajante (${comment.userId.slice(0, 5)})`;
                      })()}
                    </span>
                    <p className="text-sm text-slate-200">{comment.content}</p>
                    <p className="text-xs text-slate-500 mt-2">{formatConciseTime(comment.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <form onSubmit={handleCommentSubmit} className="flex items-center space-x-3">
            <img 
              src={activeUser.avatar} 
              onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/9.x/notionists/svg?seed=${activeUser.username}`; }}
              alt="Me" 
              className="w-9 h-9 rounded-full border border-white/10 bg-slate-800" 
            />
            <input 
              type="text" 
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..." 
              className="flex-1 bg-[#0c0a13] border border-white/5 rounded-full px-5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all"
            />
            <button 
              type="submit"
              disabled={!commentText.trim()}
              className="px-4 py-2 font-semibold text-sm bg-purple-600/20 text-purple-300 rounded-full hover:bg-purple-600/30 disabled:opacity-50 disabled:hover:bg-purple-600/20 transition-colors"
            >
              Post
            </button>
          </form>
        </div>
      )}
      {isReaderOpen && (
        <ImmersivePostReader 
          post={post}
          author={author}
          onClose={() => setIsReaderOpen(false)}
          isLiked={isLikedByMe}
          isSaved={isSaved}
          onLike={() => onLike(post.id)}
          onToggleSave={onToggleSave ? () => onToggleSave(post.id) : undefined}
        />
      )}
    </div>
  );
}
