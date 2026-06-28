export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  followers: string[]; // array of userIds
  following: string[]; // array of userIds
  email?: string;
  password?: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: number;
}

export interface EBookPage {
  id: string;
  title: string;
  content: string;
  image?: string;
  images?: Array<{
    id: string;
    url: string;
    width: number; // percentage width (10 to 100)
    align: 'left' | 'center' | 'right';
  }>;
  fontFamily: 'serif' | 'sans' | 'mono' | 'cursive';
  color: string; // hex or tailwind class
  bg: string;    // hex or tailwind class
  align: 'left' | 'center' | 'justify';
  isBold?: boolean;
  isItalic?: boolean;
}

export interface EBookAudioTrack {
  id: string;
  title: string;
  url: string;
  triggerProgress: number; // percentage (0 to 100)
  fadeInSec?: number;
  fadeOutSec?: number;
}

export interface EBook {
  id: string;
  title: string;
  coverImage: string;
  content: string;
  description?: string;
  authorId?: string;
  authorName?: string;
  pages?: EBookPage[];
  createdAt?: number;
  isPaid?: boolean;
  price?: number;
  lockType?: 'preview_30' | 'full';
  allowDownload?: boolean;
  audioTracks?: EBookAudioTrack[];
  likes?: string[]; // array of userIds
  isPdfReady?: boolean;
  uploadedPdf?: string; // base64 string
  pdfFileName?: string;
}

export interface Post {
  id: string;
  userId: string;
  title: string;
  content: string;
  image?: string;
  hashtags: string[];
  likes: string[]; // array of userIds
  comments: Comment[];
  createdAt: number;
  repostOf?: string;
  repostedBy?: string;
  relatedEBookId?: string;
}
