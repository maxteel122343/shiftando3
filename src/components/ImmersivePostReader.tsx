import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, BookOpen, Clock, Type, Play, Pause, Volume2, Sparkles, Heart, MessageCircle, Bookmark, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Post, User } from '../types';

interface ImmersivePostReaderProps {
  post: Post;
  author: User;
  onClose: () => void;
  isLiked?: boolean;
  isSaved?: boolean;
  onLike?: () => void;
  onToggleSave?: () => void;
}

type Theme = 'midnight' | 'charcoal' | 'sepia' | 'light';
type FontSize = 'sm' | 'md' | 'lg' | 'xl';
type FontStyle = 'serif' | 'sans' | 'mono';

export function ImmersivePostReader({
  post,
  author,
  onClose,
  isLiked = false,
  isSaved = false,
  onLike,
  onToggleSave
}: ImmersivePostReaderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('immersive_reader_theme') as Theme) || 'light';
  });
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    return (localStorage.getItem('immersive_reader_fontsize') as FontSize) || 'lg';
  });
  const [fontStyle, setFontStyle] = useState<FontStyle>(() => {
    return (localStorage.getItem('immersive_reader_fontstyle') as FontStyle) || 'serif';
  });

  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Background Soundscape Player
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Estimated Reading Time
  const wordCount = post.content.split(/\s+/).filter(Boolean).length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200)); // Average 200 words per minute

  // Save preferences to local storage
  useEffect(() => {
    localStorage.setItem('immersive_reader_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('immersive_reader_fontsize', fontSize);
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('immersive_reader_fontstyle', fontStyle);
  }, [fontStyle]);

  // Handle Scroll Progress
  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        const totalHeight = scrollHeight - clientHeight;
        if (totalHeight > 0) {
          setScrollProgress((scrollTop / totalHeight) * 100);
        }
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  // Audio system: Relaxing Cosmic Soundscape
  useEffect(() => {
    // We can use a high-quality, royalty-free ambient synth or white noise audio URL for shifting meditation
    const ambientUrl = "https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav"; // soft wind/synth loop fallback
    
    // Create audio element
    const audio = new Audio("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3"); // fallback loop
    audio.loop = true;
    audioRef.current = audio;

    // Use a lighter/more specific audio file for shifting lofi/ambient if possible, or a premium relaxation wave
    // For general reliability, we'll use a public ambient synthesized drone URL:
    // https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3 is a long chill synth track
    audio.src = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3";

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isPlaying ? volume : 0;
      if (isPlaying) {
        audioRef.current.play().catch(err => {
          console.log("Autoplay blocked or audio load error:", err);
          setIsPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, volume]);

  const togglePlaySound = () => {
    setIsPlaying(!isPlaying);
  };

  const themeStyles = {
    midnight: {
      bg: 'bg-[#0a0814]',
      text: 'text-slate-200 text-shadow-sm',
      headerBg: 'bg-[#120f24]/90 border-white/5 backdrop-blur-md',
      textMuted: 'text-slate-400',
      accent: 'text-purple-400',
      btnActive: 'bg-purple-600/25 border-purple-500/50 text-purple-300',
      btnInactive: 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border-white/10',
      innerCard: 'bg-[#120f24]/50 border-white/5',
      soundscapeBg: 'bg-[#120f24]/95 border-purple-500/30 shadow-[0_0_20px_rgba(126,58,242,0.25)]',
    },
    charcoal: {
      bg: 'bg-[#121212]',
      text: 'text-stone-200',
      headerBg: 'bg-[#1c1c1c]/90 border-stone-800 backdrop-blur-md',
      textMuted: 'text-stone-400',
      accent: 'text-purple-400',
      btnActive: 'bg-purple-500/20 border-purple-400/50 text-purple-300',
      btnInactive: 'bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-100 border-stone-700',
      innerCard: 'bg-[#1c1c1c]/60 border-stone-800',
      soundscapeBg: 'bg-[#1a1a1a]/95 border-stone-800 shadow-[0_0_20px_rgba(0,0,0,0.5)]',
    },
    sepia: {
      bg: 'bg-[#f5ebd6]',
      text: 'text-[#40301d]',
      headerBg: 'bg-[#ebdcb9]/90 border-[#ded0ab] backdrop-blur-md',
      textMuted: 'text-[#7e603e]',
      accent: 'text-[#8c5011]',
      btnActive: 'bg-[#dfce9e] border-[#bda674] text-[#8c5011] font-semibold',
      btnInactive: 'bg-[#eddcb4]/50 hover:bg-[#ebdca6] text-[#7e603e] hover:text-[#40301d] border-[#dfce9e]',
      innerCard: 'bg-[#eddcb4]/40 border-[#dfce9e]',
      soundscapeBg: 'bg-[#ebdcb9]/95 border-[#ded0ab] shadow-[0_4px_20px_rgba(120,90,50,0.15)]',
    },
    light: {
      bg: 'bg-[#fdfcf7]',
      text: 'text-slate-800',
      headerBg: 'bg-[#f4f2e9]/90 border-slate-200 backdrop-blur-md',
      textMuted: 'text-slate-500',
      accent: 'text-purple-600',
      btnActive: 'bg-purple-100 border-purple-300 text-purple-700 font-semibold',
      btnInactive: 'bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 border-slate-200',
      innerCard: 'bg-[#f4f2e9]/50 border-slate-200',
      soundscapeBg: 'bg-white/95 border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.08)]',
    }
  };

  const fontSizes = {
    sm: 'text-base md:text-lg leading-relaxed',
    md: 'text-lg md:text-xl leading-relaxed',
    lg: 'text-xl md:text-2xl leading-[1.8]',
    xl: 'text-2xl md:text-3xl leading-[1.85]'
  };

  const fontStyles = {
    serif: 'font-serif font-medium tracking-wide',
    sans: 'font-sans tracking-normal',
    mono: 'font-mono text-[15px] leading-relaxed'
  };

  const style = themeStyles[theme];

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-[200] flex flex-col overflow-hidden ${style.bg} ${style.text} transition-all duration-300`}
      >
        {/* Top Scroll Indicator */}
        <div className="w-full h-1 bg-white/5 shrink-0 z-[210]">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 transition-all duration-100"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {/* Reader Header */}
        <header className={`flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-b gap-3 shrink-0 z-[205] ${style.headerBg}`}>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs uppercase tracking-wider transition-all hover:scale-105 active:scale-95 cursor-pointer bg-white/5 border border-white/10 hover:bg-purple-600 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Sair do Leitor</span>
            </button>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span className={style.textMuted}>{readingTime} min de leitura</span>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
            
            {/* Font style choosing (Serif, Sans, Mono) */}
            <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10 scale-90 sm:scale-100">
              <button
                onClick={() => setFontStyle('serif')}
                className={`px-2 py-1 rounded text-xs font-semibold font-serif transition-all ${fontStyle === 'serif' ? style.btnActive : style.btnInactive}`}
                title="Fonte Serifada (Livro)"
              >
                Serif
              </button>
              <button
                onClick={() => setFontStyle('sans')}
                className={`px-2 py-1 rounded text-xs font-semibold font-sans transition-all ${fontStyle === 'sans' ? style.btnActive : style.btnInactive}`}
                title="Fonte Sem Serifa (Moderna)"
              >
                Sans
              </button>
              <button
                onClick={() => setFontStyle('mono')}
                className={`px-2 py-1 rounded text-xs font-semibold font-mono transition-all ${fontStyle === 'mono' ? style.btnActive : style.btnInactive}`}
                title="Fonte Monoespaçada (Técnica)"
              >
                Mono
              </button>
            </div>

            {/* Font size adjusting */}
            <div className="flex items-center gap-0.5 bg-white/5 p-0.5 rounded-lg border border-white/10 scale-90 sm:scale-100">
              <button
                onClick={() => setFontSize('sm')}
                className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold transition-all ${fontSize === 'sm' ? style.btnActive : style.btnInactive}`}
                title="Fonte Pequena"
              >
                A-
              </button>
              <button
                onClick={() => setFontSize('md')}
                className={`w-7 h-7 rounded flex items-center justify-center text-sm font-bold transition-all ${fontSize === 'md' ? style.btnActive : style.btnInactive}`}
                title="Fonte Média"
              >
                A
              </button>
              <button
                onClick={() => setFontSize('lg')}
                className={`w-7 h-7 rounded flex items-center justify-center text-base font-bold transition-all ${fontSize === 'lg' ? style.btnActive : style.btnInactive}`}
                title="Fonte Grande"
              >
                A+
              </button>
              <button
                onClick={() => setFontSize('xl')}
                className={`w-7 h-7 rounded flex items-center justify-center text-lg font-bold transition-all ${fontSize === 'xl' ? style.btnActive : style.btnInactive}`}
                title="Fonte Gigante"
              >
                A++
              </button>
            </div>

            {/* Themes selection */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10 scale-90 sm:scale-100">
              <button
                onClick={() => setTheme('midnight')}
                className={`w-4.5 h-4.5 rounded-full bg-[#0a0814] border transition-transform ${theme === 'midnight' ? 'ring-2 ring-purple-500 scale-110' : 'border-white/20'}`}
                title="Midnight Theme"
              />
              <button
                onClick={() => setTheme('charcoal')}
                className={`w-4.5 h-4.5 rounded-full bg-[#121212] border transition-transform ${theme === 'charcoal' ? 'ring-2 ring-purple-500 scale-110' : 'border-white/20'}`}
                title="Charcoal Theme"
              />
              <button
                onClick={() => setTheme('sepia')}
                className={`w-4.5 h-4.5 rounded-full bg-[#f5ebd6] border transition-transform ${theme === 'sepia' ? 'ring-2 ring-purple-500 scale-110' : 'border-[#dfce9e]'}`}
                title="Sepia Theme"
              />
              <button
                onClick={() => setTheme('light')}
                className={`w-4.5 h-4.5 rounded-full bg-[#fdfcf7] border transition-transform ${theme === 'light' ? 'ring-2 ring-purple-500 scale-110' : 'border-slate-300'}`}
                title="Light Theme"
              />
            </div>

          </div>
        </header>

        {/* Reading Scroll Stage */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto p-6 md:p-16 custom-scrollbar scroll-smooth flex justify-center"
        >
          <div className="max-w-2xl w-full flex flex-col">
            
            {/* Metadata layout */}
            <div className={`p-6 md:p-8 rounded-[32px] border mb-12 text-center relative overflow-hidden ${style.innerCard}`}>
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500/30 via-indigo-500/30 to-purple-500/30" />
              
              <div className="flex items-center justify-center gap-3 mb-4">
                <img
                  src={author.avatar}
                  alt={author.username}
                  className="w-12 h-12 rounded-full border border-purple-500/20 object-cover"
                />
                <div className="text-left">
                  <p className="text-[10px] tracking-[0.2em] font-mono uppercase text-purple-400 font-bold">Relato Autorizado</p>
                  <p className="text-[14px] font-bold">{author.displayName}</p>
                </div>
              </div>

              {post.title ? (
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-serif mt-2 mb-3">
                  {post.title}
                </h1>
              ) : (
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-serif mt-2 mb-3 opacity-90 italic">
                  Relato de Realidade Desejada (DR)
                </h1>
              )}

              <div className="w-16 h-0.5 bg-purple-500/40 mx-auto my-4" />

              <div className="flex flex-wrap justify-center gap-1.5">
                {post.hashtags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-purple-500/5 text-purple-400 border border-purple-500/10"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Book Body layout */}
            <div className={`flex-1 pb-32 text-justify select-text select-all whitespace-pre-wrap ${fontStyles[fontStyle]} ${fontSizes[fontSize]}`}>
              {post.content}
            </div>

            {/* End decor */}
            <div className="flex flex-col items-center justify-center pt-10 border-t border-purple-500/10 mb-16 gap-4">
              <span className="text-[11px] tracking-[0.25em] font-mono text-purple-400 uppercase font-semibold">🌌 Fim do Relato 🌌</span>
              <p className={`text-xs text-center max-w-sm ${style.textMuted}`}>
                Sinta as frequências e use esta experiência como âncora para visualizar e manifestar o seu próprio Shifting.
              </p>
              
              {/* Like / Bookmark inline interactions */}
              <div className="flex items-center gap-4 mt-2">
                {onLike && (
                  <button
                    onClick={onLike}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      isLiked
                        ? 'bg-red-500/10 border-red-500/30 text-red-400'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                    <span>{isLiked ? 'Gostei' : 'Curtir'}</span>
                  </button>
                )}
                {onToggleSave && (
                  <button
                    onClick={onToggleSave}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      isSaved
                        ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                    <span>{isSaved ? 'Salvo' : 'Salvar'}</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Ambient Soundscapes Widget */}
        <div className="fixed bottom-6 right-6 z-[220]">
          <div className={`p-3 rounded-2xl border backdrop-blur-md flex items-center gap-3 max-w-[320px] ${style.soundscapeBg}`}>
            {/* Animated Equalizer Visualizer */}
            <div className="flex items-end gap-0.5 h-4 w-4 overflow-hidden" title="Frequências de Shifting">
              <span className={`w-[2.5px] bg-purple-400 rounded-full ${isPlaying ? 'eq-bar-1' : 'h-1'}`} />
              <span className={`w-[2.5px] bg-purple-400 rounded-full ${isPlaying ? 'eq-bar-2' : 'h-1'}`} />
              <span className={`w-[2.5px] bg-purple-400 rounded-full ${isPlaying ? 'eq-bar-3' : 'h-1'}`} />
              <span className={`w-[2.5px] bg-purple-400 rounded-full ${isPlaying ? 'eq-bar-4' : 'h-1'}`} />
            </div>

            <div className="text-left shrink-0">
              <p className="text-[9px] uppercase font-mono tracking-wider text-purple-400 font-bold">Foco & Alinhamento</p>
              <p className="text-[11px] font-bold text-current">Meditação de Fundo</p>
            </div>

            {/* Play/Pause */}
            <button
              onClick={togglePlaySound}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isPlaying
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
              title={isPlaying ? "Pausar Meditação" : "Ativar Meditação Cósmica"}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            </button>

            {/* Volume slider */}
            <div className="flex items-center gap-1 border-l border-purple-500/10 pl-2">
              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="range"
                min="0"
                max="100"
                value={volume * 100}
                onChange={(e) => setVolume(parseFloat(e.target.value) / 100)}
                className="w-14 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                title={`Volume: ${Math.round(volume * 100)}%`}
              />
            </div>
          </div>
        </div>

      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
