'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Bot, User, RefreshCw, Trash2, Settings2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateFinancialAdviceAction, getAiHistoryAction, clearAiHistoryAction } from '@/app/actions';
import { toast } from 'sonner';

interface AIReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

interface Message {
  id: string;
  role: string;
  message: string;
  createdAt: Date;
}

export default function AIReportModal({ isOpen, onClose, userName }: AIReportModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [tone, setTone] = useState('FRIENDLY'); // Estado para o tom da IA
  const [showSettings, setShowSettings] = useState(false); // Toggle do menu de configurações
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  async function loadHistory() {
    try {
      const history = await getAiHistoryAction('GENERAL');
      const formatted = history.map((h: any) => ({
        id: h.id,
        role: h.role,
        message: h.message,
        createdAt: new Date(h.createdAt)
      }));
      setMessages(formatted);
    } catch (error) {
      console.error("Erro ao carregar histórico", error);
    }
  }

  const handleGenerate = async () => {
    setLoading(true);
    const tempId = Math.random().toString();
    const userMsg: Message = {
      id: tempId,
      role: 'user',
      message: 'Gere uma nova análise para mim.',
      createdAt: new Date()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      // Passamos o 'tone' escolhido para a ação
      const res = await generateFinancialAdviceAction(tone);

      if (res.success && res.message) {
        const aiMsg: Message = {
          id: Math.random().toString(),
          role: 'model',
          message: res.message,
          createdAt: new Date()
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        toast.error("Não foi possível gerar a análise.");
      }
    } catch (err) {
      toast.error("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (messages.length === 0) return;
    const confirm = window.confirm("Tens a certeza que queres apagar todo o histórico?");
    if (!confirm) return;

    setLoading(true);
    try {
      const res = await clearAiHistoryAction('GENERAL');
      if (res.success) {
        setMessages([]);
        toast.success("Histórico apagado.");
      } else {
        toast.error("Erro ao apagar histórico.");
      }
    } catch (error) {
      toast.error("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  const tones = [
    { id: 'FRIENDLY', label: 'Amigo', icon: '😊' },
    { id: 'STRICT', label: 'Auditor', icon: '🧐' },
    { id: 'COACH', label: 'Coach', icon: '🚀' },
    { id: 'POETIC', label: 'Poeta', icon: '📜' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#1a1025] w-full max-w-2xl h-[85vh] rounded-3xl border border-purple-500/20 shadow-2xl relative overflow-hidden flex flex-col">

        {/* Fundo Decorativo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Header Personalizado */}
        <div className="flex flex-col border-b border-white/5 bg-[#1f1630]/80 backdrop-blur-md z-10">
          <div className="flex justify-between items-center p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-xl">
                <Sparkles className="text-purple-400" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white leading-tight">Consultor FinLove</h3>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-400">IA Inteligente</p>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-300 border border-white/5">
                    {tones.find(t => t.id === tone)?.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-full transition ${showSettings ? 'bg-purple-500 text-white' : 'text-gray-400 hover:bg-white/10'}`}
                title="Personalidade da IA"
              >
                <Settings2 size={18} />
              </button>

              {messages.length > 0 && (
                <button onClick={handleClearHistory} className="text-gray-400 hover:text-red-400 transition p-2 hover:bg-red-500/10 rounded-full">
                  <Trash2 size={18} />
                </button>
              )}

              <button onClick={onClose} className="text-gray-400 hover:text-white transition p-2 hover:bg-white/10 rounded-full">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Menu de Configuração de Personalidade */}
          {showSettings && (
            <div className="px-5 pb-4 animate-in slide-in-from-top-2">
              <p className="text-xs text-gray-400 mb-2 font-medium">Escolha a personalidade:</p>
              <div className="flex gap-2">
                {tones.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setTone(t.id); setShowSettings(false); }}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${tone === t.id
                        ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/50'
                        : 'bg-[#2a2438] border-white/5 text-gray-400 hover:bg-white/5'
                      }`}
                  >
                    <span className="block text-base mb-1">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 relative z-0">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-60">
              <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mb-4">
                <Bot size={40} className="text-purple-400" />
              </div>
              <p className="text-sm text-gray-400 max-w-xs">
                Escolha uma personalidade nas configurações e inicie uma análise!
              </p>
            </div>
          )}

          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${isUser ? 'bg-blue-600' : 'bg-purple-600'}`}>
                  {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
                </div>
                <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-lg ${isUser ? 'bg-blue-600/20 border border-blue-500/20 text-blue-100' : 'bg-[#2a2438] border border-white/5 text-gray-200'}`}>
                  {isUser ? <p>{msg.message}</p> : <div className="prose prose-invert prose-sm max-w-none"><ReactMarkdown>{msg.message}</ReactMarkdown></div>}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-600 animate-pulse flex items-center justify-center"><Bot size={14} className="text-white" /></div>
              <div className="bg-[#2a2438] border border-white/5 rounded-2xl p-4"><span className="text-xs text-gray-400">Digitando...</span></div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        <div className="p-4 border-t border-white/5 bg-[#130b20] z-10 flex justify-center">
          <button onClick={handleGenerate} disabled={loading} className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all ${loading ? 'bg-white/5 text-gray-500' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}>
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {messages.length > 0 ? 'Gerar Nova Análise' : 'Iniciar Análise'}
          </button>
        </div>
      </div>
    </div>
  );
}