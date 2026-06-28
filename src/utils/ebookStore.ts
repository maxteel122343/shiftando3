import { EBook } from '../types';
import { MOCK_EBOOKS } from '../data/ebooks';

function getUserIdKey(prefix: string): string {
  try {
    const stored = localStorage.getItem('shifting_current_user');
    const user = stored ? JSON.parse(stored) : null;
    const userId = user ? user.id : 'user_me';
    return userId === 'user_me' ? `${prefix}_guest` : `${prefix}_${userId}`;
  } catch (e) {
    return `${prefix}_guest`;
  }
}

function getCurrentUser(): any {
  try {
    const stored = localStorage.getItem('shifting_current_user');
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    return null;
  }
}

export function getLikedEBookIds(): string[] {
  const key = getUserIdKey('shifting_liked_ebook_ids');
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      return [];
    }
  }
  return [];
}

export function toggleLikeEBook(id: string): boolean {
  const current = getLikedEBookIds();
  const index = current.indexOf(id);
  let isLikedNow = false;
  if (index === -1) {
    current.push(id);
    isLikedNow = true;
  } else {
    current.splice(index, 1);
  }
  const key = getUserIdKey('shifting_liked_ebook_ids');
  localStorage.setItem(key, JSON.stringify(current));
  window.dispatchEvent(new Event('shifting_ebook_likes_updated'));
  return isLikedNow;
}

export function getSavedEBookIds(): string[] {
  const key = getUserIdKey('shifting_saved_ebook_ids');
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      return [];
    }
  }
  return [];
}

export function toggleSaveEBook(id: string): boolean {
  const current = getSavedEBookIds();
  const index = current.indexOf(id);
  let isSavedNow = false;
  if (index === -1) {
    current.push(id);
    isSavedNow = true;
  } else {
    current.splice(index, 1);
  }
  const key = getUserIdKey('shifting_saved_ebook_ids');
  localStorage.setItem(key, JSON.stringify(current));
  window.dispatchEvent(new Event('shifting_ebook_saves_updated'));

  // Sync to Supabase in background if logged in
  const user = getCurrentUser();
  if (user && user.id !== 'user_me') {
    import('./supabase').then(async ({ isConfigured, toggleSaveEBookSupabase }) => {
      if (isConfigured) {
        await toggleSaveEBookSupabase(id, user.id, isSavedNow);
      }
    }).catch(err => {
      console.warn('Erro ao sincronizar salvamento de ebook com o Supabase:', err);
    });
  } else if (isSavedNow) {
    // Guest saved an ebook! Dispatch custom event to trigger the warning
    window.dispatchEvent(new CustomEvent('shifting_guest_warning', { 
      detail: { type: 'ebook', id } 
    }));
  }

  return isSavedNow;
}

export function getAllEBooks(): EBook[] {
  let custom: EBook[] = [];
  const stored = localStorage.getItem('shifting_ebooks');
  if (stored) {
    try {
      custom = JSON.parse(stored);
    } catch (e) {
      // ignore
    }
  }
  return [...custom, ...MOCK_EBOOKS];
}
