import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { EBook } from '../types';
import { MOCK_EBOOKS } from '../data/ebooks';
import { toggleSaveEBook, getSavedEBookIds } from '../utils/ebookStore';
import { ArrowLeft, BookOpen, ChevronUp, Type, Eye, Menu, Check, X, Sparkles, Download, Lock, Search, Play, Pause, Volume2, Music, FileText, Bookmark, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';

interface EBookReaderProps {
  ebook: EBook;
  onClose: () => void;
  onOpenCreator?: () => void;
  isPurchased?: boolean;
  onTriggerPurchase?: (ebook: EBook) => void;
}

type Theme = 'midnight' | 'charcoal' | 'sepia' | 'light' | 'white';
type FontSize = 'sm' | 'md' | 'lg' | 'xl';

interface Chapter {
  title: string;
  index: number;
}

export function EBookReader({ ebook: propEBook, onClose, onOpenCreator, isPurchased = true, onTriggerPurchase }: EBookReaderProps) {
  const [currentEBook, setCurrentEBook] = useState<EBook>(propEBook);
  const ebook = currentEBook;

  const [allEbooks, setAllEbooks] = useState<EBook[]>([]);
  const [isSaved, setIsSaved] = useState(() => getSavedEBookIds().includes(ebook.id));
  const [sidebarView, setSidebarView] = useState<'chapters' | 'saved'>('chapters');

  useEffect(() => {
    const stored = localStorage.getItem('shifting_ebooks');
    let customList: EBook[] = [];
    if (stored) {
      try {
        customList = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }
    setAllEbooks([...customList, ...MOCK_EBOOKS]);
  }, []);

  const handleToggleSave = () => {
    toggleSaveEBook(ebook.id);
    setIsSaved(getSavedEBookIds().includes(ebook.id));
  };

  const savedEBooks = allEbooks.filter(b => getSavedEBookIds().includes(b.id));

  const allParagraphs = ebook.content.split('\n\n');
  const isLimitedDegustation = ebook.isPaid && !isPurchased;
  const limitIndex = isLimitedDegustation ? Math.max(1, Math.ceil(allParagraphs.length * 0.3)) : allParagraphs.length;
  const paragraphs = allParagraphs.slice(0, limitIndex);
  const [theme, setTheme] = useState<Theme>('midnight');
  const [fontSize, setFontSize] = useState<FontSize>('lg');
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeChapter, setActiveChapter] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Audio system states
  const [activeTrack, setActiveTrack] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(true); // default to autoplaying atmospheric layers
  const [volume, setVolume] = useState(0.4); // default master volume
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<any>(null);

  // Audio widget state (default to hidden, no auto-show on scroll)
  const [showAudioWidget, setShowAudioWidget] = useState(false);
  const [showFullscreenPdf, setShowFullscreenPdf] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  const handleShareEBook = () => {
    const shareUrl = `${window.location.origin}/ebook/${ebook.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    }).catch(() => {
      // fallback for browsers that deny clipboard
      const el = document.createElement('textarea');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2500);
    });
  };

  useEffect(() => {
    setScrollProgress(0);
    setActiveChapter('');
    setIsSaved(getSavedEBookIds().includes(currentEBook.id));
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [currentEBook.id]);

  // Trigger appropriate audio track based on scroll progress
  useEffect(() => {
    const tracks = ebook.audioTracks || [];
    if (tracks.length === 0) {
      // Pause any existing playing audio if ebook has no audio
      if (audioRef.current) {
        audioRef.current.pause();
      }
      return;
    }

    // Find the track with the highest triggerProgress that is <= current scrollProgress
    const targetTrack = [...tracks]
      .sort((a, b) => b.triggerProgress - a.triggerProgress)
      .find(t => scrollProgress >= t.triggerProgress) || null;

    if (targetTrack && (!activeTrack || activeTrack.id !== targetTrack.id)) {
      handleTrackTransition(targetTrack);
    }
  }, [scrollProgress, ebook.audioTracks]);

  const handleTrackTransition = (newTrack: any) => {
    const oldTrack = activeTrack;
    setActiveTrack(newTrack);

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    // If there is an existing audio running, fade it out first!
    if (audioRef.current && !audioRef.current.paused) {
      const fadeOutDuration = (oldTrack?.fadeOutSec || 2) * 1000;
      const fadeStep = 50;
      const fadeStepsCount = Math.max(1, fadeOutDuration / fadeStep);
      let currentStep = 0;
      const initialVolume = audioRef.current.volume;

      fadeIntervalRef.current = setInterval(() => {
        currentStep++;
        if (audioRef.current) {
          const nextVol = initialVolume * (1 - (currentStep / fadeStepsCount));
          audioRef.current.volume = Math.max(0, nextVol);
        }

        if (currentStep >= fadeStepsCount) {
          clearInterval(fadeIntervalRef.current);
          playNewTrack(newTrack);
        }
      }, fadeStep);
    } else {
      playNewTrack(newTrack);
    }
  };

  const playNewTrack = (track: any) => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    audioRef.current.src = track.url;
    audioRef.current.loop = true;
    audioRef.current.volume = 0; // start at 0 for fade-in

    if (isPlaying) {
      audioRef.current.play()
        .then(() => {
          const fadeInDuration = (track.fadeInSec || 2) * 1000;
          const fadeStep = 50;
          const fadeStepsCount = Math.max(1, fadeInDuration / fadeStep);
          let currentStep = 0;

          fadeIntervalRef.current = setInterval(() => {
            currentStep++;
            if (audioRef.current) {
              const nextVol = volume * (currentStep / fadeStepsCount);
              audioRef.current.volume = Math.min(volume, nextVol);
            }

            if (currentStep >= fadeStepsCount) {
              clearInterval(fadeIntervalRef.current);
              if (audioRef.current) {
                audioRef.current.volume = volume;
              }
            }
          }, fadeStep);
        })
        .catch(err => {
          console.log("Audio autoplay / trigger prevented:", err);
        });
    }
  };

  // Dynamically update volume / pause states
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isPlaying ? volume : 0;
    }
  }, [volume, isPlaying]);

  // Cleanup on unmount or ebook change
  useEffect(() => {
    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [ebook.id]);

  const togglePlayState = () => {
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    if (audioRef.current) {
      if (nextPlaying) {
        audioRef.current.play().catch(err => console.log(err));
      } else {
        audioRef.current.pause();
      }
    }
  };

  const [searchVal, setSearchVal] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showCheatToast, setShowCheatToast] = useState<string | null>(null);

  const [isCreatorHidden, setIsCreatorHidden] = useState(() => {
    return localStorage.getItem('hide_ebook_creator') === 'true';
  });

  useEffect(() => {
    const checkHidden = () => {
      setIsCreatorHidden(localStorage.getItem('hide_ebook_creator') === 'true');
    };
    window.addEventListener('shifting_hide_creator_toggle', checkHidden);
    return () => {
      window.removeEventListener('shifting_hide_creator_toggle', checkHidden);
    };
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchVal(val);
    
    // Check for secret code
    if (val === 'devebook123') {
      const currentHidden = localStorage.getItem('hide_ebook_creator') === 'true';
      const nextHidden = !currentHidden;
      localStorage.setItem('hide_ebook_creator', nextHidden.toString());
      setIsCreatorHidden(nextHidden);

      // Trigger standard custom event so other components re-render
      window.dispatchEvent(new Event('shifting_hide_creator_toggle'));

      // Clear search input so they can type it again next time
      setSearchVal('');
      setIsSearching(false);

      // Show beautiful cheat code toast
      setShowCheatToast(nextHidden ? 'Atalho Ativado: Botão de Escrever E-Book Ocultado! 🤫' : 'Atalho Ativado: Botão de Escrever E-Book Revelado! ✨');
      setTimeout(() => setShowCheatToast(null), 4000);
    }
  };

  const renderHighlightedText = (text: string, searchVal: string) => {
    if (!searchVal.trim()) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${searchVal.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === searchVal.toLowerCase() ? (
            <mark key={i} className="bg-yellow-500/40 text-black font-semibold rounded-sm px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  // Parse chapters dynamically from the content
  const chapters: Chapter[] = [];
  if (ebook.pages && ebook.pages.length > 0) {
    ebook.pages.forEach((page, idx) => {
      chapters.push({ title: page.title, index: idx });
    });
  } else {
    paragraphs.forEach((p, idx) => {
      if (p.startsWith('Chapter') || p.startsWith('Capítulo')) {
        chapters.push({ title: p, index: idx });
      }
    });
  }

  // Track scrolling to calculate progress and update current active chapter
  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        const totalHeight = scrollHeight - clientHeight;
        if (totalHeight > 0) {
          const progress = (scrollTop / totalHeight) * 100;
          setScrollProgress(progress);
        }

        // Highlight active chapter based on viewport position
        let currentChapter = '';
        const chapterElements = containerRef.current.querySelectorAll('[data-chapter]');
        chapterElements.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const containerRect = containerRef.current!.getBoundingClientRect();
          if (rect.top - containerRect.top <= 120) {
            currentChapter = el.getAttribute('data-chapter') || '';
          }
        });
        if (currentChapter) {
          setActiveChapter(currentChapter);
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
  }, [paragraphs]);

  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const [isDownloading, setIsDownloading] = useState(false);

  // Helper: Hex color to RGB
  const hexToRgb = (hex: string) => {
    const cleaned = hex.replace('#', '');
    const r = parseInt(cleaned.substring(0, 2), 16) || 0;
    const g = parseInt(cleaned.substring(2, 4), 16) || 0;
    const b = parseInt(cleaned.substring(4, 6), 16) || 0;
    return { r, g, b };
  };

  const handleDownloadPDF = async () => {
    if (ebook.isPaid && !isPurchased) {
      alert("Acesso restrito! Adquira a versão completa deste e-book para habilitar o download em PDF.");
      return;
    }
    
    setIsDownloading(true);
    try {
      if (ebook.isPdfReady && ebook.uploadedPdf) {
        // Direct base64 download
        const link = document.createElement('a');
        link.href = ebook.uploadedPdf;
        link.download = ebook.pdfFileName || `${ebook.title.toLowerCase().replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Cover Page background
      doc.setFillColor(15, 12, 25);
      doc.rect(0, 0, 210, 297, 'F');
      
      // Cover frame
      doc.setDrawColor(126, 58, 242);
      doc.setLineWidth(1);
      doc.rect(10, 10, 190, 277, 'S');

      doc.setDrawColor(199, 125, 255);
      doc.setLineWidth(0.3);
      doc.rect(12, 12, 186, 273, 'S');

      // Cover Text
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.text(ebook.title, 105, 100, { align: 'center' });

      doc.setFont('helvetica', 'oblique');
      doc.setFontSize(13);
      doc.setTextColor(199, 125, 255);
      doc.text(ebook.description || 'Biblioteca Shifting', 105, 120, { align: 'center' });

      doc.setTextColor(180, 180, 180);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Escrito por: ${ebook.authorName || 'Autor Desconhecido'}`, 105, 250, { align: 'center' });

      if (ebook.pages && ebook.pages.length > 0) {
        // Draw each rich designed page
        ebook.pages.forEach((page, index) => {
          doc.addPage();
          
          // Background color logic based on page presets
          const bgHex = page.bg.includes('bg-white') ? '#ffffff' : page.bg.includes('bg-[#f4ecd8]') ? '#f4ecd8' : page.bg.includes('bg-[#121212]') ? '#121212' : '#0c0a13';
          const textHex = page.color || '#ffffff';
          
          const bgRgb = hexToRgb(bgHex);
          doc.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
          doc.rect(0, 0, 210, 297, 'F');

          // Draw headers & page numbers
          const textRgb = hexToRgb(textHex);
          doc.setTextColor(textRgb.r, textRgb.g, textRgb.b);
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.text(ebook.title.toUpperCase(), 20, 15);
          doc.text(`Página ${index + 1}`, 190, 15, { align: 'right' });
          doc.setDrawColor(textRgb.r, textRgb.g, textRgb.b);
          doc.setLineWidth(0.1);
          doc.line(20, 17, 190, 17);

          // Page/Chapter Title
          doc.setFontSize(18);
          let fontStyle = 'normal';
          if (page.isBold) fontStyle = 'bold';
          if (page.isItalic) fontStyle = page.isBold ? 'bolditalic' : 'italic';

          let pdfFont = 'times';
          if (page.fontFamily === 'sans') pdfFont = 'helvetica';
          if (page.fontFamily === 'mono') pdfFont = 'courier';

          doc.setFont(pdfFont, fontStyle);
          doc.text(page.title, 20, 30);

          // Draw images inside content
          let textStartY = 40;
          if (page.images && page.images.length > 0) {
            page.images.forEach(img => {
              if (img.url && (img.url.startsWith('data:image/') || img.url.startsWith('http'))) {
                try {
                  const imgWidthMm = (img.width / 100) * 170;
                  const imgHeightMm = imgWidthMm * 0.55; // aspect ratio 16:9 approx
                  let imgXMm = 20;
                  if (img.align === 'center') {
                    imgXMm = 20 + (170 - imgWidthMm) / 2;
                  } else if (img.align === 'right') {
                    imgXMm = 190 - imgWidthMm;
                  }
                  
                  if (textStartY + imgHeightMm > 270) {
                    doc.addPage();
                    doc.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
                    doc.rect(0, 0, 210, 297, 'F');
                    textStartY = 25;
                  }
                  
                  doc.addImage(img.url, 'JPEG', imgXMm, textStartY, imgWidthMm, imgHeightMm);
                  textStartY += imgHeightMm + 5;
                } catch (err) {
                  console.error("Page image draw error", err);
                }
              }
            });
            textStartY += 5;
          } else if (page.image && page.image.startsWith('data:image/')) {
            try {
              doc.addImage(page.image, 'JPEG', 45, 38, 120, 65);
              textStartY = 115;
            } catch (err) {
              console.error("Page image draw error", err);
            }
          }

          // Content text
          doc.setFont(pdfFont, fontStyle === 'bold' ? 'bold' : 'normal');
          doc.setFontSize(11);
          
          const lines = doc.splitTextToSize(page.content, 170);
          let currY = textStartY;
          
          lines.forEach((line: string) => {
            if (currY > 275) {
              doc.addPage();
              doc.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
              doc.rect(0, 0, 210, 297, 'F');
              currY = 25;
            }
            doc.text(line, page.align === 'center' ? 105 : 20, currY, {
              align: page.align === 'center' ? 'center' : 'left'
            });
            currY += 6.5;
          });
        });
      } else {
        // Inside Pages (legacy paragraphs fallback)
        allParagraphs.forEach((p, index) => {
          const isHeader = p.startsWith('Chapter') || p.startsWith('Capítulo');
          if (isHeader || index === 0 || index % 5 === 0) {
            doc.addPage();
            doc.setFillColor(250, 248, 245); // sepia-like backdrop inside PDF
            doc.rect(0, 0, 210, 297, 'F');
          }
          
          doc.setTextColor(40, 40, 40);
          doc.setFont('helvetica', isHeader ? 'bold' : 'normal');
          doc.setFontSize(isHeader ? 15 : 10.5);
          
          const lines = doc.splitTextToSize(p, 170);
          let startY = isHeader ? 35 : 55 + (index % 5) * 45;
          if (startY > 260) startY = 35;
          
          doc.text(lines, 20, startY);
        });
      }

      const safeFilename = ebook.title.toLowerCase().replace(/\s+/g, '_') || 'ebook';
      doc.save(`${safeFilename}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Houve um erro ao gerar o PDF. Tente novamente.");
    } finally {
      setIsDownloading(false);
    }
  };

  const scrollToParagraph = (pIndex: number) => {
    const el = document.getElementById(`p-${pIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // On mobile screens, automatically collapse sidebar to focus on reading
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  // Define theme classes
  const themeStyles = {
    midnight: {
      bg: 'bg-[#0a0814]',
      text: 'text-slate-200',
      headerBg: 'bg-[#120f24] border-white/5',
      sidebarBg: 'bg-[#120f24] border-r border-white/5',
      textMuted: 'text-slate-400 hover:text-white',
      cardBg: 'bg-[#151229]/50 border-white/10',
      primaryAccent: 'text-[#9d4edd]',
      buttonBg: 'bg-white/5 hover:bg-white/10 text-white',
      activeItemBg: 'bg-purple-600/15 text-purple-400 border-l-2 border-purple-500',
      inactiveItemBg: 'text-slate-400 hover:text-white hover:bg-white/5',
    },
    charcoal: {
      bg: 'bg-[#121212]',
      text: 'text-stone-200',
      headerBg: 'bg-[#1a1a1a] border-stone-800',
      sidebarBg: 'bg-[#1a1a1a] border-r border-stone-800',
      textMuted: 'text-stone-400 hover:text-stone-100',
      cardBg: 'bg-[#2a2a2a]/50 border-stone-800',
      primaryAccent: 'text-purple-400',
      buttonBg: 'bg-stone-800 hover:bg-stone-700 text-stone-100',
      activeItemBg: 'bg-stone-800 text-purple-400 border-l-2 border-purple-400',
      inactiveItemBg: 'text-stone-400 hover:text-stone-100 hover:bg-stone-800/50',
    },
    sepia: {
      bg: 'bg-[#fdf0f4]',
      text: 'text-[#5c2a38]',
      headerBg: 'bg-[#fae3e8] border-[#f2ccd4]',
      sidebarBg: 'bg-[#fae3e8] border-r border-[#f2ccd4]',
      textMuted: 'text-[#995568] hover:text-[#5c2a38]',
      cardBg: 'bg-[#fcdde3]/60 border-[#f2ccd4]',
      primaryAccent: 'text-[#db2777]',
      buttonBg: 'bg-[#fae3e8] hover:bg-[#f5cdd6] text-[#5c2a38]',
      activeItemBg: 'bg-[#f5cdd6]/60 text-[#db2777] border-l-2 border-[#db2777]',
      inactiveItemBg: 'text-[#995568] hover:text-[#5c2a38] hover:bg-[#f5cdd6]/30',
    },
    light: {
      bg: 'bg-[#fdfbf7]',
      text: 'text-slate-800',
      headerBg: 'bg-[#f4f3ef] border-slate-200',
      sidebarBg: 'bg-[#f4f3ef] border-r border-slate-200',
      textMuted: 'text-slate-500 hover:text-slate-800',
      cardBg: 'bg-[#f4f3ef]/80 border-slate-200',
      primaryAccent: 'text-purple-600',
      buttonBg: 'bg-slate-100 hover:bg-slate-200 text-slate-900',
      activeItemBg: 'bg-purple-500/10 text-purple-600 border-l-2 border-purple-600',
      inactiveItemBg: 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50',
    },
    white: {
      bg: 'bg-[#ffffff]',
      text: 'text-zinc-900',
      headerBg: 'bg-zinc-50 border-zinc-200',
      sidebarBg: 'bg-zinc-50 border-r border-zinc-200',
      textMuted: 'text-zinc-500 hover:text-zinc-900',
      cardBg: 'bg-zinc-100 border-zinc-200',
      primaryAccent: 'text-purple-600',
      buttonBg: 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900',
      activeItemBg: 'bg-purple-600/10 text-purple-600 border-l-2 border-purple-600',
      inactiveItemBg: 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100',
    }
  };

  const fontSizes = {
    sm: 'text-base md:text-lg',
    md: 'text-lg md:text-xl',
    lg: 'text-xl md:text-2xl',
    xl: 'text-2xl md:text-3xl'
  };

  const currentStyle = themeStyles[theme];

  return (
    <>
      {createPortal(
        <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-[100] flex flex-col overflow-hidden ${currentStyle.bg} ${currentStyle.text} transition-colors duration-300`}
      >
        {/* Top Progress Bar */}
        <div className="w-full h-1 bg-white/10 shrink-0 relative z-[110]">
          <div 
            className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-150"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {/* Fullscreen Header */}
        <header className={`flex items-center justify-between px-4 py-3 border-b shrink-0 z-[105] shadow-md transition-colors duration-300 ${currentStyle.headerBg}`}>
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer bg-white/5 border border-white/10 hover:bg-purple-600 hover:text-white text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar</span>
            </button>

            {/* Menu icon toggle */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-2 rounded-lg transition-colors border ${isSidebarOpen ? 'text-purple-600 border-purple-600 bg-purple-500/10' : 'border-white/10 hover:bg-white/5'}`}
              title="Sumário"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search icon toggle */}
            <button
              onClick={() => setIsSearching(!isSearching)}
              className={`p-2 rounded-lg transition-colors border ${isSearching ? 'text-purple-600 border-purple-600 bg-purple-500/10' : 'border-white/10 hover:bg-white/5'}`}
              title="Pesquisar no E-Book"
            >
              <Search className="w-5 h-5" />
            </button>

            {isSearching && (
              <div className="flex items-center gap-2 bg-white/5 border border-purple-500/20 rounded-lg px-2.5 py-1.5 max-w-[150px] sm:max-w-[200px] animate-in slide-in-from-left duration-200">
                <Search className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Pesquisar..."
                  value={searchVal}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="bg-transparent border-none text-xs text-current placeholder-slate-400 focus:outline-none w-full"
                  autoFocus
                />
                {searchVal && (
                  <button onClick={() => setSearchVal('')} className="p-0.5 hover:bg-white/10 rounded text-slate-400">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            <div className="hidden lg:flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#9d4edd]" />
              <span className="text-xs font-semibold tracking-wide truncate max-w-[150px] xl:max-w-[250px]">
                {ebook.title}
              </span>
            </div>

            {onOpenCreator && !isCreatorHidden && (
              <button
                onClick={onOpenCreator}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all hover:scale-105 active:scale-95 cursor-pointer bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600 hover:text-white"
                title="Escrever E-Book do Zero"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-semibold">Escrever E-Book</span>
              </button>
            )}

            {/* Music/Audio controls toggle in header */}
            {ebook.audioTracks && ebook.audioTracks.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowAudioWidget(!showAudioWidget)}
                  className={`p-2 rounded-lg transition-colors border ${showAudioWidget ? 'text-purple-600 border-purple-600 bg-purple-500/10' : 'border-white/10 hover:bg-white/5 bg-transparent'}`}
                  title="Controles de Música"
                >
                  <Music className="w-5 h-5" />
                </button>

                {showAudioWidget && (
                  <>
                    <div 
                      className="fixed inset-0 z-30 cursor-default" 
                      onClick={() => setShowAudioWidget(false)}
                    />
                    <div className="absolute left-0 mt-2 bg-[#110e19] border border-purple-500/30 p-4 rounded-2xl shadow-[0_10px_40px_rgba(126,58,242,0.3)] backdrop-blur-md flex flex-col gap-3 w-[280px] sm:w-[320px] z-40 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                      <div className="flex items-center gap-3">
                        <div className="flex items-end gap-0.5 h-4 w-4 overflow-hidden" title="Equalizador Atmosférico">
                          <span className={`w-[2.5px] bg-purple-400 rounded-full ${isPlaying ? 'eq-bar-1' : 'h-1'}`} />
                          <span className={`w-[2.5px] bg-purple-400 rounded-full ${isPlaying ? 'eq-bar-2' : 'h-1'}`} />
                          <span className={`w-[2.5px] bg-purple-400 rounded-full ${isPlaying ? 'eq-bar-3' : 'h-1'}`} />
                          <span className={`w-[2.5px] bg-purple-400 rounded-full ${isPlaying ? 'eq-bar-4' : 'h-1'}`} />
                        </div>
                        <div className="text-left shrink-0">
                          <p className="text-[9px] uppercase font-mono tracking-wider text-purple-400">Atmosfera de Shifting</p>
                          <p className="text-[11px] font-bold text-white truncate max-w-[180px] sm:max-w-[220px]">{activeTrack?.title || 'Buscando trilha...'}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-white/5 pt-2">
                        <button
                          onClick={togglePlayState}
                          className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                            isPlaying
                              ? 'bg-purple-600 text-white'
                              : 'bg-white/10 text-slate-300 hover:text-white hover:bg-white/15'
                          }`}
                          title={isPlaying ? "Pausar som de fundo" : "Iniciar som de fundo"}
                        >
                          {isPlaying ? <Pause className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5 text-white fill-current" />}
                        </button>

                        <div className="flex items-center gap-1.5 flex-1 justify-end font-sans">
                          <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={volume * 100}
                            onChange={(e) => setVolume(parseFloat(e.target.value) / 100)}
                            className="w-24 sm:w-32 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            title={`Volume: ${Math.round(volume * 100)}%`}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Bookmark/Save Ebook Toggle Button */}
            <button
              onClick={handleToggleSave}
              className={`p-2 rounded-lg transition-colors border ${isSaved ? 'text-purple-600 border-purple-600 bg-purple-500/10' : 'border-white/10 hover:bg-white/5 bg-transparent text-slate-400'}`}
              title={isSaved ? "Remover da Biblioteca" : "Salvar na Biblioteca"}
            >
              <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-purple-600 text-purple-600' : ''}`} />
            </button>

            {/* Share E-Book Link Button */}
            <button
              onClick={handleShareEBook}
              className="p-2 rounded-lg transition-colors border border-white/10 hover:bg-white/5 bg-transparent text-slate-400 hover:text-purple-400"
              title="Compartilhar Link do E-Book"
            >
              <Share2 className="w-5 h-5" />
            </button>

            {/* Share Toast */}
            {shareToast && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 px-4 py-2 rounded-full bg-[#15121e]/95 border border-purple-500/30 backdrop-blur-md shadow-[0_8px_24px_rgba(126,58,242,0.3)] text-white text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
                Link copiado! Compartilhe com quem quiser ler.
              </div>
            )}
          </div>

          {/* Reading Preferences Panel */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Font Size Adjuster */}
            <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10 scale-90 sm:scale-100">
              <button
                onClick={() => setFontSize('sm')}
                className={`px-2 py-1 rounded text-xs font-bold transition-colors ${fontSize === 'sm' ? 'bg-purple-600 text-white' : currentStyle.textMuted}`}
                title="Fonte Pequena"
              >
                A
              </button>
              <button
                onClick={() => setFontSize('md')}
                className={`px-2 py-1 rounded text-sm font-bold transition-colors ${fontSize === 'md' ? 'bg-purple-600 text-white' : currentStyle.textMuted}`}
                title="Fonte Média"
              >
                A
              </button>
              <button
                onClick={() => setFontSize('lg')}
                className={`px-2 py-1 rounded text-base font-bold transition-colors ${fontSize === 'lg' ? 'bg-purple-600 text-white' : currentStyle.textMuted}`}
                title="Fonte Grande"
              >
                A
              </button>
              <button
                onClick={() => setFontSize('xl')}
                className={`px-2 py-1 rounded text-lg font-bold transition-colors ${fontSize === 'xl' ? 'bg-purple-600 text-white' : currentStyle.textMuted}`}
                title="Fonte Extra"
              >
                A+
              </button>
            </div>

            {/* Theme Selector */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10 scale-90 sm:scale-100">
              <button
                onClick={() => setTheme('midnight')}
                className={`w-5 h-5 rounded-full bg-[#0a0814] border transition-transform ${theme === 'midnight' ? 'border-purple-600 scale-110' : 'border-white/20'}`}
                title="Midnight"
              />
              <button
                onClick={() => setTheme('charcoal')}
                className={`w-5 h-5 rounded-full bg-[#121212] border transition-transform ${theme === 'charcoal' ? 'border-purple-600 scale-110' : 'border-white/20'}`}
                title="Charcoal"
              />
              <button
                onClick={() => setTheme('sepia')}
                className={`w-5 h-5 rounded-full bg-[#fae3e8] border transition-transform ${theme === 'sepia' ? 'border-[#db2777] scale-110' : 'border-[#f2ccd4]'}`}
                title="Rosa Suave"
              />
              <button
                onClick={() => setTheme('light')}
                className={`w-5 h-5 rounded-full bg-[#fdfbf7] border transition-transform ${theme === 'light' ? 'border-purple-600 scale-110' : 'border-slate-300'}`}
                title="Light"
              />
              <button
                onClick={() => setTheme('white')}
                className={`w-5 h-5 rounded-full bg-[#ffffff] border transition-transform ${theme === 'white' ? 'border-purple-600 scale-110' : 'border-zinc-300'}`}
                title="Pure White"
              />
            </div>

            {/* Download PDF Button */}
            {ebook.allowDownload !== false && (
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                  ebook.isPaid && !isPurchased
                    ? 'border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-600 hover:text-white'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-500'
                }`}
                title={ebook.isPaid && !isPurchased ? "Adquira o e-book para baixar" : "Baixar E-Book em PDF"}
              >
                {isDownloading ? (
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : ebook.isPaid && !isPurchased ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">PDF</span>
              </button>
            )}
          </div>
        </header>

        {/* Fullscreen Reading + Sidebar Container */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Collapsible Sidebar (Table of Contents) */}
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 260, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className={`shrink-0 h-full flex flex-col z-40 relative shadow-lg ${currentStyle.sidebarBg}`}
              >
                <div className="p-4 border-b border-current/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSidebarView('chapters')}
                      className={`text-xs font-bold uppercase tracking-wider font-mono pb-1 border-b-2 transition-all cursor-pointer ${
                        sidebarView === 'chapters' ? 'border-purple-600 text-purple-400' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      Capítulos
                    </button>
                    <button
                      onClick={() => setSidebarView('saved')}
                      className={`text-xs font-bold uppercase tracking-wider font-mono pb-1 border-b-2 transition-all flex items-center gap-1 cursor-pointer ${
                        sidebarView === 'saved' ? 'border-purple-600 text-purple-400' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                      title="E-books Salvos"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>Salvos</span>
                    </button>
                  </div>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className={`p-1 rounded-md ${currentStyle.textMuted} cursor-pointer`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                  {sidebarView === 'chapters' ? (
                    chapters.length === 0 ? (
                      <div className="text-center py-8 text-sm opacity-50">
                        Sem capítulos estruturados.
                      </div>
                    ) : (
                      chapters.map((ch, idx) => {
                        const isActive = activeChapter === ch.title;
                        return (
                          <button
                            key={idx}
                            onClick={() => scrollToParagraph(ch.index)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 flex items-center justify-between ${
                              isActive ? currentStyle.activeItemBg : currentStyle.inactiveItemBg
                            }`}
                          >
                            <span className="truncate pr-2">{ch.title}</span>
                            {isActive && <Check className="w-4 h-4 shrink-0 text-purple-600" />}
                          </button>
                        );
                      })
                    )
                  ) : (
                    /* Saved EBooks List */
                    savedEBooks.length === 0 ? (
                      <div className="text-center py-8 text-xs opacity-50">
                        Nenhum e-book salvo.
                      </div>
                    ) : (
                      savedEBooks.map((b) => {
                        const isActive = ebook.id === b.id;
                        return (
                          <button
                            key={b.id}
                            onClick={() => {
                              setCurrentEBook(b);
                              setSidebarView('chapters');
                            }}
                            className={`w-full text-left p-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-2.5 ${
                              isActive ? currentStyle.activeItemBg : currentStyle.inactiveItemBg
                            }`}
                          >
                            <img 
                              src={b.coverImage} 
                              alt={b.title} 
                              className="w-7 aspect-[2/3] object-cover rounded-md border border-white/10 shrink-0"
                            />
                            <span className="truncate pr-1 text-xs font-bold font-sans text-left">{b.title}</span>
                          </button>
                        );
                      })
                    )
                  )}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Fullscreen Reading Area */}
          <div 
            ref={containerRef}
            id="reader-content" 
            className="flex-1 overflow-y-auto p-6 md:p-16 relative flex justify-center custom-scrollbar scroll-smooth"
          >
            <div className="max-w-2xl w-full flex flex-col">
              {!isSidebarOpen && (
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className={`mb-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer self-start transition-all duration-200 ${currentStyle.buttonBg} border-current/10`}
                >
                  <Menu className="w-3.5 h-3.5 text-purple-500" />
                  <span>Capítulos</span>
                </button>
              )}

              {/* Header decor inside text layout */}
              <div className="text-center mb-12 pb-8 border-b border-current/10">
                <p className="text-xs tracking-[0.2em] uppercase font-mono mb-2 opacity-60">
                  Remix Library
                </p>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-serif mb-4">
                  {ebook.title}
                </h1>
                <div className="w-12 h-0.5 mx-auto bg-purple-600" />
              </div>

              {/* Book Body text */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={`font-serif leading-relaxed md:leading-[1.8] space-y-10 pb-24 ${fontSizes[fontSize]}`}
              >
                {ebook.isPdfReady ? (
                  /* Ready PDF view mode */
                  <div className="flex flex-col items-center justify-center space-y-6 py-6 text-center">
                    <div className="w-48 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border border-white/10 mb-2 bg-slate-950">
                      <img src={ebook.coverImage} className="w-full h-full object-cover" alt="Capa" />
                    </div>
                    
                    <div className="max-w-md space-y-2">
                      <h2 className="text-2xl font-bold tracking-tight text-white">{ebook.title}</h2>
                      <p className="text-sm text-purple-300 font-semibold flex items-center justify-center gap-1.5">
                        <FileText className="w-4 h-4 text-purple-400 animate-pulse" />
                        <span>PDF Publicado ({ebook.pdfFileName || 'arquivo.pdf'})</span>
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">{ebook.description}</p>
                    </div>

                    {/* Elegant Download / Read block */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                      <button
                        onClick={handleDownloadPDF}
                        disabled={isDownloading}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs rounded-full hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
                      >
                        {isDownloading ? (
                          <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        <span>Baixar PDF</span>
                      </button>
                      
                      {ebook.uploadedPdf && (
                        <button
                          onClick={() => setShowFullscreenPdf(true)}
                          className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-full transition-all shadow-lg shadow-purple-500/10 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                          <span>Visualizar Cheio</span>
                        </button>
                      )}
                    </div>

                    {/* IFrame Embedded PDF Preview (if base64 is available and supported) */}
                    {ebook.uploadedPdf && (
                      <div className="w-full max-w-3xl mt-6">
                        <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider flex items-center justify-center gap-1">
                          <BookOpen className="w-4 h-4 text-purple-400" />
                          <span>Leitor Integrado</span>
                        </p>
                        <div className="rounded-2xl border border-white/10 overflow-hidden shadow-2xl bg-slate-950/40">
                          <iframe
                            src={`${ebook.uploadedPdf}#toolbar=0`}
                            className="w-full h-[600px] border-none"
                            title="PDF Preview"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : ebook.pages && ebook.pages.length > 0 ? (
                  /* Custom designed pages with multi images */
                  <div className="space-y-16">
                    {ebook.pages.map((page, pIdx) => {
                      const isBold = page.isBold;
                      const isItalic = page.isItalic;
                      const align = page.align;
                      const fontClass = page.fontFamily === 'sans' ? 'font-sans' : page.fontFamily === 'mono' ? 'font-mono' : page.fontFamily === 'cursive' ? 'font-serif italic' : 'font-serif';
                      
                      return (
                        <div 
                          key={page.id} 
                          id={`p-${pIdx}`} 
                          data-chapter={page.title}
                          className={`p-6 sm:p-10 rounded-3xl border border-white/5 shadow-xl space-y-6 ${page.bg}`}
                          style={{ color: page.color }}
                        >
                          {/* Page Header */}
                          <div className="flex justify-between items-center text-[10px] font-mono opacity-50 border-b border-current/10 pb-2">
                            <span className="truncate max-w-[150px]">{page.title}</span>
                            <span>Pág {pIdx + 1} de {ebook.pages?.length}</span>
                          </div>

                          {/* Chapter Title */}
                          <h2 className={`text-center font-bold text-xl sm:text-2xl tracking-tight ${fontClass}`}>
                            {renderHighlightedText(page.title, searchVal)}
                          </h2>

                          {/* Multiple Images Layout within Ebook Page */}
                          {page.images && page.images.length > 0 && (
                            <div className="space-y-4 my-5">
                              {page.images.map((img) => (
                                <div 
                                  key={img.id}
                                  className={`flex ${
                                    img.align === 'left' ? 'justify-start' : img.align === 'right' ? 'justify-end' : 'justify-center'
                                  }`}
                                >
                                  <div 
                                    className="rounded-2xl overflow-hidden border border-current/10 shadow-lg bg-black/25 relative group"
                                    style={{ width: `${img.width}%` }}
                                  >
                                    <img 
                                      src={img.url} 
                                      alt="Conteúdo Visual" 
                                      className="w-full object-cover transition-transform duration-350 group-hover:scale-102"
                                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x250?text=Format+Error'; }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Legacy page illustration fallback */}
                          {page.image && !page.images?.length && (
                            <div className="flex justify-center my-4">
                              <div className="rounded-2xl overflow-hidden border border-current/10 max-w-full">
                                <img src={page.image} alt="Ilustração" className="max-h-80 object-cover" />
                              </div>
                            </div>
                          )}

                          {/* Content Paragraph Text */}
                          <div 
                            className={`whitespace-pre-wrap leading-relaxed text-sm sm:text-base ${fontClass} ${isBold ? 'font-bold' : ''} ${isItalic ? 'italic' : ''}`}
                            style={{ 
                              textAlign: align === 'justify' ? 'justify' : align === 'center' ? 'center' : 'left' 
                            }}
                          >
                            {renderHighlightedText(page.content, searchVal)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Legacy paragraph loop fallback */
                  paragraphs.map((paragraph, index) => {
                    const isChapterHeader = paragraph.startsWith('Chapter') || paragraph.startsWith('Capítulo');
                    if (isChapterHeader) {
                      return (
                        <h2 
                          id={`p-${index}`}
                          key={index} 
                          data-chapter={paragraph}
                          className={`font-serif font-bold text-center mt-12 mb-6 ${
                            fontSize === 'sm' ? 'text-xl' : fontSize === 'md' ? 'text-2xl' : fontSize === 'lg' ? 'text-3xl' : 'text-4xl'
                          } ${currentStyle.primaryAccent}`}
                        >
                          {renderHighlightedText(paragraph, searchVal)}
                        </h2>
                      );
                    }
                    
                    return (
                      <p 
                        id={`p-${index}`}
                        key={index} 
                        className={
                          index === 0 || paragraphs[index - 1]?.startsWith('Chapter') || paragraphs[index - 1]?.startsWith('Capítulo')
                            ? "first-letter:text-6xl first-letter:font-extrabold first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-purple-600" 
                            : ""
                        }
                      >
                        {renderHighlightedText(paragraph, searchVal)}
                      </p>
                    );
                  })
                )}

                {isLimitedDegustation ? (
                  <div className="my-12 p-6 sm:p-10 rounded-[32px] bg-purple-950/20 border-2 border-dashed border-purple-500/30 text-center space-y-5 relative overflow-hidden backdrop-blur-sm shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-emerald-500/5 pointer-events-none" />
                    <div className="w-16 h-16 bg-purple-500/10 border border-purple-500/25 text-purple-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <Lock className="w-7 h-7" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-white tracking-tight">Leitura Limitada (30% alcançado)</h3>
                      <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                        Este e-book é uma publicação premium. Adquira a versão completa por apenas <strong className="text-purple-300">R$ {(ebook.price || 9.9).toFixed(2).replace('.', ',')}</strong> para desbloquear imediatamente os restantes {allParagraphs.length - paragraphs.length} parágrafos e todo o conteúdo exclusivo!
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={() => onTriggerPurchase?.(ebook)}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_4px_15px_rgba(255,77,109,0.3)] cursor-pointer"
                      >
                        Comprar E-Book por R$ {(ebook.price || 9.9).toFixed(2).replace('.', ',')}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* End of EBook signature */
                  <div className="flex flex-col items-center justify-center pt-16 border-t border-current/10 mt-16 space-y-6">
                    <div className="text-sm tracking-[0.15em] font-mono opacity-60">
                      FIM DA LEITURA
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4 w-full justify-center pt-4">
                      <button 
                        onClick={scrollToTop}
                        className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all duration-200 active:scale-95 ${currentStyle.buttonBg}`}
                      >
                        <ChevronUp className="w-4 h-4" />
                        Voltar ao topo
                      </button>

                      <button 
                        onClick={onClose}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-medium bg-purple-600 text-white hover:bg-purple-700 transition-all duration-200 active:scale-95 shadow-[0_4px_15px_rgba(255,77,109,0.25)]"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar para o Feed
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
        {/* Audio widget is now in header */}

        {/* Floating Cheat Code Toast */}
        <AnimatePresence>
          {showCheatToast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[999] px-6 py-4 bg-gradient-to-r from-purple-900/95 to-indigo-900/95 backdrop-blur text-purple-100 border border-purple-500/30 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-2.5 whitespace-nowrap"
            >
              <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
              <span>{showCheatToast}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
        </AnimatePresence>,
        document.body
      )}

      {showFullscreenPdf && ebook.uploadedPdf && createPortal(
        <div className="fixed inset-0 z-[999] bg-[#0c0a13] flex flex-col font-sans">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-[#110e19] border-b border-white/10 text-white shrink-0">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-purple-400" />
              <div className="text-left">
                <h2 className="text-sm font-bold truncate max-w-[150px] sm:max-w-md">{ebook.title}</h2>
                <p className="text-[10px] text-slate-400 font-medium">Leitor de PDF Interno</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                {isDownloading ? (
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Baixar</span>
              </button>
              <button
                onClick={() => setShowFullscreenPdf(false)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          {/* PDF Frame */}
          <div className="flex-1 bg-slate-950 relative">
            <iframe
              src={ebook.uploadedPdf}
              className="w-full h-full border-none bg-slate-950"
              title="PDF Reader Fullscreen"
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

