import React, { useState } from 'react';
import { X, Check, Copy, Sparkles, CreditCard, ShieldCheck } from 'lucide-react';
import { EBook } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface EBookPurchaseModalProps {
  ebook: EBook;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EBookPurchaseModal({ ebook, isOpen, onClose, onSuccess }: EBookPurchaseModalProps) {
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const pixKey = `00020126580014BR.GOV.BCB.PIX0136shiftinglibrary-${ebook.id}-key-9995204000053039865405${(ebook.price || 9.9).toFixed(2)}5802BR5916Shifting Platform6009SAO PAULO62070503***6304`;

  const handleCopyKey = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSimulatePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    }, 1800);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/95 backdrop-blur-md"
        />

        {/* Content Container */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="relative bg-[#110e19] border border-white/10 w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl flex flex-col z-10 p-6 text-left"
        >
          {/* Subtle glowing backgrounds */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none"></div>

          {/* Header */}
          <div className="flex justify-between items-center pb-4 border-b border-white/5 mb-5 relative z-10">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-500/10 rounded-xl text-purple-400">
                <CreditCard className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Adquirir E-Book</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-bounce">
                <Check className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">Pagamento Confirmado!</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  O acesso ao e-book foi liberado com sucesso. Boa leitura no Universo de Shifting! 🌌✨
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* EBook Details Row */}
              <div className="flex gap-4 bg-white/5 p-3 rounded-2xl border border-white/5">
                <img
                  src={ebook.coverImage}
                  alt={ebook.title}
                  className="w-16 h-24 object-cover rounded-xl shadow-md border border-white/10"
                />
                <div className="flex flex-col justify-center min-w-0">
                  <span className="text-[10px] font-mono text-purple-400 font-bold uppercase tracking-wider">
                    {ebook.authorName || 'BIBLIOTECA'}
                  </span>
                  <h4 className="text-sm font-bold text-white truncate leading-tight mt-0.5">
                    {ebook.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                    {ebook.description}
                  </p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/25 text-purple-300 font-bold text-xs w-fit font-mono">
                    R$ {(ebook.price || 9.9).toFixed(2).replace('.', ',')}
                  </div>
                </div>
              </div>

              {/* QR Code and PIX Details */}
              <div className="flex flex-col sm:flex-row items-center gap-5 bg-black/30 p-4 rounded-2xl border border-white/5">
                {/* Simulated QR Code Canvas/SVG */}
                <div className="w-32 h-32 bg-white p-2 rounded-xl flex items-center justify-center shrink-0 relative shadow-inner">
                  {/* Styled Grid resembling a complex QR code */}
                  <div className="w-full h-full grid grid-cols-8 gap-0.5 opacity-90">
                    {Array.from({ length: 64 }).map((_, i) => {
                      // Anchor patterns on corners
                      const isCorner =
                        (i < 3 && i % 8 < 3) || // top-left
                        (i < 3 && i % 8 >= 5) || // top-right
                        (i >= 40 && i % 8 < 3); // bottom-left
                      const isRandomActive = Math.random() > 0.45;
                      return (
                        <div
                          key={i}
                          className={`rounded-sm transition-colors ${
                            isCorner 
                              ? 'bg-[#110e19]' 
                              : isRandomActive 
                                ? 'bg-[#110e19]' 
                                : 'bg-transparent'
                          }`}
                        />
                      );
                    })}
                  </div>
                  {/* QR Logo Overlay */}
                  <div className="absolute inset-0 m-auto w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white border-2 border-white shadow">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <div>
                    <span className="text-[10px] font-mono font-semibold text-emerald-400 uppercase tracking-widest flex items-center gap-1 justify-center sm:justify-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      PIX Gerado Automaticamente
                    </span>
                    <h5 className="text-xs font-bold text-slate-300 mt-1">Escaneie o código PIX acima</h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Abra o aplicativo de pagamentos do seu banco e aponte a câmera para o QR Code.
                    </p>
                  </div>

                  {/* Copy button */}
                  <button
                    onClick={handleCopyKey}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer mx-auto sm:mx-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied ? 'Copiado!' : 'Copiar Chave Copia e Cola'}</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2.5">
                <button
                  onClick={handleSimulatePayment}
                  disabled={isProcessing}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-[0_4px_15px_rgba(255,77,109,0.3)] hover:shadow-[0_4px_20px_rgba(255,77,109,0.45)] disabled:opacity-50 disabled:pointer-events-none text-xs uppercase tracking-wide flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verificando Pagamento no Banco Central...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Simular Pagamento</span>
                    </>
                  )}
                </button>
                <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Ambiente de testes 100% seguro. Nenhuma cobrança real será feita.</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
