'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Heart, User, Zap,
  AlertTriangle, ArrowRightLeft, CalendarClock, Users, CreditCard,
  Calendar, Layers, Trophy, Wifi, Loader2, Printer, CalendarRange, RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, PieChart, Pie
} from 'recharts';
import dynamic from 'next/dynamic';
import { getMonthlyComparisonAction, payCreditCardBillAction, getFinancialProjectionAction } from '@/app/actions';
import { getDaysInMonth, isSameMonth } from 'date-fns';
import { toast } from 'sonner';

// --- NOVOS COMPONENTES DE SAÚDE FINANCEIRA ---
import FinLoveScore from '../FinLoveScore';
import Rule503020 from '../Rule503020';
import SubscriptionsModal from '../modals/SubscriptionsModal';

// Importação dinâmica
const PlanningTab = dynamic(() => import('./PlanningTab'), {
  loading: () => <div className="h-40 bg-white/5 rounded-2xl animate-pulse" />
});

const CHART_COLORS = ['#EC4899', '#8B5CF6', '#F59E0B', '#10B981', '#3B82F6', '#6366f1', '#ec4899'];

// --- TIPAGEM ---
interface Transaction {
  id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'INVESTMENT';
  category: string;
  userId: string;
  paymentMethod?: string | null;
  creditCardId?: string | null;
  isPaid: boolean;
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

interface CreditCardData {
  id: string;
  name: string;
  closingDay: number;
  dueDay: number;
  limit: number;
}

interface HomeTabProps {
  transactions: Transaction[];
  myStats: FinancialStats;
  partnerStats: FinancialStats;
  partnerName?: string;
  hasPartner: boolean;
  privacyMode: boolean;
  month: number;
  year: number;
  partnerId?: string;
  totalCreditOpen?: number;
  creditCards?: CreditCardData[];
  spendingLimit?: number;
}

export default function HomeTab({
  transactions,
  myStats, partnerStats, partnerName = 'Parceiro',
  hasPartner,
  privacyMode, month, year, partnerId,
  totalCreditOpen = 0,
  creditCards = [],
  spendingLimit = 2000
}: HomeTabProps) {

  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'ME' | 'PARTNER'>('ALL');
  const [isPaying, setIsPaying] = useState(false);

  // Novos Estados
  const [projectionData, setProjectionData] = useState<any[]>([]);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      const [compRes, projData] = await Promise.all([
        getMonthlyComparisonAction(month, year),
        getFinancialProjectionAction()
      ]);

      if (compRes.success && compRes.data) setComparison(compRes.data);
      if (projData) setProjectionData(projData);
    }
    fetchData();
  }, [month, year]);

  const formatCurrency = (val: number) =>
    privacyMode ? '••••' : `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const getBalanceColor = (val: number) => val >= 0 ? 'text-emerald-400' : 'text-red-400';

  // --- FUNÇÕES DE AÇÃO ---
  const handlePayInvoice = async () => {
    const targetCard = creditAnalysis.biggestInvoice;

    if (!targetCard || targetCard.value <= 0) {
      toast.info("Nenhuma fatura em aberto para pagar.");
      return;
    }

    const cardIdToPay = targetCard.id === 'unknown' ? null : targetCard.id;

    if (!cardIdToPay && targetCard.id === 'unknown') {
      toast.error("Não é possível pagar faturas de cartões removidos automaticamente.");
      return;
    }

    if (!confirm(`Deseja pagar a fatura de ${formatCurrency(targetCard.value)} agora? Isso debitará o valor do seu saldo.`)) {
      return;
    }

    setIsPaying(true);
    const res = await payCreditCardBillAction(cardIdToPay as string, month, year);

    if (res.success) {
      toast.success(res.message);
    } else {
      toast.error(res.error || "Erro ao pagar fatura.");
    }
    setIsPaying(false);
  };

  const handlePrintReport = () => {
    window.print();
  };

  // --- LÓGICA DE FILTRAGEM ---
  const filteredTransactions = useMemo(() => {
    if (filterMode === 'ME') return transactions.filter(t => t.userId !== partnerId);
    if (filterMode === 'PARTNER') return transactions.filter(t => t.userId === partnerId);
    return transactions;
  }, [transactions, filterMode, partnerId]);

  // --- ANÁLISE DE CARTÕES ---
  const creditAnalysis = useMemo(() => {
    const creditTxs = filteredTransactions.filter(t => t.type === 'EXPENSE' && t.paymentMethod === 'CREDIT' && !t.isPaid);

    const cardGroups: Record<string, number> = {};
    let total = 0;

    creditTxs.forEach(t => {
      const cardId = t.creditCardId || 'unknown';
      cardGroups[cardId] = (cardGroups[cardId] || 0) + Number(t.amount);
      total += Number(t.amount);
    });

    const breakdown = Object.keys(cardGroups).map(id => {
      const cardInfo = creditCards.find(c => c.id === id);
      return {
        id,
        name: cardInfo?.name || (id === 'unknown' ? 'Outros Cartões' : 'Cartão Removido'),
        value: cardGroups[id],
        info: cardInfo
      };
    }).sort((a, b) => b.value - a.value);

    return { total, breakdown, biggestInvoice: breakdown.length > 0 ? breakdown[0] : null };
  }, [filteredTransactions, creditCards]);

  // --- GRÁFICOS & INSIGHTS ---
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

  const barData = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + Number(t.amount), 0);
    const expense = filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + Number(t.amount), 0);
    return [
      { name: 'Entradas', valor: income },
      { name: 'Saídas', valor: expense },
    ];
  }, [filteredTransactions]);

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

  const villainCategory = useMemo(() => (pieData.length > 0 ? pieData[0] : null), [pieData]);

  const projection = useMemo(() => {
    const now = new Date();
    if (!isSameMonth(new Date(year, month, 1), now)) return null;
    const currentDay = now.getDate();
    if (currentDay <= 1) return null;
    const currentExpense = filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + Number(t.amount), 0);
    return (currentExpense / currentDay) * getDaysInMonth(now);
  }, [filteredTransactions, month, year]);

  const settlement = useMemo(() => {
    if (!hasPartner) return null;
    const totalShared = myStats.expense + partnerStats.expense;
    const diff = myStats.expense - (totalShared / 2);
    return { amount: Math.abs(diff), action: diff > 0 ? 'RECEIVE' : 'PAY' };
  }, [hasPartner, myStats, partnerStats]);

  const safePartnerName = partnerName ? partnerName.split(' ')[0] : 'Parceiro';

  return (
    <div className="space-y-8 print:space-y-4">
      {/* HEADER DE AÇÕES RÁPIDAS (NOVO) */}
      <div className="flex justify-end gap-3 print:hidden">
        <button onClick={() => setIsSubModalOpen(true)} className="flex items-center gap-2 bg-[#1f1630] hover:bg-white/10 text-gray-300 px-4 py-2 rounded-xl text-xs font-bold border border-white/10 transition shadow-sm">
          <RefreshCw size={16} className="text-pink-400" /> Assinaturas
        </button>
        <button onClick={handlePrintReport} className="flex items-center gap-2 bg-[#1f1630] hover:bg-white/10 text-gray-300 px-4 py-2 rounded-xl text-xs font-bold border border-white/10 transition shadow-sm">
          <Printer size={16} className="text-purple-400" /> Relatório PDF
        </button>
      </div>

      {/* 1. CARDS DE SALDO */}
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

      {/* FILTROS */}
      {hasPartner && (
        <div className="flex justify-center print:hidden">
          <div className="bg-[#1f1630] p-1 rounded-xl border border-white/5 inline-flex shadow-lg">
            <button onClick={() => setFilterMode('ME')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterMode === 'ME' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}><User size={14} /> Eu</button>
            <button onClick={() => setFilterMode('PARTNER')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterMode === 'PARTNER' ? 'bg-pink-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}><Heart size={14} /> {safePartnerName}</button>
            <button onClick={() => setFilterMode('ALL')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterMode === 'ALL' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}><Users size={14} /> Juntos</button>
          </div>
        </div>
      )}

      {/* --- SEÇÃO NOVA: TIMELINE DE PARCELAS (LIBERA LIMITE) --- */}
      <div className="bg-[#1f1630] border border-white/5 p-6 rounded-3xl relative overflow-hidden print:break-inside-avoid shadow-lg animate-in fade-in slide-in-from-bottom-2">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <CalendarRange className="text-purple-400" /> Futuro Financeiro (Parcelas)
          </h3>
          <span className="text-[10px] text-gray-400 font-bold bg-white/5 px-3 py-1.5 rounded-full border border-white/5">PRÓXIMOS 12 MESES</span>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
          {projectionData.length > 0 ? projectionData.map((item, idx) => (
            <div key={idx} className="min-w-[100px] bg-[#130b20] p-3 rounded-xl border border-white/5 flex flex-col items-center justify-center group hover:border-purple-500/30 transition shadow-sm">
              <span className="text-[10px] text-gray-400 uppercase font-bold mb-2">{item.date}</span>
              <div className="h-24 w-3 bg-gray-800 rounded-full relative overflow-hidden mb-3">
                {/* Altura relativa ao maior valor (simplificado) */}
                <div
                  className="absolute bottom-0 w-full bg-gradient-to-t from-purple-600 to-pink-500 rounded-full transition-all duration-1000 ease-out"
                  style={{ height: `${Math.min((item.amount / (spendingLimit || 2000)) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs font-bold text-white tracking-tight">{privacyMode ? '•••' : `R$ ${Math.round(item.amount)}`}</span>
            </div>
          )) : (
            <div className="w-full text-center py-8 text-gray-500 text-xs">
              <p>Nenhuma parcela futura encontrada.</p>
              <p>Registre compras parceladas para ver a projeção aqui.</p>
            </div>
          )}
        </div>
      </div>

      {/* --- SEÇÃO 2: ÁREA DE CARTÃO DE CRÉDITO --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* WIDGET DE CARTÃO: Visual Físico + Resumo */}
        <div className="bg-gradient-to-br from-[#2d2145] to-[#1a1025] rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col justify-between group min-h-[220px]">
          {/* Textura de Fundo */}
          <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay"></div>
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/40 to-transparent"></div>

          <div className="relative z-10 p-6 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
              {/* Chip do Cartão */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-9 rounded-lg bg-gradient-to-tr from-yellow-200 to-yellow-500 border border-yellow-400/50 shadow-sm flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 border-[0.5px] border-black/10 rounded-lg"></div>
                  <div className="w-full h-[1px] bg-black/10"></div>
                  <div className="h-full w-[1px] bg-black/10 absolute"></div>
                </div>
                <Wifi className="rotate-90 text-white/50" size={24} />
              </div>
              <CreditCard className="text-white/30" size={24} />
            </div>

            <div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1 shadow-black drop-shadow-md">Total em Faturas</p>

              <div className="flex justify-between items-end">
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl md:text-4xl font-mono font-bold text-white tracking-tight ${privacyMode ? 'blur-md' : ''}`}>
                    {formatCurrency(totalCreditOpen)}
                  </span>
                </div>

                {/* --- BOTÃO DE PAGAR --- */}
                {(totalCreditOpen || 0) > 0 && (
                  <button
                    onClick={handlePayInvoice}
                    disabled={isPaying}
                    className="bg-white text-purple-950 text-[10px] font-bold uppercase tracking-wider py-2 px-4 rounded-full shadow-lg hover:bg-gray-100 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                  >
                    {isPaying ? <Loader2 size={12} className="animate-spin" /> : <CreditCard size={12} />}
                    {isPaying ? 'Pagando...' : 'Pagar Fatura'}
                  </button>
                )}
              </div>
            </div>

            {/* Rodapé do Cartão */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
              {creditAnalysis.biggestInvoice && creditAnalysis.biggestInvoice.info ? (
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 uppercase font-bold">Vencimento</span>
                  <span className="text-xs text-white font-medium flex items-center gap-1">
                    <Calendar size={10} className="text-pink-400" /> Dia {creditAnalysis.biggestInvoice.info.dueDay}
                  </span>
                </div>
              ) : (
                <div className="text-[10px] text-gray-500">Sem vencimentos</div>
              )}

              <div className="flex flex-col items-end">
                <span className="text-[10px] text-gray-400 uppercase font-bold">Titular</span>
                <span className="text-xs text-white font-medium uppercase tracking-wider">
                  {filterMode === 'PARTNER' ? safePartnerName : 'Você'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* WIDGET DE ANÁLISE: Rosca + Maior Fatura (RESPONSIVO AJUSTADO) */}
        <div className="bg-[#1f1630] rounded-3xl border border-white/5 shadow-lg p-4 md:p-6 flex flex-col justify-between relative overflow-hidden">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 z-10">
            <Layers size={14} className="text-purple-400" /> Composição da Fatura
          </h3>

          {/* AJUSTE MOBILE: Flex-col em telas pequenas, Flex-row em maiores */}
          <div className="flex flex-col sm:flex-row items-center gap-4 z-10 h-full">
            {/* Gráfico Donut para Cartões */}
            <div className="w-full sm:w-1/2 h-40 sm:h-full min-h-[160px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={creditAnalysis.breakdown}
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {creditAnalysis.breakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1025', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff', fontSize: '12px' }}
                    formatter={(val: any) => privacyMode ? '••••' : `R$ ${Number(val).toFixed(2)}`}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Centro do Donut */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <CreditCard size={20} className="text-gray-600 opacity-50" />
              </div>
            </div>

            {/* Detalhes ao lado */}
            <div className="w-full sm:w-1/2 space-y-3">
              {/* Maior Fatura */}
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center gap-1">
                  <Trophy size={10} className="text-yellow-400" /> Maior Fatura
                </p>
                {creditAnalysis.biggestInvoice ? (
                  <>
                    <p className="text-xs font-bold text-white truncate">{creditAnalysis.biggestInvoice.name}</p>
                    <p className={`text-sm font-mono text-pink-400 ${privacyMode ? 'blur-sm' : ''}`}>
                      {formatCurrency(creditAnalysis.biggestInvoice.value)}
                    </p>
                    {creditAnalysis.biggestInvoice.info && (
                      <p className="text-[9px] text-gray-500 mt-0.5">Fecha dia {creditAnalysis.biggestInvoice.info.closingDay}</p>
                    )}
                  </>
                ) : <span className="text-xs text-gray-600">-</span>}
              </div>

              {/* Lista rápida (Top 2) */}
              <div className="space-y-1">
                {creditAnalysis.breakdown.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                      <span className="text-gray-400 truncate max-w-[60px]">{item.name}</span>
                    </div>
                    <span className={`text-gray-300 ${privacyMode ? 'blur-sm' : ''}`}>
                      {privacyMode ? '•••' : (item.value / (creditAnalysis.total || 1) * 100).toFixed(0) + '%'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- SEÇÃO 3: SAÚDE FINANCEIRA (NOVA) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4">
        <FinLoveScore transactions={filteredTransactions} limit={spendingLimit} />
        <Rule503020 transactions={filteredTransactions} />
      </div>

      {/* SEÇÃO 4: OUTROS INSIGHTS */}
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

        {/* PROJEÇÃO */}
        <div className="bg-[#1f1630] border border-blue-500/20 p-4 rounded-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 bg-blue-500/10 w-20 h-20 rounded-full blur-xl group-hover:bg-blue-500/20 transition"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2 text-blue-400 text-xs font-bold uppercase tracking-wider"><CalendarClock size={14} /> Projeção {filterMode === 'ME' ? 'Minha' : ''}</div>
            {projection ? (
              <>
                <p className={`text-lg font-bold text-white mb-0.5 ${privacyMode ? 'blur-sm' : ''}`}>{formatCurrency(projection)}</p>
                <p className="text-[10px] text-gray-500">Estimativa mensal</p>
              </>
            ) : <p className="text-sm text-gray-500">Sem dados.</p>}
          </div>
        </div>

        {/* ACERTO */}
        <div className={`bg-[#1f1630] border border-purple-500/20 p-4 rounded-2xl relative overflow-hidden group transition-opacity ${filterMode !== 'ALL' ? 'opacity-30 grayscale' : ''}`}>
          <div className="absolute -right-4 -top-4 bg-purple-500/10 w-20 h-20 rounded-full blur-xl group-hover:bg-purple-500/20 transition"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2 text-purple-400 text-xs font-bold uppercase tracking-wider"><ArrowRightLeft size={14} /> Acerto (Global)</div>
            {settlement && settlement.amount > 1 ? (
              <>
                <p className="text-[10px] text-gray-400 mb-0.5">{settlement.action === 'RECEIVE' ? 'Receber:' : 'Pagar:'}</p>
                <p className={`text-lg font-bold ${settlement.action === 'RECEIVE' ? 'text-emerald-400' : 'text-red-400'} ${privacyMode ? 'blur-sm' : ''}`}>{formatCurrency(settlement.amount)}</p>
              </>
            ) : <p className="text-sm text-gray-500">Equilibrado!</p>}
          </div>
        </div>
      </div>

      {/* SEÇÃO 5: GRÁFICOS INFERIORES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ROSCA DE CATEGORIAS (AJUSTADA TAMANHO MOBILE) */}
        <div className="md:col-span-1 bg-[#1f1630] p-4 md:p-6 rounded-3xl border border-white/5 shadow-lg flex flex-col relative overflow-hidden print:break-inside-avoid">
          <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
            <Zap size={16} className="text-yellow-400" /> Por Categoria
          </h3>
          <div className="flex flex-col items-center justify-center flex-1">
            {/* Responsivo: w-32 (mobile) -> w-40 (sm) */}
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full relative shadow-2xl transition-all hover:scale-105 duration-500" style={{ background: donutGradient }}>
              <div className="absolute inset-0 m-auto w-20 h-20 sm:w-28 sm:h-28 bg-[#1f1630] rounded-full flex flex-col items-center justify-center z-10">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Total</span>
                <span className={`text-sm font-bold text-white ${privacyMode ? 'blur-sm' : ''}`}>
                  {formatCurrency(pieData.reduce((acc, c) => acc + c.value, 0))}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* GRÁFICO DE BARRAS (BALANÇO) */}
        <div className="md:col-span-2 bg-[#1f1630] p-4 md:p-6 rounded-3xl border border-white/5 shadow-lg flex flex-col justify-center min-h-[250px] print:break-inside-avoid">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><DollarSign size={14} className="text-emerald-400" /> Balanço Geral</h3>
          <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 30, left: -10, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fill: '#e5e7eb', fontSize: 11, fontWeight: 600 }} width={60} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1a1025', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={(val: any) => privacyMode ? '••••' : `R$ ${Number(val).toFixed(2)}`}
                />
                <Bar dataKey="valor" barSize={32} radius={[0, 6, 6, 0]}>
                  {barData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : '#EF4444'} />)}
                  <LabelList
                    dataKey="valor"
                    position="right"
                    fill="#fff"
                    fontSize={12}
                    formatter={(val: any) => privacyMode ? '••••' : `R$ ${Number(val).toLocaleString('pt-BR', { notation: "compact" })}`}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 pt-8 print:hidden">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><DollarSign className="text-pink-500" /> Planejamento Mensal</h2>
        <PlanningTab month={month} year={year} partnerId={partnerId} partnerName={partnerName} />
      </div>

      {/* Modal de Assinaturas */}
      <SubscriptionsModal isOpen={isSubModalOpen} onClose={() => setIsSubModalOpen(false)} />
    </div>
  );
}