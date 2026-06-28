import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { EBook } from "../types";
import { MOCK_EBOOKS } from "../data/ebooks";
import { EBookReader } from "./EBookReader";
import { BookOpen } from "lucide-react";

export function EBookPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ebook, setEbook] = useState<EBook | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let found: EBook | undefined;

    const stored = localStorage.getItem("shifting_ebooks");
    if (stored) {
      try {
        const customList: EBook[] = JSON.parse(stored);
        found = customList.find((b) => b.id === id);
      } catch (e) {
        console.error(e);
      }
    }

    if (!found) {
      found = MOCK_EBOOKS.find((b) => b.id === id);
    }

    setEbook(found ?? null);
    setLoading(false);
  }, [id]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#0c0a13] flex items-center justify-center z-[9999]">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-mono tracking-widest uppercase">Carregando E-Book...</p>
        </div>
      </div>
    );
  }

  if (!ebook) {
    return (
      <div className="fixed inset-0 bg-[#0c0a13] flex items-center justify-center z-[9999]">
        <div className="flex flex-col items-center gap-6 text-center px-6 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-xl mb-2">E-Book não encontrado</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Este link pode estar desatualizado ou o e-book foi removido pelo autor.
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer"
          >
            Voltar ao Feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <EBookReader
      ebook={ebook}
      onClose={() => navigate("/")}
      isPurchased={true}
    />
  );
}
