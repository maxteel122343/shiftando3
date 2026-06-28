import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, Sparkles, Key, AlertCircle, RefreshCw, Trash2, ArrowRight, Compass, Shield, BookOpen, Layers, Zap, Landmark, Coins, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  isConfigured as isSupabaseConfigured,
  getChatMessages,
  saveChatMessage,
  clearChatMessages
} from '../utils/supabase';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

export function AIChatGuide() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // API Configuration state
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem('shifting_user_gemini_key') || atob('QUl6YVN5RFRRLXpBa2ZVazNHc3dURlA5QXlYOU42R2o3c0ctMUNz');
  });
  
  const [model, setModel] = useState(() => {
    return localStorage.getItem('shifting_user_gemini_model') || 'gemini-3.5-flash';
  });

  // API key configuration visibility (Toggled by "devkey123" command on search input)
  const [isDevKeyHidden, setIsDevKeyHidden] = useState(() => {
    const val = localStorage.getItem('shifting_hide_devkey');
    return val === null ? true : val === 'true';
  });

  // Credit limits state
  const [credits, setCredits] = useState<number>(() => {
    const stored = localStorage.getItem('shifting_ai_credits');
    if (stored === null) {
      localStorage.setItem('shifting_ai_credits', '5');
      return 5;
    }
    return Number(stored);
  });
  const [showPixModal, setShowPixModal] = useState(false);
  const [showCreditsTestModal, setShowCreditsTestModal] = useState(false);
  const [testInputValue, setTestInputValue] = useState('');
  const [testInputError, setTestInputError] = useState(false);
  const [selectedPixOption, setSelectedPixOption] = useState<{ credits: number; price: string } | null>(null);
  const [simulatedPixQR, setSimulatedPixQR] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync devkey visibility state when command fires
  useEffect(() => {
    const checkVisibility = () => {
      setIsDevKeyHidden(localStorage.getItem('shifting_hide_devkey') === 'true');
    };
    window.addEventListener('shifting_devkey_visibility_updated', checkVisibility);
    return () => window.removeEventListener('shifting_devkey_visibility_updated', checkVisibility);
  }, []);

  // Load chat history
  useEffect(() => {
    async function loadChatHistory() {
      if (isSupabaseConfigured) {
        setIsLoading(true);
        try {
          const dbMsgs = await getChatMessages();
          if (dbMsgs.length > 0) {
            setMessages(dbMsgs.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              timestamp: new Date(m.timestamp)
            })));
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.warn("Erro ao carregar mensagens do Supabase:", e);
        } finally {
          setIsLoading(false);
        }
      }

      const saved = localStorage.getItem('shifting_chat_messages');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setMessages(parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })));
          return;
        } catch (e) {}
      }

      // Initial welcome message
      setMessages([
        {
          id: 'welcome',
          role: 'model',
          content: 'Olá, Viajante das Realidades! 🌌 Eu sou o seu **Guia de Shifting AI**.\n\nEstou aqui para ajudar você a sintonizar sua consciência com sua Realidade Desejada (DR). \n\nPosso ajudar você a:\n- ✨ Criar ou refinar o seu **Script** (detalhes da sua DR, regras, clone, safe-word);\n- 🧘 Escolher e aplicar o melhor **Método de Shifting** para você (Raven, Julia, Alice, Travesseiro, etc.);\n- 🌟 Superar bloqueios, analisar sintomas de shifting e tirar dúvidas com segurança.\n\nComo está sua jornada de shifting hoje? Deseja criar um script ou tentar um novo método?',
          timestamp: new Date(),
        }
      ]);
    }
    loadChatHistory();
  }, []);

  // Save messages to local storage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('shifting_chat_messages', JSON.stringify(messages));
    }
  }, [messages]);

  // Save API Config to local storage
  useEffect(() => {
    localStorage.setItem('shifting_user_gemini_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem('shifting_user_gemini_model', model);
  }, [model]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Suggestions
  const suggestions = [
    { text: '📝 Me ajude a fazer meu Script', icon: BookOpen },
    { text: '🌀 Qual o melhor método para mim?', icon: Compass },
    { text: '💤 Como usar o Método Raven?', icon: Layers },
    { text: '🛡️ Como criar uma safe-word segura?', icon: Shield },
    { text: '✨ Quais os sintomas comuns do Shifting?', icon: Zap },
  ];

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    // Check credits before sending
    if (credits <= 0) {
      setShowCreditsTestModal(true);
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    // Decrement credits and store
    const nextCredits = credits - 1;
    setCredits(nextCredits);
    localStorage.setItem('shifting_ai_credits', String(nextCredits));

    if (isSupabaseConfigured) {
      await saveChatMessage({
        id: userMsg.id,
        role: userMsg.role,
        content: userMsg.content,
        timestamp: userMsg.timestamp.toISOString()
      });
    }

    try {
      const systemInstruction = 
        "Você é o 'Guia de Shifting AI', um assistente virtual acolhedor, místico, empático e extremamente experiente em Reality Shifting. " +
        "Seu papel é orientar entusiastas que querem mudar sua consciência para suas Realidades Desejadas (DR). " +
        "Ajude a redigir 'Scripts' estruturados e a tirar dúvidas com segurança. " +
        "Use formatação Markdown elegante. Responda em português.";

      const chatHistory = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.role === 'model' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

      chatHistory.push({
        role: 'user',
        parts: [{ text: textToSend }]
      });

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: chatHistory,
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            topK: 40,
          }
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Erro da API Gemini (Status ${response.status})`);
      }

      const resData = await response.json();
      const aiResponseText = resData?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!aiResponseText) {
        throw new Error('Não foi possível obter resposta do modelo.');
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: aiResponseText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);

      if (isSupabaseConfigured) {
        await saveChatMessage({
          id: botMsg.id,
          role: botMsg.role,
          content: botMsg.content,
          timestamp: botMsg.timestamp.toISOString()
        });
      }
    } catch (error: any) {
      console.warn('Shifting AI Error:', error);
      const botMsgError: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: `⚠️ **Ops! Encontrei um obstáculo de energia:**\n\n${error?.message || 'Houve um erro ao sintonizar com a inteligência artificial.'}\n\n*Dica: Verifique se sua chave de API está correta ou altere o modelo nas configurações acima.*`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsgError]);

      if (isSupabaseConfigured) {
        await saveChatMessage({
          id: botMsgError.id,
          role: botMsgError.role,
          content: botMsgError.content,
          timestamp: botMsgError.timestamp.toISOString()
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (window.confirm('Deseja limpar todo o histórico de conversa com o Guia de Shifting?')) {
      const welcomeMsg: Message = {
        id: 'welcome',
        role: 'model',
        content: 'Olá, Viajante das Realidades! 🌌 Eu sou o seu **Guia de Shifting AI**.\n\nHistórico limpo com sucesso! Como posso te ajudar na sintonização agora?',
        timestamp: new Date(),
      };
      setMessages([welcomeMsg]);

      if (isSupabaseConfigured) {
        try {
          await clearChatMessages();
          await saveChatMessage({
            id: welcomeMsg.id,
            role: welcomeMsg.role,
            content: welcomeMsg.content,
            timestamp: welcomeMsg.timestamp.toISOString()
          });
        } catch (e) {
          console.warn("Erro ao limpar mensagens no Supabase:", e);
        }
      }
    }
  };

  const handleResetToDefaultKey = () => {
    setApiKey(atob('QUl6YVN5RFRRLXpBa2ZVazNHc3dURlA5QXlYOU42R2o3c0ctMUNz'));
    setModel('gemini-3.5-flash');
    alert('Chave padrão e modelo redefinidos com sucesso!');
  };

  const triggerPixSimulation = (option: { credits: number; price: string }) => {
    setSelectedPixOption(option);
    // Simulates generating a random Pix payload string
    const randomHash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setSimulatedPixQR(`00020101021126360014br.gov.bcb.pix0114desirereality${randomHash}5204000053039865802BR5914DesireReality6008SaoPaulo62070503***6304`);
  };

  const handleConfirmPixPayment = () => {
    if (!selectedPixOption) return;
    const currentCredits = Number(localStorage.getItem('shifting_ai_credits') || '0');
    const newTotal = currentCredits + selectedPixOption.credits;
    setCredits(newTotal);
    localStorage.setItem('shifting_ai_credits', String(newTotal));
    setShowPixModal(false);
    setSelectedPixOption(null);
    setSimulatedPixQR(null);
    alert(`Pagamento simulado com sucesso! ${selectedPixOption.credits} créditos foram adicionados à sua conta. ✨`);
  };

  const handleRedeemTestCredits = () => {
    if (testInputValue.trim() === '+5 creditos para mim') {
      const nextCredits = credits + 5;
      setCredits(nextCredits);
      localStorage.setItem('shifting_ai_credits', String(nextCredits));
      setShowCreditsTestModal(false);
      setTestInputValue('');
      setTestInputError(false);
      alert('✨ 5 créditos foram adicionados com sucesso!');
    } else {
      setTestInputError(true);
    }
  };

  return (
    <div className="w-full py-8 px-4 relative z-10 flex flex-col min-h-[calc(100vh-80px)]">
      {/* Heading */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 px-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bot className="w-6 h-6 text-purple-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Guia de Shifting AI</h1>
          </div>
          <p className="text-xs text-slate-400">
            Converse sobre Desired Reality, scripts, sintomas e prepare sua mente para o Shifting.
          </p>
        </div>

        {/* Live Pulse Badge, Credits and Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Credits Badge */}
          <button 
            onClick={() => setShowPixModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold transition-all hover:bg-amber-500/20 cursor-pointer"
          >
            <Coins className="w-3.5 h-3.5" />
            <span>{credits} créditos</span>
          </button>

          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold select-none shadow-[0_0_15px_rgba(16,185,129,0.1)]"
            title="A Inteligência Artificial está sintonizada e pronta"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="tracking-wide animate-pulse uppercase text-[10px]">IA Ativa</span>
          </div>

          {/* Key icon button (Conditionally hidden based on isDevKeyHidden) */}
          {!isDevKeyHidden && (
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                showConfig 
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-[0_0_15px_rgba(126,58,242,0.2)]' 
                  : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white'
              }`}
              title="Configurações da Chave Gemini"
            >
              <Key className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleClearChat}
            className="p-2 rounded-xl bg-white/5 text-slate-400 border border-white/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all cursor-pointer"
            title="Limpar Conversa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Gemini Settings Box */}
      {showConfig && !isDevKeyHidden && (
        <div className="mb-6 p-4 rounded-3xl bg-[#14121f] border border-white/5 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Key className="w-4 h-4 text-purple-400" />
            Chave Gemini do Usuário (Local)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Chave API Gemini</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Insira sua API Key do Google AI Studio"
                className="w-full bg-[#0a0810] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Modelo Selecionado</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-[#0a0810] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="gemini-3.5-flash">gemini-3.5-flash (Recomendado)</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro (Mais inteligente, lento)</option>
                <option value="gemini-1.5-flash">gemini-1.5-flash (Legado)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2.5 pt-1">
            <button
              onClick={handleResetToDefaultKey}
              className="text-[10px] font-semibold text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Redefinir para Chave Padrão
            </button>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 bg-[#100e19]/60 border border-white/5 rounded-[28px] overflow-hidden flex flex-col min-h-[400px]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
          {messages.map((m) => {
            const isModel = m.role === 'model';
            return (
              <div
                key={m.id}
                className={`flex gap-3 max-w-[85%] ${isModel ? 'self-start' : 'self-end flex-row-reverse'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                    isModel 
                      ? 'bg-purple-950/40 text-purple-400 border-purple-500/10 shadow-[0_0_10px_rgba(126,58,242,0.1)]' 
                      : 'bg-white/5 text-slate-300 border-white/5'
                  }`}
                >
                  {isModel ? <Bot className="w-4 h-4" /> : <span className="text-[10px] font-bold">CR</span>}
                </div>
                {/* Bubble */}
                <div
                  className={`p-4 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap border ${
                    isModel 
                      ? 'bg-[#14121f] text-slate-300 border-white/[0.04]' 
                      : 'bg-gradient-to-r from-purple-600/90 to-purple-500/90 text-white border-purple-500/10 shadow-[0_4px_15px_rgba(126,58,242,0.15)]'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex gap-3 max-w-[80%] self-start">
              <div className="w-8 h-8 rounded-full bg-purple-950/40 text-purple-400 border border-purple-500/10 flex items-center justify-center shrink-0 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-3xl bg-[#14121f] border border-white/[0.04] text-slate-400 text-xs font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                Sintonizando ondas mentais...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {messages.length === 1 && !isLoading && (
          <div className="p-4 border-t border-white/5 bg-white/[0.01]">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 px-2">Sugestões de sintonia</span>
            <div className="flex flex-wrap gap-2 px-2">
              {suggestions.map((s) => (
                <button
                  key={s.text}
                  onClick={() => handleSendMessage(s.text.replace(/^[^\s]+\s/, ''))}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-white/5 bg-white/[0.02] text-xs text-slate-400 hover:text-white hover:bg-purple-600/10 hover:border-purple-500/20 transition-all cursor-pointer font-medium"
                >
                  <s.icon className="w-3.5 h-3.5 text-purple-400" />
                  <span>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputMessage);
          }}
          className="p-4 border-t border-white/5 flex gap-3 bg-[#0d0b14]"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={credits <= 0 ? "Você não tem créditos. Clique em recarregar acima." : "Escreva seu script, dúvida ou método..."}
            disabled={isLoading || credits <= 0}
            className="flex-1 bg-[#14121f] border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading || credits <= 0}
            className="p-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_4px_15px_rgba(255,77,109,0.3)] disabled:opacity-50 disabled:scale-100 disabled:shadow-none shrink-0 cursor-pointer"
            title="Enviar Mensagem"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Pix Refill Modal */}
      {showPixModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[#100d1a] border border-white/10 rounded-[32px] w-full max-w-[420px] p-6 relative overflow-hidden shadow-[0_10px_50px_rgba(124,58,237,0.3)]">
            <button 
              onClick={() => {
                setShowPixModal(false);
                setSelectedPixOption(null);
                setSimulatedPixQR(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Coins className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Recarregar Créditos de IA</h3>
                <p className="text-[10px] text-slate-500">Adquira mais consultas com o Guia de Shifting</p>
              </div>
            </div>

            {!selectedPixOption ? (
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-400 leading-relaxed">
                  🔮 <strong>Taxa padrão:</strong> R$ 1,00 rende **2 créditos** de consulta. Selecione um pacote acelerado abaixo:
                </div>
                
                {[
                  { credits: 10, price: '5,00', save: 'R$ 1 = 2 creds' },
                  { credits: 20, price: '9,90', save: 'Economize R$ 0,10' },
                  { credits: 50, price: '20,00', save: 'Melhor Valor!' },
                ].map((opt) => (
                  <button
                    key={opt.credits}
                    onClick={() => triggerPixSimulation(opt)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#171424] border border-white/5 hover:border-purple-500/40 hover:bg-[#1f1a30] transition-all cursor-pointer group text-left"
                  >
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">{opt.credits} Créditos</div>
                      <div className="text-[9px] text-slate-500">{opt.save}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-purple-400">R$ {opt.price}</div>
                      <div className="text-[9px] text-slate-500">Pagamento Pix</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col items-center">
                  <div className="text-xs text-slate-400 mb-1">Pagamento via Pix para:</div>
                  <div className="text-sm font-bold text-purple-400 mb-3">{selectedPixOption.credits} Créditos por R$ {selectedPixOption.price}</div>
                  
                  {/* Mock QR Code representation */}
                  <div className="w-40 h-40 bg-white p-2 rounded-xl mb-3 flex flex-col items-center justify-center relative border-4 border-purple-500/20">
                    <div className="grid grid-cols-5 grid-rows-5 gap-1.5 w-full h-full opacity-90">
                      {Array.from({ length: 25 }).map((_, i) => (
                        <div 
                          key={i} 
                          className={`rounded-sm ${(i * 7 + 13) % 2 === 0 || i === 0 || i === 4 || i === 20 || i === 24 ? 'bg-slate-900' : 'bg-transparent'}`} 
                        />
                      ))}
                    </div>
                    <Landmark className="w-8 h-8 text-purple-600 absolute bg-white p-1 rounded-lg" />
                  </div>

                  <span className="text-[9px] text-slate-500 font-mono break-all max-h-12 overflow-hidden px-4 text-ellipsis">
                    {simulatedPixQR}
                  </span>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setSelectedPixOption(null);
                      setSimulatedPixQR(null);
                    }}
                    className="flex-1 py-3 rounded-2xl bg-white/5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleConfirmPixPayment}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-xs font-bold text-white transition-colors shadow-lg shadow-purple-500/20 cursor-pointer"
                  >
                    Confirmar Pix
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Credits Test Modal */}
      {showCreditsTestModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-[#100d1a] border border-white/10 rounded-[32px] w-full max-w-[420px] p-6 relative overflow-hidden shadow-[0_10px_50px_rgba(124,58,237,0.3)] animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => {
                setShowCreditsTestModal(false);
                setTestInputValue('');
                setTestInputError(false);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Coins className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Seus créditos acabaram!</h3>
                <p className="text-[10px] text-slate-500">Faça o teste de validação para resgatar mais créditos</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-xs text-slate-300 leading-relaxed text-left">
                Para confirmar que você está utilizando ativamente o Guia de Shifting, digite exatamente a frase abaixo no campo de texto:
                <div className="mt-3 p-3 bg-[#0a0810] border border-white/10 rounded-xl text-center font-bold text-purple-400 select-all selection:bg-purple-500/30 selection:text-white font-mono tracking-wide">
                  +5 creditos para mim
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={testInputValue}
                  onChange={(e) => {
                    setTestInputValue(e.target.value);
                    if (testInputError) setTestInputError(false);
                  }}
                  placeholder="Digite a frase aqui..."
                  className={`w-full bg-[#14121f] border ${testInputError ? 'border-rose-500/50 focus:ring-rose-500' : 'border-white/5 focus:ring-purple-500'} rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:border-transparent transition-all`}
                />
                {testInputError && (
                  <p className="text-[10px] text-rose-400 mt-1.5 text-left font-medium">
                    ⚠️ A frase digitada está incorreta. Digite exatamente "+5 creditos para mim".
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCreditsTestModal(false);
                    setTestInputValue('');
                    setTestInputError(false);
                  }}
                  className="flex-1 py-3 rounded-2xl bg-white/5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRedeemTestCredits}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-xs font-bold text-white transition-colors shadow-lg shadow-purple-500/20 cursor-pointer"
                >
                  Resgatar Créditos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
