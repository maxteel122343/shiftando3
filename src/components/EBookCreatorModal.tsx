import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Sparkles, BookOpen, ChevronLeft, ChevronRight, Type, AlignLeft, AlignCenter, AlignJustify, Bold, Italic, Plus, Trash2, Download, Check, HelpCircle, Code, Music, Volume2, Sliders, Play, Square } from 'lucide-react';
import { User, EBook, EBookPage, EBookAudioTrack } from '../types';
import { jsPDF } from 'jspdf';
import { isConfigured as isSupabaseConfigured, deleteEBookSupabase, getEBooksSupabase } from '../utils/supabase';

interface EBookCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onPublish: (ebook: EBook) => void;
}

const FONT_PRESETS = [
  { value: 'serif', name: 'Serif (Playfair / Garamond)' },
  { value: 'sans', name: 'Sans-Serif (Inter / Roboto)' },
  { value: 'mono', name: 'Monospace (JetBrains / Fira)' },
  { value: 'cursive', name: 'Cursive (Elegant Script)' }
];

const COLOR_PRESETS = [
  { hex: '#ffffff', name: 'Branco', class: 'text-white' },
  { hex: '#d6bcfa', name: 'Lavanda', class: 'text-purple-200' },
  { hex: '#ecc94b', name: 'Dourado', class: 'text-yellow-400' },
  { hex: '#fbb6ce', name: 'Rosa Pastel', class: 'text-pink-300' },
  { hex: '#4fd1c5', name: 'Ciano', class: 'text-teal-300' },
  { hex: '#9f7aea', name: 'Púrpura', class: 'text-purple-400' },
  { hex: '#f4ecd8', name: 'Sépia', class: 'text-[#f4ecd8]' },
  { hex: '#2d3748', name: 'Grafite', class: 'text-slate-700' }
];

const BG_PRESETS = [
  { value: 'bg-[#0c0a13] border-white/5', name: 'Escuro Midnight', textHex: '#ffffff', bgHex: '#0c0a13' },
  { value: 'bg-[#f4ecd8] text-[#433422] border-[#d4c6a6]', name: 'Sépia Quente', textHex: '#433422', bgHex: '#f4ecd8' },
  { value: 'bg-[#121212] border-stone-800', name: 'Preto Carvão', textHex: '#e5e5e5', bgHex: '#121212' },
  { value: 'bg-white text-zinc-950 border-zinc-200', name: 'Branco Puro', textHex: '#09090b', bgHex: '#ffffff' }
];

export const AUDIO_PRESETS = [
  {
    title: 'Theta Waves 6Hz (Deep Shifting Freq)',
    url: 'https://assets.mixkit.co/music/preview/mixkit-ethereal-fairy-lullaby-121.mp3'
  },
  {
    title: 'Hogwarts Great Hall (Ambiance & Fire crackling)',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
  },
  {
    title: 'Forest Sanctuary (Wind & Healing Frequency)',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'
  },
  {
    title: 'Deep Space Astral (Synthesized Cosmic Flow)',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'
  }
];

