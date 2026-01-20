'use client'

import React, { useState, useEffect, useRef } from 'react';
import {
  Heart, Link as LinkIcon, PiggyBank, PlusCircle,
  Edit3, X, Check, Send, Zap, BellRing, TrendingUp, MessageCircle
} from 'lucide-react';
import {
  linkPartnerAction, unlinkPartnerAction,
  addSavingsAction, updateSavingsGoalNameAction,
  sendPartnerMessageAction, getPartnerMessagesAction
} from '@/app/actions';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

interface PartnerTabProps {
  partner?: { name: string | null; email: string } | null;
  totalSavings?: number;
  savingsGoalName?: string;
}

export default function PartnerTab({ partner, totalSavings = 0, savingsGoalName = "Caixinha dos Sonhos" }: PartnerTabProps) {
  const [email, setEmail] = useState('');
  const [loadingLink, setLoadingLink] = useState(false);
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [loadingSavings, setLoadingSavings] = useState(false);

  // Estados de Edição
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(savingsGoalName);
  const [loadingName, setLoadingName] = useState(false);

  // Estados de Mensagens
  const [messages, setMessages] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Carregar mensagens
  const fetchMessages = async () => {
    const msgs = await getPartnerMessagesAction();
    setMessages(msgs);
  };

  useEffect(() => {
    if (partner) fetchMessages();
  }, [partner]);

  // Scroll automático para o final (mensagens mais recentes)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handlers
  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingLink(true);
    const formData = new FormData();
    formData.append('email', email);
    const result = await linkPartnerAction(formData);
    if (result.success) {
      toast.success(result.message);
      setEmail('');
    } else {
      toast.error(result.error);
    }
    setLoadingLink(false);
  };

  const handleUnlink = async () => {
    if (!confirm("Tem certeza que deseja desfazer a conexão?")) return;
    setLoadingLink(true);
    const result = await unlinkPartnerAction();
    if (result.error) toast.error(result.error);
    else toast.success(result.message);
    setLoadingLink(false);
  };

  const handleAddSavings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingSavings(true);
    const formData = new FormData();
    formData.append('amount', amount);
    formData.append('description', desc || 'Caixinha');
    const res = await addSavingsAction(formData);
    if (res.success) {
      toast.success('Guardado!');
      setAmount('');
      setDesc('');
    } else {
      toast.error(res.error);
    }
    setLoadingSavings(false);
  };

  const handleSaveName = async () => {
    if (!tempName.trim()) return;
    setLoadingName(true);
    const formData = new FormData();
    formData.append('name', tempName);
    const res = await updateSavingsGoalNameAction(formData);
    if (res.success) {
      toast.success('Nome atualizado!');
      setIsEditingName(false);
    } else {
      toast.error(res.error);
    }
    setLoadingName(false);
  };

  const handleSendMessage = async (category: 'LOVE' | 'FINANCE' | 'ALERT', text: string) => {
    // Atualização otimista (adiciona ao final da lista)
    const tempMsg = {
      id: Math.random().toString(),
      message: text,
      category,
      senderId: 'me', // placeholder visual
      createdAt: new Date()
    };

    setMessages(prev => [...prev, tempMsg]);

    const res = await sendPartnerMessageAction(category, text);
    if (!res.success) toast.error("Erro ao enviar.");
    else fetchMessages(); // Atualiza com dados reais do servidor
  };

  // Se NÃO conectado
  if (!partner) {
    return (
      <div className="flex flex-col items-center justify-center py-12 animate-in fade-in zoom-in-95 duration-500">
        <div className="relative mb-8 group">
          <div className="absolute inset-0 bg-pink-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity rounded-full" />
          <div className="bg-[#1f1630] p-8 rounded-full border border-white/10 relative z-10 shadow-2xl">
            <Heart size={64} className="text-pink-500 animate-pulse" />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-white mb-3 text-center">Sincronia de Casal</h2>
        <p className="text-gray-400 mb-8 text-center max-w-sm">
          Conecte-se com seu amor para somar finanças, criar metas juntos e trocar incentivos.
        </p>

        <form onSubmit={handleLink} className="w-full max-w-sm space-y-4">
          <div className="relative group">
            <LinkIcon className="absolute left-4 top-4 text-gray-500 group-focus-within:text-pink-500 transition-colors" size={20} />
            <input
              type="email"
              required
              placeholder="Email do parceiro(a)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#130b20] border border-white/10 text-white pl-12 pr-4 py-4 rounded-2xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition shadow-lg"
            />
          </div>
          <button
            type="submit"
            disabled={loadingLink}
            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-4 rounded-2xl transition shadow-lg shadow-pink-900/20 active:scale-95 disabled:opacity-70 disabled:scale-100"
          >
            {loadingLink ? 'Conectando...' : 'Enviar Convite'}
          </button>
        </form>
      </div>
    );
  }

  // SE CONECTADO
  return (
    <div className="space-y-6 pb-24 md:pb-0 animate-in fade-in slide-in-from-right-8 duration-500">

      {/* --- HEADER: STATUS --- */}
      <div className="bg-gradient-to-r from-[#1f1630] to-[#251a3a] p-1 rounded-3xl border border-white/5 shadow-xl">
        <div className="bg-[#130b20]/50 backdrop-blur-md rounded-[20px] p-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <p className="text-xs font-bold text-green-400 uppercase tracking-wider">Conexão Ativa</p>
            </div>
            <h2 className="text-xl font-bold text-white">
              Você & {partner.name?.split(' ')[0] || 'Parceiro'}
            </h2>
          </div>
          <div className="flex -space-x-3">
            <div className="w-10 h-10 rounded-full bg-purple-600 border-2 border-[#130b20] flex items-center justify-center text-xs font-bold text-white">EU</div>
            <div className="w-10 h-10 rounded-full bg-pink-600 border-2 border-[#130b20] flex items-center justify-center text-xs font-bold text-white">❤️</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* --- COLUNA 1: CAIXINHA & METAS --- */}
        <div className="space-y-6">
          {/* Card Principal da Caixinha */}
          <div className="bg-gradient-to-br from-pink-600 via-purple-600 to-indigo-600 p-6 rounded-3xl text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/20 transition-colors duration-700" />

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                {isEditingName ? (
                  <div className="flex items-center gap-2 bg-black/20 p-1 rounded-lg backdrop-blur-sm">
                    <input
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="bg-transparent font-bold text-lg outline-none w-full min-w-[150px]"
                      autoFocus
                    />
                    <button onClick={handleSaveName} disabled={loadingName} className="p-1 hover:text-green-300"><Check size={18} /></button>
                    <button onClick={() => setIsEditingName(false)} className="p-1 hover:text-red-300"><X size={18} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 cursor-pointer group/edit opacity-90 hover:opacity-100" onClick={() => { setTempName(savingsGoalName); setIsEditingName(true); }}>
                    <PiggyBank className="text-pink-200" size={24} />
                    <h3 className="font-bold text-lg">{savingsGoalName}</h3>
                    <Edit3 size={14} className="opacity-0 group-hover/edit:opacity-100 transition-opacity" />
                  </div>
                )}
                <div className="text-xs bg-white/20 px-2 py-1 rounded-full font-medium backdrop-blur-sm">
                  Meta Compartilhada
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-pink-100 font-medium">Saldo Acumulado</p>
                <p className="text-4xl md:text-5xl font-bold tracking-tight">
                  {formatCurrency(totalSavings)}
                </p>
              </div>
            </div>
          </div>

          {/* Formulário Rápido */}
          <div className="bg-[#1f1630] p-5 rounded-3xl border border-white/5">
            <h4 className="text-sm font-bold text-gray-400 mb-4 flex items-center gap-2">
              <PlusCircle size={16} className="text-purple-400" /> Adicionar à Caixinha
            </h4>
            <form onSubmit={handleAddSavings} className="flex gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">R$</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-[#130b20] border border-white/10 rounded-xl pl-8 pr-3 py-3 text-white text-sm focus:border-purple-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loadingSavings}
                className="bg-white/5 hover:bg-white/10 border border-white/5 text-white p-3 rounded-xl transition disabled:opacity-50"
              >
                {loadingSavings ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={18} />}
              </button>
            </form>
          </div>
        </div>

        {/* --- COLUNA 2: LOVE ALERTS (CHAT) --- */}
        <div className="bg-[#1f1630] rounded-3xl border border-white/5 flex flex-col h-[500px] lg:h-auto overflow-hidden shadow-lg relative">
          {/* Header do Chat */}
          <div className="p-4 border-b border-white/5 bg-[#251a3a]/50 backdrop-blur-sm flex justify-between items-center z-10">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Zap className="text-yellow-400 fill-yellow-400" size={18} /> Love Alerts
            </h3>
            <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-1 rounded-full">Histórico Recente</span>
          </div>

          {/* Área de Mensagens (Timeline) */}
          {/* CORRIGIDO: Removido flex-col-reverse para manter a ordem cronológica correta (Antigo -> Novo) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar flex flex-col" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-60">
                <BellRing size={32} className="mb-2 text-purple-400" />
                <p className="text-xs">Envie um toque para começar!</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                // Se senderId for o meu ID, mostra à direita
                const isMe = msg.senderId === 'me' || (partner && msg.sender?.name?.includes('Você')); // Ajuste essa lógica com IDs reais se possível
                // Para simplificar, assumimos que 'me' é local e o resto vem do banco

                const isLove = msg.category === 'LOVE';
                const isAlert = msg.category === 'ALERT';

                return (
                  <div key={idx} className={`flex flex-col animate-in slide-in-from-bottom-2 ${msg.senderId === 'me' ? 'items-end' : 'items-start'}`}>
                    <div className={`
                      max-w-[85%] rounded-2xl p-3 text-sm relative shadow-md
                      ${isLove ? 'bg-pink-500/10 border border-pink-500/20 text-pink-100' :
                        isAlert ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-100' :
                          'bg-emerald-500/10 border border-emerald-500/20 text-emerald-100'}
                    `}>
                      <p className="leading-relaxed">{msg.message}</p>
                      <span className="text-[9px] opacity-50 block mt-1 text-right">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Botões de Ação Rápida */}
          <div className="p-4 bg-[#130b20] border-t border-white/5 grid grid-cols-2 gap-2">
            <button
              onClick={() => handleSendMessage('LOVE', 'Te amo! ❤️')}
              className="bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 p-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95"
            >
              <Heart size={16} className="fill-pink-500/20" /> Te amo!
            </button>

            <button
              onClick={() => handleSendMessage('ALERT', 'Não esquece de registrar os gastos! 💸')}
              className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 p-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95"
            >
              <BellRing size={16} /> Registra aí!
            </button>

            <button
              onClick={() => handleSendMessage('FINANCE', 'Bora investir? 📈')}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 p-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95"
            >
              <TrendingUp size={16} /> Bora investir?
            </button>

            <button
              onClick={() => handleSendMessage('LOVE', 'Saudades de você... 🥺')}
              className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 p-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95"
            >
              <Zap size={16} /> Saudades...
            </button>
          </div>
        </div>

      </div>

      {/* Footer Desconectar */}
      <div className="flex justify-center pt-8 border-t border-white/5">
        <button onClick={handleUnlink} disabled={loadingLink} className="text-xs text-red-400/40 hover:text-red-400 hover:underline transition">
          Desconectar parceria
        </button>
      </div>
    </div>
  );
}