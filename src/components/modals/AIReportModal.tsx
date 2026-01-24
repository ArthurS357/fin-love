'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Bot, User, RefreshCw, Trash2, Settings2, AlertCircle } from 'lucide-react';
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
  role: 'user' | 'model';
  message: string;
  createdAt: Date;
}

export default function AIReportModal({ isOpen, onClose, userName }: AIReportModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [tone, setTone] = useState('FRIENDLY');
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Carregar histórico ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  // Scroll automático para a última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  async function loadHistory() {
    try {
      const history = await getAiHistoryAction('GENERAL');
      const formatted: Message[] = history.map((h: any) => ({
        id: h.id,
        role: h.role as 'user' | 'model',
        message: h.message,
        createdAt: new Date(h.createdAt)
      }));
      setMessages(formatted);
    } catch (error) {
      console.error("Erro ao carregar histórico", error);
      toast.error("Não foi possível carregar o histórico de mensagens.");
    }
  }

  const handleGenerate = async () => {
    setLoading(true);
    setError(false);

    // Adiciona mensagem do usuário visualmente
    const userMsg: Message = {
      id: Math.random().toString(),
      role: 'user',
      message: 'Gere uma análise detalhada da minha vida financeira atual.',
      createdAt: new Date()
    };

    setMessages(prev => [...prev, userMsg]);

    try {
      // Chama a Action que agora utiliza o Gemini 2.0 e busca dados do Prisma
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
        setError(true);
        toast.error(res.error || "A IA não conseguiu processar os dados.");
        // Remove a última mensagem do usuário se falhar para não poluir
        setMessages(prev => prev.slice(0, -1));
      }
    } catch (err) {
      setError(true);
      toast.error("Erro de conexão com o servidor.");
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (messages.length === 0) return;
    const confirmClear = window.confirm("Tens a certeza que queres apagar todo o histórico de análises?");
    if (!confirmClear) return;

    setLoading(true);
    try {
      const res = await clearAiHistoryAction('GENERAL');
      if (res.success) {
        setMessages([]);
        toast.success("Histórico limpo com sucesso.");
      } else {
        toast.error("Erro ao apagar histórico.");
      }
    } catch (error) {
      toast.error("Erro ao processar solicitação.");
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

        {/* Glow de fundo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col border-b border-white/5 bg-[#1f1630]/80 backdrop-blur-md z-10 shadow-sm">
          <div className="flex justify-between items-center p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-xl">
                <Sparkles className="text-purple-400" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white leading-tight">Consultor FinLove</h3>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-400">Powered by Gemini 2.0</p>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-purple-300 border border-purple-500/20">
                    {tones.find(t => t.id === tone)?.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-full transition-all ${showSettings ? 'bg-purple-500 text-white' : 'text-gray-400 hover:bg-white/10'}`}
                title="Personalidade da IA"
              >
                <Settings2 size={18} />
              </button>

              {messages.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  disabled={loading}
                  className="text-gray-400 hover:text-red-400 transition p-2 hover:bg-red-500/10 rounded-full disabled:opacity-50"
                >
                  <Trash2 size={18} />
                </button>
              )}

              <button onClick={onClose} className="text-gray-400 hover:text-white transition p-2 hover:bg-white/10 rounded-full">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Settings/Tone Selector */}
          {showSettings && (
            <div className="px-5 pb-4 animate-in slide-in-from-top-2 duration-200">
              <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">Como deseja ser atendido?</p>
              <div className="flex gap-2">
                {tones.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setTone(t.id); setShowSettings(false); }}
                    className={`flex-1 flex flex-col items-center py-2 rounded-xl text-xs font-medium border transition-all ${tone === t.id
                      ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-900/40'
                      : 'bg-[#2a2438] border-white/5 text-gray-400 hover:bg-white/5 hover:border-white/10'
                      }`}
                  >
                    <span className="text-lg mb-0.5">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 relative z-0 bg-[#160e20]/30">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
              <div className="w-20 h-20 bg-purple-500/10 rounded-3xl flex items-center justify-center animate-pulse">
                <Bot size={40} className="text-purple-400" />
              </div>
              <div className="space-y-2">
                <p className="text-white font-medium">Olá, {userName}!</p>
                <p className="text-sm text-gray-400 max-w-[280px]">
                  Estou pronto para analisar seus gastos, investimentos e metas. Como posso te ajudar hoje?
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-in slide-in-from-bottom-2`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${isUser ? 'bg-indigo-600' : 'bg-purple-600'}`}>
                  {isUser ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
                </div>
                <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${isUser
                    ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-50'
                    : 'bg-[#2a2438] border border-white/5 text-gray-200'
                  }`}>
                  {isUser ? (
                    <p>{msg.message}</p>
                  ) : (
                    <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-black/30">
                      <ReactMarkdown>{msg.message}</ReactMarkdown>
                    </div>
                  )}
                  <p className={`text-[10px] mt-2 opacity-40 ${isUser ? 'text-right' : 'text-left'}`}>
                    {msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-4 animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-purple-600/50 flex items-center justify-center shadow-inner">
                <Bot size={16} className="text-white/50" />
              </div>
              <div className="bg-[#2a2438] border border-white/5 rounded-2xl p-4 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce"></span>
                </div>
                <span className="text-xs text-gray-400 font-medium">Analisando dados...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs mx-auto max-w-fit">
              <AlertCircle size={14} />
              Houve um problema. Tente novamente em instantes.
            </div>
          )}

          <div ref={scrollRef} className="h-2" />
        </div>

        {/* Footer/Action */}
        <div className="p-6 border-t border-white/5 bg-[#130b20] z-10 flex flex-col items-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className={`w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-semibold text-sm transition-all shadow-xl shadow-purple-900/20 ${loading
                ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white active:scale-[0.98]'
              }`}
          >
            {loading ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {messages.length > 0 ? 'Atualizar Análise Financeira' : 'Gerar Meu Relatório com IA'}
          </button>
          <p className="text-[10px] text-gray-500 uppercase tracking-tighter">
            A IA pode cometer erros. Revise informações importantes.
          </p>
        </div>
      </div>
    </div>
  );
}