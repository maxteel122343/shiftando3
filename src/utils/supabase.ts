import { createClient } from '@supabase/supabase-js';
import { User, Post, Comment, EBook, EBookPage } from '../types';

const supabaseUrl = 
  import.meta.env?.VITE_SUPABASE_URL || 
  process.env?.SUPABASE_URL || 
  '';
const supabaseAnonKey = 
  import.meta.env?.VITE_SUPABASE_ANON_KEY || 
  process.env?.SUPABASE_ANON_KEY || 
  '';

export const isConfigured = 
  !!supabaseUrl && 
  !!supabaseAnonKey && 
  !supabaseUrl.includes('your-supabase-project') && 
  !supabaseAnonKey.includes('your-anon-key-here') &&
  supabaseUrl !== 'MY_SUPABASE_URL';

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Dynamic status flag to fall back to offline/local mode on network/schema errors
let isSupabaseOnline = isConfigured;

export function getIsSupabaseOnline() {
  return isSupabaseOnline;
}

export function setSupabaseOffline() {
  isSupabaseOnline = false;
}

// Helper to convert any custom ID (e.g., "user_1", "post_abc") into a stable, valid UUID
export function toUUID(str: string): string {
  if (!str) return '00000000-0000-0000-0000-000000000000';
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) return str;

  // Generate a deterministic 32-hex character hash from string
  let hash = '';
  for (let i = 0; i < 32; i++) {
    const charCode = str.charCodeAt(i % str.length) || 0;
    const hex = ((charCode * (i + 17) + 13) % 16).toString(16);
    hash += hex;
  }
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

// Ensure the standard profiles are available in Supabase
export async function syncInitialData(users: User[], posts: Post[]) {
  if (!supabase || !isSupabaseOnline) return;
  
  try {
    // 1. Sync profiles
    for (const user of users) {
      const uuid = toUUID(user.id);
      const { error } = await supabase.from('profiles').upsert({
        id: uuid,
        username: user.username,
        display_name: user.displayName,
        avatar: user.avatar,
        bio: user.bio,
        followers: user.followers.map(toUUID),
        following: user.following.map(toUUID)
      });
      if (error) throw error;
    }

    // 2. Sync posts
    for (const post of posts) {
      const postUuid = toUUID(post.id);
      const userUuid = toUUID(post.userId);
      
      const { error: postErr } = await supabase.from('posts').upsert({
        id: postUuid,
        user_id: userUuid,
        title: post.title || 'Relato',
        content: post.content,
        image: post.image || null,
        hashtags: post.hashtags || []
      });
      if (postErr) throw postErr;

      // Sync likes
      if (post.likes && post.likes.length > 0) {
        for (const likerId of post.likes) {
          const { error: likeErr } = await supabase.from('likes').upsert({
            post_id: postUuid,
            user_id: toUUID(likerId)
          }, { onConflict: 'post_id,user_id' });
          if (likeErr) throw likeErr;
        }
      }

      // Sync comments
      if (post.comments && post.comments.length > 0) {
        for (const comment of post.comments) {
          const { error: commentErr } = await supabase.from('comments').upsert({
            id: toUUID(comment.id),
            post_id: postUuid,
            user_id: toUUID(comment.userId),
            content: comment.content,
            created_at: new Date(comment.createdAt).toISOString()
          });
          if (commentErr) throw commentErr;
        }
      }
    }
    console.log('Dados iniciais sincronizados com sucesso no Supabase!');
  } catch (error: any) {
    console.warn('Erro ao sincronizar dados iniciais (provavelmente tabela não criada):', error?.message || error);
    isSupabaseOnline = false;
  }
}

// ---------------- PROFILES ----------------
export async function getProfiles(): Promise<User[]> {
  if (!supabase || !isSupabaseOnline) return [];
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');
    
    if (error) {
      console.warn('Erro ao buscar perfis do Supabase:', error.message);
      isSupabaseOnline = false;
      throw error;
    }

    return (data || []).map(row => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name || row.username,
      avatar: row.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      bio: row.bio || '',
      followers: row.followers || [],
      following: row.following || []
    }));
  } catch (error: any) {
    console.warn('Erro ao acessar profiles no Supabase, ativando fallback local:', error?.message || error);
    isSupabaseOnline = false;
    throw error;
  }
}

