import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Post, User, EBook } from '../types';
import { PostCard } from './PostCard';
import { ArrowLeft, UserPlus, Check, Edit, Camera, Save, X, BookOpen, Lock, Heart, Bookmark } from 'lucide-react';

import { isConfigured as isSupabaseConfigured, supabase, getEBooksSupabase, toUUID } from '../utils/supabase';
import { getAllEBooks, getLikedEBookIds, toggleLikeEBook, getSavedEBookIds, toggleSaveEBook } from '../utils/ebookStore';
import { EBookReader } from './EBookReader';
import { EBookPurchaseModal } from './EBookPurchaseModal';

interface ProfileProps {
  currentUser: User;
  posts: Post[];
  users: User[];
  onLike: (postId: string) => void;
  onComment: (postId: string, content: string) => void;
  onFollow: (userId: string) => void;
  savedPostIds?: string[];
  onToggleSave?: (postId: string) => void;
  onRepost?: (postId: string) => void;
  onUpdateProfile?: (updatedUser: User) => void;
  onDeletePost?: (postId: string) => void;
}

export function Profile({ 
  currentUser,
  posts, 
  users, 
  onLike, 
  onComment, 
  onFollow,
  savedPostIds = [],
  onToggleSave,
  onRepost,
  onUpdateProfile,
  onDeletePost
}: ProfileProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const profileUser = users.find(u => u.id === id);
  
  // Edit Profile States (Declared at the top level before any conditional return)
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profileUser?.displayName || '');
  const [username, setUsername] = useState(profileUser?.username || '');
  const [bio, setBio] = useState(profileUser?.bio || '');
  const [avatar, setAvatar] = useState(profileUser?.avatar || 'https://api.dicebear.com/9.x/notionists/svg?seed=default');

  const [allEbooks, setAllEbooks] = useState<EBook[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>(getLikedEBookIds());
  const [savedIds, setSavedIds] = useState<string[]>(getSavedEBookIds());
  const [purchasedIds, setPurchasedIds] = useState<string[]>([]);
  const [readingEbook, setReadingEbook] = useState<EBook | null>(null);
  const [purchasingEbook, setPurchasingEbook] = useState<EBook | null>(null);

  // Synchronize local states when profileUser changes (or when navigating to different profile)
  useEffect(() => {
    if (profileUser) {
      setDisplayName(profileUser.displayName);
      setUsername(profileUser.username);
      setBio(profileUser.bio);
      setAvatar(profileUser.avatar);
      setIsEditing(false);
    }
  }, [profileUser]);

  useEffect(() => {
    if (!profileUser) return;
    async function loadEbooks() {
      let list = getAllEBooks();
      if (isSupabaseConfigured) {
        try {
          const dbEbooks = await getEBooksSupabase();
          dbEbooks.forEach(dbBook => {
            if (!list.some(b => b.id === dbBook.id)) {
              list.push(dbBook);
            }
          });
        } catch (e) {
          console.warn('Erro ao carregar ebooks do Supabase no Perfil:', e);
        }
      }
      setAllEbooks(list);
    }

    loadEbooks();

    const handleUpdate = () => loadEbooks();
    window.addEventListener('shifting_ebooks_updated', handleUpdate);
    return () => window.removeEventListener('shifting_ebooks_updated', handleUpdate);
  }, [profileUser?.id]);

  useEffect(() => {
    const updateLikes = () => setLikedIds(getLikedEBookIds());
    const updateSaves = () => setSavedIds(getSavedEBookIds());
    window.addEventListener('shifting_ebook_likes_updated', updateLikes);
    window.addEventListener('shifting_ebook_saves_updated', updateSaves);
    return () => {
      window.removeEventListener('shifting_ebook_likes_updated', updateLikes);
      window.removeEventListener('shifting_ebook_saves_updated', updateSaves);
    };
  }, []);

  useEffect(() => {
    const storedPurchased = localStorage.getItem('shifting_purchased_ebooks');
    if (storedPurchased) {
      try {
        setPurchasedIds(JSON.parse(storedPurchased));
      } catch (e) {}
    }
  }, []);

  const handlePurchaseSuccess = (ebookId: string) => {
    const updated = [...purchasedIds, ebookId];
    setPurchasedIds(updated);
    localStorage.setItem('shifting_purchased_ebooks', JSON.stringify(updated));
  };

  if (!profileUser) {
    return (
      <div className="flex flex-col items-center justify-center h-full pt-20">
        <h2 className="text-xl font-bold text-slate-200">Usuário não encontrado</h2>
        <button onClick={() => navigate(-1)} className="mt-4 text-purple-400 hover:underline">Voltar</button>
      </div>
    );
  }

  const isMe = profileUser.id === currentUser.id;
  
  // Dynamic reactive checks for follow/unfollow
  const currentUserInState = users.find(u => u.id === currentUser.id) || currentUser;
  const amIFollowing = currentUserInState.following.includes(profileUser.id);
  
  const userPosts = posts.filter(p => p.userId === profileUser.id).sort((a, b) => b.createdAt - a.createdAt);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim() || !username.trim()) return;
    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '').replace('@', '');

    // Check if the username is taken by someone else locally
    const takenLocal = users.some(u => u.id !== profileUser.id && u.username.toLowerCase() === cleanUsername);
    if (takenLocal) {
      alert(`O nome de usuário @${cleanUsername} já está sendo utilizado por outro Shifter.`);
      return;
    }

    // Check if the username is taken by someone else in Supabase
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: existingProfile, error: checkError } = await supabase
          .from('profiles')
          .select('id, username')
          .eq('username', cleanUsername)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingProfile && existingProfile.id !== profileUser.id) {
          alert(`O nome de usuário @${cleanUsername} já está em uso no banco de dados por outro Shifter.`);
          return;
        }
      } catch (err) {
        console.warn('Erro ao verificar username no Supabase:', err);
      }
    }
    
    if (onUpdateProfile) {
      onUpdateProfile({
        ...profileUser,
        displayName: displayName.trim(),
        username: cleanUsername,
        bio: bio.trim(),
        avatar: avatar
      });
    }
    setIsEditing(false);
  };

  const userEbooks = allEbooks.filter(ebook => {
    if (!profileUser) return false;
    if (ebook.authorId) {
      const ebookAuthorUuid = toUUID(ebook.authorId);
      const profileUserUuid = toUUID(profileUser.id);
      if (ebookAuthorUuid === profileUserUuid || ebook.authorId === profileUser.id) {
        return true;
      }
    }
    if (ebook.authorName && (
      ebook.authorName.toLowerCase() === profileUser.username.toLowerCase() ||
      ebook.authorName.toLowerCase() === profileUser.displayName.toLowerCase()
    )) {
      return true;
    }
    return false;
  });

  return (
    <div className="w-full py-8 px-4 relative z-10">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center space-x-2 text-[15px] font-medium text-slate-400 hover:text-white transition-colors mb-6 px-2"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Voltar</span>
      </button>

      <div className="bg-[#15121e] rounded-[32px] border border-white/5 shadow-2xl p-6 sm:p-8 mb-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#3a1a73]/40 to-transparent pointer-events-none"></div>
        <div className="relative z-10 flex flex-col items-center mt-4">
          
          {isEditing ? (
            /* Editing State Layout */
            <div className="w-full max-w-md space-y-5 text-left">
              <h3 className="text-lg font-semibold text-white mb-2 text-center">Editar Perfil</h3>
              
              {/* Avatar upload */}
              <div className="flex flex-col items-center mb-4">
                <div className="relative group w-24 h-24 mb-2">
                  <img 
                    src={avatar} 
                    alt="Preview avatar" 
                    onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/9.x/notionists/svg?seed=preview`; }}
                    className="w-24 h-24 rounded-full object-cover bg-slate-800 border-2 border-purple-500/50"
                  />
                  <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-6 h-6 text-white" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleAvatarFileChange} 
                      className="hidden" 
                    />
                  </label>
                </div>
                <span className="text-[11px] text-slate-500">Clique para fazer upload de foto</span>
              </div>

              {/* Display Name Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nome de Exibição</label>
                <input 
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-[#0c0a13] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all font-medium"
                  required
                />
              </div>

              {/* Username Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">Nome de usuário (@)</label>
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#0c0a13] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all font-mono"
                  required
                />
              </div>

              {/* Bio Textarea */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Biografia</label>
                <textarea 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full bg-[#0c0a13] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all resize-none"
                />
              </div>

              {/* Form Controls */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setDisplayName(profileUser.displayName);
                    setUsername(profileUser.username);
                    setBio(profileUser.bio);
                    setAvatar(profileUser.avatar);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white/5 border border-white/10 text-slate-300 rounded-xl hover:bg-white/10 text-sm font-medium transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Cancelar</span>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!displayName.trim() || !username.trim()}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar</span>
                </button>
              </div>
            </div>
          ) : (
            /* Normal View State */
            <>
              <img 
                src={profileUser.avatar} 
                alt={profileUser.username}
                onError={(e) => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/9.x/notionists/svg?seed=${profileUser.username}`; }}
                className="w-24 h-24 rounded-full bg-slate-800 border-4 border-[#15121e] shadow-lg mb-4 object-cover"
              />
              <div className="flex items-center justify-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold text-white">{profileUser.displayName}</h1>
                {isMe && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 transition-all"
                    title="Editar Perfil"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-sm sm:text-[15px] font-medium text-slate-400 mb-5">@{profileUser.username}</p>
              <p className="text-slate-300 text-sm sm:text-[15px] max-w-md mx-auto mb-8 leading-relaxed px-2">{profileUser.bio || 'Nenhuma biografia adicionada.'}</p>
              
              <div className="flex items-center justify-around w-full max-w-sm gap-2 sm:gap-6 mb-8">
                 <div className="text-center px-2">
                   <span className="block font-bold text-white text-lg sm:text-xl">{profileUser.followers.length}</span>
                   <span className="text-[9px] sm:text-[11px] text-slate-500 uppercase tracking-widest font-semibold mt-1">Seguidores</span>
                 </div>
                 <div className="text-center px-2">
                   <span className="block font-bold text-white text-lg sm:text-xl">{profileUser.following.length}</span>
                   <span className="text-[9px] sm:text-[11px] text-slate-500 uppercase tracking-widest font-semibold mt-1">Seguindo</span>
                 </div>
                 <div className="text-center px-2">
                   <span className="block font-bold text-white text-lg sm:text-xl">{userPosts.length}</span>
                   <span className="text-[9px] sm:text-[11px] text-slate-500 uppercase tracking-widest font-semibold mt-1">Posts</span>
                 </div>
              </div>

              {!isMe && (
                <button
                  onClick={() => onFollow(profileUser.id)}
                  className={`flex items-center space-x-2 px-8 py-3 rounded-full font-semibold transition-colors ${
                    amIFollowing 
                      ? 'bg-white/10 text-white hover:bg-white/20' 
                      : 'bg-purple-600 text-white hover:bg-purple-700 shadow-[0_4px_15px_rgba(255,77,109,0.25)]'
                  }`}
                >
                  {amIFollowing ? (
                    <>
                      <Check className="w-5 h-5" />
                      <span>Seguindo</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      <span>Seguir</span>
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {userEbooks.length > 0 && (
        <div className="bg-[#15121e] rounded-[32px] border border-white/5 shadow-2xl p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Vitrine de E-Books</h2>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar select-none">
            {userEbooks.map(ebook => {
              const isAuthor = ebook.authorId === currentUser.id;
              const isPurchased = !ebook.isPaid || isAuthor || purchasedIds.includes(ebook.id);
              const requiresPrePurchase = ebook.isPaid && !isPurchased && ebook.lockType === 'full';
              const isLiked = likedIds.includes(ebook.id);
              const isSaved = savedIds.includes(ebook.id);

              return (
                <div 
                  key={ebook.id} 
                  className="flex-none w-36 sm:w-40 flex flex-col group relative rounded-2xl transition-all duration-300"
                >
                  <div className="relative w-full aspect-[2/3] rounded-2xl overflow-hidden mb-3 border border-white/5 bg-[#120f1d] shadow-lg">
                    <img 
                      src={ebook.coverImage} 
                      alt={ebook.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80 group-hover:opacity-100 mix-blend-luminosity pointer-events-none"
                    />

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

                  {requiresPrePurchase ? (
                    <button 
                      onClick={() => setPurchasingEbook(ebook)}
                      className="w-full py-1.5 rounded-xl bg-purple-600 border border-purple-500 text-white hover:bg-purple-700 text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-lg"
                    >
                      <Lock className="w-3.5 h-3.5 shrink-0" />
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
        </div>
      )}

      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-white px-2 mb-4">Posts</h2>
        {userPosts.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.02] rounded-[28px] border border-white/5 border-dashed">
            <p className="text-slate-500 font-medium text-[15px]">Nenhum post publicado ainda.</p>
          </div>
        ) : (
          userPosts.map(post => {
            const author = users.find(u => u.id === post.userId) || profileUser;
            return (
              <PostCard 
                key={post.id} 
                post={post} 
                author={author}
                onLike={onLike}
                onComment={onComment}
                isSaved={savedPostIds.includes(post.id)}
                onToggleSave={onToggleSave}
                onRepost={onRepost}
                onDelete={onDeletePost}
                currentUser={currentUser}
              />
            );
          })
        )}
      </div>
      
      {readingEbook && (
        <EBookReader 
          ebook={readingEbook} 
          onClose={() => setReadingEbook(null)} 
          isPurchased={!readingEbook.isPaid || readingEbook.authorId === currentUser.id || purchasedIds.includes(readingEbook.id)}
          onTriggerPurchase={(ebook) => {
            setReadingEbook(null);
            setPurchasingEbook(ebook);
          }}
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
