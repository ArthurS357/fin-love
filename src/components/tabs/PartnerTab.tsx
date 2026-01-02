'use client'

import React, { useState } from 'react';
import { Heart, Link as LinkIcon, AlertCircle, CheckCircle2, UserCheck, Unlink, PiggyBank, PlusCircle, Edit3, X, Check } from 'lucide-react';
import { linkPartnerAction, unlinkPartnerAction, addSavingsAction, updateSavingsGoalNameAction } from '@/app/actions';
import { toast } from 'sonner';

interface PartnerTabProps {
  partner?: { name: string | null; email: string } | null;
  totalSavings?: number;
  savingsGoalName?: string; // NOVO PROP
}

export default function PartnerTab({ partner, totalSavings = 0, savingsGoalName = "Caixinha dos Sonhos" }: PartnerTabProps) {
  // ... (Estados existentes: email, status, loadingLink, amount, desc, loadingSavings)
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  const [loadingLink, setLoadingLink] = useState(false);
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [loadingSavings, setLoadingSavings] = useState(false);

  // Estados para edição do nome
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(savingsGoalName);
  const [loadingName, setLoadingName] = useState(false);

  // ... (Handlers existentes: handleLink, handleUnlink, handleAddSavings)
  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingLink(true);
    setStatus({ type: null, message: '' });
    const formData = new FormData();
    formData.append('email', email);
    const result = await linkPartnerAction(formData);
    if (result.error) {
      setStatus({ type: 'error', message: result.error });
      toast.error(result.error);
    } else if (result.success) {
      setStatus({ type: 'success', message: result.message || 'Conectado!' });
      toast.success(result.message);
      setEmail('');
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
    formData.append('description', desc || 'Investimento Caixinha');
    const res = await addSavingsAction(formData);
    if (res.success) {
      toast.success('Dinheiro guardado!');
      setAmount('');
      setDesc('');
    } else {
      toast.error(res.error || 'Erro.');
    }
    setLoadingSavings(false);
  };

  // NOVO: Handler para editar nome
  const handleSaveName = async () => {
    if (!tempName.trim()) return;
    setLoadingName(true);
    const formData = new FormData();
    formData.append('name', tempName);
    const res = await updateSavingsGoalNameAction(formData);
    
    if (res.success) {
      toast.success('Nome da caixinha atualizado!');
      setIsEditingName(false);
    } else {
      toast.error(res.error);
    }
    setLoadingName(false);
  };

  if (partner) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-8 pb-24 md:pb-0">
        
        {/* Header Conectado */}
        <div className="flex items-center justify-between bg-gradient-to-r from-[#1f1630] to-[#2a1e3d] p-6 rounded-3xl border border-white/5 shadow-xl">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
              <UserCheck className="text-green-400" size={24} /> Conexão Ativa
            </h2>
            <p className="text-gray-400 text-sm">
              Sincronizado com <span className="text-pink-400 font-semibold">{partner.name || partner.email}</span>
            </p>
          </div>
          <div className="hidden md:block bg-pink-500/10 p-3 rounded-full ring-1 ring-pink-500/30">
            <Heart className="text-pink-500 fill-pink-500/20" size={32} />
          </div>
        </div>

        {/* Área da Caixinha */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Card Visualização */}
          <div className="bg-gradient-to-br from-pink-900/40 to-purple-900/40 border border-white/10 p-6 rounded-3xl relative overflow-hidden group shadow-2xl backdrop-blur-sm">
            <div className="absolute -top-10 -right-10 bg-pink-500/20 w-40 h-40 rounded-full blur-[60px]" />
            
            <div className="flex items-center justify-between mb-8 relative z-10">
              {isEditingName ? (
                <div className="flex items-center gap-2 w-full mr-4">
                  <input 
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="w-full bg-black/20 text-white font-bold text-lg px-2 py-1 rounded border border-white/20 focus:border-pink-500 outline-none"
                    autoFocus
                  />
                  <button onClick={handleSaveName} disabled={loadingName} className="p-2 bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-white rounded-lg transition"><Check size={16}/></button>
                  <button onClick={() => setIsEditingName(false)} className="p-2 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition"><X size={16}/></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/edit cursor-pointer" onClick={() => { setTempName(savingsGoalName); setIsEditingName(true); }}>
                  <h3 className="text-xl font-bold text-white truncate">{savingsGoalName}</h3>
                  <Edit3 size={14} className="text-gray-400 opacity-0 group-hover/edit:opacity-100 transition-opacity" />
                </div>
              )}
              <div className="bg-white/10 p-2 rounded-lg text-white">
                <PiggyBank size={24} />
              </div>
            </div>

            <div className="relative z-10">
              <p className="text-pink-200/70 text-xs uppercase tracking-wider mb-1">Saldo Compartilhado</p>
              <p className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                R$ {totalSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Formulário */}
          <div className="bg-[#1f1630] border border-white/5 p-6 rounded-3xl shadow-xl flex flex-col justify-center">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <PlusCircle className="text-pink-400" size={20} />
              Adicionar Saldo
            </h3>

            <form onSubmit={handleAddSavings} className="space-y-4">
               {/* Mesma lógica de formulário anterior, apenas visual melhorado nos inputs */}
               {/* ... */}
               <div>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0,00"
                      className="w-full bg-[#130b20] text-white font-bold text-lg pl-10 pr-4 py-4 rounded-2xl border border-gray-700 focus:border-pink-500 outline-none transition"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loadingSavings}
                    className="bg-pink-600 hover:bg-pink-500 text-white font-bold px-6 rounded-2xl transition shadow-[0_0_20px_rgba(236,72,153,0.3)] disabled:opacity-50"
                  >
                    Guardar
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Descrição (Ex: Jantar, Viagem...)"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  className="w-full mt-3 bg-transparent text-gray-400 text-sm px-2 py-2 border-b border-gray-800 focus:border-pink-500 outline-none transition placeholder:text-gray-600"
                />
              </div>
            </form>
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex justify-center pt-6">
          <button onClick={handleUnlink} disabled={loadingLink} className="text-xs text-red-400/60 hover:text-red-400 hover:underline transition">
             {loadingLink ? 'Processando...' : 'Desconectar do parceiro'}
          </button>
        </div>
      </div>
    );
  }

  // Se não conectado, mantém o código antigo (Login form)
  return (
    <div className="text-center py-10 animate-in fade-in slide-in-from-right-8">
      {/* ... (código do form de conexão inalterado, exceto estilos de container) */}
       <div className="max-w-md mx-auto bg-[#1f1630] p-8 rounded-3xl border border-white/5 shadow-2xl">
          <div className="inline-flex items-center justify-center p-5 bg-pink-500/10 rounded-full mb-6 ring-1 ring-pink-500/30">
            <Heart size={48} className="text-pink-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Sincronia</h2>
          <p className="text-gray-400 mb-8 text-sm">Conecte-se para somar forças.</p>
          
          <form onSubmit={handleLink} className="space-y-4">
            <div className="relative">
              <LinkIcon className="absolute left-4 top-4 text-gray-500" size={18} />
              <input
                type="email"
                required
                placeholder="Email do parceiro(a)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#130b20] border border-gray-700 text-white pl-11 pr-4 py-3.5 rounded-xl focus:ring-2 focus:ring-pink-500 outline-none transition"
              />
            </div>
            
            {status.message && (
              <div className={`text-xs p-3 rounded-lg ${status.type === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                {status.message}
              </div>
            )}

            <button type="submit" disabled={loadingLink} className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-pink-900/20">
              {loadingLink ? '...' : 'Conectar'}
            </button>
          </form>
       </div>
    </div>
  );
}