import React, { useState } from 'react';
import { X, Upload, Sparkles, LogIn, UserPlus } from 'lucide-react';
import { User } from '../types';
import { isConfigured as isSupabaseConfigured, supabase } from '../utils/supabase';
// @ts-ignore
import guestAvatar from '../../assets/guest_avatar.jpg';

const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUser: User;
  onAuthenticate: (user: User) => void;
  onRegister: (newUser: User) => void;
  onLogout?: () => void;
}

export function AuthModal({ isOpen, onClose, users, currentUser, onAuthenticate, onRegister, onLogout }: AuthModalProps) {
  const [isLoginTab, setIsLoginTab] = useState(true);
  
  // Login State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Register State
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regBio, setRegBio] = useState('');
  const [regAvatar, setRegAvatar] = useState(guestAvatar);
  const [regError, setRegError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setRegAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmitting(true);
    
    const identifier = loginIdentifier.trim();
    
    // Check if the user is typing an email but forgot the '@'
    const isEmailLike = identifier.includes('.com') || identifier.includes('.br') || identifier.includes('gmail') || identifier.includes('hotmail') || identifier.includes('outlook');
    if (isEmailLike && !identifier.includes('@')) {
      setLoginError('Seu e-mail parece estar incompleto (faltando o caractere "@"). Por favor, digite no formato correto (ex: usuario@gmail.com).');
      setIsSubmitting(false);
      return;
    }

    const isEmail = identifier.includes('@') && identifier.includes('.');

    if (isSupabaseConfigured && supabase) {
      // ---------------- ONLINE SUPABASE LOGIN ----------------
      if (!isEmail) {
        setLoginError('Para entrar usando o Supabase, por favor digite o seu e-mail cadastrado (com @) em vez do nome de usuário.');
        setIsSubmitting(false);
        return;
      }

      if (!loginPassword) {
        setLoginError('Por favor, digite a sua senha.');
        setIsSubmitting(false);
        return;
      }

      try {
        // Try authenticating with Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email: identifier,
          password: loginPassword,
        });

        if (error) {
          const isNetworkError = error.message?.toLowerCase().includes('fetch') || error.message?.toLowerCase().includes('network');
          if (!isNetworkError) {
            setLoginError(error.message === 'Invalid login credentials' 
              ? 'E-mail ou senha incorretos. Por favor, verifique seus dados.'
              : error.message);
            setIsSubmitting(false);
            return;
          }
          throw error;
        }

        if (data.user) {
          // Fetch their profile from Profiles
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profileError) throw profileError;

          if (profile) {
            const loggedInUser: User = {
              id: profile.id,
              username: profile.username,
              displayName: profile.display_name || profile.username,
              avatar: profile.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
              bio: profile.bio || '',
              followers: profile.followers || [],
              following: profile.following || [],
              email: data.user.email,
            };
            onAuthenticate(loggedInUser);
            onClose();
            setIsSubmitting(false);
            return;
          }
        }
      } catch (err: any) {
        console.warn("Supabase Auth failed online:", err);
        const isNetworkError = err.message?.toLowerCase().includes('fetch') || err.message?.toLowerCase().includes('network');
        if (!isNetworkError) {
          setLoginError(err.message || 'Erro ao conectar ao Supabase.');
          setIsSubmitting(false);
          return;
        }
        // If it was a network error, let it fall through to local lookup
      }
    }

    // ---------------- OFFLINE DEMO FALLBACK LOGIN ----------------
    const cleanUsername = identifier.toLowerCase().replace('@', '');
    const foundUser = users.find(u => 
      u.username.toLowerCase() === cleanUsername || 
      (u.email && u.email.toLowerCase() === identifier.toLowerCase())
    );
    
    if (foundUser) {
      onAuthenticate(foundUser);
      onClose();
      // reset
      setLoginIdentifier('');
      setLoginPassword('');
    } else {
      setLoginError('Credenciais incorretas ou usuário não encontrado. Digite dados válidos ou crie uma conta.');
    }
    setIsSubmitting(false);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setIsSubmitting(true);

    if (!regDisplayName.trim() || !regUsername.trim() || !regEmail.trim() || !regPassword.trim()) {
      setRegError('Por favor, preencha todos os campos obrigatórios.');
      setIsSubmitting(false);
      return;
    }

    if (!isValidEmail(regEmail.trim())) {
      setRegError('Por favor, digite um e-mail válido (ex: seu_email@exemplo.com) contendo "@" e um domínio.');
      setIsSubmitting(false);
      return;
    }

    const cleanUsername = regUsername.trim().toLowerCase().replace('@', '').replace(/\s+/g, '');
    
    // Check if username is already taken
    const exists = users.some(u => u.username.toLowerCase() === cleanUsername);
    if (exists) {
      setRegError(`O usuário @${cleanUsername} já está sendo utilizado.`);
      setIsSubmitting(false);
      return;
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: existingProfile, error: checkError } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', cleanUsername)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingProfile) {
          setRegError(`O usuário @${cleanUsername} já está sendo utilizado.`);
          setIsSubmitting(false);
          return;
        }
      } catch (err: any) {
        console.warn('Erro ao verificar username no Supabase:', err);
        // If it's a network error, we can ignore and let signUp fail or fallback,
        // but if it's a constraint, we block.
      }
    }

    try {
      let userId = `user_${Date.now()}`;
      
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: regEmail,
          password: regPassword,
          options: {
            data: {
              username: cleanUsername,
              display_name: regDisplayName.trim(),
              avatar_url: regAvatar,
              bio: regBio.trim(),
            }
          }
        });

        if (error) {
          if (error.message.includes('already registered') || error.message.includes('already exists')) {
            setRegError('Este email já está cadastrado. Tente entrar na aba "Entrar".');
            setIsSubmitting(false);
            return;
          }
          throw error;
        }

        if (data.user) {
          userId = data.user.id;
        }
      }

      const newUser: User = {
        id: userId,
        username: cleanUsername,
        displayName: regDisplayName.trim(),
        avatar: regAvatar,
        bio: regBio.trim() || 'Sintonizando minha consciência com novas realidades...',
        followers: [],
        following: [],
        email: regEmail,
        password: regPassword,
      };

      await onRegister(newUser);
      await onAuthenticate(newUser);
      onClose();
      
      // reset form
      setRegEmail('');
      setRegPassword('');
      setRegDisplayName('');
      setRegUsername('');
      setRegBio('');
      setRegAvatar(guestAvatar);
    } catch (err: any) {
      console.warn('Erro no cadastro do Supabase:', err);
      
      const isNetworkError = err.message?.toLowerCase().includes('fetch') || err.message?.toLowerCase().includes('network');
      if (isSupabaseConfigured && !isNetworkError) {
        setRegError(err.message || 'Erro ao criar conta no Supabase.');
        setIsSubmitting(false);
        return;
      }
      
      // Fallback local signup
      const newUser: User = {
        id: `user_${Date.now()}`,
        username: cleanUsername,
        displayName: regDisplayName.trim(),
        avatar: regAvatar,
        bio: regBio.trim() || 'Sintonizando minha consciência com novas realidades...',
        followers: [],
        following: [],
        email: regEmail,
        password: regPassword,
      };
      
      onRegister(newUser);
      onAuthenticate(newUser);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (user: User) => {
    onAuthenticate(user);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
      />

      {/* Content Card */}
      <div className="relative bg-[#15121e] border border-white/5 w-full max-w-[420px] rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[88svh] z-10 animate-in fade-in zoom-in-95 duration-200">
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#3a1a73]/20 to-transparent pointer-events-none"></div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5 relative z-10 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-bold text-white">Minha Conta Shifting</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        {currentUser.id === 'user_me' && (
          <div className="flex border-b border-white/5">
            <button
              onClick={() => { setIsLoginTab(true); setLoginError(''); }}
              className={`flex-1 py-3 text-sm font-semibold transition-all border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
                isLoginTab 
                  ? 'border-purple-500 text-purple-400 bg-purple-500/5' 
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Entrar</span>
            </button>
            <button
              onClick={() => { setIsLoginTab(false); setRegError(''); }}
              className={`flex-1 py-3 text-sm font-semibold transition-all border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
                !isLoginTab 
                  ? 'border-purple-500 text-purple-400 bg-purple-500/5' 
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Cadastrar</span>
            </button>
          </div>
        )}

        {/* Scrollable Form Body */}
         <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {currentUser.id !== 'user_me' ? (
            /* Logged In Status Screen */
            <div className="space-y-6">
              <div className="p-4.5 rounded-2xl bg-purple-950/20 border border-purple-500/10 flex items-center justify-between shadow-inner animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex items-center gap-3">
                  <img src={currentUser.avatar} alt={currentUser.displayName} className="w-10 h-10 rounded-full object-cover bg-slate-800 ring-2 ring-purple-500/20" />
                  <div className="min-w-0">
                    <span className="block text-[13px] font-bold text-white truncate leading-tight">{currentUser.displayName}</span>
                    <span className="block text-[11px] text-slate-500 truncate mt-0.5">@{currentUser.username}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onLogout?.();
                  }}
                  className="text-[11px] font-bold text-red-400 hover:text-red-300 transition-colors bg-red-500/10 hover:bg-red-500/15 px-3 py-1.5 rounded-xl cursor-pointer"
                >
                  Sair da Conta
                </button>
              </div>

              <div className="text-center py-8 px-4 space-y-3 bg-white/[0.01] border border-white/5 rounded-3xl animate-in fade-in zoom-in-95 duration-300">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto text-xl animate-pulse">
                  ✓
                </div>
                <h3 className="text-sm font-bold text-white">Conectado com Sucesso</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Você está autenticado no universo Shifting como <strong>{currentUser.displayName}</strong>. Seus relatos, e-books e progresso estão seguros na nuvem!
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Fechar Janela
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Logged Out / Visitor Forms */
            <>

          {isLoginTab ? (
            /* Login Form */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Usuário ou Email</label>
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="stardust_traveler ou email@exemplo.com"
                  className="w-full bg-[#0c0a13] border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Senha</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Sua senha de shifting"
                  className="w-full bg-[#0c0a13] border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
                />
                <span className="text-[10px] text-slate-500 block mt-1">Opcional para usuários locais de demonstração</span>
              </div>

              {loginError && (
                <p className="text-xs text-red-400 font-medium leading-relaxed bg-red-500/10 p-3 rounded-xl border border-red-500/10">
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800/50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2 shadow-[0_4px_15px_rgba(255,77,109,0.25)] cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{isSubmitting ? 'Entrando...' : 'Entrar no Universo'}</span>
              </button>
            </form>
          ) : (
            /* Register Form */
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center mb-4">
                <div className="relative group w-20 h-20 mb-2">
                  <img 
                    src={regAvatar} 
                    alt="Reg preview" 
                    className="w-20 h-20 rounded-full object-cover bg-slate-800 border border-white/10"
                  />
                  <label className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="w-5 h-5 text-white" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      className="hidden" 
                    />
                  </label>
                </div>
                <span className="text-[10px] text-slate-500">Faça upload de foto ou use o padrão</span>
              </div>

              <div className="p-3 bg-purple-950/20 border border-purple-500/10 rounded-2xl text-[11px] text-purple-300 leading-relaxed mb-4">
                ✨ Crie sua conta personalizada preenchendo os campos abaixo. Seus relatos, e-books e progresso serão vinculados a ela!
              </div>

              {/* Email Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">E-mail de Acesso</label>
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="seu_email@exemplo.com"
                  className="w-full bg-[#0c0a13] border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
                  required
                />
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Senha</label>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Sua senha secreta"
                  className="w-full bg-[#0c0a13] border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
                  required
                />
              </div>

              {/* Display Name Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Nome de Exibição</label>
                <input
                  type="text"
                  value={regDisplayName}
                  onChange={(e) => setRegDisplayName(e.target.value)}
                  placeholder="Ex: Viajante das Estrelas"
                  className="w-full bg-[#0c0a13] border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all"
                  required
                />
              </div>

              {/* Username Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">Nome de usuário único (@)</label>
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="meu_shifter"
                  className="w-full bg-[#0c0a13] border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 font-mono transition-all"
                  required
                />
              </div>

              {/* Bio Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Biografia (Opcional)</label>
                <textarea
                  value={regBio}
                  onChange={(e) => setRegBio(e.target.value)}
                  placeholder="Ex: Viajando por realidades..."
                  rows={2}
                  className="w-full bg-[#0c0a13] border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50 transition-all resize-none"
                />
              </div>

              {regError && (
                <p className="text-xs text-red-400 font-medium leading-relaxed bg-red-500/10 p-3 rounded-xl border border-red-500/10">
                  {regError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800/50 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2 shadow-[0_4px_15px_rgba(255,77,109,0.25)] cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmitting ? 'Criando Conta...' : 'Criar Nova Conta'}</span>
              </button>
            </form>
          )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}
