'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Bot, User, RefreshCw, Trash2 } from 'lucide-react';
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
  const scrollRef = useRef<HTMLDivElement>(null);

  // Carrega histórico ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  // Rola para o fim sempre que chegar nova mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  async function loadHistory() {
    try {
      const history = await getAiHistoryAction('GENERAL');

      // Formata os dados vindos do banco para o estado local
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

    // Adiciona uma mensagem "fake" do usuário para dar feedback visual imediato
    const tempId = Math.random().toString();
    const userMsg: Message = {
      id: tempId,
      role: 'user',
      message: 'Por favor, gere uma nova análise baseada nas minhas transações recentes.',
      createdAt: new Date()
    };

    setMessages(prev => [...prev, userMsg]);

    try {
      // Chama a Server Action
      const res = await generateFinancialAdviceAction();

      if (res.success && res.message) {
        // A IA respondeu
        const aiMsg: Message = {
          id: Math.random().toString(),
          role: 'model', // ou 'assistant'
          message: res.message,
          createdAt: new Date()
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        toast.error("Não foi possível gerar a análise no momento.");
      }
    } catch (err) {
      toast.error("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (messages.length === 0) return;

    const confirm = window.confirm("Tens a certeza que queres apagar todo o histórico de conversas?");
    if (!confirm) return;

    setLoading(true);
    try {
      const res = await clearAiHistoryAction('GENERAL');
      if (res.success) {
        setMessages([]); // Limpa visualmente imediatamente
        toast.success("Histórico apagado com sucesso.");
      } else {
        toast.error("Erro ao apagar histórico.");
      }
    } catch (error) {
      toast.error("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#1a1025] w-full max-w-2xl h-[85vh] rounded-3xl border border-purple-500/20 shadow-2xl relative overflow-hidden flex flex-col">

        {/* Fundo Decorativo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-white/5 bg-[#1f1630]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-xl">
              <Sparkles className="text-purple-400" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">Consultor FinLove</h3>
              <p className="text-xs text-gray-400">Histórico de Inteligência Artificial</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão de Limpar Histórico */}
            {messages.length > 0 && (
              <button
                onClick={handleClearHistory}
                disabled={loading}
                className="text-gray-400 hover:text-red-400 transition p-2 hover:bg-red-500/10 rounded-full"
                title="Limpar Histórico"
              >
                <Trash2 size={18} />
              </button>
            )}

            {/* Botão Fechar */}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition p-2 hover:bg-white/10 rounded-full"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Área de Chat (Scrollável) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6 relative z-0">

          {/* Estado Vazio (Sem mensagens) */}
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-60">
              <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mb-4">
                <Bot size={40} className="text-purple-400" />
              </div>
              <h4 className="text-white font-medium mb-2">Olá, {userName}!</h4>
              <p className="text-sm text-gray-400 max-w-xs">
                Ainda não tens análises salvas. Clica abaixo para eu verificar a saúde das tuas finanças.
              </p>
            </div>
          )}

          {/* Lista de Mensagens */}
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>

                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${isUser ? 'bg-blue-600' : 'bg-purple-600'
                  }`}>
                  {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
                </div>

                {/* Balão de Texto */}
                <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-lg ${isUser
                  ? 'bg-blue-600/20 border border-blue-500/20 text-blue-100 rounded-tr-sm'
                  : 'bg-[#2a2438] border border-white/5 text-gray-200 rounded-tl-sm'
                  }`}>
                  {isUser ? (
                    <p>{msg.message}</p>
                  ) : (
                    // Renderiza o Markdown da IA
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{msg.message}</ReactMarkdown>
                    </div>
                  )}

                  {/* Data/Hora */}
                  <span className="text-[10px] opacity-40 block mt-2 text-right">
                    {msg.createdAt.toLocaleDateString()} • {msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Loading State (Digitando...) */}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center shrink-0 animate-pulse">
                <Bot size={14} className="text-white" />
              </div>
              <div className="bg-[#2a2438] border border-white/5 rounded-2xl rounded-tl-sm p-4 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}

          {/* Elemento invisível para scroll automático */}
          <div ref={scrollRef} />
        </div>

        {/* Footer (Ações) */}
        <div className="p-4 border-t border-white/5 bg-[#130b20] z-10 flex justify-center gap-3">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className={`
                flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all
                ${loading
                ? 'bg-white/5 text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/20 hover:scale-[1.02]'
              }
              `}
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {messages.length > 0 ? 'Gerar Nova Análise' : 'Iniciar Análise Completa'}
          </button>
        </div>
      </div>
    </div>
  );
}