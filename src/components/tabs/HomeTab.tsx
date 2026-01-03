'use client';

import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Wallet, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  MoreHorizontal 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie 
} from 'recharts';

interface HomeTabProps {
  income: number;
  expense: number;
  balance: number;
  accumulatedBalance: number; // NOVO: Saldo total da vida
  pieData: any[];
  barData: any[];
  privacyMode: boolean;
}

const COLORS = ['#EC4899', '#8B5CF6', '#A855F7', '#D946EF', '#F472B6', '#C084FC'];

export default function HomeTab({ 
  income, 
  expense, 
  balance, 
  accumulatedBalance, 
  pieData, 
  barData, 
  privacyMode 
}: HomeTabProps) {

  // Lógica: Se o saldo total é 5000 e o do mês é 1000, então 4000 veio de antes.
  const previousBalance = accumulatedBalance - balance;

  const formatCurrency = (value: number) => {
    if (privacyMode) return '••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      
      {/* --- CARD PRINCIPAL (SALDO ACUMULADO) --- */}
      <div className="relative overflow-hidden rounded-[2rem] p-6 shadow-2xl bg-gradient-to-br from-pink-600 to-purple-700 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Background Decorativo */}
        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-64 h-64 bg-white opacity-5 blur-3xl rounded-full pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-black opacity-10 blur-2xl rounded-full pointer-events-none"></div>

        <div className="relative z-10 text-white">
          <div className="flex items-center gap-2 mb-2 opacity-90">
            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
              <Wallet size={16} className="text-white" />
            </div>
            <span className="text-sm font-medium tracking-wide">Saldo Total em Conta</span>
          </div>

          <div className="mb-6">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              {formatCurrency(accumulatedBalance)}
            </h2>
          </div>

          {/* Detalhamento (Mês Anterior vs Atual) */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/5">
             {/* Veio do Mês Passado */}
             <div className="flex items-center gap-3 pr-6 sm:border-r border-white/10">
                <div className="p-2 rounded-full bg-white/10">
                  <MoreHorizontal size={18} className="text-pink-200" />
                </div>
                <div>
                   <p className="text-[10px] uppercase font-bold text-pink-200/70 tracking-wider">Mês Anterior</p>
                   <p className="font-semibold text-lg">{formatCurrency(previousBalance)}</p>
                </div>
             </div>

             {/* Resultado deste Mês */}
             <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${balance >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  {balance >= 0 ? <TrendingUp size={18} className="text-green-300" /> : <ArrowDownCircle size={18} className="text-red-300" />}
                </div>
                <div>
                   <p className="text-[10px] uppercase font-bold text-pink-200/70 tracking-wider">Resultado do Mês</p>
                   <p className={`font-semibold text-lg ${balance >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                     {balance > 0 ? '+' : ''}{formatCurrency(balance)}
                   </p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* --- CARDS DE ENTRADA E SAÍDA DO MÊS --- */}
      <div className="grid grid-cols-2 gap-4">
        {/* Entradas */}
        <div className="bg-[#1a1025] border border-white/5 p-5 rounded-3xl relative overflow-hidden group hover:border-white/10 transition-colors">
          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <ArrowUpCircle size={80} />
          </div>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-green-500/10 rounded-xl text-green-400">
              <ArrowUpCircle size={20} />
            </div>
            <span className="text-gray-400 text-sm font-medium">Entradas</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(income)}</p>
        </div>

        {/* Saídas */}
        <div className="bg-[#1a1025] border border-white/5 p-5 rounded-3xl relative overflow-hidden group hover:border-white/10 transition-colors">
          <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <ArrowDownCircle size={80} />
          </div>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-red-500/10 rounded-xl text-red-400">
              <ArrowDownCircle size={20} />
            </div>
            <span className="text-gray-400 text-sm font-medium">Saídas</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(expense)}</p>
        </div>
      </div>

      {/* --- GRÁFICOS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Gráfico de Barras (Resumo) */}
        <div className="bg-[#1a1025] p-6 rounded-3xl border border-white/5">
          <h3 className="text-white font-bold mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-purple-400" /> Fluxo Mensal
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barSize={40}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9CA3AF', fontSize: 12 }} 
                  dy={10}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1f1630', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                />
                <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : '#EF4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Pizza (Categorias) */}
        <div className="bg-[#1a1025] p-6 rounded-3xl border border-white/5">
          <h3 className="text-white font-bold mb-6 flex items-center gap-2">
            <PieChartIcon size={18} className="text-pink-400" /> Gastos por Categoria
          </h3>
          <div className="h-64 w-full flex items-center justify-center relative">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f1630', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-gray-500">
                <PieChartIcon size={48} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">Sem gastos registrados</p>
              </div>
            )}
            
            {/* Texto Central (Total Gastos) */}
            {pieData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className="text-xs text-gray-400 font-medium">Total</span>
                 <span className="text-lg font-bold text-white">{formatCurrency(expense)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}