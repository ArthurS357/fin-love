'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Target, Save, Lightbulb,
  TrendingUp, Plus, Briefcase, Building, Bitcoin, Landmark, Wallet, EyeOff, Trash2, Loader2, PieChart as PieIcon, RefreshCw, ArrowDownLeft
} from 'lucide-react';
import { updateSpendingLimitAction, getInvestmentsAction, deleteInvestmentAction, redeemInvestmentAction } from '@/app/actions';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import InvestmentModal from '../modals/InvestmentModal';
import { Skeleton } from '@/components/ui/skeleton';
import CompoundInterestCalculator from '../CompoundInterestCalculator';

interface GoalsTabProps {
  income: number;
  expense: number;
  transactions: any[];
  currentLimit: number;
  privacyMode: boolean;
}

const COLORS = ['#EC4899', '#8B5CF6', '#F59E0B', '#10B981', '#3B82F6'];

const MOTIVATIONAL_TIPS = [
  "💡 Regra 50-30-20: 50% Essencial, 30% Desejos, 20% Futuro.",
  "💡 Pague-se primeiro: invista assim que receber o salário.",
  "💡 Diversificação é o único 'almoço grátis' do mercado.",
  "💡 Juros compostos são a oitava maravilha do mundo.",
  "💡 Defina metas claras. 'Ficar rico' é vago; 'R$ 100k em 5 anos' é um plano.",
  "💡 Mantenha sua reserva de emergência em liquidez diária."
];

