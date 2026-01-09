'use client'

import React, { useState, useMemo, useEffect } from 'react';
import {
  Target, Save, Lightbulb,
  TrendingUp, Plus, Briefcase, Building, Bitcoin, Landmark, Wallet, EyeOff
} from 'lucide-react';
import { updateSpendingLimitAction, getInvestmentsAction } from '@/app/actions';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import InvestmentModal from '../modals/InvestmentModal';
import { Skeleton } from '@/components/ui/skeleton';

interface GoalsTabProps {
  income: number;
  expense: number;
  transactions: any[];
  currentLimit: number;
  privacyMode: boolean;
}

const COLORS = ['#EC4899', '#8B5CF6', '#F59E0B', '#10B981', '#3B82F6'];

const MOTIVATIONAL_TIPS = [
  "💡 Regra 50-30-20: 50% para o essencial, 30% para desejos e 20% para o futuro.",
  "💡 Antes de comprar algo caro, espere 24h. Se a vontade passar, era impulso.",
  "💡 Pague-se primeiro: invista assim que receber.",
  "💡 Diversificação é a única 'almoço grátis' do mercado financeiro.",
  "💡 Revise suas assinaturas mensais recorrentes.",
  "💡 Reinvista seus dividendos para aproveitar os juros compostos.",
  "💡 Evite dívidas de cartão de crédito a todo custo.",
  "💡 Defina metas claras. 'Juntar dinheiro' é vago; 'Viagem em Dezembro' é um plano.",
  "💡 Nunca invista no que você não entende.",
  "💡 Mantenha sua reserva de emergência em liquidez diária.",
  "💡 O tempo no mercado ganha de tentar acertar o tempo do mercado.",
  "💡 Acompanhe seu patrimônio, mas não fique obsessivo com cotações diárias."
];

