-- SUPABASE DATABASE SCHEMA FOR SHIFTING SOCIAL APP (IDEMPOTENT / RUN-SAFE VERSION)
-- Copy and paste this directly into your Supabase SQL Editor!

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Public Profiles Table (Links to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar TEXT,
    bio TEXT,
    followers UUID[] DEFAULT '{}'::UUID[],
    following UUID[] DEFAULT '{}'::UUID[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Posts Table
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image TEXT,
    hashtags TEXT[] DEFAULT '{}'::TEXT[],
    focus_on_text BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Likes Table
CREATE TABLE IF NOT EXISTS public.likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(post_id, user_id) -- A user can only like a post once
);

-- 5. Create Comments Table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create Saves (Saved Posts) Table
CREATE TABLE IF NOT EXISTS public.saves (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(post_id, user_id)
);

-- 7. Create Saved Ebooks Table (Saves and keeps reader preferences/progress)
CREATE TABLE IF NOT EXISTS public.saved_ebooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    ebook_id TEXT NOT NULL,
    progress FLOAT DEFAULT 0.0 NOT NULL,
    current_chapter INT DEFAULT 0 NOT NULL,
    font_size INT DEFAULT 16,
    line_height TEXT DEFAULT 'normal',
    font_family TEXT DEFAULT 'sans-serif',
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, ebook_id)
);

-- 7b. Create Ebooks Table
CREATE TABLE IF NOT EXISTS public.ebooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    cover_image TEXT,
    description TEXT,
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    author_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_paid BOOLEAN DEFAULT false NOT NULL,
    price NUMERIC(10, 2) DEFAULT 0.0,
    lock_type TEXT DEFAULT 'preview_30',
    allow_download BOOLEAN DEFAULT true NOT NULL,
    is_pdf_ready BOOLEAN DEFAULT false NOT NULL,
    uploaded_pdf TEXT,
    pdf_file_name TEXT,
    audio_tracks JSONB DEFAULT '[]'::JSONB
);

-- 7c. Create Ebook Pages Table
CREATE TABLE IF NOT EXISTS public.ebook_pages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ebook_id UUID REFERENCES public.ebooks(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image TEXT,
    images JSONB DEFAULT '[]'::JSONB,
    font_family TEXT DEFAULT 'serif',
    color TEXT,
    bg TEXT,
    align TEXT DEFAULT 'justify',
    is_bold BOOLEAN DEFAULT false,
    is_italic BOOLEAN DEFAULT false,
    page_index INT DEFAULT 0
);

-- 7d. Create Messages Table for Shifting AI Chat Guide
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_ebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ebook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS Policies (Safely dropping first to avoid existing policy errors)

-- PROFILES Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- POSTS Policies
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
CREATE POLICY "Posts are viewable by everyone" ON public.posts
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.posts;
CREATE POLICY "Authenticated users can create posts" ON public.posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
CREATE POLICY "Users can update their own posts" ON public.posts
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
CREATE POLICY "Users can delete their own posts" ON public.posts
    FOR DELETE USING (auth.uid() = user_id);

-- LIKES Policies
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.likes;
CREATE POLICY "Likes are viewable by everyone" ON public.likes
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can toggle likes" ON public.likes;
CREATE POLICY "Authenticated users can toggle likes" ON public.likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove their own likes" ON public.likes;
CREATE POLICY "Users can remove their own likes" ON public.likes
    FOR DELETE USING (auth.uid() = user_id);

-- COMMENTS Policies
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Comments are viewable by everyone" ON public.comments
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can comment" ON public.comments;
CREATE POLICY "Authenticated users can comment" ON public.comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their comments" ON public.comments;
CREATE POLICY "Users can update their comments" ON public.comments
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their comments" ON public.comments;
CREATE POLICY "Users can delete their comments" ON public.comments
    FOR DELETE USING (auth.uid() = user_id);

-- SAVES Policies
DROP POLICY IF EXISTS "Saves are private to owners" ON public.saves;
CREATE POLICY "Saves are private to owners" ON public.saves
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can save posts" ON public.saves;
CREATE POLICY "Authenticated users can save posts" ON public.saves
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unsave posts" ON public.saves;
CREATE POLICY "Users can unsave posts" ON public.saves
    FOR DELETE USING (auth.uid() = user_id);