export async function upsertProfile(user: User): Promise<boolean> {
  if (user.id === 'user_me') return false;
  if (!supabase || !isSupabaseOnline) return false;
  const uuid = toUUID(user.id);
  
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: uuid,
        username: user.username,
        display_name: user.displayName,
        avatar: user.avatar,
        bio: user.bio,
        followers: user.followers.map(toUUID),
        following: user.following.map(toUUID),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.warn('Erro ao salvar perfil no Supabase:', error.message);
      isSupabaseOnline = false;
      return false;
    }
    return true;
  } catch (error: any) {
    console.warn('Falha na operação de upsert do profile:', error?.message || error);
    isSupabaseOnline = false;
    return false;
  }
}

// ---------------- POSTS ----------------
export async function getPosts(): Promise<Post[]> {
  if (!supabase || !isSupabaseOnline) return [];
  
  try {
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (
          username,
          display_name,
          avatar
        )
      `)
      .order('created_at', { ascending: false });

    if (postsError) {
      console.warn('Erro ao buscar posts:', postsError.message);
      isSupabaseOnline = false;
      throw postsError;
    }

    const posts: Post[] = [];

    for (const row of (postsData || [])) {
      const postUuid = row.id;

      // Fetch likes
      const { data: likesData, error: likesError } = await supabase
        .from('likes')
        .select('user_id')
        .eq('post_id', postUuid);

      if (likesError) throw likesError;

      // Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select(`
          *,
          profiles:user_id (
            username,
            display_name,
            avatar
          )
        `)
        .eq('post_id', postUuid)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      posts.push({
        id: row.id,
        userId: row.user_id,
        title: row.title || '',
        content: row.content,
        image: row.image || undefined,
        hashtags: row.hashtags || [],
        likes: (likesData || []).map(l => l.user_id),
        comments: (commentsData || []).map(c => ({
          id: c.id,
          postId: c.post_id,
          userId: c.user_id,
          content: c.content,
          createdAt: new Date(c.created_at).getTime()
        })),
        createdAt: new Date(row.created_at).getTime()
      });
    }

    return posts;
  } catch (error: any) {
    console.warn('Erro ao acessar posts no Supabase, ativando fallback local:', error?.message || error);
    isSupabaseOnline = false;
    throw error;
  }
}

export async function createPost(post: Post): Promise<boolean> {
  if (!supabase || !isSupabaseOnline) return false;
  const postUuid = toUUID(post.id);
  const userUuid = toUUID(post.userId);

  try {
    const { error } = await supabase
      .from('posts')
      .insert({
        id: postUuid,
        user_id: userUuid,
        title: post.title || '',
        content: post.content,
        image: post.image || null,
        hashtags: post.hashtags || [],
        created_at: new Date(post.createdAt).toISOString()
      });

    if (error) {
      console.warn('Erro ao criar post no Supabase:', error.message);
      isSupabaseOnline = false;
      return false;
    }
    return true;
  } catch (error: any) {
    console.warn('Falha ao criar post:', error?.message || error);
    isSupabaseOnline = false;
    return false;
  }
}

export async function deletePost(postId: string, userId: string): Promise<boolean> {
  if (!supabase || !isSupabaseOnline) return false;
  const postUuid = toUUID(postId);
  const userUuid = toUUID(userId);

  try {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postUuid)
      .eq('user_id', userUuid);

    if (error) {
      console.warn('Erro ao excluir post no Supabase:', error.message);
      isSupabaseOnline = false;
      return false;
    }
    return true;
  } catch (error: any) {
    console.warn('Falha ao excluir post:', error?.message || error);
    isSupabaseOnline = false;
    return false;
  }
}

// ---------------- LIKES ----------------
export async function toggleLike(postId: string, userId: string, isLiking: boolean): Promise<boolean> {
  if (!supabase || !isSupabaseOnline) return false;
  const postUuid = toUUID(postId);
  const userUuid = toUUID(userId);

  try {
    if (isLiking) {
      const { error } = await supabase
        .from('likes')
        .upsert({
          post_id: postUuid,
          user_id: userUuid
        }, { onConflict: 'post_id,user_id' });
        
      if (error) {
        console.warn('Erro ao curtir post no Supabase:', error.message);
        isSupabaseOnline = false;
        return false;
      }
    } else {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postUuid)
        .eq('user_id', userUuid);

      if (error) {
        console.warn('Erro ao descurtir post no Supabase:', error.message);
        isSupabaseOnline = false;
        return false;
      }
    }
    return true;
  } catch (error: any) {
    console.warn('Falha ao alterar curtida no Supabase:', error?.message || error);
    isSupabaseOnline = false;
    return false;
  }
}

// ---------------- COMMENTS ----------------
export async function addComment(comment: Comment): Promise<boolean> {
  if (!supabase || !isSupabaseOnline) return false;
  const commentUuid = toUUID(comment.id);
  const postUuid = toUUID(comment.postId);
  const userUuid = toUUID(comment.userId);

  try {
    const { error } = await supabase
      .from('comments')
      .insert({
        id: commentUuid,
        post_id: postUuid,
        user_id: userUuid,
        content: comment.content,
        created_at: new Date(comment.createdAt).toISOString()
      });

    if (error) {
      console.warn('Erro ao adicionar comentário no Supabase:', error.message);
      isSupabaseOnline = false;
      return false;
    }
    return true;
  } catch (error: any) {
    console.warn('Falha ao adicionar comentário:', error?.message || error);
    isSupabaseOnline = false;
    return false;
  }
}

// ---------------- MESSAGES ----------------
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export async function getChatMessages(): Promise<ChatMessage[]> {
  if (!supabase || !isSupabaseOnline) return [];
  
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('timestamp', { ascending: true });

    if (error) {
      console.warn('Erro ao buscar mensagens do chat:', error.message);
      isSupabaseOnline = false;
      throw error;
    }
    return data || [];
  } catch (error: any) {
    console.warn('Erro ao buscar mensagens do chat no Supabase, usando localstorage fallback:', error?.message || error);
    isSupabaseOnline = false;
    throw error;
  }
}

export async function saveChatMessage(msg: ChatMessage): Promise<boolean> {
  if (!supabase || !isSupabaseOnline) return false;
  
  try {
    const { error } = await supabase
      .from('messages')
      .insert({
        id: toUUID(msg.id),
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      });

    if (error) {
      console.warn('Erro ao salvar mensagem no Supabase:', error.message);
      isSupabaseOnline = false;
      return false;
    }
    return true;
  } catch (error: any) {
    console.warn('Falha ao salvar mensagem:', error?.message || error);
    isSupabaseOnline = false;
    return false;
  }
}

export async function clearChatMessages(): Promise<boolean> {
  if (!supabase || !isSupabaseOnline) return false;
  
  try {
    const { error } = await supabase
      .from('messages')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (error) {
      console.warn('Erro ao limpar mensagens no Supabase:', error.message);
      isSupabaseOnline = false;
      return false;
    }
    return true;
  } catch (error: any) {
    console.warn('Falha ao limpar mensagens:', error?.message || error);
    isSupabaseOnline = false;
    return false;
  }
}

// ---------------- SAVES (SAVED POSTS) ----------------
export async function getSavedPosts(userId: string): Promise<string[]> {
  if (!supabase || !isSupabaseOnline) return [];
  const userUuid = toUUID(userId);
  try {
    const { data, error } = await supabase
      .from('saves')
      .select('post_id')
      .eq('user_id', userUuid);

    if (error) {
      console.warn('Erro ao buscar posts salvos:', error.message);
      return [];
    }
    return (data || []).map(row => row.post_id);
  } catch (error: any) {
    console.warn('Falha ao buscar posts salvos:', error?.message || error);
    return [];
  }
}

export async function toggleSavePostSupabase(postId: string, userId: string, isSaving: boolean): Promise<boolean> {
  if (!supabase || !isSupabaseOnline) return false;
  const postUuid = toUUID(postId);
  const userUuid = toUUID(userId);

  try {
    if (isSaving) {
      const { error } = await supabase
        .from('saves')
        .upsert({
          post_id: postUuid,
          user_id: userUuid
        }, { onConflict: 'post_id,user_id' });
        
      if (error) {
        console.warn('Erro ao salvar post no Supabase:', error.message);
        return false;
      }
    } else {
      const { error } = await supabase
        .from('saves')
        .delete()
        .eq('post_id', postUuid)
        .eq('user_id', userUuid);

      if (error) {
        console.warn('Erro ao remover post salvo no Supabase:', error.message);
        return false;
      }
    }
    return true;
  } catch (error: any) {
    console.warn('Falha ao alterar post salvo no Supabase:', error?.message || error);
    return false;
  }
}

// ---------------- SAVED EBOOKS ----------------
export async function getSavedEBooksSupabase(userId: string): Promise<string[]> {
  if (!supabase || !isSupabaseOnline) return [];
  const userUuid = toUUID(userId);
  try {
    const { data, error } = await supabase
      .from('saved_ebooks')
      .select('ebook_id')
      .eq('user_id', userUuid);

    if (error) {
      console.warn('Erro ao buscar e-books salvos:', error.message);
      return [];
    }
    return (data || []).map(row => row.ebook_id);
  } catch (error: any) {
    console.warn('Falha ao buscar e-books salvos:', error?.message || error);
    return [];
  }
}

export async function toggleSaveEBookSupabase(ebookId: string, userId: string, isSaving: boolean): Promise<boolean> {
  if (!supabase || !isSupabaseOnline) return false;
  const userUuid = toUUID(userId);

  try {
    if (isSaving) {
      const { error } = await supabase
        .from('saved_ebooks')
        .upsert({
          ebook_id: ebookId,
          user_id: userUuid
        }, { onConflict: 'user_id,ebook_id' });
        
      if (error) {
        console.warn('Erro ao salvar e-book no Supabase:', error.message);
        return false;
      }
    } else {
      const { error } = await supabase
        .from('saved_ebooks')
        .delete()
        .eq('ebook_id', ebookId)
        .eq('user_id', userUuid);

      if (error) {
        console.warn('Erro ao remover e-book salvo no Supabase:', error.message);
        return false;
      }
    }
    return true;
  } catch (error: any) {
    console.warn('Falha ao alterar e-book salvo no Supabase:', error?.message || error);
    return false;
  }
}

// ---------------- GUEST DATA MIGRATION ----------------
export async function migrateGuestData(
  newUserId: string,
  localPosts: Post[] = [],
  localSavedPostIds: string[] = [],
  localSavedEBookIds: string[] = []
): Promise<boolean> {
  if (!supabase || !isSupabaseOnline) return false;
  const guestUuid = toUUID('user_me');
  const userUuid = toUUID(newUserId);

  try {
    // --- 1. Database-to-Database Migration (for existing entries if any) ---
    const { error: postErr } = await supabase
      .from('posts')
      .update({ user_id: userUuid })
      .eq('user_id', guestUuid);
    if (postErr) console.warn('Aviso de migração de posts:', postErr.message);

    const { error: commentErr } = await supabase
      .from('comments')
      .update({ user_id: userUuid })
      .eq('user_id', guestUuid);
    if (commentErr) console.warn('Aviso de migração de comentários:', commentErr.message);

    const { data: guestLikes } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', guestUuid);
    if (guestLikes && guestLikes.length > 0) {
      for (const l of guestLikes) {
        await supabase.from('likes').upsert({ post_id: l.post_id, user_id: userUuid }, { onConflict: 'post_id,user_id' });
      }
      await supabase.from('likes').delete().eq('user_id', guestUuid);
    }

    const { data: guestSaves } = await supabase
      .from('saves')
      .select('post_id')
      .eq('user_id', guestUuid);
    if (guestSaves && guestSaves.length > 0) {
      for (const s of guestSaves) {
        await supabase.from('saves').upsert({ post_id: s.post_id, user_id: userUuid }, { onConflict: 'post_id,user_id' });
      }
      await supabase.from('saves').delete().eq('user_id', guestUuid);
    }

    const { data: guestEBooks } = await supabase
      .from('saved_ebooks')
      .select('*')
      .eq('user_id', guestUuid);
    if (guestEBooks && guestEBooks.length > 0) {
      for (const eb of guestEBooks) {
        await supabase.from('saved_ebooks').upsert({
          user_id: userUuid,
          ebook_id: eb.ebook_id,
          progress: eb.progress,
          current_chapter: eb.current_chapter,
          font_size: eb.font_size,
          line_height: eb.line_height,
          font_family: eb.font_family,
          last_read_at: eb.last_read_at
        }, { onConflict: 'user_id,ebook_id' });
      }
      await supabase.from('saved_ebooks').delete().eq('user_id', guestUuid);
    }

    // --- 2. Local-to-Database Migration (ensures local changes sync properly under new session) ---
    // A. Migrate Local Posts
    const guestPosts = localPosts.filter(p => p.userId === 'user_me' || p.userId === newUserId);
    for (const post of guestPosts) {
      const postUuid = toUUID(post.id);
      
      await supabase.from('posts').upsert({
        id: postUuid,
        user_id: userUuid,
        title: post.title || 'Relato',
        content: post.content,
        image: post.image || null,
        hashtags: post.hashtags || [],
        created_at: new Date(post.createdAt).toISOString()
      });

      // Likes on this post
      if (post.likes && post.likes.length > 0) {
        for (const likerId of post.likes) {
          const resolvedLikerId = likerId === 'user_me' ? userUuid : toUUID(likerId);
          await supabase.from('likes').upsert({
            post_id: postUuid,
            user_id: resolvedLikerId
          }, { onConflict: 'post_id,user_id' });
        }
      }

      // Comments on this post
      if (post.comments && post.comments.length > 0) {
        for (const comment of post.comments) {
          const resolvedCommenterId = comment.userId === 'user_me' ? userUuid : toUUID(comment.userId);
          await supabase.from('comments').upsert({
            id: toUUID(comment.id),
            post_id: postUuid,
            user_id: resolvedCommenterId,
            content: comment.content,
            created_at: new Date(comment.createdAt).toISOString()
          });
        }
      }
    }

    // B. Migrate Local Likes & Comments on OTHER posts
    for (const post of localPosts) {
      if (post.userId === 'user_me' || post.userId === newUserId) continue; // already handled above
      const postUuid = toUUID(post.id);

      if (post.likes && post.likes.includes('user_me')) {
        await supabase.from('likes').upsert({
          post_id: postUuid,
          user_id: userUuid
        }, { onConflict: 'post_id,user_id' });
      }

      if (post.comments && post.comments.length > 0) {
        for (const comment of post.comments) {
          if (comment.userId === 'user_me') {
            await supabase.from('comments').upsert({
              id: toUUID(comment.id),
              post_id: postUuid,
              user_id: userUuid,
              content: comment.content,
              created_at: new Date(comment.createdAt).toISOString()
            });
          }
        }
      }
    }

    // C. Migrate Local Saves
    if (localSavedPostIds && localSavedPostIds.length > 0) {
      for (const postId of localSavedPostIds) {
        await supabase.from('saves').upsert({
          post_id: toUUID(postId),
          user_id: userUuid
        }, { onConflict: 'post_id,user_id' });
      }
    }

    // D. Migrate Local Saved E-Books
    if (localSavedEBookIds && localSavedEBookIds.length > 0) {
      for (const ebookId of localSavedEBookIds) {
        await supabase.from('saved_ebooks').upsert({
          ebook_id: ebookId,
          user_id: userUuid,
          progress: 0,
          current_chapter: 0,
          last_read_at: new Date().toISOString()
        }, { onConflict: 'user_id,ebook_id' });
      }
    }

    return true;
  } catch (error: any) {
    console.warn('Erro ao migrar dados de visitante:', error?.message || error);
    return false;
  }
}

// ---------------- CUSTOM EBOOKS & PAGES ----------------
export async function getEBooksSupabase(): Promise<EBook[]> {
  if (!supabase || !isSupabaseOnline) return [];

  try {
    // Fetch all ebooks
    const { data: ebooksData, error: ebooksError } = await supabase
      .from('ebooks')
      .select('*')
      .order('created_at', { ascending: false });

    if (ebooksError) {
      console.warn('Erro ao buscar e-books do Supabase:', ebooksError.message);
      return [];
    }

    if (!ebooksData || ebooksData.length === 0) return [];

    // Fetch all ebook pages
    const { data: pagesData, error: pagesError } = await supabase
      .from('ebook_pages')
      .select('*')
      .order('page_index', { ascending: true });

    if (pagesError) {
      console.warn('Erro ao buscar páginas de e-books do Supabase:', pagesError.message);
      return ebooksData.map(row => rowToEBook(row, []));
    }

    return ebooksData.map(row => rowToEBook(row, pagesData || []));
  } catch (error: any) {
    console.warn('Erro ao acessar e-books no Supabase:', error?.message || error);
    return [];
  }
}

export async function createEBookSupabase(ebook: EBook): Promise<boolean> {
  if (!supabase || !isSupabaseOnline) return false;

  const bookRow = ebookToRow(ebook);

  try {
    // 1. Insert or update the ebook metadata row
    const { error: ebookError } = await supabase
      .from('ebooks')
      .upsert(bookRow, { onConflict: 'id' });

    if (ebookError) {
      console.warn('Erro ao salvar e-book no Supabase:', ebookError.message);
      return false;
    }

    // 2. Delete existing pages to avoid duplicates before inserting updated ones
    await supabase
      .from('ebook_pages')
      .delete()
      .eq('ebook_id', bookRow.id);

    // 3. Insert new pages if they exist
    if (ebook.pages && ebook.pages.length > 0) {
      const pagesRows = ebook.pages.map((p, i) => pageToRow(p, ebook.id, i));
      const { error: pagesError } = await supabase
        .from('ebook_pages')
        .insert(pagesRows);

      if (pagesError) {
        console.warn('Erro ao salvar páginas do e-book no Supabase:', pagesError.message);
        return false;
      }
    }

    return true;
  } catch (error: any) {
    console.warn('Falha ao salvar e-book completo no Supabase:', error?.message || error);
    return false;
  }
}

export async function deleteEBookSupabase(ebookId: string, authorId: string): Promise<boolean> {
  if (!supabase || !isSupabaseOnline) return false;
  const bookUuid = toUUID(ebookId);
  const authorUuid = toUUID(authorId);

  try {
    const { error } = await supabase
      .from('ebooks')
      .delete()
      .eq('id', bookUuid)
      .eq('author_id', authorUuid);

    if (error) {
      console.warn('Erro ao excluir e-book no Supabase:', error.message);
      return false;
    }
    return true;
  } catch (error: any) {
    console.warn('Falha ao excluir e-book no Supabase:', error?.message || error);
    return false;
  }
}

// --- Mappers to bridge frontend CamelCase types and DB SnakeCase columns ---
function ebookToRow(ebook: EBook) {
  return {
    id: toUUID(ebook.id),
    title: ebook.title,
    cover_image: ebook.coverImage || null,
    description: ebook.description || null,
    author_id: toUUID(ebook.authorId || 'user_me'),
    author_name: ebook.authorName || null,
    is_paid: ebook.isPaid || false,
    price: ebook.price || 0.0,
    lock_type: ebook.lockType || 'preview_30',
    allow_download: ebook.allowDownload !== false,
    is_pdf_ready: ebook.isPdfReady || false,
    uploaded_pdf: ebook.uploadedPdf || null,
    pdf_file_name: ebook.pdfFileName || null,
    audio_tracks: ebook.audioTracks || []
  };
}

function pageToRow(page: EBookPage, ebookId: string, index: number) {
  return {
    id: toUUID(page.id),
    ebook_id: toUUID(ebookId),
    title: page.title,
    content: page.content,
    image: page.image || null,
    images: page.images || [],
    font_family: page.fontFamily || 'serif',
    color: page.color || null,
    bg: page.bg || null,
    align: page.align || 'justify',
    is_bold: page.isBold || false,
    is_italic: page.isItalic || false,
    page_index: index
  };
}

function rowToEBook(row: any, pagesRows: any[] = []): EBook {
  const pages: EBookPage[] = pagesRows
    .filter(p => p.ebook_id === row.id)
    .sort((a, b) => (a.page_index || 0) - (b.page_index || 0))
    .map(p => ({
      id: p.id,
      title: p.title,
      content: p.content,
      image: p.image || undefined,
      images: p.images || [],
      fontFamily: p.font_family || 'serif',
      color: p.color || '',
      bg: p.bg || '',
      align: p.align || 'justify',
      isBold: p.is_bold || false,
      isItalic: p.is_italic || false
    }));

  return {
    id: row.id,
    title: row.title,
    coverImage: row.cover_image || '',
    content: row.content || '',
    description: row.description || '',
    authorId: row.author_id,
    authorName: row.author_name || '',
    createdAt: new Date(row.created_at).getTime(),
    isPaid: row.is_paid,
    price: row.price ? Number(row.price) : 0,
    lockType: row.lock_type,
    allowDownload: row.allow_download,
    isPdfReady: row.is_pdf_ready,
    uploadedPdf: row.uploaded_pdf || undefined,
    pdfFileName: row.pdf_file_name || undefined,
    audioTracks: row.audio_tracks || [],
    pages: pages
  };
}