export function EBookCreatorModal({ isOpen, onClose, currentUser, onPublish }: EBookCreatorModalProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
  const [userEbooks, setUserEbooks] = useState<EBook[]>([]);

  // Load custom ebooks published by current user
  React.useEffect(() => {
    async function loadUserEBooks() {
      if (isOpen) {
        if (isSupabaseConfigured && currentUser.id !== 'user_me') {
          const dbEbooks = await getEBooksSupabase();
          const filtered = dbEbooks.filter(b => b.authorId === currentUser.id);
          setUserEbooks(filtered);
        } else {
          const stored = localStorage.getItem('shifting_ebooks');
          if (stored) {
            try {
              const parsed: EBook[] = JSON.parse(stored);
              const filtered = parsed.filter(b => b.authorId === currentUser.id);
              setUserEbooks(filtered);
            } catch (e) {
              console.error("Error loading user ebooks:", e);
            }
          } else {
            setUserEbooks([]);
          }
        }
      }
    }
    loadUserEBooks();
  }, [isOpen, currentUser.id]);

  const handleDeleteEBook = async (ebookId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este e-book? Esta ação é irreversível.')) {
      if (isSupabaseConfigured && currentUser.id !== 'user_me') {
        const success = await deleteEBookSupabase(ebookId, currentUser.id);
        if (!success) {
          console.warn("Falha ao excluir e-book do Supabase.");
        }
      }

      const stored = localStorage.getItem('shifting_ebooks');
      if (stored) {
        try {
          const parsed: EBook[] = JSON.parse(stored);
          const updated = parsed.filter(b => b.id !== ebookId);
          localStorage.setItem('shifting_ebooks', JSON.stringify(updated));
          
          // Update local state inside modal
          setUserEbooks(updated.filter(b => b.authorId === currentUser.id));
          
          // Dispatch custom event to notify all carousels/showcases on the feed to update!
          window.dispatchEvent(new Event('shifting_ebooks_updated'));
          
          setSuccessMsg('✨ E-Book excluído com sucesso!');
          setTimeout(() => setSuccessMsg(''), 3000);
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const [creationMode, setCreationMode] = useState<'editor' | 'pdf'>('editor');
  const [uploadedPdf, setUploadedPdf] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);

  // EBook level states
  const [bookTitle, setBookTitle] = useState('');
  const [bookDesc, setBookDesc] = useState('');
  const [coverImage, setCoverImage] = useState('https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=600&auto=format&fit=crop');
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState(19.90);
  const [lockType, setLockType] = useState<'preview_30' | 'full'>('preview_30');
  const [allowDownload, setAllowDownload] = useState(true);

  // Audio progression states
  const [audioTracks, setAudioTracks] = useState<EBookAudioTrack[]>([
    {
      id: 'track_1',
      title: 'Theta Waves 6Hz (Deep Shifting Freq)',
      url: 'https://assets.mixkit.co/music/preview/mixkit-ethereal-fairy-lullaby-121.mp3',
      triggerProgress: 0,
      fadeInSec: 2,
      fadeOutSec: 2
    }
  ]);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);

  // Toggle play preview
  const togglePlayPreview = (track: EBookAudioTrack) => {
    if (playingTrackId === track.id) {
      if (previewAudio) {
        previewAudio.pause();
      }
      setPlayingTrackId(null);
    } else {
      if (previewAudio) {
        previewAudio.pause();
      }
      const audio = new Audio(track.url);
      audio.loop = true;
      audio.play().catch(err => console.log('Preview error:', err));
      setPreviewAudio(audio);
      setPlayingTrackId(track.id);
    }
  };

  // Cleanup preview audio on unmount or close
  React.useEffect(() => {
    return () => {
      if (previewAudio) {
        previewAudio.pause();
      }
    };
  }, [previewAudio]);
  
  // Pages states
  const [pages, setPages] = useState<EBookPage[]>([
    {
      id: 'page_1',
      title: 'Capítulo 1: O Despertar',
      content: 'Digite a maravilhosa história do seu shifting aqui...\n\nSinta-se livre para formatar usando as ferramentas acima, definir a fonte ideal e inserir imagens mágicas de Hogwarts, seu quarto de meditação ou de sua realidade desejada (DR).',
      fontFamily: 'serif',
      color: '#ffffff',
      bg: 'bg-[#0c0a13] border-white/5',
      align: 'justify',
      isBold: false,
      isItalic: false
    }
  ]);
  const [currentPageIdx, setCurrentPageIdx] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const currentPage = pages[currentPageIdx] || pages[0];

  // Helper: update property of current page
  const updateCurrentPage = (updates: Partial<EBookPage>) => {
    setPages(prev => prev.map((p, idx) => {
      if (idx === currentPageIdx) {
        return { ...p, ...updates };
      }
      return p;
    }));
  };

  // Add Page
  const handleAddPage = () => {
    const newPageNum = pages.length + 1;
    const newPage: EBookPage = {
      id: `page_${Date.now()}_${newPageNum}`,
      title: `Capítulo ${newPageNum}: Novo Capítulo`,
      content: 'Escreva mais sobre as suas experiências de shifting nesta página...',
      fontFamily: currentPage.fontFamily,
      color: currentPage.color,
      bg: currentPage.bg,
      align: currentPage.align,
      isBold: currentPage.isBold,
      isItalic: currentPage.isItalic
    };
    setPages(prev => [...prev, newPage]);
    setCurrentPageIdx(pages.length); // Navigate to new page
  };

  // Delete current page
  const handleDeletePage = () => {
    if (pages.length <= 1) return; // Must have at least one page
    
    setPages(prev => prev.filter((_, idx) => idx !== currentPageIdx));
    setCurrentPageIdx(prev => Math.max(0, prev - 1));
  };

  // File Upload Handlers (for Cover & Page)
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setCoverImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePageImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          updateCurrentPage({ image: reader.result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPageImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const newImg = {
            id: `img_${Date.now()}`,
            url: reader.result,
            width: 50,
            align: 'center' as const
          };
          const existing = currentPage.images || [];
          updateCurrentPage({ images: [...existing, newImg] });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddPageImageUrl = (url: string) => {
    if (!url.trim()) return;
    const newImg = {
      id: `img_${Date.now()}`,
      url: url.trim(),
      width: 50,
      align: 'center' as const
    };
    const existing = currentPage.images || [];
    updateCurrentPage({ images: [...existing, newImg] });
  };

  const updatePageImage = (id: string, updates: Partial<{ url: string; width: number; align: 'left' | 'center' | 'right' }>) => {
    const updated = (currentPage.images || []).map(img => {
      if (img.id === id) {
        return { ...img, ...updates };
      }
      return img;
    });
    updateCurrentPage({ images: updated });
  };

  const removePageImage = (id: string) => {
    const updated = (currentPage.images || []).filter(img => img.id !== id);
    updateCurrentPage({ images: updated });
  };

  // Save as PDF using jsPDF
  const handleExportPDF = async () => {
    if (!bookTitle.trim()) return;
    setIsExporting(true);
    
    try {
      // Initialize A4 portrait document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // 1. --- DRAW COVER PAGE ---
      // Paint elegant background (midnight gradient vibe)
      doc.setFillColor(15, 12, 25);
      doc.rect(0, 0, 210, 297, 'F');

      // Draw double border frame
      doc.setDrawColor(126, 58, 242);
      doc.setLineWidth(1);
      doc.rect(10, 10, 190, 277, 'S');
      
      doc.setDrawColor(199, 125, 255);
      doc.setLineWidth(0.3);
      doc.rect(12, 12, 186, 273, 'S');

      // Cover Title
      doc.setTextColor(255, 255, 255);
      doc.setFont('times', 'bold');
      doc.setFontSize(26);
      
      const titleLines = doc.splitTextToSize(bookTitle.trim().toUpperCase(), 160);
      let titleY = 70;
      titleLines.forEach((line: string) => {
        doc.text(line, 105, titleY, { align: 'center' });
        titleY += 12;
      });

      // Subtitle
      if (bookDesc.trim()) {
        doc.setFont('times', 'italic');
        doc.setFontSize(14);
        doc.setTextColor(180, 180, 180);
        const descLines = doc.splitTextToSize(bookDesc.trim(), 150);
        let descY = titleY + 10;
        descLines.forEach((line: string) => {
          doc.text(line, 105, descY, { align: 'center' });
          descY += 8;
        });
      }

      // Cover Image (If base64 format, render in PDF)
      if (coverImage && coverImage.startsWith('data:image/')) {
        try {
          doc.addImage(coverImage, 'JPEG', 55, 130, 100, 70);
        } catch (err) {
          console.error("Cover image draw error", err);
        }
      } else {
        // Draw decorative star/book logo inside PDF cover
        doc.setDrawColor(126, 58, 242);
        doc.setLineWidth(0.5);
        doc.line(85, 160, 125, 160);
        doc.text("✦ ✦ ✦", 105, 155, { align: 'center' });
      }

      // Author Signature
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(199, 125, 255);
      doc.text(`Escrito por: ${currentUser.displayName}`, 105, 240, { align: 'center' });
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(10);
      doc.text(`Plataforma Shifting Remix • ${new Date().toLocaleDateString('pt-BR')}`, 105, 255, { align: 'center' });

      // 2. --- DRAW EACH BOOK PAGE ---
      pages.forEach((page, index) => {
        doc.addPage();
        
        // Background color logic based on page presets
        const currentBgPreset = BG_PRESETS.find(p => p.value === page.bg) || BG_PRESETS[0];
        
        // Fill background
        const bgRgb = hexToRgb(currentBgPreset.bgHex);
        doc.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
        doc.rect(0, 0, 210, 297, 'F');

        // Draw headers & page numbers
        const textRgb = hexToRgb(page.color || currentBgPreset.textHex);
        doc.setTextColor(textRgb.r, textRgb.g, textRgb.b);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(bookTitle.toUpperCase(), 20, 15);
        doc.text(`Página ${index + 1}`, 190, 15, { align: 'right' });
        doc.setDrawColor(textRgb.r, textRgb.g, textRgb.b);
        doc.setLineWidth(0.1);
        doc.line(20, 17, 190, 17);

        // Page/Chapter Title
        doc.setFontSize(18);
        // Map page font family
        let fontStyle = 'normal';
        if (page.isBold) fontStyle = 'bold';
        if (page.isItalic) fontStyle = page.isBold ? 'bolditalic' : 'italic';

        let pdfFont = 'times';
        if (page.fontFamily === 'sans') pdfFont = 'helvetica';
        if (page.fontFamily === 'mono') pdfFont = 'courier';
        if (page.fontFamily === 'cursive') pdfFont = 'times'; // fallback

        doc.setFont(pdfFont, fontStyle);
        doc.text(page.title, 20, 30);

        // Draw content images
        let textStartY = 40;
        if (page.images && page.images.length > 0) {
          page.images.forEach(img => {
            if (img.url && (img.url.startsWith('data:image/') || img.url.startsWith('http'))) {
              try {
                const imgWidthMm = (img.width / 100) * 170;
                const imgHeightMm = imgWidthMm * 0.55; // 16:9 approx
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
            textStartY = 115; // Shift text starting coordinate down
          } catch (err) {
            console.error("Page image draw error", err);
          }
        }

        // Draw Content text
        doc.setFont(pdfFont, fontStyle === 'bold' ? 'bold' : 'normal');
        doc.setFontSize(11);
        
        const lines = doc.splitTextToSize(page.content, 170);
        let currY = textStartY;
        
        lines.forEach((line: string) => {
          if (currY > 275) {
            doc.addPage();
            // redraw page back on overflow
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

      // Export file
      const safeFilename = bookTitle.trim().toLowerCase().replace(/\s+/g, '_') || 'ebook';
      doc.save(`${safeFilename}.pdf`);
      
      setSuccessMsg('PDF gerado e baixado com sucesso!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (error) {
      console.error("Erro exportando PDF", error);
      alert("Houve um erro ao renderizar o PDF. Verifique se as imagens estão corrompidas.");
    } finally {
      setIsExporting(false);
    }
  };

  // Helper: Hex color to RGB
  function hexToRgb(hex: string) {
    const cleaned = hex.replace('#', '');
    const r = parseInt(cleaned.substring(0, 2), 16) || 0;
    const g = parseInt(cleaned.substring(2, 4), 16) || 0;
    const b = parseInt(cleaned.substring(4, 6), 16) || 0;
    return { r, g, b };
  }

  // Publish eBook (Injects eBook + post announcement)
  const handlePublish = () => {
    if (!bookTitle.trim()) return;

    // Compile markdown-like text content for backward compatibility
    const compiledContent = creationMode === 'pdf' 
      ? 'Este e-book foi enviado pronto em formato PDF. Use o leitor para baixar ou visualizar o conteúdo completo com todas as formatações originais!'
      : pages.map(p => `${p.title}\n\n${p.content}`).join('\n\n');

    const newEBook: EBook = {
      id: `ebook_${Date.now()}`,
      title: bookTitle.trim().toUpperCase(),
      coverImage: coverImage,
      content: compiledContent,
      description: bookDesc.trim() || 'Novidade na biblioteca Shifting!',
      authorId: currentUser.id,
      authorName: currentUser.displayName,
      pages: creationMode === 'pdf' ? [] : pages,
      createdAt: Date.now(),
      isPaid: isPaid,
      price: isPaid ? Number(price) : undefined,
      lockType: isPaid ? lockType : undefined,
      allowDownload: allowDownload,
      audioTracks: audioTracks,
      isPdfReady: creationMode === 'pdf',
      uploadedPdf: creationMode === 'pdf' ? (uploadedPdf || undefined) : undefined,
      pdfFileName: creationMode === 'pdf' ? (pdfFileName || undefined) : undefined
    };

    onPublish(newEBook);
    
    setSuccessMsg('✨ E-Book publicado com sucesso na vitrine e anunciado no feed!');
    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 2500);

    // Reset fields
    setBookTitle('');
    setBookDesc('');
    setCoverImage('https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=600&auto=format&fit=crop');
    setIsPaid(false);
    setPrice(19.90);
    setLockType('preview_30');
    setAllowDownload(true);
    setCreationMode('editor');
    setUploadedPdf(null);
    setPdfFileName(null);
    setAudioTracks([
      {
        id: 'track_1',
        title: 'Theta Waves 6Hz (Deep Shifting Freq)',
        url: 'https://assets.mixkit.co/music/preview/mixkit-ethereal-fairy-lullaby-121.mp3',
        triggerProgress: 0,
        fadeInSec: 2,
        fadeOutSec: 2
      }
    ]);
    setPages([
      {
        id: 'page_1',
        title: 'Capítulo 1: O Despertar',
        content: 'Digite a maravilhosa história do seu shifting aqui...',
        fontFamily: 'serif',
        color: '#ffffff',
        bg: 'bg-[#0c0a13] border-white/5',
        align: 'justify',
        isBold: false,
        isItalic: false
      }
    ]);
    setCurrentPageIdx(0);
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-md"
      />

      {/* Main Multi-panel Layout container - FULL SCREEN */}
      <div className="relative bg-[#110e19] w-full h-full overflow-hidden shadow-2xl flex flex-col z-10 animate-in fade-in duration-200">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none"></div>

        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-2xl">
              <BookOpen className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Estúdio de Criação de E-Books</h2>
              <p className="text-xs text-slate-400 font-medium">Escreva, formate, insira ilustrações e publique em PDF ou na vitrine do Feed</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={onClose}
              className="p-2 rounded-full bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-[#0c0a13] border-b border-white/5 px-6 pt-3 gap-6 shrink-0 relative z-10">
          <button
            onClick={() => setActiveTab('create')}
            className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'create'
                ? 'text-purple-400 border-b-2 border-purple-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Criar Novo E-Book
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'manage'
                ? 'text-purple-400 border-b-2 border-purple-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Meus E-Books Publicados ({userEbooks.length})
          </button>
        </div>

        {/* Success / Notification banner */}
        {successMsg && (
          <div className="bg-emerald-500/20 text-emerald-300 px-6 py-3.5 text-center text-sm font-semibold border-b border-emerald-500/10 animate-in slide-in-from-top duration-200 flex items-center justify-center gap-2 relative z-20 shrink-0">
            <Check className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Main EBook Creator Workspace (Split screen Editor + Preview) */}
        {activeTab === 'create' ? (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* LEFT COMPONENT: Scrollable Editor Panel */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 border-r border-white/5 space-y-6 text-left custom-scrollbar">
              
              {/* SECTION 1: EBook Details & Cover Settings */}
              <div className="bg-[#151221] border border-white/5 rounded-2xl p-4 sm:p-5 space-y-4">
                <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>1. Capa & Informações</span>
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Título do E-Book</label>
                      <input
                        type="text"
                        value={bookTitle}
                        onChange={(e) => setBookTitle(e.target.value)}
                        placeholder="Ex: SEGREDOS DA REALIDADE DESEJADA"
                        className="w-full bg-[#0c0a13] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all font-bold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Descrição Breve / Subtítulo</label>
                      <input
                        type="text"
                        value={bookDesc}
                        onChange={(e) => setBookDesc(e.target.value)}
                        placeholder="Ex: Como eu consegui shifting usando o método theta"
                        className="w-full bg-[#0c0a13] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
                      />
                    </div>
                  </div>

                  {/* Image cover input */}
                  <div className="space-y-3">
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Imagem da Capa</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative bg-[#0c0a13] border border-white/5 border-dashed rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer hover:border-purple-500/30 transition-all text-center">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Upload className="w-5 h-5 text-slate-500 mb-1" />
                        <span className="text-[9px] text-slate-400 font-semibold leading-none">Upload Imagem</span>
                      </div>
                      
                      <div className="flex flex-col justify-center">
                        <input
                          type="text"
                          value={coverImage.startsWith('data:') ? '' : coverImage}
                          onChange={(e) => setCoverImage(e.target.value || 'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=600&auto=format&fit=crop')}
                          placeholder="Ou cole a URL aqui..."
                          className="w-full bg-[#0c0a13] border border-white/10 rounded-xl px-3 py-2 text-[10px] text-white focus:outline-none focus:border-purple-500/50 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 1.2: COMO DESEJA CRIAR O SEU E-BOOK */}
              <div className="bg-[#151221] border border-white/5 rounded-2xl p-4 sm:p-5 space-y-4">
                <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  <span>Como deseja criar o seu E-Book?</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCreationMode('editor')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      creationMode === 'editor'
                        ? 'bg-purple-600/10 border-purple-500 text-white shadow-lg'
                        : 'bg-[#0c0a13] border-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-purple-400" />
                      <span>Editor Interativo</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                      Crie o e-book página por página no editor, escolhendo fontes, cores, imagens e trilhas sonoras atmosféricas.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreationMode('pdf')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      creationMode === 'pdf'
                        ? 'bg-purple-600/10 border-purple-500 text-white shadow-lg'
                        : 'bg-[#0c0a13] border-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-2">
                      <Upload className="w-4 h-4 text-purple-400" />
                      <span>PDF Pronto (Rápido)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                      Já tem um PDF pronto? Faça o upload instantâneo, adicione capa, personalize o preço e publique direto na vitrine!
                    </p>
                  </button>
                </div>
              </div>

              {/* SECTION 1.5: Pricing & Access Settings */}
              <div className="bg-[#151221] border border-white/5 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span>2. Monetização & Acesso</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">E-book Pago?</span>
                    <button
                      type="button"
                      onClick={() => setIsPaid(!isPaid)}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isPaid ? 'bg-purple-600' : 'bg-zinc-800'}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${isPaid ? 'translate-x-5' : 'translate-x-0'}`}
                      />
                    </button>
                  </div>
                </div>

                {isPaid ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Preço do E-Book (R$)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-purple-400">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={price}
                          onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                          placeholder="19.90"
                          className="w-full bg-[#0c0a13] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all font-mono font-bold"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500">Defina o valor cobrado para liberação de acesso completo.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Nível de Acesso (Tipo de Bloqueio)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setLockType('preview_30')}
                          className={`p-2 rounded-xl border text-[11px] font-bold text-center transition-all ${
                            lockType === 'preview_30'
                              ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                              : 'bg-[#0c0a13] border-white/5 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Bloquear após 30%
                        </button>
                        <button
                          type="button"
                          onClick={() => setLockType('full')}
                          className={`p-2 rounded-xl border text-[11px] font-bold text-center transition-all ${
                            lockType === 'full'
                              ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                              : 'bg-[#0c0a13] border-white/5 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Bloqueio Total
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        {lockType === 'preview_30' 
                          ? 'Degustação de até 30% antes de bloquear.' 
                          : 'Exige compra imediata antes de abrir.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic bg-[#0c0a13] p-3 rounded-xl border border-white/5">
                    Este livro será disponibilizado gratuitamente na vitrine para todos os shifters lerem livremente.
                  </p>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-slate-300">Permitir Download em PDF</span>
                    <span className="text-[9px] text-slate-500">Permitir salvar offline (após compra se for pago)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAllowDownload(!allowDownload)}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${allowDownload ? 'bg-purple-600' : 'bg-zinc-800'}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${allowDownload ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              </div>

              {/* SECTION 1.8: Audio tracks configuration */}
              <div className="bg-[#151221] border border-white/5 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Music className="w-4 h-4 text-purple-400" />
                    <span>3. Trilhas Sonoras & Atmosferas (Progressivo)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      const newTrack: EBookAudioTrack = {
                        id: `track_${Date.now()}`,
                        title: `Nova Atmosfera ${audioTracks.length + 1}`,
                        url: 'https://assets.mixkit.co/music/preview/mixkit-ethereal-fairy-lullaby-121.mp3',
                        triggerProgress: audioTracks.length === 0 ? 0 : Math.min(100, audioTracks[audioTracks.length - 1].triggerProgress + 20),
                        fadeInSec: 2,
                        fadeOutSec: 2
                      };
                      setAudioTracks([...audioTracks, newTrack]);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600 hover:text-white text-[11px] font-bold transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Trilha</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Programe diferentes músicas atmosféricas de fundo para tocar automaticamente em determinados pontos da leitura (ex: tocar som de chuva ao atingir 20% de progresso, e som astral a 50%).
                </p>

                {audioTracks.length === 0 ? (
                  <div className="text-center py-6 bg-black/20 rounded-xl border border-white/5 border-dashed">
                    <Music className="w-8 h-8 text-slate-600 mx-auto mb-2 stroke-1" />
                    <p className="text-slate-500 text-xs">Nenhuma trilha sonora configurada.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                    {audioTracks.map((track, index) => (
                      <div key={track.id} className="bg-black/30 border border-white/5 p-3 rounded-xl space-y-3 relative">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-xs font-bold text-purple-400 font-mono">Trilha #{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (playingTrackId === track.id && previewAudio) {
                                previewAudio.pause();
                                setPlayingTrackId(null);
                              }
                              setAudioTracks(audioTracks.filter(t => t.id !== track.id));
                            }}
                            className="p-1 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                            title="Remover trilha"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Title */}
                          <div>
                            <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1">Título da Atmosfera</label>
                            <input
                              type="text"
                              value={track.title}
                              onChange={(e) => {
                                const updated = [...audioTracks];
                                updated[index].title = e.target.value;
                                setAudioTracks(updated);
                              }}
                              className="w-full bg-[#0c0a13] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                              placeholder="Ex: Frequência Theta 6Hz"
                            />
                          </div>

                          {/* URL / Preset Selector */}
                          <div>
                            <label className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wider mb-1">URL do Áudio (MP3 / Link Direto)</label>
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={track.url}
                                onChange={(e) => {
                                  const updated = [...audioTracks];
                                  updated[index].url = e.target.value;
                                  setAudioTracks(updated);
                                }}
                                className="flex-1 bg-[#0c0a13] border border-white/10 rounded-lg px-3 py-1.5 text-[11px] text-white font-mono"
                                placeholder="Cole o link .mp3 aqui..."
                              />
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    const updated = [...audioTracks];
                                    updated[index].url = e.target.value;
                                    const preset = AUDIO_PRESETS.find(p => p.url === e.target.value);
                                    if (preset) {
                                      updated[index].title = preset.title;
                                    }
                                    setAudioTracks(updated);
                                  }
                                }}
                                className="bg-purple-600/20 border border-purple-500/30 text-purple-300 text-xs rounded-lg px-2 py-1.5 cursor-pointer max-w-[100px]"
                                defaultValue=""
                              >
                                <option value="" disabled className="bg-[#110e19] text-white">Presets</option>
                                {AUDIO_PRESETS.map((p, pIdx) => (
                                  <option key={pIdx} value={p.url} className="bg-[#110e19] text-white text-xs">
                                    {p.title}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* trigger progress & fade properties */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5">
                          {/* Trigger Progress Slider */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                              <span>Tocar em (% progresso)</span>
                              <span className="text-purple-300 font-mono font-bold">{track.triggerProgress}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={track.triggerProgress}
                              onChange={(e) => {
                                const updated = [...audioTracks];
                                updated[index].triggerProgress = parseInt(e.target.value);
                                setAudioTracks(updated);
                              }}
                              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                          </div>

                          {/* Fade In */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                              <span>Fade In (Suave)</span>
                              <span className="text-purple-300 font-mono">{track.fadeInSec}s</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              value={track.fadeInSec}
                              onChange={(e) => {
                                const updated = [...audioTracks];
                                updated[index].fadeInSec = parseInt(e.target.value);
                                setAudioTracks(updated);
                              }}
                              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                          </div>

                          {/* Fade Out */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                              <span>Fade Out (Suave)</span>
                              <span className="text-purple-300 font-mono">{track.fadeOutSec}s</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="10"
                              value={track.fadeOutSec}
                              onChange={(e) => {
                                const updated = [...audioTracks];
                                updated[index].fadeOutSec = parseInt(e.target.value);
                                setAudioTracks(updated);
                              }}
                              className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                            />
                          </div>
                        </div>

                        {/* Preview play/pause button */}
                        <div className="pt-1.5 flex justify-end">
                          <button
                            type="button"
                            onClick={() => togglePlayPreview(track)}
                            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                              playingTrackId === track.id
                                ? 'bg-amber-500/20 border border-amber-500 text-amber-300'
                                : 'bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20'
                            }`}
                          >
                            {playingTrackId === track.id ? (
                              <>
                                <Square className="w-3 h-3 fill-amber-300" />
                                <span>Parar Preview</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 fill-purple-300" />
                                <span>Testar Áudio</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 2 OR PDF UPLOAD CONTAINER */}
              {creationMode === 'pdf' ? (
                <div className="bg-[#151221] border border-white/5 rounded-2xl p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
                  <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-purple-400" />
                    <span>2. Upload de Arquivo PDF Pronto</span>
                  </h3>
                  
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Você escolheu publicar um PDF pronto. Envie seu e-book no formato original abaixo para que os usuários possam visualizá-lo ou baixá-lo.
                  </p>

                  <div className="relative bg-[#0c0a13] border-2 border-white/10 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-purple-500/30 transition-all text-center">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setPdfFileName(file.name);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            if (typeof reader.result === 'string') {
                              setUploadedPdf(reader.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div className="p-3 bg-purple-500/10 rounded-full text-purple-400 mb-2">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-white">
                      {pdfFileName ? `PDF Selecionado: ${pdfFileName}` : 'Arraste seu PDF ou clique para buscar'}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">Formato suportado: .pdf (Máx. 25MB)</p>
                  </div>

                  {uploadedPdf && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-300">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="truncate max-w-[200px]">PDF Carregado com sucesso! ({pdfFileName})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedPdf(null);
                          setPdfFileName(null);
                        }}
                        className="text-red-400 font-bold hover:underline cursor-pointer"
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* SECTION 2: Dynamic Page Editor & Rich Formatting Toolbar */
                <div className="bg-[#151221] border border-white/5 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-white/5">
                    <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4" />
                      <span>2. Editor de Páginas & Texto</span>
                    </h3>
                    
                    {/* Page Navigator */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCurrentPageIdx(p => Math.max(0, p - 1))}
                        disabled={currentPageIdx === 0}
                        className="p-1.5 bg-white/5 border border-white/5 text-slate-300 rounded-lg hover:bg-white/10 hover:text-white disabled:opacity-35 disabled:hover:bg-white/5 transition-all"
                        title="Página Anterior"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-mono text-purple-300 font-bold px-1.5 bg-purple-500/10 py-1 rounded-md">
                        Pág {currentPageIdx + 1} de {pages.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentPageIdx(p => Math.min(pages.length - 1, p + 1))}
                        disabled={currentPageIdx === pages.length - 1}
                        className="p-1.5 bg-white/5 border border-white/5 text-slate-300 rounded-lg hover:bg-white/10 hover:text-white disabled:opacity-35 disabled:hover:bg-white/5 transition-all"
                        title="Próxima Página"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleAddPage}
                        className="ml-2 flex items-center gap-1 px-2.5 py-1.5 bg-purple-600/30 border border-purple-500/30 text-purple-300 hover:bg-purple-600 hover:text-white text-xs font-semibold rounded-lg transition-all"
                        title="Nova Página"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Nova Pág</span>
                      </button>

                      {pages.length > 1 && (
                        <button
                          type="button"
                          onClick={handleDeletePage}
                          className="p-1.5 bg-red-500/10 border border-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                          title="Deletar Página Atual"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rich Format Toolbar */}
                  <div className="flex flex-wrap items-center gap-2 bg-[#0c0a13] p-2.5 rounded-xl border border-white/5">
                    {/* Font Family selector */}
                    <div className="relative">
                      <select
                        value={currentPage.fontFamily}
                        onChange={(e) => updateCurrentPage({ fontFamily: e.target.value as any })}
                        className="bg-white/5 border border-white/10 text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-purple-500/50 transition-all font-medium cursor-pointer"
                      >
                        {FONT_PRESETS.map(font => (
                          <option key={font.value} value={font.value} className="bg-[#110e19] text-white">
                            {font.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="h-4 w-px bg-white/10" />

                    {/* Formatting selectors (Bold, Italic) */}
                    <button
                      type="button"
                      onClick={() => updateCurrentPage({ isBold: !currentPage.isBold })}
                      className={`p-1.5 rounded-lg border transition-all ${currentPage.isBold ? 'bg-purple-600 border-purple-500 text-white' : 'border-white/5 text-slate-400 hover:bg-white/5'}`}
                      title="Negrito"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateCurrentPage({ isItalic: !currentPage.isItalic })}
                      className={`p-1.5 rounded-lg border transition-all ${currentPage.isItalic ? 'bg-purple-600 border-purple-500 text-white' : 'border-white/5 text-slate-400 hover:bg-white/5'}`}
                      title="Itálico"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>

                    <div className="h-4 w-px bg-white/10" />

                    {/* Alignment selectors */}
                    <div className="flex items-center bg-white/5 rounded-lg border border-white/5 p-0.5">
                      {(['left', 'center', 'justify'] as const).map(alignValue => {
                        const Icon = alignValue === 'left' ? AlignLeft : alignValue === 'center' ? AlignCenter : AlignJustify;
                        return (
                          <button
                            key={alignValue}
                            type="button"
                            onClick={() => updateCurrentPage({ align: alignValue })}
                            className={`p-1 rounded transition-colors ${currentPage.align === alignValue ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </button>
                        );
                      })}
                    </div>

                    <div className="h-4 w-px bg-white/10" />

                    {/* Presets color indicators */}
                    <div className="flex items-center gap-1">
                      {COLOR_PRESETS.slice(0, 7).map(col => (
                        <button
                          key={col.hex}
                          type="button"
                          onClick={() => updateCurrentPage({ color: col.hex })}
                          className={`w-4 h-4 rounded-full border border-black/30 transition-transform ${currentPage.color === col.hex ? 'scale-125 ring-1 ring-purple-400' : 'hover:scale-110'}`}
                          style={{ backgroundColor: col.hex }}
                          title={col.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Subtitle / Page Title input */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Título da Página / Capítulo</label>
                    <input
                      type="text"
                      value={currentPage.title}
                      onChange={(e) => updateCurrentPage({ title: e.target.value })}
                      placeholder="Ex: Capítulo 1: O Portal dos Sonhos"
                      className="w-full bg-[#0c0a13] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all font-bold"
                    />
                  </div>

                  {/* Page Content text block */}
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1 font-mono">Conteúdo da Página</label>
                    <textarea
                      value={currentPage.content}
                      onChange={(e) => updateCurrentPage({ content: e.target.value })}
                      placeholder="Escreva sua experiência..."
                      rows={8}
                      className="w-full bg-[#0c0a13] border border-white/5 rounded-xl p-4 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all resize-none font-serif leading-relaxed"
                    />
                  </div>

                  {/* Multi-Image Content Manager */}
                  <div className="pt-4 border-t border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Imagens Inseridas no Conteúdo ({currentPage.images?.length || 0})
                      </span>
                      <div className="relative">
                        <button
                          type="button"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600 hover:text-white text-[10px] font-bold transition-all cursor-pointer relative"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Adicionar Imagem</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAddPageImage}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </button>
                      </div>
                    </div>

                    {/* Add URL trigger */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ou digite/cole o link direto de uma imagem aqui..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddPageImageUrl(e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                        className="flex-1 bg-[#0c0a13] border border-white/5 rounded-xl px-3 py-1.5 text-[10px] text-white focus:outline-none focus:border-purple-500/50 transition-all"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          if (input && input.value) {
                            handleAddPageImageUrl(input.value);
                            input.value = '';
                          }
                        }}
                        className="px-3 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold rounded-xl transition-all cursor-pointer"
                      >
                        Inserir
                      </button>
                    </div>

                    {/* List of page images with live preview and controls */}
                    {currentPage.images && currentPage.images.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {currentPage.images.map((img) => (
                          <div 
                            key={img.id}
                            className="bg-[#0c0a13] border border-white/5 rounded-xl p-3 space-y-3 relative overflow-hidden group"
                          >
                            {/* Image preview with resize drag guide */}
                            <div className="relative aspect-[16/10] bg-black/40 rounded-lg overflow-hidden border border-white/5 flex items-center justify-center">
                              <img 
                                src={img.url} 
                                alt="Content Preview" 
                                className="max-h-full max-w-full object-contain transition-transform"
                                style={{ width: `${img.width}%` }}
                              />
                              
                              {/* Drag borders / Resize handles indicator */}
                              <div className="absolute inset-x-2 bottom-2 bg-black/75 px-2 py-1 rounded text-[9px] text-purple-300 font-mono flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                                <span>Largura: {img.width}%</span>
                                <span>Alinhado: {img.align === 'left' ? 'Esquerda' : img.align === 'right' ? 'Direita' : 'Centro'}</span>
                              </div>

                              {/* Delete button top right */}
                              <button
                                type="button"
                                onClick={() => removePageImage(img.id)}
                                className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg cursor-pointer"
                                title="Remover Imagem"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Controls (Align, Width Slider, Border dragging representation) */}
                            <div className="space-y-2">
                              {/* Align Buttons */}
                              <div>
                                <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-1">Alinhamento</span>
                                <div className="grid grid-cols-3 gap-1">
                                  {['left', 'center', 'right'].map((al) => (
                                    <button
                                      key={al}
                                      type="button"
                                      onClick={() => updatePageImage(img.id, { align: al as any })}
                                      className={`py-1 text-[9px] font-bold rounded-md border transition-all ${
                                        img.align === al 
                                          ? 'bg-purple-600/20 border-purple-500 text-white' 
                                          : 'bg-black/20 border-white/5 text-slate-400 hover:text-slate-200'
                                      }`}
                                    >
                                      {al === 'left' ? 'Esquerda' : al === 'right' ? 'Direita' : 'Centro'}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Width Slider (Touch-friendly & Drag borders alternative) */}
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Ajustar Tamanho (Borda)</span>
                                  <span className="text-[9px] font-mono font-bold text-purple-300">{img.width}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="range"
                                    min="10"
                                    max="100"
                                    value={img.width}
                                    onChange={(e) => updatePageImage(img.id, { width: parseInt(e.target.value) })}
                                    className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-black/20 rounded-xl border border-white/5 border-dashed">
                        <p className="text-[10px] text-slate-500">Nenhuma imagem adicionada ao conteúdo ainda.</p>
                        <p className="text-[9px] text-slate-600 mt-1">Insira imagens para ilustrar seu e-book de shifting de forma incrível!</p>
                      </div>
                    )}
                  </div>

                  {/* Page Background Theme presets */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase">Tema Visual de Fundo das Páginas</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {BG_PRESETS.map(preset => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => updateCurrentPage({ bg: preset.value })}
                          className={`px-2.5 py-2 text-[10px] font-semibold rounded-xl border text-center transition-all ${
                            currentPage.bg === preset.value 
                              ? 'border-purple-500 text-purple-400 bg-purple-500/5' 
                              : 'border-white/5 text-slate-400 hover:text-white bg-[#0c0a13]'
                          }`}
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ACTION FOOTER */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/5">
                {creationMode !== 'pdf' && (
                  <button
                    type="button"
                    onClick={handleExportPDF}
                    disabled={isExporting || !bookTitle.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold text-xs rounded-full hover:from-teal-600 hover:to-emerald-700 transition-all shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isExporting ? 'Renderizando PDF...' : 'Salvar em PDF'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={!bookTitle.trim() || (creationMode === 'pdf' && !uploadedPdf)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-xs rounded-full hover:from-purple-700 hover:to-indigo-700 transition-all shadow-[0_0_15px_rgba(126,58,242,0.4)] disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Publicar e Exibir no Feed</span>
                </button>
              </div>

            </div>

            {/* RIGHT COMPONENT: Immersive Book Live Preview Panel */}
            <div className="flex-1 bg-black/40 overflow-y-auto p-4 sm:p-6 flex flex-col justify-center items-center custom-scrollbar">
              
              <div className="w-full max-w-[340px] space-y-2 mb-3 self-center text-center">
                <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase bg-white/5 px-2.5 py-1 rounded-full">Prévia em Tempo Real</span>
              </div>

              {/* Simulated Book Container with realistic page bindings / borders */}
              <div className="w-full max-w-sm aspect-[4/6] rounded-[24px] overflow-hidden shadow-2xl border border-white/10 flex flex-col bg-slate-900/40 relative">
                
                {/* Book cover or interior layout */}
                <div className={`flex-1 p-6 flex flex-col justify-between transition-colors duration-300 relative ${currentPage.bg}`}>
                  
                  {/* Decorative book binder shadow on the left */}
                  <div className="absolute top-0 left-0 bottom-0 w-3 bg-gradient-to-r from-black/25 to-transparent z-10 pointer-events-none"></div>

                  <div className="space-y-4">
                    {/* Header bar preview */}
                    <div className="flex justify-between items-center text-[8px] tracking-wider opacity-45 uppercase border-b border-current/10 pb-1.5 mb-2 font-mono">
                      <span>{bookTitle || 'Sem título'}</span>
                      <span>Pág {currentPageIdx + 1}</span>
                    </div>

                    {/* Image space inside the book page */}
                    {currentPage.image && (
                      <div className="rounded-xl overflow-hidden border border-current/10 max-h-32 bg-black/20 flex items-center justify-center">
                        <img 
                          src={currentPage.image} 
                          alt="Book visual" 
                          className="max-h-32 object-cover w-full"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x250?text=Format+Error'; }}
                        />
                      </div>
                    )}

                    {/* Chapter Title */}
                    <h4 
                      className={`font-serif font-bold text-center border-b border-current/5 pb-2 leading-tight ${
                        currentPage.fontFamily === 'serif' ? 'font-serif' : currentPage.fontFamily === 'sans' ? 'font-sans' : currentPage.fontFamily === 'mono' ? 'font-mono' : 'font-serif italic'
                      } ${
                        currentPage.isBold ? 'font-bold' : ''
                      } ${
                        currentPage.isItalic ? 'italic' : ''
                      }`}
                      style={{ color: currentPage.color }}
                    >
                      {currentPage.title || `Capítulo ${currentPageIdx + 1}`}
                    </h4>

                    {/* Chapter Content text body with formatting */}
                    <p 
                      className={`text-[11px] leading-relaxed select-none ${
                        currentPage.fontFamily === 'serif' ? 'font-serif' : currentPage.fontFamily === 'sans' ? 'font-sans' : currentPage.fontFamily === 'mono' ? 'font-mono' : 'font-serif italic'
                      } ${
                        currentPage.isBold ? 'font-bold' : ''
                      } ${
                        currentPage.isItalic ? 'italic' : ''
                      }`}
                      style={{ 
                        color: currentPage.color,
                        textAlign: currentPage.align === 'justify' ? 'justify' : currentPage.align === 'center' ? 'center' : 'left'
                      }}
                    >
                      {currentPage.content || 'Digite a maravilhosa história do seu shifting aqui...'}
                    </p>
                  </div>

                  {/* Book Author signature footer */}
                  <div className="text-[8px] tracking-widest text-center opacity-40 font-semibold border-t border-current/5 pt-2 flex items-center justify-between font-mono">
                    <span>Shifting Remix</span>
                    <span>Escrito por: {currentUser.displayName}</span>
                  </div>
                </div>

              </div>

            </div>

          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-left custom-scrollbar bg-[#0a0810] animate-in fade-in duration-200">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">Meus E-Books Publicados</h3>
                  <p className="text-xs text-slate-400">Gerencie as suas publicações na Biblioteca de Shifting. Qualquer e-book excluído sumirá instantaneamente das vitrines do Feed.</p>
                </div>
              </div>

              {userEbooks.length === 0 ? (
                <div className="text-center py-20 bg-[#120f1d]/40 rounded-3xl border border-white/5 border-dashed flex flex-col items-center justify-center gap-3">
                  <div className="p-4 bg-white/5 rounded-full text-slate-500">
                    <BookOpen className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold text-sm">Nenhum e-book publicado por você</p>
                    <p className="text-xs text-slate-500 mt-1">Escreva e publique sua primeira história na aba "Criar Novo E-Book"!</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="mt-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg"
                  >
                    Começar a Escrever
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userEbooks.map((ebook) => (
                    <div 
                      key={ebook.id} 
                      className="bg-[#120f1d]/60 border border-white/5 rounded-2xl p-4 flex flex-col group hover:border-purple-500/30 hover:bg-[#120f1d]/80 transition-all duration-300 relative shadow-lg"
                    >
                      <div className="flex gap-4">
                        {/* Cover thumbnail */}
                        <div className="w-16 aspect-[2/3] rounded-lg overflow-hidden bg-black/40 border border-white/5 shrink-0">
                          <img 
                            src={ebook.coverImage} 
                            alt={ebook.title} 
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex flex-col min-w-0 justify-center">
                          <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider mb-0.5">
                            {ebook.isPaid ? `R$ ${(ebook.price || 0).toFixed(2).replace('.', ',')}` : 'Gratuito'}
                          </span>
                          <h4 className="text-xs font-bold text-white tracking-wide leading-tight truncate">
                            {ebook.title}
                          </h4>
                          <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {ebook.description}
                          </p>
                          <span className="text-[9px] text-slate-500 mt-2 font-mono">
                            Publicado em {new Date(ebook.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-white/5 mt-4 pt-3 flex items-center justify-end">
                        <button
                          onClick={() => handleDeleteEBook(ebook.id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 hover:border-rose-500 text-rose-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
                          title="Excluir e-book da plataforma"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}
