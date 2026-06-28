import React, { useState, useEffect } from 'react';
import { Bookmark, BookOpen, Heart, Trash2, ArrowLeft } from 'lucide-react';
import { Post, User, EBook } from '../types';
import { PostCard } from './PostCard';
import { getSavedEBookIds, getAllEBooks, toggleSaveEBook, toggleLikeEBook, getLikedEBookIds } from '../utils/ebookStore';
import { EBookReader } from './EBookReader';

interface SavedPageProps {
  posts: Post[];
  users: User[];
  savedPostIds: string[];
  currentUser: User;
  onLike: (postId: string) => void;
  onComment: (postId: string, content: string) => void;
  onToggleSave: (postId: string) => void;
  onRepost: (postId: string) => void;
  onDeletePost?: (postId: string) => void;
}

export function SavedPage({
  posts,
  users,
  savedPostIds,
  currentUser,
  onLike,
  onComment,
  onToggleSave,
  onRepost,
  onDeletePost
}: SavedPageProps) {
  const [activeTab, setActiveTab] = useState<'posts' | 'ebooks'>('posts');
  const [savedEBooks, setSavedEBooks] = useState<EBook[]>([]);
  const [likedEBookIds, setLikedEBookIds] = useState<string[]>(getLikedEBookIds());
  const [readingEBook, setReadingEBook] = useState<EBook | null>(null);

  // Load saved e-books
  const loadSavedEBooks = () => {
    const savedIds = getSavedEBookIds();
    const allBooks = getAllEBooks();
    const filtered = allBooks.filter(book => savedIds.includes(book.id));
    setSavedEBooks(filtered);
    setLikedEBookIds(getLikedEBookIds());
  };

  useEffect(() => {
    loadSavedEBooks();

    // Listen for storage events to update list
    window.addEventListener('shifting_ebook_saves_updated', loadSavedEBooks);
    window.addEventListener('shifting_ebook_likes_updated', loadSavedEBooks);

    return () => {
      window.removeEventListener('shifting_ebook_saves_updated', loadSavedEBooks);
      window.removeEventListener('shifting_ebook_likes_updated', loadSavedEBooks);
    };
  }, []);

  const savedPosts = posts.filter(p => savedPostIds.includes(p.id)).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="w-full py-8 px-4 relative z-10 flex flex-col">
      <div className="mb-6 px-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
          <Bookmark className="w-6 h-6 text-purple-400 fill-purple-400/20" />
          <span>Itens Salvos</span>
        </h1>

        {/* Tab switchers */}
        <div className="flex bg-[#110e19]/80 border border-white/5 p-1 rounded-full self-start">
          <button
            onClick={() => setActiveTab('posts')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'posts'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Posts ({savedPosts.length})
          </button>
          <button
            onClick={() => setActiveTab('ebooks')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'ebooks'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            E-Books ({savedEBooks.length})
          </button>
        </div>
      </div>

      {currentUser.id === 'user_me' && (savedPosts.length > 0 || savedEBooks.length > 0) && (
        <div className="mb-6 mx-2 bg-amber-500/10 border border-amber-500/20 rounded-[24px] p-4 text-xs text-amber-300 flex items-start gap-3">
          <span className="text-lg select-none">⚠️</span>
          <div>
            <p className="font-bold text-amber-400">Você está visualizando itens salvos como Visitante</p>
            <p className="mt-0.5 text-[#eab308]/80 leading-relaxed">
              Estes itens estão salvos apenas temporariamente no seu navegador. Para mantê-los seguros permanentemente e sincronizá-los com todos os seus dispositivos, faça login na sua conta!
            </p>
          </div>
        </div>
      )}

      {activeTab === 'posts' ? (
        savedPosts.length === 0 ? (
          <div className="text-center py-24 bg-white/[0.02] rounded-[28px] border border-white/5 border-dashed">
            <Bookmark className="w-12 h-12 text-slate-600 mx-auto mb-4 stroke-1" />
            <p className="text-slate-500 font-medium text-[15px]">Nenhum post salvo ainda.</p>
            <p className="text-xs text-slate-600 mt-2">Salve posts clicando no ícone de salvar em qualquer post do feed.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {savedPosts.map(post => {
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
                <PostCard
                  key={post.id}
                  post={post}
                  author={author}
                  onLike={onLike}
                  onComment={onComment}
                  isSaved={true}
                  onToggleSave={onToggleSave}
                  onRepost={onRepost}
                  onDelete={onDeletePost}
                  currentUser={currentUser}
                />
              );
            })}
          </div>
        )
      ) : (
        savedEBooks.length === 0 ? (
          <div className="text-center py-24 bg-white/[0.02] rounded-[28px] border border-white/5 border-dashed">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4 stroke-1" />
            <p className="text-slate-500 font-medium text-[15px]">Nenhum e-book salvo ainda.</p>
            <p className="text-xs text-slate-600 mt-2">Salve e-books clicando no ícone de marcador nos carrosséis da biblioteca.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 px-2">
            {savedEBooks.map(ebook => {
              const isLiked = likedEBookIds.includes(ebook.id);
              return (
                <div key={ebook.id} className="bg-[#15121e]/40 border border-white/5 rounded-2xl p-3 flex flex-col group transition-all hover:border-purple-500/20">
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-3 border border-white/5 bg-[#120f1d] shadow-md">
                    <img
                      src={ebook.coverImage}
                      alt={ebook.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80 group-hover:opacity-100 mix-blend-luminosity"
                    />

                    {/* floating overlay buttons */}
                    <div className="absolute top-2 left-2 flex gap-1.5 z-10">
                      <button
                        onClick={() => toggleLikeEBook(ebook.id)}
                        className={`p-1.5 rounded-lg border backdrop-blur-md transition-all active:scale-90 cursor-pointer ${
                          isLiked
                            ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                            : 'bg-black/60 border-white/10 text-slate-300 hover:text-rose-400'
                        }`}
                        title="Curtir"
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500' : ''}`} />
                      </button>

                      <button
                        onClick={() => toggleSaveEBook(ebook.id)}
                        className="p-1.5 rounded-lg border backdrop-blur-md transition-all active:scale-90 cursor-pointer bg-purple-500/20 border-purple-500 text-purple-300 hover:text-rose-400"
                        title="Remover dos salvos"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-purple-400 hover:text-rose-400" />
                      </button>
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-3">
                      <span className="text-purple-300 text-[10px] font-mono uppercase tracking-widest font-bold mb-1 truncate">
                        {ebook.authorName || 'BIBLIOTECA'}
                      </span>
                      <span className="text-white text-xs font-bold leading-tight line-clamp-2">
                        {ebook.title}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setReadingEBook(ebook)}
                    className="w-full py-1.5 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-300 hover:bg-purple-600 hover:text-white text-xs font-bold transition-all cursor-pointer mt-auto"
                  >
                    Ler E-Book
                  </button>
                </div>
              );
            })}
          </div>
        )
      )}

      {readingEBook && (
        <EBookReader
          ebook={readingEBook}
          onClose={() => setReadingEBook(null)}
          onOpenCreator={() => {}}
          isPurchased={true}
          onTriggerPurchase={() => {}}
        />
      )}
    </div>
  );
}
