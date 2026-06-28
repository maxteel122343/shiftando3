import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon, X, Upload, Globe, ArrowLeft } from 'lucide-react';
import { User, Post } from '../types';

export interface RedditSource {
  author: string;
  subreddit: string;
  permalink: string;
}

interface CreatePostProps {
  currentUser: User;
  onPostCreate: (post: Post) => void;
  initialTitle?: string;
  initialContent?: string;
  initialImage?: string;
  redditSource?: RedditSource;
}

export function CreatePost({ currentUser, onPostCreate, initialTitle = '', initialContent = '', initialImage = '', redditSource }: CreatePostProps) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [hashtags, setHashtags] = useState('#shifting #reddit');
  const [imageUrl, setImageUrl] = useState(initialImage);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImageUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const tagsArray = hashtags
      .split(' ')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .map(tag => tag.startsWith('#') ? tag : `#${tag}`);

    const newPost: Post = {
      id: `post_${Date.now()}`,
      userId: currentUser.id,
      title: title.trim(),
      content: content.trim(),
      image: imageUrl.trim() || undefined,
      hashtags: tagsArray,
      likes: [],
      comments: [],
      createdAt: Date.now(),
    };

    onPostCreate(newPost);
    navigate('/');
  };

  return (
    <div className="w-full py-4 px-2.5 sm:py-8 sm:px-4 relative z-10">
      <div className="mb-4 sm:mb-6 px-2 flex flex-col items-start">
        <button
          onClick={() => navigate('/')}
          className="mb-3.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all duration-200 bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
          type="button"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-purple-400" />
          <span>Voltar para o Feed</span>
        </button>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Criar Post</h1>
      </div>

      {/* Reddit Import Banner */}
      {redditSource && (
        <div className="mb-4 flex items-start gap-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 text-xs text-orange-300">
          <Globe className="w-4 h-4 shrink-0 mt-0.5 text-orange-400" />
          <div>
            <p className="font-bold text-orange-300 mb-0.5">📡 Relato importado do Reddit</p>
            <p className="text-orange-300/70 leading-relaxed">
              Originalmente publicado por <span className="font-semibold text-orange-300">u/{redditSource.author}</span> em <span className="font-semibold">r/{redditSource.subreddit}</span>. Edite o conteúdo e publique como um relato na nossa comunidade!
            </p>
            <a
              href={`https://reddit.com${redditSource.permalink}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-orange-400 hover:underline"
            >
              Ver original no Reddit →
            </a>
          </div>
        </div>
      )}

      <div className="bg-[#15121e]/75 dark:bg-[#15121e]/75 app-light-mode:bg-white/80 backdrop-blur-xl border border-white/[0.08] dark:border-white/[0.08] app-light-mode:border-slate-200/50 border-t-white/[0.16] dark:border-t-white/[0.16] app-light-mode:border-t-white/90 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] app-light-mode:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.05)] p-4 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <label htmlFor="title" className="block text-xs sm:text-[13px] font-medium text-slate-400 mb-1.5 sm:mb-2 uppercase tracking-wider">Título</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Minha primeira mini-shifting para Hogwarts!"
              className="w-full bg-[#0c0a13] border border-white/5 rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 text-sm sm:text-[15px] text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-all font-medium"
              required
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-xs sm:text-[13px] font-medium text-slate-400 mb-1.5 sm:mb-2 uppercase tracking-wider">Conteúdo</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Conte o que aconteceu na sua jornada..."
              rows={5}
              className="w-full bg-[#0c0a13] border border-white/5 rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 text-sm sm:text-[15px] text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-all resize-none"
              required
            />
          </div>

          <div>
            <label htmlFor="hashtags" className="block text-xs sm:text-[13px] font-medium text-slate-400 mb-1.5 sm:mb-2 uppercase tracking-wider">Hashtags</label>
            <input
              type="text"
              id="hashtags"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#dr #metodoraven #shifting"
              className="w-full bg-[#0c0a13] border border-white/5 rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 text-sm sm:text-[15px] text-purple-300 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-all"
            />
          </div>

          {/* New dual Image Selection Option */}
          <div className="space-y-3">
            <label className="block text-[13px] font-medium text-slate-400 uppercase tracking-wider">Adicionar Imagem</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* File Upload Option */}
              <div className="relative bg-[#0c0a13] border border-white/5 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center group hover:border-purple-500/30 transition-all min-h-[120px] text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                <Upload className="w-8 h-8 text-slate-500 group-hover:text-purple-400 mb-2 transition-colors" />
                <span className="text-xs text-slate-400 font-medium group-hover:text-slate-200">Upload de imagem</span>
                <span className="text-[10px] text-slate-600 mt-1">Selecione um arquivo local (JPG, PNG, WEBP)</span>
              </div>

              {/* Paste URL Option */}
              <div className="hidden sm:flex bg-[#0c0a13] border border-white/5 rounded-2xl p-5 flex-col justify-center min-h-[120px]">
                <span className="text-xs text-slate-400 font-medium mb-2 text-left">Ou cole uma URL de imagem:</span>
                <div className="relative flex">
                  <input
                    type="url"
                    value={imageUrl.startsWith('data:') ? '' : imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://exemplo.com/imagem.jpg"
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
                  />
                  {imageUrl && (
                    <button 
                      type="button" 
                      onClick={() => setImageUrl('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {imageUrl && (
            <div className="rounded-2xl overflow-hidden border border-white/5 mt-4 max-h-60 relative bg-[#0c0a13] flex items-center justify-center">
               <img 
                 src={imageUrl} 
                 alt="Preview" 
                 className="max-h-60 object-contain w-full" 
                 onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/600x400?text=Formato+Invalido'; }} 
                 referrerPolicy="no-referrer"
               />
               <button 
                 type="button"
                 onClick={() => setImageUrl('')}
                 className="absolute top-3 right-3 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors z-20 shadow-lg"
                 title="Remover imagem"
               >
                 <X className="w-4 h-4" />
               </button>
            </div>
          )}

          {currentUser.id === 'user_me' && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-xs text-amber-300 flex items-start gap-2.5">
              <span className="text-base select-none">⚠️</span>
              <div>
                <p className="font-bold">Você está publicando como visitante (sem login)</p>
                <p className="mt-0.5 text-[#eab308]/80 leading-relaxed">
                  Este relato será excluído automaticamente após 24 horas. Para manter seus relatos salvos permanentemente e conseguir salvar outros posts, e-books e fotos, faça login na sua conta!
                </p>
              </div>
            </div>
          )}

          <div className="pt-4 sm:pt-6 flex justify-end">
            <button
              type="submit"
              disabled={!title.trim() || !content.trim()}
              className="w-full sm:w-auto px-8 py-3 sm:py-3.5 bg-purple-600 text-white font-medium rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600 transition-colors shadow-[0_4px_15px_rgba(255,77,109,0.25)] cursor-pointer"
            >
              Publicar Post
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
