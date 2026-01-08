'use client';

import { TrendingUp, TrendingDown, DollarSign, Heart, User, AlertCircle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis } from 'recharts';
import dynamic from 'next/dynamic';

const PlanningTab = dynamic(() => import('./PlanningTab'), {
  loading: () => <div className="h-40 bg-white/5 rounded-2xl animate-pulse" />
});

const COLORS = ['#EC4899', '#8B5CF6', '#F59E0B', '#10B981', '#3B82F6'];

interface HomeTabProps {
  myStats: { income: number; expense: number; balance: number };
  partnerStats: { income: number; expense: number; balance: number };
  partnerName: string;
  hasPartner: boolean;
  pieData: any[];
  barData: any[];
  privacyMode: boolean;
  month: number;
  year: number;
  partnerId?: string;
}

export default function HomeTab({
  myStats, partnerStats, partnerName, hasPartner,
  pieData, barData, privacyMode,
  month, year, partnerId
}: HomeTabProps) {

  const formatCurrency = (val: number) =>
    privacyMode ? '••••' : `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  // Helper para cores condicionais
  const getBalanceColor = (val: number) => val >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="space-y-8">

      {/* SEÇÃO 1: CARDS DE SALDO SEPARADOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* --- MEU CARD --- */}
        <div className="bg-[#1f1630] p-6 rounded-3xl border border-white/5 shadow-lg relative overflow-hidden group">
          {/* Efeito de fundo sutil */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-400"><User size={14} /></div>
              <h3 className="text-gray-400 text-sm font-medium">Minhas Finanças</h3>
            </div>

            {/* Saldo Principal com Cor */}
            <p className={`text-3xl font-bold mb-6 ${privacyMode ? 'text-white' : getBalanceColor(myStats.balance)}`}>
              {formatCurrency(myStats.balance)}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#130b20]/50 p-3 rounded-2xl border border-white/5">
                <div className="flex items-center gap-2 text-emerald-400 text-xs mb-1 font-bold uppercase tracking-wider">
                  <TrendingUp size={14} /> Entradas
                </div>
                <p className="font-semibold text-gray-200">{formatCurrency(myStats.income)}</p>
              </div>
              <div className="bg-[#130b20]/50 p-3 rounded-2xl border border-white/5">
                <div className="flex items-center gap-2 text-red-400 text-xs mb-1 font-bold uppercase tracking-wider">
                  <TrendingDown size={14} /> Saídas
                </div>
                <p className="font-semibold text-gray-200">{formatCurrency(myStats.expense)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* --- CARD DO PARCEIRO --- */}
        {hasPartner ? (
          <div className="bg-[#1f1630] p-6 rounded-3xl border border-white/5 shadow-lg relative overflow-hidden group">
            {/* Efeito de fundo rosa sutil */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-pink-500/10 rounded-lg text-pink-400"><Heart size={14} /></div>
                <h3 className="text-gray-400 text-sm font-medium">Finanças de {partnerName.split(' ')[0]}</h3>
              </div>

              {/* Saldo Parceiro com Cor */}
              <p className={`text-3xl font-bold mb-6 ${privacyMode ? 'text-white' : getBalanceColor(partnerStats.balance)}`}>
                {formatCurrency(partnerStats.balance)}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#130b20]/50 p-3 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs mb-1 font-bold uppercase tracking-wider">
                    <TrendingUp size={14} /> Entradas
                  </div>
                  <p className="font-semibold text-gray-200">{formatCurrency(partnerStats.income)}</p>
                </div>
                <div className="bg-[#130b20]/50 p-3 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 text-red-400 text-xs mb-1 font-bold uppercase tracking-wider">
                    <TrendingDown size={14} /> Saídas
                  </div>
                  <p className="font-semibold text-gray-200">{formatCurrency(partnerStats.expense)}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Estado Desconectado (Roxo Acinzentado / Neutro)
          <div className="bg-[#1f1630] p-6 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center group hover:bg-white/[0.02] transition">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3 text-gray-500 group-hover:text-pink-400 group-hover:scale-110 transition">
              <Heart size={24} />
            </div>
            <p className="text-gray-300 font-medium mb-1">Conecte-se ao seu amor</p>
            <p className="text-xs text-gray-500 max-w-[220px] leading-relaxed">
              Junte suas finanças para ver o saldo e os gastos dele(a) aqui, com as mesmas cores e detalhes.
            </p>
          </div>
        )}
      </div>

      {/* SEÇÃO 2: GRÁFICOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-[#1f1630] p-6 rounded-3xl border border-white/5 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-6">Gastos por Categoria</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(255,255,255,0.05)" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1025', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(val: any) => `R$ ${Number(val).toFixed(2)}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#1f1630] p-6 rounded-3xl border border-white/5 shadow-lg flex flex-col justify-center">
          <h3 className="text-lg font-bold text-white mb-4 text-center">Balanço Geral</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ backgroundColor: '#1a1025', border: 'none', borderRadius: '8px' }}
                  formatter={(val: any) => `R$ ${Number(val).toFixed(2)}`}
                />
                <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                  {barData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : '#EF4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SEÇÃO 3: PLANILHA DE PLANEJAMENTO */}
      <div className="border-t border-white/5 pt-8">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <DollarSign className="text-pink-500" /> Planejamento Mensal
        </h2>
        <PlanningTab
          month={month}
          year={year}
          partnerId={partnerId}
          partnerName={partnerName}
        />
      </div>
    </div>
  );
}