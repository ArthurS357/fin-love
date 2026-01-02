'use client'

import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, AlertCircle } from 'lucide-react';

interface HomeTabProps {
  income: number;
  expense: number;
  balance: number;
  pieData: any[];
  barData: any[];
}

// Cores vibrantes para o gráfico de pizza
const PIE_COLORS = ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

// Componente de Card Pequeno
function SummaryCard({ title, value, type }: { title: string, value: number, type: 'income' | 'expense' | 'balance' }) {
  let colors = '';
  let Icon = Wallet;

  switch (type) {
    case 'income':
      colors = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      Icon = TrendingUp;
      break;
    case 'expense':
      colors = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      Icon = TrendingDown;
      break;
    case 'balance':
      colors = 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      Icon = Wallet;
      break;
  }

  return (
    <div className={`p-5 rounded-2xl border backdrop-blur-md relative overflow-hidden group transition-all hover:-translate-y-1 ${colors.split(' ')[2]} bg-[#1f1630]/60`}>
      <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full blur-2xl opacity-20 ${colors.split(' ')[0].replace('text-', 'bg-')}`}></div>

      <div className="flex justify-between items-start relative z-10">
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1">{title}</p>
          <p className={`text-2xl md:text-3xl font-bold ${colors.split(' ')[0]}`}>
            R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className={`p-3 rounded-xl ${colors.split(' ')[1]}`}>
          <Icon size={24} className={colors.split(' ')[0]} />
        </div>
      </div>
    </div>
  );
}

export default function HomeTab({ income, expense, balance, pieData, barData }: HomeTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-0">

      {/* 1. Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard title="Receitas" value={income} type="income" />
        <SummaryCard title="Despesas" value={expense} type="expense" />
        <SummaryCard title="Saldo Atual" value={balance} type="balance" />
      </div>

      {/* 2. Área de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Gráfico de Distribuição (Pizza) */}
        <div className="bg-[#1f1630]/60 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
            Distribuição de Gastos
          </h3>

          <div className="flex-1 min-h-[250px] relative">
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
                    {pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1025',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#fff',
                      boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)'
                    }}
                    itemStyle={{ color: '#fff' }}
                    // CORREÇÃO AQUI: Usamos 'any' para evitar conflito de tipos com undefined
                    formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-3">
                <div className="p-4 bg-white/5 rounded-full">
                  <AlertCircle size={32} opacity={0.5} />
                </div>
                <p className="text-sm font-medium">Sem despesas registradas este mês</p>
              </div>
            )}

            {/* Legenda Customizada (para telas maiores) */}
            {pieData.length > 0 && (
              <div className="absolute bottom-0 right-0 hidden md:flex flex-col gap-1 text-xs text-gray-400 pointer-events-none opacity-50">
                {pieData.slice(0, 3).map((d, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i] }}></span>
                    {d.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Gráfico de Fluxo (Barras) */}
        <div className="bg-[#1f1630]/60 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-pink-500 rounded-full"></span>
            Fluxo do Mês
          </h3>

          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#9ca3af"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  stroke="#9ca3af"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `R$${val}`}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)', radius: 8 }}
                  contentStyle={{
                    backgroundColor: '#1a1025',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: '#fff'
                  }}
                // CORREÇÃO: Aplicado mesmo padrão seguro aqui se necessário, mas o padrão do Recharts já funciona bem para barras simples
                />
                <Bar
                  dataKey="valor"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={60}
                >
                  {barData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={index === 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}