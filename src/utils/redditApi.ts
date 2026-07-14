export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  score: number;
  num_comments: number;
  created_utc: number;
  url: string;
  permalink: string;
  thumbnail: string;
  thumbnail_url?: string;
  subreddit: string;
  subreddit_name_prefixed: string;
  preview?: {
    images?: Array<{
      source: { url: string; width: number; height: number };
    }>;
  };
}

export const REDDIT_SUBREDDITS = [
  'shiftingrealities',
  'realityshifting',
  'shiftingscripts',
  'shiftingmethods',
] as const;

export type SubredditKey = typeof REDDIT_SUBREDDITS[number];

export const SUBREDDIT_LABELS: Record<SubredditKey, string> = {
  shiftingrealities: 'r/shiftingrealities',
  realityshifting:   'r/realityshifting',
  shiftingscripts:   'r/shiftingscripts',
  shiftingmethods:   'r/shiftingmethods',
};

export const SUBREDDIT_COLORS: Record<SubredditKey, string> = {
  shiftingrealities: 'orange',
  realityshifting:   'violet',
  shiftingscripts:   'sky',
  shiftingmethods:   'emerald',
};

async function redditFetch(url: string): Promise<Response> {
  // Substitui a URL absoluta do Reddit pela rota local configurada no proxy do Vite
  const localUrl = url.replace('https://www.reddit.com', '/api/reddit');
  const res = await fetch(localUrl);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res;
}

function resolveImage(post: RedditPost): string | undefined {
  const previewUrl = post.preview?.images?.[0]?.source?.url;
  if (previewUrl) return previewUrl.replace(/&amp;/g, '&');
  if (
    post.thumbnail &&
    post.thumbnail.startsWith('http') &&
    post.thumbnail !== 'self' &&
    post.thumbnail !== 'default' &&
    post.thumbnail !== 'nsfw'
  ) return post.thumbnail;
  return undefined;
}

function parsePosts(data: unknown): RedditPost[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any)?.data?.children ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((c: any) => c.data as RedditPost)
    .filter(
      (p: RedditPost) =>
        p.selftext &&
        p.selftext.length > 80 &&
        !p.selftext.startsWith('[removed]') &&
        !p.selftext.startsWith('[deleted]')
    )
    .map((p: RedditPost) => ({ ...p, thumbnail_url: resolveImage(p) }));
}

const BACKUP_REDDIT_POSTS: RedditPost[] = [
  {
    id: 'backup_1',
    title: 'Detailed guide on scripting for shifting realities',
    selftext: 'Scripting is not mandatory, but it helps organize your thoughts. You can script your appearance, your relationships, safety rules (like "I cannot die in my DR"), and a clone template. Remember that scripting does not create the reality; it just helps you tune into the one you want.',
    author: 'shifting_expert_101',
    score: 420,
    num_comments: 89,
    created_utc: Date.now() / 1000 - 86400,
    url: '',
    permalink: '/r/shiftingrealities/comments/backup_1',
    thumbnail: '',
    subreddit: 'shiftingrealities',
    subreddit_name_prefixed: 'r/shiftingrealities'
  },
  {
    id: 'backup_2',
    title: 'How I shifted using the Void State method',
    selftext: 'The void state is a state of deep meditation where you are pure consciousness. To get there, lay down comfortably and close your eyes. Repeat affirmations like "I am" until you feel weightless and see nothing but darkness. From there, affirm your DR and you will shift instantly.',
    author: 'void_traveler',
    score: 310,
    num_comments: 45,
    created_utc: Date.now() / 1000 - 172800,
    url: '',
    permalink: '/r/shiftingrealities/comments/backup_2',
    thumbnail: '',
    subreddit: 'shiftingrealities',
    subreddit_name_prefixed: 'r/shiftingrealities'
  },
  {
    id: 'backup_3',
    title: 'The importance of mindset and letting go',
    selftext: 'Shifting is all about your subconscious belief. Obsessing over shifting every night can create resistance. Take breaks, practice self-care, and remember that you shift every single second with every decision you make. Trust yourself and the process.',
    author: 'starlight_shifter',
    score: 285,
    num_comments: 32,
    created_utc: Date.now() / 1000 - 259200,
    url: '',
    permalink: '/r/shiftingrealities/comments/backup_3',
    thumbnail: '',
    subreddit: 'shiftingrealities',
    subreddit_name_prefixed: 'r/shiftingrealities'
  }
];

// ---------------------------------------------------------------------------
// Public API (Busca do Reddit original usando fila de proxies redundantes)
// ---------------------------------------------------------------------------

export async function fetchRedditPosts(
  sort: string = 'hot',
  limit: number = 8,
  subredditFilter?: SubredditKey
): Promise<RedditPost[]> {
  const subreddits = subredditFilter ? [subredditFilter] : [...REDDIT_SUBREDDITS];
  const results: RedditPost[] = [];

  await Promise.all(
    subreddits.map(async (sub) => {
      try {
        const perSub = subredditFilter
          ? limit
          : Math.ceil(limit / subreddits.length) + 2;
        const url = `https://www.reddit.com/r/${sub}/${sort}.json?limit=${perSub}&raw_json=1`;
        const res = await redditFetch(url);
        const data = await res.json();
        results.push(...parsePosts(data));
      } catch (e) {
        console.warn(`Erro ao buscar Reddit r/${sub}:`, e);
      }
    })
  );

  if (results.length === 0) {
    return BACKUP_REDDIT_POSTS.slice(0, limit);
  }

  results.sort(() => Math.random() - 0.5);
  return results.slice(0, limit);
}

export async function searchRedditPosts(
  query: string,
  subreddits: SubredditKey[] = [...REDDIT_SUBREDDITS],
  limit: number = 20
): Promise<RedditPost[]> {
  const results: RedditPost[] = [];
  const q = encodeURIComponent(query);

  await Promise.all(
    subreddits.map(async (sub) => {
      try {
        const url = `https://www.reddit.com/r/${sub}/search.json?q=${q}&restrict_sr=1&sort=relevance&limit=${limit}&raw_json=1`;
        const res = await redditFetch(url);
        const data = await res.json();
        results.push(...parsePosts(data));
      } catch (e) {
        console.warn(`Erro ao buscar Reddit r/${sub}:`, e);
      }
    })
  );

  if (results.length === 0) {
    return BACKUP_REDDIT_POSTS.slice(0, limit);
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
