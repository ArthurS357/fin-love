'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Heart, User, Zap, 
  AlertTriangle, ArrowRightLeft, CalendarClock, Users 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList 
} from 'recharts';
import dynamic from 'next/dynamic';
import { getMonthlyComparisonAction } from '@/app/actions';
import { getDaysInMonth, isSameMonth } from 'date-fns';

// Importação dinâmica para não travar o carregamento inicial
const PlanningTab = dynamic(() => import('./PlanningTab'), {
  loading: () => <div className="h-40 bg-white/5 rounded-2xl animate-pulse" />
});

// Cores vibrantes para o gráfico CSS
const CHART_COLORS = ['#EC4899', '#8B5CF6', '#F59E0B', '#10B981', '#3B82F6', '#6366f1', '#ec4899'];

// --- TIPAGEM SÓLIDA ---
interface Transaction {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'INVESTMENT';
  category: string;
  userId: string;
}

interface FinancialStats {
  income: number;
  expense: number;
  balance: number;
}

interface ComparisonData {
  increased: boolean;
  diffPercent: number;
}

interface HomeTabProps {
  transactions: Transaction[];
  myStats: FinancialStats;
  partnerStats: FinancialStats;
  partnerName?: string; // Pode ser opcional se não tiver parceiro
  hasPartner: boolean;
  privacyMode: boolean;
  month: number;
  year: number;
  partnerId?: string;
}