export default function GoalsTab({ income, expense, currentLimit, privacyMode }: GoalsTabProps) {
  // --- ESTADOS ---
  const [limit, setLimit] = useState(currentLimit);
  const [loadingLimit, setLoadingLimit] = useState(false);

  const [investments, setInvestments] = useState<{ myInvestments: any[], partnerInvestments: any[] }>({ myInvestments: [], partnerInvestments: [] });
  const [isInvestModalOpen, setIsInvestModalOpen] = useState(false);
  const [loadingInvest, setLoadingInvest] = useState(true);

  // Estados para Resgate e Exclusão
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<any>(null);

  // --- CARREGAMENTO DE DADOS ---
  const fetchInvestments = async () => {
    // setLoadingInvest(true); // Opcional: descomente se quiser loading total a cada update
    const res = await getInvestmentsAction();
    setInvestments(res);
    setLoadingInvest(false);
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

  // --- CÁLCULOS ---
  const percentage = limit > 0 ? (expense / limit) * 100 : 0;
  const isOverLimit = expense > limit;

  const currentTip = useMemo(() => {
    return MOTIVATIONAL_TIPS[new Date().getHours() % MOTIVATIONAL_TIPS.length];
  }, []);

  const myTotal = investments.myInvestments.reduce((acc, i) => acc + Number(i.currentAmount), 0);
  const partnerTotal = investments.partnerInvestments.reduce((acc, i) => acc + Number(i.currentAmount), 0);
  const grandTotal = myTotal + partnerTotal;

  // Prepara dados para o gráfico (agrupa por categoria)
  const allocationData = useMemo(() => {
    const all = [...investments.myInvestments, ...investments.partnerInvestments];
    const categories: any = {};
    all.forEach(i => {
      categories[i.category] = (categories[i.category] || 0) + i.currentAmount;
    });
    return Object.keys(categories).map(k => ({
      name: k.replace('_', ' '),
      value: categories[k]
    })).sort((a, b) => b.value - a.value);
  }, [investments]);

  // --- AÇÕES ---
  const handleSaveLimit = async () => {
    setLoadingLimit(true);
    const formData = new FormData();
    formData.append('limit', limit.toString());
    const res = await updateSpendingLimitAction(formData);
    if (res.success) toast.success(res.message);
    else toast.error(res.error);
    setLoadingLimit(false);
  };

  const handleDeleteInvestment = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o ativo "${name}"?`)) return;

    setDeletingId(id);
    const res = await deleteInvestmentAction(id);

    if (res.success) {
      toast.success(res.message);
      await fetchInvestments(); // Recarrega a lista
    } else {
      toast.error(res.error);
    }
    setDeletingId(null);
  };

  const openRedeemModal = (inv: any) => {
    setSelectedInvestment(inv);
    setRedeemModalOpen(true);
  };

  // --- HELPERS VISUAIS ---
  const maskValue = (val: number) => privacyMode ? '••••••' : formatCurrency(val);

  const getCategoryStyles = (cat: string) => {
    switch (cat) {
      case 'CRIPTO': return { icon: <Bitcoin size={18} className="text-orange-500" />, color: 'text-orange-500', bg: 'bg-orange-500/10' };
      case 'ACOES': return { icon: <TrendingUp size={18} className="text-blue-400" />, color: 'text-blue-400', bg: 'bg-blue-400/10' };
      case 'FII': return { icon: <Building size={18} className="text-purple-400" />, color: 'text-purple-400', bg: 'bg-purple-400/10' };
      case 'RENDA_FIXA': return { icon: <Landmark size={18} className="text-emerald-400" />, color: 'text-emerald-400', bg: 'bg-emerald-400/10' };
      default: return { icon: <Wallet size={18} className="text-gray-400" />, color: 'text-gray-400', bg: 'bg-gray-500/10' };
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-0">

      {/* --- SEÇÃO 1: TETO DE GASTOS & DICA --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Card Teto de Gastos */}
        <div className="lg:col-span-2 bg-[#1f1630] p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 bg-pink-500/10 w-64 h-64 rounded-full blur-[80px] pointer-events-none group-hover:bg-pink-500/20 transition duration-1000" />

          <div className="relative z-10">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <Target className="text-pink-500" /> Controle de Orçamento
            </h3>

            <div className="flex gap-4 mb-6 items-center">
              <div className="flex-1 relative group/input">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold group-focus-within/input:text-pink-500 transition">R$</span>
                <input
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(parseFloat(e.target.value))}
                  className={`w-full bg-[#130b20] text-white text-2xl font-bold pl-12 pr-4 py-4 rounded-2xl border border-white/10 focus:border-pink-500 outline-none transition-all shadow-inner ${privacyMode ? 'blur-sm' : ''}`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-bold tracking-widest pointer-events-none">META MENSAL</span>
              </div>
              <button
                onClick={handleSaveLimit}
                disabled={loadingLimit}
                className="h-full aspect-square bg-pink-600 hover:bg-pink-500 text-white rounded-2xl transition shadow-lg shadow-pink-600/20 active:scale-95 flex items-center justify-center"
                title="Salvar Meta"
              >
                {loadingLimit ? <Loader2 size={24} className="animate-spin" /> : <Save size={24} />}
              </button>
            </div>

            {/* Barra de Progresso */}
            <div className="bg-[#130b20] p-5 rounded-2xl border border-white/5">
              <div className="flex justify-between text-sm mb-3">
                <span className="text-gray-400 font-medium">Gasto Realizado: <span className="text-white">{maskValue(expense)}</span></span>
                <span className={`font-bold ${isOverLimit ? 'text-red-400' : 'text-emerald-400'}`}>{percentage.toFixed(1)}%</span>
              </div>
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden relative">
                <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-white/10 z-10" title="Limite" />
                <div
                  className={`h-full transition-all duration-1000 ${isOverLimit ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-emerald-400 to-blue-500'}`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              {isOverLimit && <p className="text-xs text-red-400 mt-2 font-medium animate-pulse">⚠️ Você ultrapassou o teto definido!</p>}
            </div>
          </div>
        </div>

        {/* Card Dica */}
        <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-500/20 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-center shadow-lg">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
          <Lightbulb className="text-blue-400 mb-4" size={32} />
          <h4 className="font-bold text-blue-100 mb-2 text-lg">Insight Financeiro</h4>
          <p className="text-blue-200/80 text-sm leading-relaxed italic">"{currentTip}"</p>
        </div>
      </div>

      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* --- SEÇÃO 2: PATRIMÔNIO (INVESTIMENTOS) --- */}
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Briefcase className="text-emerald-400" /> Patrimônio & Investimentos
            </h2>
            <p className="text-gray-400 text-sm mt-1">Gerencie seus ativos, ações e reservas.</p>
          </div>
          <button
            onClick={() => setIsInvestModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl text-sm font-bold transition shadow-lg shadow-emerald-900/20 active:scale-95 group"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform" />
            Novo Aporte
          </button>
        </div>

        {loadingInvest ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Skeleton className="h-48 rounded-3xl bg-white/5 border border-white/5" />
            <Skeleton className="h-48 md:col-span-2 rounded-3xl bg-white/5 border border-white/5" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

            {/* 1. Card Valor Total */}
            <div className="bg-[#1f1630] p-6 rounded-3xl border border-white/5 flex flex-col justify-center relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-500">
              <div className="absolute -right-12 -bottom-12 text-emerald-500/5 group-hover:text-emerald-500/10 transition-colors duration-500">
                <Briefcase size={180} />
              </div>

              <div className="flex justify-between items-start z-10">
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Patrimônio Total</p>
                {privacyMode && <EyeOff size={16} className="text-gray-500" />}
              </div>

              <h3 className="text-4xl font-bold text-white mb-6 z-10 tracking-tight">
                {maskValue(grandTotal)}
              </h3>

              {/* Barras de Progresso Casal */}
              <div className="space-y-3 z-10">
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Você</span>
                    <span className="text-white font-medium">{maskValue(myTotal)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500" style={{ width: `${grandTotal > 0 ? (myTotal / grandTotal) * 100 : 0}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Parceiro(a)</span>
                    <span className="text-white font-medium">{maskValue(partnerTotal)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-pink-500" style={{ width: `${grandTotal > 0 ? (partnerTotal / grandTotal) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Gráfico de Alocação */}
            <div className="md:col-span-2 bg-[#1f1630] p-6 rounded-3xl border border-white/5 flex items-center relative overflow-hidden">
              <div className="absolute top-4 left-6 z-10">
                <h4 className="text-sm text-gray-300 font-bold flex items-center gap-2">
                  <PieIcon size={14} className="text-purple-400" /> Diversificação
                </h4>
              </div>

              <div className="w-full h-48 flex items-center justify-center">
                {allocationData.length > 0 ? (
                  <div className="flex items-center w-full max-w-lg justify-between">
                    <div className="w-48 h-48 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={allocationData}
                            cx="50%" cy="50%"
                            innerRadius={50} outerRadius={70}
                            paddingAngle={4}
                            dataKey="value"
                            stroke="none"
                          >
                            {allocationData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1a1025', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                            itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                            formatter={(value: any) => privacyMode ? '••••••' : formatCurrency(Number(value))}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Centro da Donut */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center opacity-50">
                          <span className="text-[10px] text-gray-400 block uppercase">Ativos</span>
                          <span className="text-lg font-bold text-white">{investments.myInvestments.length + investments.partnerInvestments.length}</span>
                        </div>
                      </div>
                    </div>

                    {/* Legenda Lateral */}
                    <div className="flex-1 ml-8 space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                      {allocationData.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-xs group cursor-default">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-gray-300 group-hover:text-white transition">{d.name}</span>
                          </div>
                          {!privacyMode && (
                            <div className="flex items-center gap-3">
                              <span className="text-gray-500">{formatCurrency(d.value)}</span>
                              <span className="font-bold text-gray-400 w-8 text-right">({((d.value / grandTotal) * 100).toFixed(0)}%)</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <PieIcon size={32} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Nenhum investimento registrado.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* LISTAS DE ATIVOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Coluna: MEUS ATIVOS */}
          <div className="bg-[#1f1630]/50 rounded-3xl p-5 border border-white/5 flex flex-col h-full">
            <h4 className="text-purple-400 font-bold text-sm mb-4 flex items-center gap-2 uppercase tracking-wider">
              <span className="w-2 h-2 bg-purple-500 rounded-full shadow-[0_0_10px_#a855f7]" /> Meus Ativos
            </h4>

            <div className="space-y-3 flex-1">
              {loadingInvest ? (
                <SkeletonGroup>
                  <Skeleton className="h-20 w-full rounded-2xl bg-white/5" />
                  <Skeleton className="h-20 w-full rounded-2xl bg-white/5" />
                </SkeletonGroup>
              ) : investments.myInvestments.length === 0 ? (
                <EmptyState />
              ) : (
                investments.myInvestments.map((inv: any) => (
                  <InvestmentCard
                    key={inv.id}
                    inv={inv}
                    styles={getCategoryStyles(inv.category)}
                    privacyMode={privacyMode}
                    onDelete={() => handleDeleteInvestment(inv.id, inv.name)}
                    isDeleting={deletingId === inv.id}
                    onRedeem={() => openRedeemModal(inv)} // Habilita o resgate
                  />
                ))
              )}
            </div>
          </div>

          {/* Coluna: PARCEIRO */}
          <div className="bg-[#1f1630]/50 rounded-3xl p-5 border border-white/5 flex flex-col h-full">
            <h4 className="text-pink-400 font-bold text-sm mb-4 flex items-center gap-2 uppercase tracking-wider">
              <span className="w-2 h-2 bg-pink-500 rounded-full shadow-[0_0_10px_#ec4899]" /> Carteira do Parceiro
            </h4>

            <div className="space-y-3 flex-1">
              {loadingInvest ? (
                <SkeletonGroup>
                  <Skeleton className="h-20 w-full rounded-2xl bg-white/5" />
                  <Skeleton className="h-20 w-full rounded-2xl bg-white/5" />
                </SkeletonGroup>
              ) : investments.partnerInvestments.length === 0 ? (
                <EmptyState partner />
              ) : (
                investments.partnerInvestments.map((inv: any) => (
                  <InvestmentCard
                    key={inv.id}
                    inv={inv}
                    styles={getCategoryStyles(inv.category)}
                    privacyMode={privacyMode}
                  // Sem ações para o parceiro
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- SEÇÃO 3: FERRAMENTAS EXTRAS --- */}
      <div className="mt-12 pt-8 border-t border-white/5">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <RefreshCw size={18} className="text-gray-500" /> Simuladores
        </h3>
        <CompoundInterestCalculator />
      </div>

      {/* --- MODAIS --- */}
      <InvestmentModal
        isOpen={isInvestModalOpen}
        onClose={() => setIsInvestModalOpen(false)}
        onSuccess={fetchInvestments}
      />

      {/* Modal de Resgate */}
      {redeemModalOpen && selectedInvestment && (
        <RedeemModal
          isOpen={redeemModalOpen}
          onClose={() => setRedeemModalOpen(false)}
          investment={selectedInvestment}
          onSuccess={fetchInvestments}
        />
      )}
    </div>
  );
}

// --- SUBCOMPONENTES ---

function InvestmentCard({ inv, styles, privacyMode, onDelete, isDeleting, onRedeem }: any) {
  return (
    <div className="group relative bg-[#130b20] p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300 flex items-center justify-between">
      {/* Esquerda: Ícone e Nome */}
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${styles.bg} transition-transform group-hover:scale-110`}>
          {styles.icon}
        </div>
        <div>
          <p className="text-sm font-bold text-white group-hover:text-pink-100 transition-colors">{inv.name}</p>
          <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${styles.color}`}>
            {inv.category.replace('_', ' ')}
          </p>
        </div>
      </div>

      {/* Direita: Valores e Ações */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className={`text-sm font-bold transition-all ${privacyMode ? 'text-gray-500 blur-sm' : 'text-white'}`}>
            {privacyMode ? '••••••' : formatCurrency(inv.currentAmount)}
          </p>
          <p className="text-[10px] text-gray-500">
            Aportado: {privacyMode ? '•••' : formatCurrency(inv.investedAmount)}
          </p>
        </div>

        {/* Botões de Ação (Aparecem no Hover) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onRedeem && (
            <button
              onClick={(e) => { e.stopPropagation(); onRedeem(); }}
              className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-full transition"
              title="Resgatar Valor (Liquidez)"
            >
              <ArrowDownLeft size={16} />
            </button>
          )}

          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              disabled={isDeleting}
              className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-full transition"
              title="Excluir Ativo"
            >
              {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function RedeemModal({ isOpen, onClose, investment, onSuccess }: any) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append('id', investment.id);
    formData.append('amount', amount);

    const res = await redeemInvestmentAction(formData);
    setLoading(false);

    if (res.success) {
      toast.success(res.message);
      onSuccess();
      onClose();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#1a1025] w-full max-w-sm rounded-3xl border border-white/10 shadow-2xl p-6 relative">
        <h3 className="text-lg font-bold text-white mb-1">Resgatar Investimento</h3>
        <p className="text-xs text-gray-400 mb-4">Transferir de <b>{investment.name}</b> para Conta Corrente.</p>

        <form onSubmit={handleRedeem} className="space-y-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-gray-500">Valor do Resgate</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">R$</span>
              <input
                type="number" step="0.01" max={investment.currentAmount} required
                value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[#130b20] border border-white/10 rounded-xl p-3 pl-10 text-white text-lg font-bold outline-none focus:border-emerald-500 transition"
                placeholder="0.00"
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1 text-right">Disponível: {formatCurrency(investment.currentAmount)}</p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-gray-400 hover:text-white text-sm font-bold">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm py-3 transition shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const EmptyState = ({ partner }: { partner?: boolean }) => (
  <div className="h-full flex flex-col items-center justify-center py-10 text-center border-2 border-dashed border-white/5 rounded-2xl">
    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3 opacity-50">
      <Briefcase size={20} className="text-gray-400" />
    </div>
    <p className="text-gray-400 text-sm font-medium">{partner ? 'Nenhum ativo visível' : 'Comece a investir!'}</p>
    <p className="text-xs text-gray-600 max-w-[180px] mt-1">
      {partner ? 'Seu parceiro ainda não registrou investimentos.' : 'Adicione seu primeiro ativo para ver o gráfico.'}
    </p>
  </div>
);

const SkeletonGroup = ({ children }: any) => <div className="space-y-3">{children}</div>;