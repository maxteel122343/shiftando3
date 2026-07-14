import React, { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Play, Pause, Sparkles, AlertCircle, Plus, X, Upload, Film, Music, Trash2 } from 'lucide-react';
import { User } from '../types';

interface VideoFeedPageProps {
  currentUser: User;
  users: User[];
  appTheme?: 'dark' | 'light';
}

interface VideoPost {
  id: string;
  username: string;
  avatar: string;
  description: string;
  tags: string[];
  videoUrl: string;
  likes: number;
  comments: number;
  shares: number;
  music: string;
  isTikTok?: boolean;
}

const DEFAULT_VIDEOS: VideoPost[] = [
  {
    id: 'vid_pedradalu4',
    username: 'pedradalu4',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    description: 'O que é shifting e como praticar. Eu nunca pratiquei mas acredito e sei que tudo é possivel com o poder da mente 🌌✨💜',
    tags: ['shifting', 'shifttok', 'shifters', 'shiftingbrasil', 'lawofattraction'],
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-starry-night-sky-with-clouds-in-time-lapse-40015-large.mp4',
    likes: 1250,
    comments: 88,
    shares: 45,
    music: 'som original - crystal moon 🦞🪩'
  },
  {
    id: 'vid_shiftxwlivie_1',
    username: 'shiftxwlivie',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    description: 'A sensação de acordar na sua DR pela primeira vez é inexplicável! Persistam, shifters! 💫✨',
    tags: ['shifttok', 'shifting', 'realidadedesejada', 'dr', 'relatoshifting'],
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-woman-meditating-in-nature-41582-large.mp4',
    likes: 2310,
    comments: 145,
    shares: 88,
    music: 'Original Sound - Livie Shifter'
  },
  {
    id: 'vid_nannalavigne',
    username: 'nannalavigne',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    description: 'Respondendo a perguntas sobre os sintomas físicos ao tentar fazer o shifting. É normal sentir isso? 🧬🌌',
    tags: ['shiftingbrasil', 'sintomasdeshifting', 'shifttok', 'realityshifting'],
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-mystical-fog-in-a-forest-41604-large.mp4',
    likes: 1850,
    comments: 92,
    shares: 34,
    music: 'Ambient Chill - Nanna'
  },
  {
    id: 'vid_enjoyagencia1',
    username: 'enjoyagencia1',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    description: 'Diferença entre sonhos lúcidos, projeção astral e reality shifting. Entenda de uma vez por todas! 🚪💫',
    tags: ['shifting', 'projecaoastral', 'sonholucido', 'astral', 'shifttokbrasil'],
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-forest-stream-under-beams-of-sunlight-41611-large.mp4',
    likes: 3100,
    comments: 201,
    shares: 95,
    music: 'Música Esotérica Relaxante'
  },
  {
    id: 'vid_trezeastra',
    username: 'trezeastra',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    description: 'A física quântica e a teoria dos multiuniversos explicando a realidade do shifting! 🌌🧬',
    tags: ['shiftingrealities', 'multiverso', 'fisicaquantica', 'shifttok'],
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-abstract-laser-lights-background-42171-large.mp4',
    likes: 1420,
    comments: 67,
    shares: 29,
    music: 'Cosmic Journey - TrezeAstra'
  },
  {
    id: 'vid_veradoastral',
    username: 'veradoastral',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    description: 'Conectando com a energia cósmica para facilitar a sua viagem para a DR hoje à noite! 🌌🪩',
    tags: ['leidaatracao', 'viagemastral', 'dr', 'shiftingbrasil'],
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-waves-crashing-on-rocks-from-above-42194-large.mp4',
    likes: 950,
    comments: 38,
    shares: 18,
    music: 'Frequência de Limpeza Astral'
  },
  {
    id: 'vid_shiftxwlivie_2',
    username: 'shiftxwlivie',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    description: 'Meu diário de shifting: Como foi passar um ano inteiro na DR e retornar para a CR. 📝💫',
    tags: ['relatoshifting', 'dr', 'realityshifting', 'diariodeshifting'],
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-the-earth-globe-42203-large.mp4',
    likes: 4200,
    comments: 310,
    shares: 154,
    music: 'Memory Lane - LoFi'
  },
  {
    id: 'vid_cria_shifter',
    username: 'cria_shifter',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    description: 'Técnicas de reprogramação mental para destravar o seu shifting e ir de vez para a DR! 🧠⚡',
    tags: ['reprogramacaomental', 'shifting', 'dr', 'metodosshifting'],
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-northern-lights-in-the-night-sky-40018-large.mp4',
    likes: 2780,
    comments: 119,
    shares: 56,
    music: 'Reprogramação Theta 8Hz'
  },
  {
    id: 'vid_lindih',
    username: 'lindih_d_trancaruas',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    description: 'Cuidando da sua energia e limpando influências antes de iniciar o processo de transição! 🌌🕯️',
    tags: ['limpezaenergetica', 'shifting', 'espiritualidade', 'shifters'],
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-particles-glowing-in-the-dark-42213-large.mp4',
    likes: 1980,
    comments: 87,
    shares: 42,
    music: 'Música de Proteção Espiritual'
  },
  {
    id: 'vid_ravenashf444',
    username: 'ravenashf444',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    description: 'O método Raven passo a passo atualizado para fazer hoje e obter resultados incríveis! 🌌✨',
    tags: ['metodoraven', 'shiftingrealities', 'dr', 'tutorialshifting'],
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-nebula-in-outer-space-40011-large.mp4',
    likes: 3050,
    comments: 198,
    shares: 72,
    music: 'Raven Guided Track - Alpha Waves'
  }
];

