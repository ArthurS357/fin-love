'use client'

import { useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PieChart as PieChartIcon, 
  Activity 
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';

interface HomeTabProps {
  income: number;
  expense: number;
  balance: number;
  pieData: any[];
  barData: any[];
}

const COLORS = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function HomeTab({ income, expense, balance, pieData, barData }: HomeTabProps) {
  
  // Formatação de Moeda
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-0">
      
      {/* 1. Cards de Resumo (Cards Superiores) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card Saldo Total */}
        <div className="bg-gradient-to-br from-purple-900/50 to-[#1f1630] p-6 rounded-3xl border border-white/10 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet size={48} className="text-white" />
          </div>
          <div className="relative z-10">
            <p className="text-purple-200 text-sm font-medium mb-1">Saldo em Conta</p>
            <h3 className="text-3xl font-bold text-white tracking-tight">
              {formatCurrency(balance)}
            </h3>
            <div className="mt-4 flex items-center gap-2 text-xs text-purple-300/60 bg-white/5 w-fit px-2 py-1 rounded-lg">
              <Activity size={14} />
              <span>Visão mensal</span>
            </div>
          </div>
        </div>

        {/* Card Entradas */}
        <div className="bg-[#1f1630] p-6 rounded-3xl border border-white/5 shadow-lg flex flex-col justify-between group hover:border-green-500/30 transition-colors">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-green-500/10 rounded-2xl text-green-400 group-hover:scale-110 transition-transform">
              <TrendingUp size={24} />
            </div>
            <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-md">Receitas</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white mt-4">{formatCurrency(income)}</h3>
          </div>
        </div>

        {/* Card Saídas */}
        <div className="bg-[#1f1630] p-6 rounded-3xl border border-white/5 shadow-lg flex flex-col justify-between group hover:border-red-500/30 transition-colors">
          <div className="flex justify-between items-start">
            <div className="p-3 bg-red-500/10 rounded-2xl text-red-400 group-hover:scale-110 transition-transform">
              <TrendingDown size={24} />
            </div>
            <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-md">Despesas</span>
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white mt-4">{formatCurrency(expense)}</h3>
          </div>
        </div>
      </div>

      {/* 2. Área Gráfica */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico de Barras (Fluxo) */}
        <div className="bg-[#1f1630] p-6 rounded-3xl border border-white/5 shadow-lg">
          <h4 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="text-pink-500" size={20} /> Fluxo de Caixa
          </h4>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#6b7280" axisLine={false} tickLine={false} />
                <YAxis stroke="#6b7280" axisLine={false} tickLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1f1630', borderColor: '#374151', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  cursor={{ fill: '#ffffff05' }}
                />
                <Bar dataKey="valor" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Pizza (Categorias) */}
        <div className="bg-[#1f1630] p-6 rounded-3xl border border-white/5 shadow-lg flex flex-col">
          <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <PieChartIcon className="text-purple-500" size={20} /> Gastos por Categoria
          </h4>
          
          {pieData.length > 0 ? (
            <div className="flex-1 flex flex-col md:flex-row items-center gap-4">
              {/* Gráfico */}
              <div className="h-48 w-48 relative shrink-0">
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
                    <RechartsTooltip contentStyle={{ backgroundColor: '#1f1630', borderColor: '#374151', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Texto Central */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-xs text-gray-500 font-medium">Categorias</span>
                </div>
              </div>

              {/* Legenda Customizada */}
              <div className="flex-1 w-full grid grid-cols-2 gap-x-2 gap-y-2 overflow-y-auto max-h-48 pr-2 custom-scrollbar">
                {pieData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    <div 
                      className="w-3 h-3 rounded-full shrink-0" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-gray-300 truncate font-medium">{entry.name}</span>
                      <span className="text-gray-500">{((entry.value / expense) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 py-10 opacity-50">
              <PieChartIcon size={48} className="mb-2" />
              <p className="text-sm">Sem gastos registrados</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}