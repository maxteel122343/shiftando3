import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MOCK_EBOOKS } from '../data/ebooks';
import { EBook, User } from '../types';
import { EBookReader } from './EBookReader';
import { EBookCreatorModal } from './EBookCreatorModal';
import { EBookPurchaseModal } from './EBookPurchaseModal';
import { Sparkles, BookOpen, Lock, Heart, Bookmark } from 'lucide-react';
import { getLikedEBookIds, toggleLikeEBook, getSavedEBookIds, toggleSaveEBook } from '../utils/ebookStore';
import { isConfigured as isSupabaseConfigured, getEBooksSupabase, createEBookSupabase, deleteEBookSupabase } from '../utils/supabase';

interface LibraryHighlightsProps {
  currentUser: User;
  onPublishEBookPost: (title: string, authorName: string, coverImage: string, description: string, ebookId: string) => void;
  title?: string;
  startIndex?: number;
  themeColor?: 'purple' | 'indigo' | 'emerald' | 'amber';
}

export function LibraryHighlights({ 
  currentUser, 
  onPublishEBookPost,
  title = "Biblioteca de Shifting",
  startIndex = 0,
  themeColor = "purple"
}: LibraryHighlightsProps) {
  const [readingEbook, setReadingEbook] = useState<EBook | null>(null);
  const [customEbooks, setCustomEbooks] = useState<EBook[]>([]);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [purchasedIds, setPurchasedIds] = useState<string[]>([]);
  const [purchasingEbook, setPurchasingEbook] = useState<EBook | null>(null);
  
  const [likedIds, setLikedIds] = useState<string[]>(getLikedEBookIds());
  const [savedIds, setSavedIds] = useState<string[]>(getSavedEBookIds());

  const containerRef = useRef<HTMLDivElement>(null);
  const isAdjustingScroll = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  const [isCreatorHidden, setIsCreatorHidden] = useState(() => {
    return localStorage.getItem('hide_ebook_creator') === 'true';
  });

  useEffect(() => {
    const checkHidden = () => {
      setIsCreatorHidden(localStorage.getItem('hide_ebook_creator') === 'true');
    };
    window.addEventListener('shifting_hide_creator_toggle', checkHidden);
    return () => {
      window.removeEventListener('shifting_hide_creator_toggle', checkHidden);
    };
  }, []);

  // Listen to like/save/list changes across components
  useEffect(() => {
    const updateLikes = () => setLikedIds(getLikedEBookIds());
    const updateSaves = () => setSavedIds(getSavedEBookIds());
    const updateEBooks = async () => {
      if (isSupabaseConfigured) {
        const dbEbooks = await getEBooksSupabase();
        setCustomEbooks(dbEbooks);
      } else {
        const stored = localStorage.getItem('shifting_ebooks');
        if (stored) {
          try {
            setCustomEbooks(JSON.parse(stored));
          } catch (e) {
            console.error("Error loading custom ebooks", e);
          }
        } else {
          setCustomEbooks([]);
        }
      }
    };

    window.addEventListener('shifting_ebook_likes_updated', updateLikes);
    window.addEventListener('shifting_ebook_saves_updated', updateSaves);
    window.addEventListener('shifting_ebooks_updated', updateEBooks);

    return () => {
      window.removeEventListener('shifting_ebook_likes_updated', updateLikes);
      window.removeEventListener('shifting_ebook_saves_updated', updateSaves);
      window.removeEventListener('shifting_ebooks_updated', updateEBooks);
    };
  }, []);

  // Load custom ebooks from localStorage or Supabase on mount
  useEffect(() => {
    async function loadInitialEBooks() {
      if (isSupabaseConfigured) {
        const dbEbooks = await getEBooksSupabase();
        setCustomEbooks(dbEbooks);
      } else {
        const stored = localStorage.getItem('shifting_ebooks');
        if (stored) {
          try {
            setCustomEbooks(JSON.parse(stored));
          } catch (e) {
            console.error("Error loading custom ebooks", e);
          }
        }
      }
    }

    loadInitialEBooks();

    const storedPurchased = localStorage.getItem('shifting_purchased_ebooks');
    if (storedPurchased) {
      try {
        setPurchasedIds(JSON.parse(storedPurchased));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handlePurchaseSuccess = (ebookId: string) => {
    const updated = [...purchasedIds, ebookId];
    setPurchasedIds(updated);
    localStorage.setItem('shifting_purchased_ebooks', JSON.stringify(updated));
  };

  const allEbooks = [...customEbooks, ...MOCK_EBOOKS];

  // Rotate/offset based on startIndex to highlight different ebooks
  const shiftedEbooks = allEbooks.length > 0
    ? [
        ...allEbooks.slice(startIndex % allEbooks.length),
        ...allEbooks.slice(0, startIndex % allEbooks.length)
      ]
    : [];

  // Repeat the books 3 times to allow infinite looping scroll
  const carouselEbooks = useMemo(() => {
    return Array.from({ length: 3 }).flatMap((_, i) => 
      shiftedEbooks.map((ebook, ebIdx) => ({
        ...ebook,
        uniqueId: `${ebook.id}_carousel_${i}_${ebIdx}`
      }))
    );
  }, [shiftedEbooks]);

  // Scroll exactly to the start of the center block (Block 1) on mount
  useEffect(() => {
    if (containerRef.current && shiftedEbooks.length > 0) {
      const container = containerRef.current;
      requestAnimationFrame(() => {
        const blockWidth = container.scrollWidth / 3;
        isAdjustingScroll.current = true;
        container.scrollLeft = blockWidth;
      });
    }
  }, [customEbooks, shiftedEbooks.length]);

  // Handle looping logic on scroll
  const handleScroll = () => {
    if (!containerRef.current || shiftedEbooks.length === 0) return;

    if (isAdjustingScroll.current) {
      isAdjustingScroll.current = false;
      return;
    }

    const container = containerRef.current;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    const blockWidth = scrollWidth / 3;

    // If we scroll too far left (into Block 0), shift to center block (Block 1)
    if (scrollLeft < blockWidth - 100) {
      isAdjustingScroll.current = true;
      container.scrollLeft = scrollLeft + blockWidth;
    }
    // If we scroll too far right (into Block 2), shift back to center block (Block 1)
    else if (scrollLeft + clientWidth > blockWidth * 2 + 100) {
      isAdjustingScroll.current = true;
      container.scrollLeft = scrollLeft - blockWidth;
    }
  };

  // Drag-to-scroll handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeftState(containerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    containerRef.current.scrollLeft = scrollLeftState - walk;
  };

  const handlePublishNewEBook = async (newEbook: EBook) => {
    if (isSupabaseConfigured && currentUser.id !== 'user_me') {
      const success = await createEBookSupabase(newEbook);
      if (!success) {
        console.warn("Falha ao salvar e-book no Supabase.");
      }
    }

    const stored = localStorage.getItem('shifting_ebooks');
    let currentCustom: EBook[] = [];
    if (stored) {
      try {
        currentCustom = JSON.parse(stored);
      } catch (e) {
        console.error("Error loading custom ebooks", e);
      }
    }
    
    if (!currentCustom.some(b => b.id === newEbook.id)) {
      const updated = [newEbook, ...currentCustom];
      localStorage.setItem('shifting_ebooks', JSON.stringify(updated));
      window.dispatchEvent(new Event('shifting_ebooks_updated'));
    }
    
    // Announce in Feed
    onPublishEBookPost(
      newEbook.title,
      newEbook.authorName || currentUser.displayName,
      newEbook.coverImage,
      newEbook.description || '',
      newEbook.id
    );
  };

  // Dynamic classes based on themeColor
  const themeClasses = {
    purple: {
      bg: "bg-purple-950/5 border-purple-500/5",
      glow: "bg-purple-500/5",
      text: "text-purple-400 font-bold",
      accent: "from-purple-600 to-purple-500"
    },
    indigo: {
      bg: "bg-indigo-950/5 border-indigo-500/5",
      glow: "bg-indigo-500/5",
      text: "text-indigo-400 font-bold",
      accent: "from-indigo-600 to-blue-600"
    },
    emerald: {
      bg: "bg-emerald-950/5 border-emerald-500/5",
      glow: "bg-emerald-500/5",
      text: "text-emerald-400 font-bold",
      accent: "from-emerald-600 to-teal-600"
    },
    amber: {
      bg: "bg-amber-950/5 border-amber-500/5",
      glow: "bg-amber-500/5",
      text: "text-amber-400 font-bold",
      accent: "from-amber-500 to-orange-500"
    }
  }[themeColor] || {
    bg: "bg-purple-950/5 border-purple-500/5",
    glow: "bg-purple-500/5",
    text: "text-purple-400 font-bold",
    accent: "from-purple-600 to-purple-500"
  };

  return (
    <div className={`w-full my-8 p-5 sm:p-6 rounded-[28px] relative border backdrop-blur-md shadow-[0_15px_45px_rgba(0,0,0,0.2)] dark:shadow-[0_15px_45px_rgba(0,0,0,0.2)] app-light-mode:shadow-[0_15px_35px_rgba(0,0,0,0.03)] bg-white/[0.01] dark:bg-white/[0.01] app-light-mode:bg-white/45 border-white/[0.06] dark:border-white/[0.06] app-light-mode:border-slate-200/40 border-t-white/[0.12] dark:border-t-white/[0.12] app-light-mode:border-t-white/80 ${themeClasses.bg}`}>
      <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full pointer-events-none ${themeClasses.glow}`}></div>
      
      <div className="flex justify-between items-center mb-4 px-2">
        <div className="flex items-center gap-2">
          <BookOpen className={`w-5 h-5 ${themeColor === 'purple' ? 'text-purple-400' : themeColor === 'indigo' ? 'text-indigo-400' : themeColor === 'emerald' ? 'text-emerald-400' : 'text-amber-400'}`} />
          <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs text-slate-500 font-mono">Arraste para navegar</span>
        </div>
      </div>

      <div 
        ref={containerRef}
        onScroll={handleScroll}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onDragStart={(e) => e.preventDefault()}
        className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar px-2 cursor-grab active:cursor-grabbing select-none"
      >
        {carouselEbooks.map((ebook) => {
          const isAuthor = ebook.authorId === currentUser.id;
          const isPurchased = !ebook.isPaid || isAuthor || purchasedIds.includes(ebook.id);
          const requiresPrePurchase = ebook.isPaid && !isPurchased && ebook.lockType === 'full';
          const isLiked = likedIds.includes(ebook.id);
          const isSaved = savedIds.includes(ebook.id);

          return (
            <div 
              key={ebook.uniqueId} 
              data-ebook-id={ebook.id} 
              className="flex-none w-36 sm:w-40 flex flex-col group relative rounded-2xl transition-all duration-300"
            >
              {/* Book Cover Container */}
              <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden mb-3 border border-white/5 bg-[#120f1d] shadow-lg">
                <img 
                  src={ebook.coverImage} 
                  alt={ebook.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80 group-hover:opacity-100 mix-blend-luminosity pointer-events-none"
                />

                {/* Floating Hearts & Saved Bookmarks Action buttons inside Card */}
                <div className="absolute top-2 left-2 flex gap-1.5 z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLikeEBook(ebook.id);
                    }}
                    className={`p-1.5 rounded-lg border backdrop-blur-md transition-all active:scale-90 cursor-pointer ${
                      isLiked 
                        ? 'bg-rose-500/20 border-rose-500 text-rose-400' 
                        : 'bg-black/60 border-white/10 text-slate-300 hover:text-rose-400 hover:border-rose-500/40'
                    }`}
                    title={isLiked ? "Curtido" : "Curtir"}
                  >
                    <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500' : ''}`} />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSaveEBook(ebook.id);
                    }}
                    className={`p-1.5 rounded-lg border backdrop-blur-md transition-all active:scale-90 cursor-pointer ${
                      isSaved 
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300' 
                        : 'bg-black/60 border-white/10 text-slate-300 hover:text-purple-300 hover:border-purple-500/40'
                    }`}
                    title={isSaved ? "Salvo" : "Salvar"}
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-purple-500' : ''}`} />
                  </button>
                </div>

                {/* Padlock Icon overlay for paid books */}
                {ebook.isPaid && !isPurchased && (
                  <div className="absolute top-2 right-2 p-1.5 bg-black/80 backdrop-blur-sm rounded-lg border border-purple-500/30 text-purple-300 z-10" title="E-book Premium">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-3">
                  <span className="text-purple-300 text-[10px] font-mono uppercase tracking-widest font-bold mb-1 truncate">
                    {ebook.authorName || 'BIBLIOTECA'}
                  </span>
                  <span className="text-white text-xs font-bold text-center tracking-wide leading-tight line-clamp-2">
                    {ebook.title}
                  </span>
                </div>
              </div>

              {/* Read / Buy Button */}
              {requiresPrePurchase ? (
                <button 
                  onClick={() => setPurchasingEbook(ebook)}
                  className="w-full py-1.5 rounded-xl bg-purple-600 border border-purple-500 text-white hover:bg-purple-700 text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-lg"
                >
                  <Lock className="w-3 h-3 shrink-0" />
                  <span>Comprar R$ {(ebook.price || 9.9).toFixed(2).replace('.', ',')}</span>
                </button>
              ) : (
                <button 
                  onClick={() => setReadingEbook(ebook)}
                  className="w-full py-1.5 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-300 hover:bg-purple-600 hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  {ebook.isPaid && !isPurchased ? 'Degustar' : 'Ler E-Book'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {readingEbook && (
        <EBookReader 
          ebook={readingEbook} 
          onClose={() => setReadingEbook(null)} 
          onOpenCreator={() => {
            setReadingEbook(null);
            setIsCreatorOpen(true);
          }}
          isPurchased={!readingEbook.isPaid || readingEbook.authorId === currentUser.id || purchasedIds.includes(readingEbook.id)}
          onTriggerPurchase={(ebook) => {
            setReadingEbook(null);
            setPurchasingEbook(ebook);
          }}
        />
      )}

      {isCreatorOpen && (
        <EBookCreatorModal
          isOpen={isCreatorOpen}
          onClose={() => setIsCreatorOpen(false)}
          currentUser={currentUser}
          onPublish={handlePublishNewEBook}
        />
      )}

      {purchasingEbook && (
        <EBookPurchaseModal
          ebook={purchasingEbook}
          isOpen={!!purchasingEbook}
          onClose={() => setPurchasingEbook(null)}
          onSuccess={() => handlePurchaseSuccess(purchasingEbook.id)}
        />
      )}
    </div>
  );
}