-- SAVED EBOOKS Policies
DROP POLICY IF EXISTS "Saved ebooks are private to owners" ON public.saved_ebooks;
CREATE POLICY "Saved ebooks are private to owners" ON public.saved_ebooks
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can save ebooks" ON public.saved_ebooks;
CREATE POLICY "Authenticated users can save ebooks" ON public.saved_ebooks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their saved ebooks" ON public.saved_ebooks;
CREATE POLICY "Users can update their saved ebooks" ON public.saved_ebooks
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their saved ebooks" ON public.saved_ebooks;
CREATE POLICY "Users can delete their saved ebooks" ON public.saved_ebooks
    FOR DELETE USING (auth.uid() = user_id);

-- EBOOKS Policies
DROP POLICY IF EXISTS "Ebooks are viewable by everyone" ON public.ebooks;
CREATE POLICY "Ebooks are viewable by everyone" ON public.ebooks
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create ebooks" ON public.ebooks;
CREATE POLICY "Authenticated users can create ebooks" ON public.ebooks
    FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can update their own ebooks" ON public.ebooks;
CREATE POLICY "Users can update their own ebooks" ON public.ebooks
    FOR UPDATE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can delete their own ebooks" ON public.ebooks;
CREATE POLICY "Users can delete their own ebooks" ON public.ebooks
    FOR DELETE USING (auth.uid() = author_id);

-- EBOOK_PAGES Policies
DROP POLICY IF EXISTS "Ebook pages are viewable by everyone" ON public.ebook_pages;
CREATE POLICY "Ebook pages are viewable by everyone" ON public.ebook_pages
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert ebook pages" ON public.ebook_pages;
CREATE POLICY "Authenticated users can insert ebook pages" ON public.ebook_pages
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update ebook pages" ON public.ebook_pages;
CREATE POLICY "Authenticated users can update ebook pages" ON public.ebook_pages
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete ebook pages" ON public.ebook_pages;
CREATE POLICY "Authenticated users can delete ebook pages" ON public.ebook_pages
    FOR DELETE USING (true);

-- MESSAGES Policies
DROP POLICY IF EXISTS "Anyone can read messages" ON public.messages;
CREATE POLICY "Anyone can read messages" ON public.messages
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can insert messages" ON public.messages;
CREATE POLICY "Anyone can insert messages" ON public.messages
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can delete messages" ON public.messages;
CREATE POLICY "Anyone can delete messages" ON public.messages
    FOR DELETE USING (true);

-- 10. Automatic Profile Creation Trigger (CRITICAL FOR EASY SIGNUP)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar, bio)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', 'shifter_' || substr(new.id::text, 1, 8)),
    COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username', 'New Shifter'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'),
    'Iniciando minha jornada de Shifting!'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 11. Helper view for full posts with metrics (likes count, comments count, etc)
CREATE OR REPLACE VIEW public.posts_with_metrics AS
SELECT 
    p.*,
    COALESCE(l.likes_count, 0) as likes_count,
    COALESCE(c.comments_count, 0) as comments_count,
    pr.username,
    pr.display_name,
    pr.avatar
FROM public.posts p
LEFT JOIN public.profiles pr ON p.user_id = pr.id
LEFT JOIN (
    SELECT post_id, COUNT(*) as likes_count 
    FROM public.likes 
    GROUP BY post_id
) l ON p.id = l.post_id
LEFT JOIN (
    SELECT post_id, COUNT(*) as comments_count 
    FROM public.comments 
    GROUP BY post_id
) c ON p.id = c.post_id;

-- 12. Create Credit Requests Table (Logs user requests for credit refills)
CREATE TABLE IF NOT EXISTS public.credit_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount INT DEFAULT 5 NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.credit_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own credit requests" ON public.credit_requests;
CREATE POLICY "Users can insert their own credit requests" ON public.credit_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id OR (auth.uid() IS NULL AND user_id = '00000000-0000-0000-0000-000000000000'::UUID));

DROP POLICY IF EXISTS "Users can view their own credit requests" ON public.credit_requests;
CREATE POLICY "Users can view their own credit requests" ON public.credit_requests
    FOR SELECT USING (auth.uid() = user_id);