function getEmbedUrl(url: string): { type: 'youtube' | 'tiktok' | 'native'; url: string } {
  if (!url) return { type: 'native', url: '' };

  if (url.includes('.mp4') || url.includes('tikwm.com/video/')) {
    return { type: 'native', url };
  }

  // TikTok matches
  if (url.includes('tiktok.com')) {
    const videoIdMatch = url.match(/\/video\/(\d+)/) || url.match(/\/v\/(\d+)/) || url.match(/embed\/(\d+)/);
    if (videoIdMatch) {
      return {
        type: 'tiktok',
        url: `https://www.tiktok.com/embed/v2/${videoIdMatch[1]}?autoplay=1`
      };
    }
    // Fallback for short links (vm.tiktok.com)
    return {
      type: 'tiktok',
      url: url
    };
  }

  if (url.includes('tiktok.com/embed/')) {
    const embedUrl = url.includes('?') ? `${url}&autoplay=1` : `${url}?autoplay=1`;
    return { type: 'tiktok', url: embedUrl };
  }

  // YouTube Shorts matches
  const ytShortsRegex = /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/i;
  const ytShortsMatch = url.match(ytShortsRegex);
  if (ytShortsMatch) {
    return {
      type: 'youtube',
      url: `https://www.youtube.com/embed/${ytShortsMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytShortsMatch[1]}`
    };
  }

  // YouTube standard matches
  const ytRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/i;
  const ytMatch = url.match(ytRegex);
  if (ytMatch) {
    return {
      type: 'youtube',
      url: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}`
    };
  }

  return { type: 'native', url };
}

export function VideoFeedPage({ currentUser, users, appTheme = 'dark' }: VideoFeedPageProps) {
  const [videos, setVideos] = useState<VideoPost[]>(() => {
    const stored = localStorage.getItem('shifting_videos_v4');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_VIDEOS;
  });

  const [isDevDeleteEnabled, setIsDevDeleteEnabled] = useState(() => 
    localStorage.getItem('shifting_dev_delete_enabled') === 'true'
  );

  useEffect(() => {
    const checkDevDelete = () => {
      setIsDevDeleteEnabled(localStorage.getItem('shifting_dev_delete_enabled') === 'true');
    };
    window.addEventListener('shifting_dev_delete_updated', checkDevDelete);
    return () => {
      window.removeEventListener('shifting_dev_delete_updated', checkDevDelete);
    };
  }, []);

  const [activeVideoId, setActiveVideoId] = useState<string>(() => videos[0]?.id || '');
  const [likedVideos, setLikedVideos] = useState<Record<string, boolean>>({});
  const [muted, setMuted] = useState<boolean>(false);
  const [playingState, setPlayingState] = useState<Record<string, boolean>>(() => ({
    [videos[0]?.id || '']: true
  }));

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoFileUrl, setVideoFileUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [music, setMusic] = useState('');

  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    localStorage.setItem('shifting_videos_v4', JSON.stringify(videos));
  }, [videos]);

  useEffect(() => {
    const resolveTikTokVideos = async () => {
      let updated = false;
      const resolved = await Promise.all(videos.map(async (v) => {
        if (v.videoUrl.includes('tiktok.com') && !v.videoUrl.includes('.mp4') && !v.videoUrl.includes('tikwm.com')) {
          try {
            const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(v.videoUrl)}`);
            const json = await res.json();
            if (json && json.data && json.data.play) {
              updated = true;
              return { ...v, videoUrl: json.data.play };
            }
          } catch (e) {
            console.warn("Failed to resolve tikwm url for", v.id, e);
          }
        }
        return v;
      }));
      if (updated) {
        setVideos(resolved);
      }
    };
    resolveTikTokVideos();
  }, []);

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.25
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const videoId = entry.target.getAttribute('data-video-id');
        if (!videoId) return;

        if (entry.isIntersecting) {
          setActiveVideoId(videoId);
          setPlayingState(prev => ({ ...prev, [videoId]: true }));
        } else {
          setPlayingState(prev => ({ ...prev, [videoId]: false }));
        }
      });
    }, observerOptions);

    const currentRefs = { ...videoRefs.current };
    Object.keys(currentRefs).forEach((id) => {
      const el = currentRefs[id];
      if (el) {
        el.setAttribute('data-video-id', id);
        observer.observe(el);
      }
    });

    return () => {
      Object.keys(currentRefs).forEach((id) => {
        const el = currentRefs[id];
        if (el) {
          observer.unobserve(el);
        }
      });
    };
  }, [videos]);

  useEffect(() => {
    Object.keys(videoRefs.current).forEach((id) => {
      const videoEl = videoRefs.current[id];
      if (videoEl) {
        if (id === activeVideoId) {
          if (playingState[id]) {
            videoEl.play().catch(() => {});
          } else {
            videoEl.pause();
          }
        } else {
          videoEl.pause();
        }
      }
    });
  }, [activeVideoId, playingState]);

  const handleTogglePlay = (id: string) => {
    const isPlaying = !playingState[id];
    setPlayingState(prev => ({ ...prev, [id]: isPlaying }));
    const videoEl = videoRefs.current[id];
    if (videoEl) {
      if (isPlaying) {
        videoEl.play().catch(() => {});
      } else {
        videoEl.pause();
      }
    }
  };

  const handleToggleLike = (id: string) => {
    setLikedVideos(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoFileUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResolving(true);
    let finalVideoUrl = videoFileUrl || videoUrl.trim() || 'https://assets.mixkit.co/videos/preview/mixkit-starry-night-sky-with-clouds-in-time-lapse-40015-large.mp4';
    
    if (!videoFileUrl && finalVideoUrl.includes('tiktok.com')) {
      try {
        const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(finalVideoUrl)}`);
        const json = await res.json();
        if (json && json.data) {
          if (json.data.play) {
            finalVideoUrl = json.data.play;
          } else if (json.data.images && json.data.images.length > 0) {
            finalVideoUrl = json.data.images[0];
          }
        }
      } catch (err) {
        console.warn("Failed to resolve on submit:", err);
      }
    }
    
    const tagsArray = tags
      .split(' ')
      .map(t => t.trim())
      .filter(t => t.length > 0)
      .map(t => t.startsWith('#') ? t.substring(1) : t);

    const isTikTokUrl = videoUrl.includes('tiktok.com') || finalVideoUrl.includes('tiktok.com') || finalVideoUrl.includes('tikwm.com');

    const newVideo: VideoPost = {
      id: `vid_${Date.now()}`,
      username: currentUser.username || 'visitante',
      avatar: currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      description: description.trim() || 'Novo vídeo de shifting!',
      tags: tagsArray.length > 0 ? tagsArray : ['shifting'],
      videoUrl: finalVideoUrl,
      likes: 0,
      comments: 0,
      shares: 0,
      music: music.trim() || `Música Original - ${currentUser.username || 'visitante'}`,
      isTikTok: isTikTokUrl
    };

    const updatedVideos = [newVideo, ...videos];
    setVideos(updatedVideos);
    setActiveVideoId(newVideo.id);
    setPlayingState({ [newVideo.id]: true });

    // Reset Form
    setVideoUrl('');
    setVideoFileUrl(null);
    setDescription('');
    setTags('');
    setMusic('');
    setIsResolving(false);
    setIsModalOpen(false);
  };

  const handleDeleteVideo = (id: string) => {
    if (window.confirm("Deseja realmente excluir este relato em vídeo?")) {
      const updated = videos.filter(v => v.id !== id);
      setVideos(updated);
      if (activeVideoId === id && updated.length > 0) {
        setActiveVideoId(updated[0].id);
        setPlayingState({ [updated[0].id]: true });
      }
    }
  };

  const isLight = appTheme === 'light';

  return (
    <div className={`w-full min-h-screen flex flex-col items-center py-6 px-2 sm:px-4 transition-colors duration-300 ${
      isLight 
        ? 'bg-gradient-to-br from-white via-slate-50 to-slate-100 text-slate-800' 
        : 'bg-[#08070d] text-white'
    }`}>
      {/* Header */}
      <div className="w-full max-w-[700px] flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
          <h1 className={`text-xl font-bold ${
            isLight
              ? 'text-purple-700'
              : 'bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent'
          }`}>
            Shift Reels
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-600 hover:bg-purple-700 transition-all text-white text-xs font-semibold shadow-md shadow-purple-500/25 cursor-pointer"
            title="Criar Post de Vídeo"
          >
            <Plus className="w-4 h-4" />
            <span>Postar Vídeo</span>
          </button>
          <button
            onClick={() => setMuted(!muted)}
            className={`p-2 rounded-full transition-all cursor-pointer ${
              isLight
                ? 'bg-slate-200/60 hover:bg-slate-300/60 text-slate-700'
                : 'bg-white/10 hover:bg-white/20 text-slate-300'
            }`}
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main vertical scrolling cards feed */}
      <div className="w-full max-w-[680px] flex flex-col gap-6 px-1 sm:px-2 pb-32">
        {videos.map((video) => {
          const isLiked = !!likedVideos[video.id];
          const isPlaying = !!playingState[video.id];
          const isTikTok = video.isTikTok || video.videoUrl.includes('tiktok.com') || video.videoUrl.includes('tikwm.com') || video.id.includes('pedradalu') || video.id.includes('shiftxwlivie') || video.id.includes('nanna') || video.id.includes('enjoy') || video.id.includes('treze') || video.id.includes('veradoastral') || video.id.includes('cria') || video.id.includes('lindih') || video.id.includes('ravena');
          const embedInfo = getEmbedUrl(video.videoUrl);
          const isEmbed = embedInfo.type !== 'native';
          const isOwnVideo = video.username === (currentUser.username || 'visitante') || video.id === 'vid_test_tiktok';
          const isImage = !!(video.videoUrl.match(/\.(jpeg|jpg|gif|png|webp)/i) || video.videoUrl.includes('unsplash') || video.videoUrl.includes('format=webp') || video.videoUrl.includes('format=jpeg') || video.videoUrl.includes('format=png'));

          return (
            <div 
              key={video.id}
              className={`w-full h-[calc(100vh-80px)] min-h-[580px] max-h-[800px] snap-start snap-always border rounded-[28px] p-0 py-3.5 flex flex-col justify-between shadow-xl transition-all ${
                isLight
                  ? 'bg-white border-slate-200'
                  : 'bg-[#120f20] border-white/5'
              }`}
            >
              {/* Creator Header - Hide on TikTok videos to save space */}
              {!isTikTok && (
                <div className="flex items-center justify-between w-full shrink-0 px-4 pb-2">
                  <div className="flex items-center gap-3">
                    <img 
                      src={video.avatar} 
                      alt={video.username} 
                      className="w-9 h-9 rounded-full border border-purple-500/30 object-cover" 
                    />
                    <div className="flex flex-col">
                      <span className={`font-bold text-xs ${isLight ? 'text-purple-700' : 'text-purple-300'}`}>@{video.username}</span>
                      <span className="text-[9px] text-slate-500 font-medium">Shifter</span>
                    </div>
                  </div>
                  {(isOwnVideo || isDevDeleteEnabled) && (
                    <button 
                      onClick={() => handleDeleteVideo(video.id)}
                      className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all cursor-pointer animate-fade-in"
                      title="Excluir relato em vídeo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Video Player Container (Edge-to-Edge Width) */}
              <div className="relative flex-1 min-h-0 w-full bg-black overflow-hidden shadow-inner flex items-center justify-center">
                {isTikTok && isDevDeleteEnabled && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteVideo(video.id);
                    }}
                    className="absolute top-4 right-4 z-30 p-2 rounded-lg bg-black/60 hover:bg-red-600 border border-white/10 text-white hover:text-white transition-all cursor-pointer shadow-md"
                    title="Excluir relato em vídeo (Modo Dev)"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                )}
                {isImage ? (
                  <img
                    src={video.videoUrl}
                    alt={video.description}
                    className="w-full h-full object-cover scale-[1.4] md:scale-100 transition-transform origin-center"
                  />
                ) : isEmbed ? (
                  <iframe
                    src={embedInfo.url}
                    className="w-full h-full border-0 overflow-hidden scale-[1.4] md:scale-100 transition-transform origin-center"
                    scrolling="no"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <video
                    ref={(el) => { videoRefs.current[video.id] = el; }}
                    src={video.videoUrl}
                    loop
                    muted={muted || activeVideoId !== video.id}
                    playsInline
                    onPlay={() => setPlayingState(prev => ({ ...prev, [video.id]: true }))}
                    onPause={() => setPlayingState(prev => ({ ...prev, [video.id]: false }))}
                    onClick={() => handleTogglePlay(video.id)}
                    className="w-full h-full object-cover cursor-pointer scale-[1.4] md:scale-100 transition-transform origin-center"
                  />
                )}

                {/* Floating controls for TikTok videos */}
                {isTikTok && (
                  <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                    {isOwnVideo && (
                      <button 
                        onClick={() => handleDeleteVideo(video.id)}
                        className="p-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white transition-all cursor-pointer shadow-md"
                        title="Excluir relato em vídeo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <a
                      href={`https://www.tiktok.com/@${video.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 hover:bg-purple-600 border border-white/10 text-[9px] font-bold text-white transition-all backdrop-blur-sm shadow-md cursor-pointer"
                    >
                      <span>Seguir no TikTok</span>
                    </a>
                  </div>
                )}
                
                {/* Custom Play/Pause Overlay for native videos */}
                {!isPlaying && !isEmbed && !isImage && (
                  <div 
                    onClick={() => handleTogglePlay(video.id)}
                    className="absolute inset-0 flex items-center justify-center bg-black/35 cursor-pointer"
                  >
                    <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 hover:scale-105 transition-transform">
                      <Play className="w-6 h-6 text-white fill-white ml-1" />
                    </div>
                  </div>
                )}
              </div>

              {/* Details and Actions Row below the player */}
              <div className="flex flex-col gap-3 px-4 pt-2.5 shrink-0">
                {/* Actions & Music bar - Hide on TikTok to prevent duplicates */}
                {!isTikTok && (
                  <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-100' : 'border-white/5'}`}>
                    <div className="flex items-center gap-4">
                      {/* Like button */}
                      <button 
                        onClick={() => handleToggleLike(video.id)}
                        className={`flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
                          isLiked 
                            ? 'text-pink-500' 
                            : isLight ? 'text-slate-500 hover:text-pink-500' : 'text-slate-400 hover:text-pink-500'
                        }`}
                      >
                        <Heart className={`w-5 h-5 ${isLiked ? 'fill-pink-500 text-pink-500' : ''}`} />
                        <span>{video.likes + (isLiked ? 1 : 0)}</span>
                      </button>

                      {/* Comments mock button */}
                      <div className={`flex items-center gap-1.5 text-xs font-semibold ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                        <MessageCircle className="w-5 h-5" />
                        <span>{video.comments}</span>
                      </div>

                      {/* Share mock button */}
                      <div className={`flex items-center gap-1.5 text-xs font-semibold ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                        <Share2 className="w-5 h-5" />
                        <span>{video.shares}</span>
                      </div>
                    </div>

                    {/* Music Track Badge */}
                    {video.music && (
                      <div className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border max-w-[170px] ${
                        isLight 
                          ? 'bg-purple-50 border-purple-100 text-purple-600' 
                          : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                      }`}>
                        <Music className="w-3 h-3 shrink-0 animate-pulse" />
                        <span className="truncate">{video.music}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Description & Tags */}
                <div className="space-y-2">
                  <p className={`text-xs leading-relaxed font-semibold ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
                    {video.description}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {video.tags.map((tag) => (
                        <span 
                          key={tag} 
                          className={`text-[10px] font-bold uppercase tracking-wider ${
                            isLight ? 'text-purple-600' : 'text-purple-400'
                          }`}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Repositioned Music Badge for TikTok videos to save space */}
                    {isTikTok && video.music && (
                      <div className={`flex items-center gap-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full border max-w-[155px] shrink-0 ${
                        isLight 
                          ? 'bg-purple-50 border-purple-100 text-purple-600' 
                          : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                      }`}>
                        <Music className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{video.music}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`mt-4 flex items-center gap-2 text-xs border px-4 py-2.5 rounded-full max-w-[420px] text-center ${
        isLight
          ? 'text-slate-600 bg-slate-100/60 border-slate-200'
          : 'text-slate-500 bg-[#0e0c15] border-white/5'
      }`}>
        <AlertCircle className="w-4 h-4 text-purple-500 shrink-0 animate-bounce" />
        <span>Role para baixo ou use o scroll para ver mais relatos em vídeo.</span>
      </div>

      {/* Create Video Post Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <div className={`relative border w-full max-w-md rounded-[28px] p-6 shadow-2xl z-10 animate-in fade-in zoom-in duration-200 ${
            isLight
              ? 'bg-white border-slate-200 text-[#1e293b]'
              : 'bg-[#15121e] border-purple-500/20 text-white'
          }`}>
            <button 
              onClick={() => setIsModalOpen(false)}
              className={`absolute top-4 right-4 transition-colors ${
                isLight ? 'text-slate-400 hover:text-slate-700' : 'text-slate-400 hover:text-white'
              }`}
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${
              isLight ? 'text-slate-800' : 'text-white'
            }`}>
              <Film className="w-5 h-5 text-purple-400" />
              <span>Criar Relato em Vídeo</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Media Selection */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Mídia do Vídeo</label>
                <div className="grid grid-cols-1 gap-3">
                  {/* File Upload Option */}
                  <div className="relative bg-[#0c0a13] border border-white/5 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center group hover:border-purple-500/30 transition-all min-h-[90px] text-center">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                    />
                    <Upload className="w-6 h-6 text-slate-500 group-hover:text-purple-400 mb-1 transition-colors" />
                    <span className="text-xs text-slate-400 font-medium group-hover:text-slate-200">
                      {videoFileUrl ? "Vídeo carregado com sucesso!" : "Upload de vídeo local"}
                    </span>
                  </div>

                  {/* Paste URL Option */}
                  <div className="bg-[#0c0a13] border border-white/5 rounded-2xl p-3">
                    <span className="text-[11px] text-slate-400 font-medium mb-1.5 block">Ou cole link de vídeo:</span>
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => {
                        setVideoUrl(e.target.value);
                        setVideoFileUrl(null);
                      }}
                      placeholder="https://www.tiktok.com/@usuario/video/123456789..."
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
                    />
                    <p className="text-[10.5px] text-slate-500 mt-1.5 leading-normal">
                      💡 <strong>Dica:</strong> Cole o link completo do navegador (deve conter <strong>/video/</strong> ou <strong>/v/</strong> e o ID numérico). Links curtos de compartilhamento do app do celular (ex: <em>vm.tiktok.com</em> ou <em>/t/</em>) não funcionam devido a restrições do TikTok.
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Descrição</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva a sua experiência..."
                  rows={3}
                  className="w-full bg-[#0c0a13] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all resize-none"
                  required
                />
              </div>

              {/* Tags */}
              <div>
                <label htmlFor="tags" className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Hashtags</label>
                <input
                  type="text"
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="shifting dr sonho"
                  className="w-full bg-[#0c0a13] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
                />
              </div>

              {/* Music */}
              <div>
                <label htmlFor="music" className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider flex items-center gap-1">
                  <Music className="w-3 h-3 text-purple-400" />
                  <span>Trilha Sonora / Música</span>
                </label>
                <input
                  type="text"
                  id="music"
                  value={music}
                  onChange={(e) => setMusic(e.target.value)}
                  placeholder="Ex: Dreamscape Ambient - LoFi Beats"
                  className="w-full bg-[#0c0a13] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold py-2.5 rounded-xl transition-all cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isResolving}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold py-2.5 rounded-xl transition-all shadow-[0_4px_15px_rgba(147,51,234,0.25)] cursor-pointer text-center disabled:opacity-50"
                >
                  {isResolving ? 'Processando Link...' : 'Postar Vídeo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

