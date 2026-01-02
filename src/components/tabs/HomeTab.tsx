import React from 'react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { TrendingUp, TrendingDown, History, AlertCircle } from 'lucide-react';

// Reutilizando o card pequeno
function SummaryCard({ title, value, color, icon }: any) {
  return (
    <div className="bg-[#1f1630] p-5 rounded-xl border border-purple-900/20 flex items-center justify-between shadow-lg">
      <div>
        <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">{title}</p>
        <p className={`text-2xl font-bold ${color}`}>R$ {value.toFixed(2)}</p>
      </div>
      <div className={`p-3 rounded-xl bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
        {icon}
      </div>
    </div>
  );
}

const COLORS = ['#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

interface HomeTabProps {
  income: number;
  expense: number;
  balance: number;
  pieData: any[];
  barData: any[];
}

export default function HomeTab({ income, expense, balance, pieData, barData }: HomeTabProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard title="Receitas" value={income} color="text-green-400" icon={<TrendingUp />} />
        <SummaryCard title="Despesas" value={expense} color="text-red-400" icon={<TrendingDown />} />
        <SummaryCard title="Saldo" value={balance} color="text-purple-400" icon={<History />} />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico Pizza */}
        <div className="bg-[#1f1630] p-4 rounded-xl border border-purple-900/30 shadow-lg">
          <h3 className="text-base font-semibold mb-4 text-center text-gray-300">Distribuição de Gastos</h3>
          <div className="h-[250px] w-full">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {pieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1f1630', borderColor: '#4c1d95', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                <AlertCircle opacity={0.5} /> Sem despesas
              </div>
            )}
          </div>
        </div>

        {/* Gráfico Barras */}
        <div className="bg-[#1f1630] p-4 rounded-xl border border-purple-900/30 shadow-lg">
           <h3 className="text-base font-semibold mb-4 text-center text-gray-300">Fluxo de Caixa</h3>
           <div className="h-[250px] w-full">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#372f47" vertical={false} />
                  <XAxis dataKey="name" stroke="#9ca3af" tickLine={false} />
                  <YAxis stroke="#9ca3af" tickLine={false} tickFormatter={(val) => `R$${val}`} />
                  <Tooltip cursor={{fill: '#2a2235'}} contentStyle={{ backgroundColor: '#1f1630', borderColor: '#4c1d95' }} />
                  <Bar dataKey="valor" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={50} />
                </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
}