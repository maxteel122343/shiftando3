import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Plus, Search, Bookmark, TrendingUp, WifiOff, ChevronDown, ChevronUp, Database, AlertCircle, X } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Feed } from './components/Feed';
import { CreatePost } from './components/CreatePost';
import type { RedditSource } from './components/CreatePost';
import { Profile } from './components/Profile';
import { PostCard } from './components/PostCard';
import { AuthModal } from './components/AuthModal';
import { getStoredData, saveData, CURRENT_USER } from './store';
import { AIChatGuide } from './components/AIChatGuide';
import { SavedPage } from './components/SavedPage';
import { EBookPage } from './components/EBookPage';
import { RedditUniversePage } from './components/RedditUniversePage';
import { VideoFeedPage } from './components/VideoFeedPage';
import { Post, User, Comment } from './types';
import {
  isConfigured as isSupabaseConfigured,
  supabase,
  getProfiles,
  getPosts,
  createPost,
  toggleLike,
  addComment,
  upsertProfile,
  syncInitialData
} from './utils/supabase';

/** Wrapper that reads Reddit pre-fill query params and passes to CreatePost */
function CreatePostWithParams({ currentUser, onPostCreate }: { currentUser: User; onPostCreate: (post: Post) => void }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const rt = params.get('rt') || '';
  const rc = params.get('rc') || '';
  const ra = params.get('ra') || '';
  const rs = params.get('rs') || '';
  const rp = params.get('rp') || '';
  const ri = params.get('ri') || '';
  const redditSource: RedditSource | undefined =
    ra && rs && rp ? { author: ra, subreddit: rs, permalink: rp } : undefined;
  return (
    <CreatePost
      currentUser={currentUser}
      onPostCreate={onPostCreate}
      initialTitle={rt}
      initialContent={rc}
      initialImage={ri}
      redditSource={redditSource}
    />
  );
}