export default function HomeTab({
  transactions,
  myStats, partnerStats, partnerName = 'Parceiro', // Valor padrão seguro
  hasPartner,
  privacyMode, month, year, partnerId
}: HomeTabProps) {

  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'ME' | 'PARTNER'>('ALL');

  useEffect(() => {
    async function fetchComparison() {
      const res = await getMonthlyComparisonAction(month, year);
      if (res.success && res.data) setComparison(res.data);
    }
    fetchComparison();
  }, [month, year]);

  const formatCurrency = (val: number) =>
    privacyMode ? '••••' : `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const getBalanceColor = (val: number) => val >= 0 ? 'text-emerald-400' : 'text-red-400';

  // --- LÓGICA DE FILTRAGEM ---
  const filteredTransactions = useMemo(() => {
    if (filterMode === 'ME') return transactions.filter(t => t.userId !== partnerId);
    if (filterMode === 'PARTNER') return transactions.filter(t => t.userId === partnerId);
    return transactions;
  }, [transactions, filterMode, partnerId]);

  // --- DADOS DO GRÁFICO DE ROSCA ---
  const pieData = useMemo(() => {
    const categories: Record<string, number> = {};
    filteredTransactions
      .filter(t => t.type === 'EXPENSE')
      .forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + Number(t.amount);
      });
    return Object.keys(categories)
      .map(key => ({ name: key, value: categories[key] }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // --- DADOS DO GRÁFICO DE BARRAS ---
  const barData = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + Number(t.amount), 0);
    const expense = filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + Number(t.amount), 0);
    return [
      { name: 'Entradas', valor: income },
      { name: 'Saídas', valor: expense },
    ];
  }, [filteredTransactions]);

  // --- GRADIENTE CSS PURO (Conic) ---
  const donutGradient = useMemo(() => {
    const total = pieData.reduce((acc, cur) => acc + cur.value, 0);
    if (total === 0) return 'conic-gradient(#333 0% 100%)';

    let currentAngle = 0;
    const parts = pieData.map((entry, i) => {
      const percentage = (entry.value / total) * 100;
      const start = currentAngle;
      currentAngle += percentage;
      return `${CHART_COLORS[i % CHART_COLORS.length]} ${start}% ${currentAngle}%`;
    });
    return `conic-gradient(${parts.join(', ')})`;
  }, [pieData]);

  // --- INSIGHTS INTELIGENTES ---
  const villainCategory = useMemo(() => {
    if (pieData.length === 0) return null;
    return pieData[0];
  }, [pieData]);

  const projection = useMemo(() => {
    const now = new Date();
    const isCurrentMonth = isSameMonth(new Date(year, month, 1), now);
    if (!isCurrentMonth) return null;

    const currentDay = now.getDate();
    const daysInMonth = getDaysInMonth(now);
    if (currentDay <= 1) return null;

    const currentExpense = filteredTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc, t) => acc + Number(t.amount), 0);

    const dailyAvg = currentExpense / currentDay;
    return dailyAvg * daysInMonth;
  }, [filteredTransactions, month, year]);

  const settlement = useMemo(() => {
    if (!hasPartner) return null;
    const totalShared = myStats.expense + partnerStats.expense;
    const fairShare = totalShared / 2;
    const diff = myStats.expense - fairShare;
    return { amount: Math.abs(diff), action: diff > 0 ? 'RECEIVE' : 'PAY' };
  }, [hasPartner, myStats.expense, partnerStats.expense]);

  // Nome seguro para exibição
  const safePartnerName = partnerName ? partnerName.split(' ')[0] : 'Parceiro';

  return (
    <div className="space-y-8">
      {/* SEÇÃO 1: CARDS DE SALDO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* MEU CARD */}
        <div className={`bg-[#1f1630] p-6 rounded-3xl border shadow-lg relative overflow-hidden group transition-all duration-300 ${filterMode === 'PARTNER' ? 'opacity-40 grayscale border-white/5' : 'border-purple-500/30'}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-400"><User size={14} /></div>
                <h3 className="text-gray-400 text-sm font-medium">Minhas Finanças</h3>
              </div>
              {comparison && (
                <div className={`text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 border ${comparison.increased ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                  {comparison.increased ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(comparison.diffPercent)}%
                </div>
              )}
            </div>
            <p className={`text-3xl font-bold mb-6 ${privacyMode ? 'blur-md select-none text-white' : getBalanceColor(myStats.balance)} transition-all duration-300`}>
              {formatCurrency(myStats.balance)}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#130b20]/50 p-3 rounded-2xl border border-white/5">
                <div className="flex items-center gap-2 text-emerald-400 text-xs mb-1 font-bold uppercase tracking-wider"><TrendingUp size={14} /> Entradas</div>
                <p className={`font-semibold text-gray-200 ${privacyMode ? 'blur-sm' : ''}`}>{formatCurrency(myStats.income)}</p>
              </div>
              <div className="bg-[#130b20]/50 p-3 rounded-2xl border border-white/5">
                <div className="flex items-center gap-2 text-red-400 text-xs mb-1 font-bold uppercase tracking-wider"><TrendingDown size={14} /> Saídas</div>
                <p className={`font-semibold text-gray-200 ${privacyMode ? 'blur-sm' : ''}`}>{formatCurrency(myStats.expense)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* PARCEIRO CARD */}
        {hasPartner ? (
          <div className={`bg-[#1f1630] p-6 rounded-3xl border shadow-lg relative overflow-hidden group transition-all duration-300 ${filterMode === 'ME' ? 'opacity-40 grayscale border-white/5' : 'border-pink-500/30'}`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-pink-500/10 rounded-lg text-pink-400"><Heart size={14} /></div>
                <h3 className="text-gray-400 text-sm font-medium">Finanças de {safePartnerName}</h3>
              </div>
              <p className={`text-3xl font-bold mb-6 ${privacyMode ? 'blur-md select-none text-white' : getBalanceColor(partnerStats.balance)} transition-all duration-300`}>
                {formatCurrency(partnerStats.balance)}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#130b20]/50 p-3 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs mb-1 font-bold uppercase tracking-wider"><TrendingUp size={14} /> Entradas</div>
                  <p className={`font-semibold text-gray-200 ${privacyMode ? 'blur-sm' : ''}`}>{formatCurrency(partnerStats.income)}</p>
                </div>
                <div className="bg-[#130b20]/50 p-3 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 text-red-400 text-xs mb-1 font-bold uppercase tracking-wider"><TrendingDown size={14} /> Saídas</div>
                  <p className={`font-semibold text-gray-200 ${privacyMode ? 'blur-sm' : ''}`}>{formatCurrency(partnerStats.expense)}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#1f1630] p-6 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center group hover:bg-white/[0.02] transition">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3 text-gray-500 group-hover:text-pink-400 group-hover:scale-110 transition"><Heart size={24} /></div>
            <p className="text-gray-300 font-medium mb-1">Conecte-se ao seu amor</p>
            <p className="text-xs text-gray-500 max-w-[220px] leading-relaxed">Junte suas finanças para ver o saldo e os gastos dele(a) aqui.</p>
          </div>
        )}
      </div>

      {/* SEÇÃO 2: GRÁFICOS E CARDS INTELIGENTES */}
      <div className="space-y-6">

        {/* FILTRO VISUAL */}
        {hasPartner && (
          <div className="flex justify-center">
            <div className="bg-[#1f1630] p-1 rounded-xl border border-white/5 inline-flex shadow-lg">
              <button onClick={() => setFilterMode('ME')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterMode === 'ME' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
                <User size={14} /> Eu
              </button>
              <button onClick={() => setFilterMode('PARTNER')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterMode === 'PARTNER' ? 'bg-pink-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
                <Heart size={14} /> {safePartnerName}
              </button>
              <button onClick={() => setFilterMode('ALL')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterMode === 'ALL' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}>
                <Users size={14} /> Juntos
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* 1. GRÁFICO DE ROSCA CSS PURO */}
          <div className="md:col-span-1 bg-[#1f1630] p-6 rounded-3xl border border-white/5 shadow-lg flex flex-col relative overflow-hidden">
            <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
              <Zap size={16} className="text-yellow-400" /> Gastos {filterMode === 'ME' ? 'Meus' : filterMode === 'PARTNER' ? `de ${safePartnerName}` : 'Totais'}
            </h3>

            <div className="flex flex-col items-center justify-center flex-1">
              {pieData.length > 0 ? (
                <>
                  <div className="w-40 h-40 rounded-full relative shadow-2xl transition-all hover:scale-105 duration-500" style={{ background: donutGradient }}>
                    <div className="absolute inset-0 m-auto w-28 h-28 bg-[#1f1630] rounded-full flex flex-col items-center justify-center z-10">
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Total</span>
                      <span className={`text-sm font-bold text-white ${privacyMode ? 'blur-sm' : ''}`}>
                        {formatCurrency(pieData.reduce((acc, c) => acc + c.value, 0))}
                      </span>
                    </div>
                  </div>
                  <div className="mt-6 w-full space-y-2">
                    {pieData.slice(0, 3).map((entry, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></span>
                          <span className="text-gray-300 truncate max-w-[100px]">{entry.name}</span>
                        </div>
                        <span className={`text-gray-400 font-mono ${privacyMode ? 'blur-sm' : ''}`}>{formatCurrency(entry.value)}</span>
                      </div>
                    ))}
                    {pieData.length > 3 && <p className="text-center text-[10px] text-gray-500 mt-2">+ {pieData.length - 3} outras</p>}
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-500 py-10"><p className="text-sm">Sem gastos neste filtro.</p></div>
              )}
            </div>
          </div>

          {/* 2. CARDS DE INSIGHTS E BALANÇO */}
          <div className="md:col-span-2 space-y-6">

            {/* LINHA DE CARDS INTELIGENTES */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              {/* VILÃO DO MÊS */}
              <div className="bg-[#1f1630] border border-red-500/20 p-4 rounded-2xl relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 bg-red-500/10 w-20 h-20 rounded-full blur-xl group-hover:bg-red-500/20 transition"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2 text-red-400 text-xs font-bold uppercase tracking-wider"><AlertTriangle size={14} /> Vilão {filterMode === 'ME' ? 'Meu' : ''}</div>
                  {villainCategory ? (
                    <>
                      <p className="text-lg font-bold text-white mb-0.5 truncate">{villainCategory.name}</p>
                      <p className={`text-sm text-gray-400 ${privacyMode ? 'blur-sm' : ''}`}>{formatCurrency(villainCategory.value)}</p>
                    </>
                  ) : <p className="text-sm text-gray-500">Tudo tranquilo.</p>}
                </div>
              </div>

              {/* PROJEÇÃO DE GASTOS */}
              <div className="bg-[#1f1630] border border-blue-500/20 p-4 rounded-2xl relative overflow-hidden group">
                <div className="absolute -right-4 -top-4 bg-blue-500/10 w-20 h-20 rounded-full blur-xl group-hover:bg-blue-500/20 transition"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2 text-blue-400 text-xs font-bold uppercase tracking-wider"><CalendarClock size={14} /> Projeção {filterMode === 'ME' ? 'Minha' : ''}</div>
                  {projection ? (
                    <>
                      <p className={`text-lg font-bold text-white mb-0.5 ${privacyMode ? 'blur-sm' : ''}`}>{formatCurrency(projection)}</p>
                      <p className="text-[10px] text-gray-500">Se {filterMode === 'ME' ? 'você' : 'vocês'} mantiver{filterMode === 'ALL' ? 'em' : ''} o ritmo...</p>
                    </>
                  ) : <p className="text-sm text-gray-500">Sem dados suficientes.</p>}
                </div>
              </div>

              {/* ACERTO DE CONTAS */}
              <div className={`bg-[#1f1630] border border-purple-500/20 p-4 rounded-2xl relative overflow-hidden group transition-opacity ${filterMode !== 'ALL' ? 'opacity-30 grayscale' : ''}`}>
                <div className="absolute -right-4 -top-4 bg-purple-500/10 w-20 h-20 rounded-full blur-xl group-hover:bg-purple-500/20 transition"></div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2 text-purple-400 text-xs font-bold uppercase tracking-wider"><ArrowRightLeft size={14} /> Acerto (Global)</div>
                  {settlement && settlement.amount > 1 ? (
                    <>
                      <p className="text-[10px] text-gray-400 mb-1">{settlement.action === 'RECEIVE' ? 'Parceiro te deve:' : 'Você deve:'}</p>
                      <p className={`text-lg font-bold ${settlement.action === 'RECEIVE' ? 'text-emerald-400' : 'text-red-400'} ${privacyMode ? 'blur-sm' : ''}`}>{formatCurrency(settlement.amount)}</p>
                    </>
                  ) : <p className="text-sm text-gray-500">Contas equilibradas!</p>}
                </div>
              </div>
            </div>

            {/* GRÁFICO DE BARRAS (BALANÇO GERAL) CORRIGIDO */}
            <div className="bg-[#1f1630] p-6 rounded-3xl border border-white/5 shadow-lg flex flex-col justify-center h-[200px]">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><DollarSign size={14} className="text-emerald-400" /> Balanço {filterMode === 'ME' ? 'Pessoal' : filterMode === 'PARTNER' ? `de ${safePartnerName}` : 'Geral'}</h3>
              <div className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 50, left: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    {/* YAxis: Texto claro e visível */}
                    <YAxis type="category" dataKey="name" tick={{ fill: '#e5e7eb', fontSize: 11, fontWeight: 600 }} width={60} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: '#1a1025', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#9ca3af' }}
                      // CORREÇÃO: Tipagem segura para o formatter
                      formatter={(val: any) => privacyMode ? '••••' : `R$ ${Number(val).toFixed(2)}`}
                    />
                    <Bar dataKey="valor" barSize={24} radius={[0, 4, 4, 0]}>
                      {barData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : '#EF4444'} />)}
                      {/* LabelList: Valores brancos ao lado da barra */}
                      <LabelList
                        dataKey="valor"
                        position="right"
                        fill="#fff"
                        fontSize={11}
                        // CORREÇÃO: Tipagem segura para o formatter
                        formatter={(val: any) => privacyMode ? '••••' : `R$ ${Number(val).toLocaleString('pt-BR', { notation: "compact" })}`}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 pt-8">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><DollarSign className="text-pink-500" /> Planejamento Mensal</h2>
        <PlanningTab month={month} year={year} partnerId={partnerId} partnerName={partnerName} />
      </div>
    </div>
  );
}