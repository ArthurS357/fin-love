'use client'

import { useState, useEffect } from 'react';
import { X, Sparkles, Lightbulb, Bot } from 'lucide-react';
import { generateFinancialAdviceAction } from '@/app/actions';

interface AIReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

export default function AIReportModal({ isOpen, onClose, userName }: AIReportModalProps) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !report) {
      handleGenerate();
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    setLoading(true);
    const res = await generateFinancialAdviceAction();
    if (res.success && res.message) {
      setReport(res.message);
    } else {
      setReport("Não consegui analisar os teus dados agora. Tenta adicionar mais transações!");
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#1a1025] w-full max-w-lg rounded-3xl border border-purple-500/30 shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Fundo Decorativo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-white/5 bg-[#1f1630]">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="text-yellow-400" size={20} /> Consultor FinLove
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition p-2 hover:bg-white/10 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 animate-pulse" />
                <Bot size={48} className="text-purple-400 animate-bounce" />
              </div>
              <p className="text-gray-400 animate-pulse text-sm">A analisar as tuas finanças...</p>
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              {/* Renderização simples de Markdown (podes melhorar com react-markdown depois) */}
              <div className="whitespace-pre-wrap text-gray-200 leading-relaxed font-sans">
                {report?.split('**').map((part, i) => 
                  i % 2 === 1 ? <span key={i} className="text-purple-300 font-bold">{part}</span> : part
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && (
          <div className="p-4 border-t border-white/5 bg-[#130b20] flex justify-end">
            <button 
              onClick={handleGenerate}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition"
            >
              <Lightbulb size={14} /> Gerar nova análise
            </button>
          </div>
        )}
      </div>
    </div>
  );
}