export default function App() {
  const location = useLocation();
  const isChatRoute = location.pathname === '/chat';
  const isVideosRoute = location.pathname === '/videos' || location.pathname === '/';
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dynamic currentUser state
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const stored = localStorage.getItem('shifting_current_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed;
      } catch (e) {}
    }
    return CURRENT_USER;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showGuestWarning, setShowGuestWarning] = useState(false);
  const [guestWarningType, setGuestWarningType] = useState<'post' | 'ebook' | null>(null);
  const [appTheme, setAppTheme] = useState<'dark' | 'light'>(() => {
    const stored = localStorage.getItem('shifting_app_theme');
    if (!stored) {
      localStorage.setItem('shifting_app_theme', 'light');
      return 'light';
    }
    return (stored as 'dark' | 'light');
  });

  const handleToggleTheme = () => {
    const nextTheme = appTheme === 'dark' ? 'light' : 'dark';
    setAppTheme(nextTheme);
    localStorage.setItem('shifting_app_theme', nextTheme);
  };

  const [dbError, setDbError] = useState<string | null>(null);
  const [dbErrorDetails, setDbErrorDetails] = useState<string | null>(null);
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Global Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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

  useEffect(() => {
    async function loadData() {
      if (isSupabaseConfigured) {
        setIsSyncing(true);
        try {
          let dbProfiles = await getProfiles();
          let dbPosts = await getPosts();

          // Seed if database is completely fresh
          if (dbProfiles.length === 0 && dbPosts.length === 0) {
            const localData = getStoredData();
            await syncInitialData(localData.users, localData.posts);
            dbProfiles = await getProfiles();
            dbPosts = await getPosts();
          }

          // Clean up and filter expired guest posts (older than 24 hours)
          const now = Date.now();
          const twentyFourHours = 24 * 60 * 60 * 1000;
          
          // Load local guest posts from cache
          const localData = getStoredData();
          const localGuestPosts = localData.posts.filter((p: Post) => p.userId === 'user_me');
          
          // Combine database posts and local guest posts
          const combinedPosts = [...dbPosts];
          for (const lp of localGuestPosts) {
            if (!combinedPosts.some(p => p.id === lp.id)) {
              combinedPosts.push(lp);
            }
          }

          const expiredGuestPosts = combinedPosts.filter(p => p.userId === 'user_me' && (now - p.createdAt > twentyFourHours));
          const activeDbPosts = combinedPosts.filter(p => !(p.userId === 'user_me' && (now - p.createdAt > twentyFourHours)));

          setPosts(activeDbPosts);

          // Get active user
          let activeUser = CURRENT_USER;
          const storedUser = localStorage.getItem('shifting_current_user');
          if (storedUser) {
            try {
              activeUser = JSON.parse(storedUser);
            } catch (e) {}
          }

          if (isSupabaseConfigured && supabase) {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              const dbProfile = dbProfiles.find(u => u.id === session.user.id);
              if (dbProfile) {
                activeUser = dbProfile;
              } else {
                activeUser = {
                  id: session.user.id,
                  username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'usuario',
                  displayName: session.user.user_metadata?.display_name || 'Usuário',
                  avatar: session.user.user_metadata?.avatar_url || CURRENT_USER.avatar,
                  bio: session.user.user_metadata?.bio || 'Iniciando minha jornada de Shifting!',
                  followers: [],
                  following: []
                };
              }
            }
          }

          if (activeUser.id === 'user_me') {
            activeUser.avatar = CURRENT_USER.avatar;
          }

          // Merge activeUser with Supabase representation if exists
          const foundDbUser = dbProfiles.find(u => u.username.toLowerCase() === activeUser.username.toLowerCase());
          if (foundDbUser) {
            activeUser = foundDbUser;
          } else {
            // Upsert currentUser to profiles so foreign keys don't fail
            if (activeUser.id !== 'user_me') {
              await upsertProfile(activeUser);
            }
            dbProfiles.push(activeUser);
          }

          setCurrentUser(activeUser);
          setUsers(dbProfiles);

          // Delete expired guest posts from Supabase in background
          if (expiredGuestPosts.length > 0) {
            const { deletePost } = await import('./utils/supabase');
            for (const p of expiredGuestPosts) {
              await deletePost(p.id, 'user_me');
            }
          }

          // Load saved posts and ebooks from Supabase if logged in
          if (activeUser.id !== 'user_me') {
            const { getSavedPosts, getSavedEBooksSupabase } = await import('./utils/supabase');
            const dbSavedPostIds = await getSavedPosts(activeUser.id);
            setSavedPostIds(dbSavedPostIds);

            const dbSavedEBookIds = await getSavedEBooksSupabase(activeUser.id);
            localStorage.setItem(`shifting_saved_ebook_ids_${activeUser.id}`, JSON.stringify(dbSavedEBookIds));
            // Trigger event so any active component refreshes
            window.dispatchEvent(new Event('shifting_ebook_saves_updated'));
          } else {
            const storedSaved = localStorage.getItem('shifting_saved_post_ids_guest');
            if (storedSaved) {
              setSavedPostIds(JSON.parse(storedSaved));
            }
          }

        } catch (err: any) {
          console.warn('Erro de conexão com o Supabase:', err);
          setDbError("Erro ao sintonizar com o banco de dados do Supabase. Utilizando fallback local.");
          if (err) {
            setDbErrorDetails(
              typeof err === 'object'
                ? JSON.stringify(err, Object.getOwnPropertyNames(err), 2)
                : String(err)
            );
          }
          loadLocalFallback();
        } finally {
          setIsSyncing(false);
        }
      } else {
        loadLocalFallback();
      }
    }

    function loadLocalFallback() {
      const data = getStoredData();
      const now = Date.now();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      const expiredLocalGuestPosts = data.posts.filter((p: Post) => p.userId === 'user_me' && (now - p.createdAt > twentyFourHours));
      const activeLocalPosts = data.posts.filter((p: Post) => !(p.userId === 'user_me' && (now - p.createdAt > twentyFourHours)));

      setPosts(activeLocalPosts);
      
      if (expiredLocalGuestPosts.length > 0) {
        saveData(activeLocalPosts, data.users);
      }
      
      const storedUser = localStorage.getItem('shifting_current_user');
      let activeUser = CURRENT_USER;
      if (storedUser) {
        try {
          activeUser = JSON.parse(storedUser);
        } catch (e) {}
      }
      if (activeUser.id === 'user_me') {
        activeUser.avatar = CURRENT_USER.avatar;
      }
      setCurrentUser(activeUser);

      const filteredUsers = data.users.filter((u: User) => u.id !== activeUser.id);
      setUsers([...filteredUsers, activeUser]);

      const storedSaved = localStorage.getItem(activeUser.id === 'user_me' ? 'shifting_saved_post_ids_guest' : `shifting_saved_post_ids_${activeUser.id}`);
      if (storedSaved) {
        setSavedPostIds(JSON.parse(storedSaved));
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    if (posts.length > 0 || users.length > 0) {
      saveData(posts, users);
    }
  }, [posts, users]);

  // Load saved posts on mount or user change
  useEffect(() => {
    const key = currentUser.id === 'user_me' 
      ? 'shifting_saved_post_ids_guest' 
      : `shifting_saved_post_ids_${currentUser.id}`;
      
    const storedSaved = localStorage.getItem(key);
    if (storedSaved) {
      setSavedPostIds(JSON.parse(storedSaved));
    } else {
      setSavedPostIds([]);
    }
  }, [currentUser.id]);

  // Save saved posts to local storage when changed
  useEffect(() => {
    const key = currentUser.id === 'user_me' 
      ? 'shifting_saved_post_ids_guest' 
      : `shifting_saved_post_ids_${currentUser.id}`;
      
    localStorage.setItem(key, JSON.stringify(savedPostIds));
  }, [savedPostIds, currentUser.id]);

  // Sync currentUser changes to localStorage
  useEffect(() => {
    localStorage.setItem('shifting_current_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    const handleGuestWarning = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detailType = customEvent.detail?.type || 'ebook';
      setGuestWarningType(detailType);
      setShowGuestWarning(true);
    };

    const handleRequestPostCreation = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { post } = customEvent.detail || {};
      if (post) {
        await handleCreatePost(post);
        showToast("Relato publicado com sucesso! E-book desbloqueado. 📖✨", "success");
      }
    };

    window.addEventListener('shifting_guest_warning', handleGuestWarning);
    window.addEventListener('shifting_request_post_creation', handleRequestPostCreation);
    return () => {
      window.removeEventListener('shifting_guest_warning', handleGuestWarning);
      window.removeEventListener('shifting_request_post_creation', handleRequestPostCreation);
    };
  }, []);

  const handleCreatePost = async (newPost: Post) => {
    setPosts(prev => [newPost, ...prev]);
    if (isSupabaseConfigured) {
      const success = await createPost(newPost);
      if (!success) {
        setDbError("Falha ao persistir post no Supabase.");
      }
    }
  };

  const handleLike = async (postId: string) => {
    let isLiking = false;
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const hasLiked = post.likes.includes(currentUser.id);
        isLiking = !hasLiked;
        return {
          ...post,
          likes: hasLiked 
            ? post.likes.filter(id => id !== currentUser.id)
            : [...post.likes, currentUser.id]
        };
      }
      return post;
    }));

    if (isSupabaseConfigured) {
      const success = await toggleLike(postId, currentUser.id, isLiking);
      if (!success) {
        setDbError("Erro ao registrar curtida no Supabase.");
      }
    }
  };

  const handleComment = async (postId: string, content: string) => {
    const newComment: Comment = {
      id: `comment_${Date.now()}`,
      postId,
      userId: currentUser.id,
      content,
      createdAt: Date.now()
    };

    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: [...post.comments, newComment]
        };
      }
      return post;
    }));

    if (isSupabaseConfigured) {
      const success = await addComment(newComment);
      if (!success) {
        setDbError("Erro ao salvar comentário no Supabase.");
      }
    }
  };

  const handleToggleSave = async (postId: string) => {
    const isSaving = !savedPostIds.includes(postId);
    setSavedPostIds(prev => 
      prev.includes(postId)
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    );

    if (isSupabaseConfigured && currentUser.id !== 'user_me') {
      const { toggleSavePostSupabase } = await import('./utils/supabase');
      await toggleSavePostSupabase(postId, currentUser.id, isSaving);
    } else if (isSaving) {
      setGuestWarningType('post');
      setShowGuestWarning(true);
    }
  };

  const handleRepost = async (postId: string) => {
    const originalPost = posts.find(p => p.id === postId);
    if (!originalPost) return;

    const newPost: Post = {
      id: `repost_${Date.now()}`,
      userId: currentUser.id,
      title: originalPost.title,
      content: originalPost.content,
      image: originalPost.image,
      hashtags: originalPost.hashtags,
      likes: [],
      comments: [],
      createdAt: Date.now(),
      repostOf: originalPost.id,
      repostedBy: currentUser.displayName
    };

    setPosts(prev => [newPost, ...prev]);
    
    if (isSupabaseConfigured) {
      await createPost(newPost);
    }
  };

  const handlePublishEBookAnnouncement = async (title: string, authorName: string, coverImage: string, description: string, ebookId: string) => {
    const newPost: Post = {
      id: `post_ebook_${Date.now()}`,
      userId: currentUser.id,
      title: `✨ NOVO E-BOOK PUBLICADO: ${title}!`,
      content: `📖 Acabei de publicar meu novo e-book na Biblioteca de Shifting!\n\n"${description}"\n\nVenha ler agora na vitrine de destaques de livros! Ficou sensacional e você pode até baixar em PDF. 🌌✨`,
      image: coverImage,
      hashtags: ['#ebook', '#shiftinglibrary', '#manifestacao', '#escrever'],
      likes: [],
      comments: [],
      createdAt: Date.now(),
      relatedEBookId: ebookId
    };
    
    // Save locally to cache so it displays and persists in fallback state
    const localData = getStoredData();
    localData.posts.unshift(newPost);
    saveData(localData.posts, localData.users);

    setPosts(prev => [newPost, ...prev]);
    
    if (isSupabaseConfigured) {
      await createPost(newPost);
    }
  };

  const handleFollow = async (targetUserId: string) => {
    let updatedCurrentUser: User | null = null;
    let updatedTargetUser: User | null = null;

    setUsers(prev => prev.map(user => {
      if (user.id === currentUser.id) {
        const isFollowing = user.following.includes(targetUserId);
        const updatedFollowing = isFollowing
          ? user.following.filter(id => id !== targetUserId)
          : [...user.following, targetUserId];
        
        updatedCurrentUser = { ...user, following: updatedFollowing };
        setCurrentUser(updatedCurrentUser);
        return updatedCurrentUser;
      }
      if (user.id === targetUserId) {
         const isFollowedByMe = user.followers.includes(currentUser.id);
         const updatedFollowers = isFollowedByMe
           ? user.followers.filter(id => id !== currentUser.id)
           : [...user.followers, currentUser.id];
           
         updatedTargetUser = { ...user, followers: updatedFollowers };
         return updatedTargetUser;
      }
      return user;
    }));

    if (isSupabaseConfigured) {
      if (updatedCurrentUser) await upsertProfile(updatedCurrentUser);
      if (updatedTargetUser) await upsertProfile(updatedTargetUser);
    }
  };

  // Profile update handler
  const handleUpdateProfile = async (updatedUser: User) => {
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    
    if (isSupabaseConfigured) {
      await upsertProfile(updatedUser);
    }
  };

  const handleDeletePost = async (postId: string) => {
    // 1. Remove from local state
    setPosts(prev => prev.filter(post => post.id !== postId));
    
    // 2. Remove from Supabase if configured
    if (isSupabaseConfigured) {
      const { deletePost } = await import('./utils/supabase');
      const success = await deletePost(postId, currentUser.id);
      if (!success) {
        showToast("Erro ao excluir relato no banco de dados.", "error");
      } else {
        showToast("Relato excluído com sucesso!", "success");
      }
    } else {
      showToast("Relato excluído localmente!", "success");
    }
  };

  // Authentication Handlers
  const handleAuthenticateUser = async (user: User) => {
    const isGuest = currentUser.id === 'user_me';
    
    if (isGuest && user.id !== 'user_me') {
      // 1. Migrate local states first
      setPosts(prev => prev.map(post => {
        const updatedPost = { ...post };
        if (updatedPost.userId === 'user_me') {
          updatedPost.userId = user.id;
        }
        if (updatedPost.likes.includes('user_me')) {
          updatedPost.likes = updatedPost.likes.map(id => id === 'user_me' ? user.id : id);
        }
        updatedPost.comments = updatedPost.comments.map(c => {
          if (c.userId === 'user_me') {
            return { ...c, userId: user.id };
          }
          return c;
        });
        return updatedPost;
      }));

      // 2. Perform Supabase migration
      if (isSupabaseConfigured) {
        try {
          const { migrateGuestData, getSavedPosts, getSavedEBooksSupabase, getPosts: fetchPosts } = await import('./utils/supabase');
          const storedSavedEbookIds = JSON.parse(localStorage.getItem('shifting_saved_ebook_ids_guest') || '[]');
          await migrateGuestData(user.id, posts, savedPostIds, storedSavedEbookIds);
          
          // Re-sync saved lists
          const dbSavedPostIds = await getSavedPosts(user.id);
          setSavedPostIds(dbSavedPostIds);

          const dbSavedEBookIds = await getSavedEBooksSupabase(user.id);
          localStorage.setItem(`shifting_saved_ebook_ids_${user.id}`, JSON.stringify(dbSavedEBookIds));
          window.dispatchEvent(new Event('shifting_ebook_saves_updated'));

          // Refresh posts from Supabase to ensure everything is synced
          const freshPosts = await fetchPosts();
          setPosts(freshPosts);
        } catch (e) {
          console.warn('Erro ao migrar dados de visitante para o Supabase:', e);
        }
      }
    }

    setCurrentUser(user);
    setUsers(prev => {
      if (!prev.some(u => u.id === user.id)) {
        return [...prev, user];
      }
      return prev;
    });

    if (user.id !== 'user_me') {
      showToast(`Acesso confirmado! Bem-vindo(a), ${user.displayName}!`, 'success');
    }

    if (isSupabaseConfigured) {
      await upsertProfile(user);
    }
  };

  const handleRegisterUser = async (newUser: User) => {
    setUsers(prev => [...prev, newUser]);
    
    if (isSupabaseConfigured) {
      try {
        await upsertProfile(newUser);
        showToast(`Conta criada com sucesso no Supabase! Bem-vindo(a), ${newUser.displayName}!`, 'success');
      } catch (err) {
        console.warn('Erro ao salvar perfil no Supabase:', err);
        showToast(`Conta registrada localmente. Bem-vindo(a), ${newUser.displayName}!`, 'info');
      }
    } else {
      showToast(`Conta criada localmente (Modo Offline)! Bem-vindo(a), ${newUser.displayName}!`, 'success');
    }
  };

  const handleLogout = async () => {
    setCurrentUser(CURRENT_USER);
    
    // Clear saved posts state and load guest saved posts from localStorage
    const storedSaved = localStorage.getItem('shifting_saved_post_ids_guest');
    setSavedPostIds(storedSaved ? JSON.parse(storedSaved) : []);

    // Dispatch update events to reload ebook lists based on guest session
    window.dispatchEvent(new Event('shifting_ebook_saves_updated'));
    window.dispatchEvent(new Event('shifting_ebook_likes_updated'));

    showToast('Você se desconectou da sua conta.', 'info');
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn("Supabase logout error:", err);
      }
    }
  };

  return (
    <>
    <div className={`flex h-screen overflow-hidden bg-[#0c0a13] text-slate-200 font-sans relative transition-colors duration-300 ${appTheme === 'light' ? 'app-light-mode' : ''}`}>
      <Sidebar 
        currentUser={currentUser} 
        onOpenAuth={() => setIsAuthModalOpen(true)} 
        appTheme={appTheme}
        onToggleTheme={handleToggleTheme}
        posts={posts}
        onHashtagClick={setSearchQuery}
      />
      <main className={`flex-1 relative flex flex-col ${
        isChatRoute
          ? "overflow-hidden" 
          : isVideosRoute
            ? "overflow-y-auto snap-y snap-mandatory scroll-smooth items-center"
            : "overflow-y-auto pb-24 lg:pb-8 items-center"
      }`}>
        {!isChatRoute && !isVideosRoute && (
          <div className="w-full max-w-[800px] mx-auto px-2 sm:px-4 pt-4">
            {isSupabaseConfigured ? (
              <div className="mb-4 flex items-center justify-between p-3 rounded-2xl bg-purple-950/20 border border-purple-500/10 text-xs text-purple-300">
                <div className="flex items-center gap-2">
                  <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                  </div>
                  <span>
                    {isSyncing 
                      ? 'Sintonizando...' 
                      : 'Sintonizado com o Universo'
                    }
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        )}
        <div className={`w-full ${
          isChatRoute
            ? "flex-1 h-full flex flex-col overflow-hidden" 
            : isVideosRoute
              ? "max-w-[600px] mx-auto"
              : "max-w-[800px] mx-auto"
        }`}>
            <Routes>
              <Route 
                path="/" 
                element={<VideoFeedPage currentUser={currentUser} users={users} appTheme={appTheme} />} 
              />
              <Route 
                path="/feed" 
                element={
                  <Feed 
                    posts={posts} 
                    users={users} 
                    onLike={handleLike} 
                    onComment={handleComment} 
                    savedPostIds={savedPostIds}
                    onToggleSave={handleToggleSave}
                    onRepost={handleRepost}
                    currentUser={currentUser}
                    onPublishEBookPost={handlePublishEBookAnnouncement}
                    onDeletePost={handleDeletePost}
                    appTheme={appTheme}
                    onToggleTheme={handleToggleTheme}
                  />
                } 
              />
              <Route 
                path="/create" 
                element={<CreatePostWithParams currentUser={currentUser} onPostCreate={handleCreatePost} />} 
              />
              <Route 
                path="/profile/:id" 
                element={
                  <Profile 
                    currentUser={currentUser}
                    posts={posts} 
                    users={users} 
                    onLike={handleLike} 
                    onComment={handleComment} 
                    onFollow={handleFollow} 
                    savedPostIds={savedPostIds}
                    onToggleSave={handleToggleSave}
                    onRepost={handleRepost}
                    onUpdateProfile={handleUpdateProfile}
                    onDeletePost={handleDeletePost}
                  />
                } 
              />
              <Route 
                path="/saved" 
                element={
                  <SavedPage 
                    posts={posts}
                    users={users}
                    savedPostIds={savedPostIds}
                    currentUser={currentUser}
                    onLike={handleLike}
                    onComment={handleComment}
                    onToggleSave={handleToggleSave}
                    onRepost={handleRepost}
                    onDeletePost={handleDeletePost}
                  />
                } 
              />
              <Route 
                path="/search" 
                element={
                  <div className="w-full py-4 sm:py-8 px-2 sm:px-4 relative z-10">
                    <h1 className="text-2xl font-semibold tracking-tight text-white mb-6 px-2">Pesquisar</h1>
                    <div className="mb-8 px-2">
                      <div className="relative">
                        <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input 
                           type="text"
                           value={searchQuery}
                           onChange={(e) => {
                             const val = e.target.value;
                             if (val === 'devkey123') {
                               const current = localStorage.getItem('shifting_hide_devkey') === 'true';
                               localStorage.setItem('shifting_hide_devkey', String(!current));
                               window.dispatchEvent(new Event('shifting_devkey_visibility_updated'));
                               setSearchQuery('');
                               showToast(current ? 'Chave de API do Guia agora visível' : 'Chave de API do Guia agora oculta', 'info');
                             } else {
                               setSearchQuery(val);
                             }
                           }}
                           placeholder="Pesquisar por posts, hashtags ou palavras..."
                           className="w-full bg-[#15121e] border border-white/5 rounded-full pl-12 pr-6 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-all"
                        />
                      </div>
                    </div>
                    {searchQuery && (
                      <div className="space-y-6">
                        {posts.filter(p => 
                          p.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.hashtags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
                        ).length === 0 ? (
                          <div className="text-center py-20 bg-white/[0.02] rounded-[28px] border border-white/5 border-dashed">
                            <p className="text-slate-500 font-medium text-[15px]">Nenhum post correspondente encontrado.</p>
                          </div>
                        ) : (
                          posts.filter(p => 
                            p.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            p.hashtags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
                          ).map(post => {
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
                                onLike={handleLike}
                                onComment={handleComment}
                                isSaved={savedPostIds.includes(post.id)}
                                onToggleSave={handleToggleSave}
                                onRepost={handleRepost}
                                onDelete={handleDeletePost}
                                currentUser={currentUser}
                              />
                            );
                          })
                        )}
                      </div>
                    )}
                    {!searchQuery && (
                      <div className="space-y-6 px-2">
                        {/* Trending hashtags in Search Page */}
                        <div className="bg-[#15121e] border border-white/5 rounded-[28px] p-6 shadow-xl">
                          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-purple-400" />
                            Assuntos em Alta
                          </h2>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {trendingHashtags.map(({ tag, count }) => (
                              <button
                                key={tag}
                                onClick={() => setSearchQuery(tag)}
                                className="flex items-center justify-between p-4 rounded-2xl bg-[#0c0a13]/40 hover:bg-purple-600/10 border border-white/5 hover:border-purple-500/20 transition-all text-left group cursor-pointer"
                              >
                                <div className="flex flex-col">
                                  <span className="font-semibold text-purple-400 dark:text-purple-300 group-hover:text-purple-300">
                                    {tag}
                                  </span>
                                  <span className="text-xs text-slate-500 mt-1">
                                    {count} {count === 1 ? 'relato' : 'relatos'}
                                  </span>
                                </div>
                                <span className="text-xs text-purple-500/50 group-hover:text-purple-400 group-hover:translate-x-1 transition-all">
                                  →
                                </span>
                              </button>
                            ))}
                            {trendingHashtags.length === 0 && (
                              <p className="text-xs text-slate-500 italic py-2">
                                Nenhuma hashtag encontrada ainda nos relatos.
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-center py-10 text-slate-500">
                          <p className="text-sm">Digite algo na barra de pesquisa para buscar posts sobre Shifting.</p>
                        </div>
                      </div>
                    )}
                  </div>
                } 
              />
              <Route 
                path="/videos" 
                element={<VideoFeedPage currentUser={currentUser} users={users} appTheme={appTheme} />} 
              />
              <Route 
                path="/ebook/:id" 
                element={<EBookPage />} 
              />
              <Route 
                path="/chat" 
                element={<AIChatGuide />} 
              />
              <Route 
                path="/reddit" 
                element={<RedditUniversePage />} 
              />
            </Routes>
        </div>
      </main>
      <Link to="/create" className="fixed bottom-20 left-5 lg:bottom-8 lg:right-8 lg:left-auto w-12 h-12 lg:w-14 lg:h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full flex items-center justify-center shadow-[0_4px_24px_rgba(147,51,234,0.5)] transition-all z-50 lg:shadow-[0_4px_20px_rgba(255,77,109,0.35)]">
        <Plus className="w-5 h-5 lg:w-6 lg:h-6" />
      </Link>
    </div>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        users={users} 
        currentUser={currentUser}
        onAuthenticate={handleAuthenticateUser} 
        onRegister={handleRegisterUser} 
        onLogout={handleLogout}
      />

      {showGuestWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            onClick={() => setShowGuestWarning(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <div className="relative bg-[#15121e] border border-amber-500/30 w-full max-w-sm rounded-[24px] p-6 shadow-[0_0_50px_rgba(245,158,11,0.15)] z-10 animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full flex items-center justify-center text-xl mb-4 animate-bounce">
                ⚠️
              </div>
              <h3 className="text-base font-bold text-white mb-2">
                {guestWarningType === 'ebook' 
                  ? 'E-Book salvo como visitante!' 
                  : 'Post salvo como visitante!'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Você salvou este {guestWarningType === 'ebook' ? 'e-book' : 'post'} localmente. Para garantir que seu progresso, relatos salvos, curtidas e conquistas fiquem guardados permanentemente na nuvem e nunca sejam perdidos, faça login ou cadastre-se!
              </p>
              
              <div className="w-full flex flex-col gap-2">
                <button
                  onClick={() => {
                    setShowGuestWarning(false);
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold py-2.5 rounded-xl transition-all shadow-[0_4px_15px_rgba(255,77,109,0.25)] cursor-pointer"
                >
                  Fazer Login / Cadastrar
                </button>
                <button
                  onClick={() => setShowGuestWarning(false)}
                  className="w-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Continuar como Visitante
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-3 px-5 py-3 rounded-full bg-[#15121e]/90 border border-purple-500/20 backdrop-blur-md shadow-[0_10px_30px_rgba(255,96,125,0.2)] text-white text-xs sm:text-sm font-semibold animate-in fade-in slide-in-from-top-4 duration-300">
          <span className={`w-2 h-2 rounded-full animate-pulse ${
            toast.type === 'success' ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" :
            toast.type === 'error' ? "bg-red-400 shadow-[0_0_8px_#f87171]" :
            "bg-blue-400 shadow-[0_0_8px_#60a5fa]"
          }`} />
          <span>{toast.message}</span>
        </div>
      )}
    </>
  );
}
