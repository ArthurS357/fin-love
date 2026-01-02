'use client'

import React, { useState } from 'react';
import { Heart, Link as LinkIcon, AlertCircle, CheckCircle2, UserCheck, Unlink, PiggyBank, PlusCircle } from 'lucide-react';
import { linkPartnerAction, unlinkPartnerAction, addSavingsAction } from '@/app/actions';
import { toast } from 'sonner';

interface PartnerTabProps {
  partner?: { name: string | null; email: string } | null;
  totalSavings?: number;
}

export default function PartnerTab({ partner, totalSavings = 0 }: PartnerTabProps) {
  // Estados para Conexão
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  const [loadingLink, setLoadingLink] = useState(false);

  // Estados para Caixinha
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [loadingSavings, setLoadingSavings] = useState(false);

  // --- HANDLERS ---

  // 1. Conectar Parceiro
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

  // 2. Desconectar
  const handleUnlink = async () => {
    if (!confirm("Tem certeza que deseja desfazer a conexão com seu parceiro?")) return;

    setLoadingLink(true);
    const result = await unlinkPartnerAction();

    if (result.error) toast.error(result.error);
    else toast.success(result.message);

    setLoadingLink(false);
  };

  // 3. Adicionar à Caixinha
  const handleAddSavings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingSavings(true);

    const formData = new FormData();
    formData.append('amount', amount);
    formData.append('description', desc || 'Investimento Caixinha');

    const res = await addSavingsAction(formData);

    if (res.success) {
      toast.success('Dinheiro guardado na caixinha!');
      setAmount('');
      setDesc('');
    } else {
      toast.error(res.error || 'Erro ao guardar valor.');
    }
    setLoadingSavings(false);
  };

  // --- RENDERIZAÇÃO ---

  // MODO 1: USUÁRIO JÁ CONECTADO (Exibe Caixinha e Dados)
  if (partner) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-right-8 pb-24 md:pb-0">

        {/* Header Conectado */}
        <div className="flex items-center justify-between bg-[#1f1630] p-6 rounded-2xl border border-pink-900/20 shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
              <UserCheck className="text-pink-500" size={24} /> Espaço do Casal
            </h2>
            <p className="text-gray-400 text-sm">
              Conectado com <span className="text-pink-400 font-semibold">{partner.name || partner.email}</span>
            </p>
          </div>
          <div className="bg-pink-500/10 p-3 rounded-full ring-1 ring-pink-500/30">
            <Heart className="text-pink-500 fill-pink-500/20" size={32} />
          </div>
        </div>

        {/* Área da Caixinha */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Card Visualização do Saldo */}
          <div className="bg-gradient-to-br from-[#2d1b4e] to-[#1f1630] border border-white/10 p-6 rounded-2xl relative overflow-hidden group shadow-xl">
            {/* Efeitos de Fundo */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 bg-pink-500/10 w-32 h-32 rounded-full blur-3xl group-hover:bg-pink-500/20 transition duration-500"></div>

            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="bg-pink-500 p-2.5 rounded-xl text-white shadow-lg shadow-pink-500/30">
                <PiggyBank size={24} />
              </div>
              <h3 className="text-lg font-bold text-white">Caixinha dos Sonhos</h3>
            </div>

            <div className="mb-4 relative z-10">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Valor Total Acumulado</p>
              <p className="text-4xl font-bold text-white tracking-tight">
                R$ {totalSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <p className="text-xs text-gray-500 italic relative z-10 border-t border-white/5 pt-3 mt-2">
              * Soma dos investimentos realizados por você e {partner.name?.split(' ')[0] || 'seu parceiro'}.
            </p>
          </div>

          {/* Formulário de Adicionar Dinheiro */}
          <div className="bg-[#1f1630] border border-white/5 p-6 rounded-2xl shadow-lg">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <PlusCircle className="text-green-400" size={20} />
              Guardar Dinheiro
            </h3>

            <form onSubmit={handleAddSavings} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Objetivo (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Viagem, Casa Nova..."
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  className="w-full bg-[#130b20] text-gray-300 text-sm px-4 py-3 rounded-xl border border-gray-700 focus:border-green-500 outline-none transition placeholder:text-gray-600"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Valor a guardar</label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-3 text-gray-500 text-sm font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      required
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="w-full bg-[#130b20] text-white font-bold pl-9 pr-4 py-3 rounded-xl border border-gray-700 focus:border-green-500 outline-none transition"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loadingSavings}
                    className="bg-green-600 hover:bg-green-500 active:scale-95 text-white font-bold px-6 py-3 rounded-xl transition shadow-lg shadow-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingSavings ? '...' : 'Guardar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Rodapé com Desconexão */}
        <div className="text-center pt-8 border-t border-white/5">
          <button
            onClick={handleUnlink}
            disabled={loadingLink}
            className="group flex items-center justify-center gap-2 mx-auto text-sm text-gray-500 hover:text-red-400 transition-colors"
          >
            <Unlink size={16} className="group-hover:-ml-1 transition-all" />
            {loadingLink ? 'Desconectando...' : 'Desfazer conexão com parceiro'}
          </button>
        </div>
      </div>
    );
  }

  // MODO 2: FORMULÁRIO DE CONEXÃO (Usuário Solteiro)
  return (
    <div className="text-center py-10 animate-in fade-in slide-in-from-right-8">
      <div className="inline-flex items-center justify-center p-6 bg-pink-500/10 rounded-full mb-6 ring-1 ring-pink-500/30 shadow-[0_0_30px_rgba(236,72,153,0.15)]">
        <Heart size={64} className="text-pink-500" />
      </div>

      <h2 className="text-3xl font-bold text-white mb-3">Sincronia do Casal</h2>
      <p className="text-gray-400 max-w-md mx-auto mb-8 leading-relaxed">
        Conecte-se com seu amor para visualizarem juntos o progresso dos sonhos e somarem forças na <span className="text-pink-400">Caixinha do Casal</span>.
      </p>

      <form onSubmit={handleLink} className="max-w-sm mx-auto space-y-4 bg-[#1f1630] p-6 rounded-2xl border border-white/5 shadow-xl">
        <div className="relative">
          <LinkIcon className="absolute left-3 top-3.5 text-gray-500" size={20} />
          <input
            type="email"
            required
            placeholder="Digite o email do parceiro(a)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#130b20] border border-gray-700 text-white pl-10 pr-4 py-3.5 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition"
          />
        </div>

        {status.message && (
          <div className={`text-sm p-3 rounded-lg flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-1 ${status.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
            {status.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            {status.message}
          </div>
        )}

        <button
          type="submit"
          disabled={loadingLink}
          className="w-full bg-pink-600 hover:bg-pink-500 active:scale-95 disabled:opacity-50 text-white font-bold py-3.5 px-8 rounded-xl transition shadow-lg shadow-pink-900/20 flex items-center justify-center gap-2"
        >
          {loadingLink ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Conectar Parceiro'
          )}
        </button>
      </form>
    </div>
  );
}