export default function GoalsTab({ income, expense, currentLimit, privacyMode }: GoalsTabProps) {
  const [limit, setLimit] = useState(currentLimit);
  const [loadingLimit, setLoadingLimit] = useState(false);

  const [investments, setInvestments] = useState<{ myInvestments: any[], partnerInvestments: any[] }>({ myInvestments: [], partnerInvestments: [] });
  const [isInvestModalOpen, setIsInvestModalOpen] = useState(false);
  const [loadingInvest, setLoadingInvest] = useState(true);

  const fetchInvestments = async () => {
    const res = await getInvestmentsAction();
    setInvestments(res);
    setLoadingInvest(false);
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

  const percentage = limit > 0 ? (expense / limit) * 100 : 0;
  const isOverLimit = expense > limit;

  const currentTip = useMemo(() => {
    return MOTIVATIONAL_TIPS[new Date().getHours() % MOTIVATIONAL_TIPS.length];
  }, []);

  const handleSaveLimit = async () => {
    setLoadingLimit(true);
    const formData = new FormData();
    formData.append('limit', limit.toString());
    const res = await updateSpendingLimitAction(formData);
    if (res.success) toast.success(res.message);
    else toast.error(res.error);
    setLoadingLimit(false);
  };

  const myTotal = investments.myInvestments.reduce((acc, i) => acc + Number(i.currentAmount), 0);
  const partnerTotal = investments.partnerInvestments.reduce((acc, i) => acc + Number(i.currentAmount), 0);
  const grandTotal = myTotal + partnerTotal;

  const allocationData = useMemo(() => {
    const all = [...investments.myInvestments, ...investments.partnerInvestments];
    const categories: any = {};
    all.forEach(i => {
      categories[i.category] = (categories[i.category] || 0) + i.currentAmount;
    });
    return Object.keys(categories).map(k => ({ name: k.replace('_', ' '), value: categories[k] }));
  }, [investments]);

  // Helper para esconder valores
  const maskValue = (val: number) => privacyMode ? '••••••' : formatCurrency(val);

  // --- NOVO: Lógica de Cores e Estilos para os Cards ---
  const getCategoryStyles = (cat: string) => {
    switch (cat) {
      case 'CRIPTO':
        return {
          icon: <Bitcoin size={18} className="text-orange-500" />,
          borderColor: 'group-hover:border-orange-500/50',
          shadowColor: 'group-hover:shadow-[0_0_20px_rgba(249,115,22,0.15)]',
          bgHover: 'group-hover:bg-orange-500/5'
        };
      case 'ACOES':
        return {
          icon: <TrendingUp size={18} className="text-blue-400" />,
          borderColor: 'group-hover:border-blue-400/50',
          shadowColor: 'group-hover:shadow-[0_0_20px_rgba(96,165,250,0.15)]',
          bgHover: 'group-hover:bg-blue-400/5'
        };
      case 'FII':
        return {
          icon: <Building size={18} className="text-purple-400" />,
          borderColor: 'group-hover:border-purple-400/50',
          shadowColor: 'group-hover:shadow-[0_0_20px_rgba(192,132,252,0.15)]',
          bgHover: 'group-hover:bg-purple-400/5'
        };
      case 'RENDA_FIXA':
        return {
          icon: <Landmark size={18} className="text-emerald-400" />,
          borderColor: 'group-hover:border-emerald-400/50',
          shadowColor: 'group-hover:shadow-[0_0_20px_rgba(52,211,153,0.15)]',
          bgHover: 'group-hover:bg-emerald-400/5'
        };
      default:
        return {
          icon: <Wallet size={18} className="text-gray-400" />,
          borderColor: 'group-hover:border-gray-400/50',
          shadowColor: 'group-hover:shadow-[0_0_20px_rgba(156,163,175,0.15)]',
          bgHover: 'group-hover:bg-white/5'
        };
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-0">

      {/* SEÇÃO 1: META DE GASTOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#1f1630] p-6 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-pink-500/10 w-64 h-64 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
              <Target className="text-pink-500" /> Teto de Gastos
            </h3>

            <div className="flex gap-4 mb-6">
              <div className="flex-1 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">R$</span>
                <input
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(parseFloat(e.target.value))}
                  className={`w-full bg-[#130b20] text-white text-xl font-bold pl-11 pr-4 py-3 rounded-xl border border-gray-700 focus:border-pink-500 outline-none transition ${privacyMode ? 'blur-sm' : ''}`}
                />
              </div>
              <button onClick={handleSaveLimit} disabled={loadingLimit} className="bg-pink-600 hover:bg-pink-500 text-white px-6 rounded-xl transition shadow-lg shadow-pink-600/20 active:scale-95">
                {loadingLimit ? <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full block" /> : <Save size={20} />}
              </button>
            </div>

            <div className="bg-[#130b20] p-4 rounded-xl border border-white/5">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Gasto Atual: {maskValue(expense)}</span>
                <span className={isOverLimit ? 'text-red-400' : 'text-green-400'}>{percentage.toFixed(1)}%</span>
              </div>
              <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${isOverLimit ? 'bg-red-500' : 'bg-gradient-to-r from-green-400 to-blue-500'}`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dica do Dia */}
        <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-500/20 p-6 rounded-3xl relative overflow-hidden flex flex-col justify-center shadow-lg shadow-blue-900/20">
          <Lightbulb className="text-blue-400 mb-3" size={28} />
          <h4 className="font-bold text-blue-100 mb-2">Insight de Hoje</h4>
          <p className="text-blue-200/70 text-sm italic leading-relaxed">"{currentTip}"</p>
        </div>
      </div>

      <div className="w-full h-px bg-white/5" />

      {/* SEÇÃO 2: CARTEIRA DE INVESTIMENTOS */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Briefcase className="text-emerald-400" /> Patrimônio
            </h2>
            <p className="text-gray-400 text-sm">Gerencie seus ativos e veja seu dinheiro crescer.</p>
          </div>
          <button
            onClick={() => setIsInvestModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition shadow-lg shadow-emerald-900/20 active:scale-95"
          >
            <Plus size={18} /> Novo Ativo
          </button>
        </div>

        {/* Loading State com Skeletons */}
        {loadingInvest ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Skeleton className="h-48 rounded-3xl bg-white/5 border border-white/5" />
            <Skeleton className="h-48 md:col-span-2 rounded-3xl bg-white/5 border border-white/5" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Card Total */}
            <div className="bg-[#1f1630] p-6 rounded-3xl border border-white/5 flex flex-col justify-center relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-500">
              <div className="absolute -right-10 -bottom-10 text-emerald-500/5 group-hover:text-emerald-500/10 transition-colors duration-500"><Briefcase size={150} /></div>
              <div className="flex justify-between items-start">
                <p className="text-gray-400 text-sm font-medium mb-1">Patrimônio Total</p>
                {privacyMode && <EyeOff size={16} className="text-gray-500" />}
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">
                {maskValue(grandTotal)}
              </h3>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Você</span>
                  <span>{maskValue(myTotal)}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500" style={{ width: `${grandTotal > 0 ? (myTotal / grandTotal) * 100 : 0}%` }} />
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Parceiro(a)</span>
                  <span>{maskValue(partnerTotal)}</span>
                </div>
              </div>
            </div>

            {/* Gráfico de Alocação */}
            <div className="md:col-span-2 bg-[#1f1630] p-6 rounded-3xl border border-white/5">
              <h4 className="text-sm text-gray-400 font-bold mb-4">Alocação por Classe</h4>
              <div className="h-40 w-full flex items-center">
                {allocationData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={allocationData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                        {allocationData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1a1025', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
                        formatter={(value: any) => privacyMode ? '••••••' : formatCurrency(Number(value))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full text-center text-gray-600 text-sm">Nenhum investimento registrado.</div>
                )}

                {/* Legenda Lateral */}
                <div className="ml-4 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                  {allocationData.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span>{d.name}</span>
                      {!privacyMode && <span className="font-bold opacity-60">({((d.value / grandTotal) * 100).toFixed(0)}%)</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lista de Ativos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Meus Investimentos */}
          <div className="bg-[#1f1630]/50 rounded-2xl p-4 border border-white/5">
            <h4 className="text-purple-400 font-bold text-sm mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full" /> Meus Ativos
            </h4>
            <div className="space-y-3">
              {loadingInvest ? (
                <SkeletonGroup>
                  <Skeleton className="h-16 w-full rounded-xl bg-white/5" />
                  <Skeleton className="h-16 w-full rounded-xl bg-white/5" />
                </SkeletonGroup>
              ) : investments.myInvestments.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">Sua carteira está vazia.</p>
              ) : (
                investments.myInvestments.map((inv: any) => (
                  <InvestmentCard
                    key={inv.id}
                    inv={inv}
                    styles={getCategoryStyles(inv.category)}
                    privacyMode={privacyMode}
                  />
                ))
              )}
            </div>
          </div>

          {/* Investimentos do Parceiro */}
          <div className="bg-[#1f1630]/50 rounded-2xl p-4 border border-white/5">
            <h4 className="text-pink-400 font-bold text-sm mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-pink-500 rounded-full" /> Carteira do Parceiro
            </h4>
            <div className="space-y-3">
              {loadingInvest ? (
                <SkeletonGroup>
                  <Skeleton className="h-16 w-full rounded-xl bg-white/5" />
                  <Skeleton className="h-16 w-full rounded-xl bg-white/5" />
                </SkeletonGroup>
              ) : investments.partnerInvestments.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">Carteira vazia.</p>
              ) : (
                investments.partnerInvestments.map((inv: any) => (
                  <InvestmentCard
                    key={inv.id}
                    inv={inv}
                    styles={getCategoryStyles(inv.category)}
                    privacyMode={privacyMode}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <InvestmentModal
        isOpen={isInvestModalOpen}
        onClose={() => setIsInvestModalOpen(false)}
        onSuccess={fetchInvestments}
      />
    </div>
  );
}

// Subcomponente de Cartão com Estilos Dinâmicos (Glow Effect)
function InvestmentCard({ inv, styles, privacyMode }: any) {
  return (
    <div className={`
      relative bg-[#130b20] p-3 rounded-xl border border-white/5 
      flex items-center justify-between transition-all duration-300 group
      ${styles.borderColor} ${styles.shadowColor} ${styles.bgHover}
    `}>
      <div className="flex items-center gap-3">
        {/* Ícone com fundo leve */}
        <div className="p-2 bg-white/5 rounded-lg group-hover:scale-110 transition-transform duration-300">
          {styles.icon}
        </div>
        <div>
          <p className="text-sm font-bold text-white group-hover:text-white transition-colors">{inv.name}</p>
          <p className="text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors">{inv.category.replace('_', ' ')}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-bold transition-all ${privacyMode ? 'text-gray-500' : 'text-emerald-400 group-hover:text-emerald-300'}`}>
          {privacyMode ? '••••••' : formatCurrency(inv.currentAmount)}
        </p>
        <p className="text-[10px] text-gray-600 group-hover:text-gray-500">
          Investido: {privacyMode ? '•••' : formatCurrency(inv.investedAmount)}
        </p>
      </div>
    </div>
  );
}

// Subcomponente Helper para Skeletons
const SkeletonGroup = ({ children }: any) => <div className="space-y-2">{children}</div>;