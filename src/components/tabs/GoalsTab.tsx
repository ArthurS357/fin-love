import React, { useMemo, useState } from 'react';
import { Target, Trophy, AlertTriangle, TrendingDown, Wallet, Pencil, Check, X } from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip 
} from 'recharts';

interface GoalsTabProps {
  income: number;
  expense: number;
  transactions: any[];
}

export default function GoalsTab({ income, expense, transactions }: GoalsTabProps) {
  // Estado para controlar a edição da meta
  const [isEditing, setIsEditing] = useState(false);
  const [customLimit, setCustomLimit] = useState<number | null>(null);
  const [tempLimit, setTempLimit] = useState('');

  // Lógica de Meta: Padrão (80% renda) ou Personalizado
  const defaultLimit = income > 0 ? income * 0.8 : 2000;
  const spendingLimit = customLimit !== null ? customLimit : defaultLimit;
  
  const percentageSpent = spendingLimit > 0 ? (expense / spendingLimit) * 100 : 0;
  const remaining = spendingLimit - expense;
  const isOverBudget = expense > spendingLimit;

  // Handlers para edição
  const startEditing = () => {
    setTempLimit(spendingLimit.toString());
    setIsEditing(true);
  };

  const saveLimit = () => {
    const val = parseFloat(tempLimit);
    if (!isNaN(val) && val > 0) {
      setCustomLimit(val);
    }
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  const resetToAuto = () => {
    setCustomLimit(null);
    setIsEditing(false);
  };

  const getStatusMessage = () => {
    if (income === 0 && expense === 0 && !customLimit) return { title: "Sem dados", msg: "Adicione transações para começar.", color: "text-gray-400" };
    if (isOverBudget) return { 
        title: "Limite Excedido", 
        msg: "Você ultrapassou seu teto de gastos. Hora de rever o orçamento!", 
        color: "text-rose-400",
        icon: <AlertTriangle size={32} />
    };
    if (percentageSpent > 85) return { 
        title: "Alerta Amarelo", 
        msg: "Cuidado, você está muito perto do limite definido.", 
        color: "text-amber-400",
        icon: <AlertTriangle size={32} />
    };
    return { 
        title: "Dentro da Meta", 
        msg: "Excelente! Seus gastos estão controlados conforme o planejado.", 
        color: "text-emerald-400",
        icon: <Trophy size={32} />
    };
  };

  const status = getStatusMessage();

  const data = [
    { name: 'Gasto', value: expense },
    { name: 'Disponível', value: Math.max(0, remaining) }
  ];

  const topCategories = useMemo(() => {
    const cats: Record<string, number> = {};
    transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + t.amount;
    });
    return Object.entries(cats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
  }, [transactions]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 pb-24 md:pb-0">
      
      {/* Card Principal */}
      <div className={`relative overflow-hidden rounded-3xl p-6 border border-white/10 shadow-2xl bg-gradient-to-br from-[#1f1630] to-[#130b20]`}>
        <div className={`absolute top-0 right-0 p-32 blur-[80px] rounded-full opacity-20 ${isOverBudget ? 'bg-rose-600' : 'bg-emerald-600'}`}></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className={`p-4 rounded-2xl bg-white/5 border border-white/10 shadow-inner ${status.color}`}>
            {status.icon || <Target size={32} />}
          </div>
          <div className="text-center md:text-left flex-1">
            <h2 className={`text-2xl font-bold mb-1 ${status.color}`}>{status.title}</h2>
            <p className="text-gray-300 leading-relaxed">{status.msg}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card do Gráfico + Edição */}
        <div className="bg-[#1f1630]/60 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col items-center justify-center relative group">
           
           <div className="w-full flex justify-between items-start mb-2">
             <h3 className="text-lg font-semibold text-white flex items-center gap-2">
               <Target size={18} className="text-purple-400" /> Meta Mensal
             </h3>
             
             {/* Botão de Edição (Canto superior) */}
             {!isEditing && (
               <button 
                 onClick={startEditing}
                 className="p-2 text-gray-500 hover:text-purple-400 hover:bg-white/5 rounded-lg transition"
                 title="Alterar limite"
               >
                 <Pencil size={16} />
               </button>
             )}
           </div>

           {/* Modo de Edição do Limite */}
           {isEditing ? (
             <div className="w-full mb-6 bg-[#130b20] p-4 rounded-xl border border-purple-500/30 animate-in fade-in zoom-in duration-200">
               <p className="text-xs text-purple-300 mb-2 font-semibold">Definir novo teto:</p>
               <div className="flex items-center gap-2">
                 <span className="text-gray-400 text-sm">R$</span>
                 <input 
                   type="number" 
                   value={tempLimit}
                   onChange={(e) => setTempLimit(e.target.value)}
                   className="w-full bg-transparent border-b border-purple-500 text-white font-bold focus:outline-none"
                   autoFocus
                 />
               </div>
               <div className="flex justify-end gap-2 mt-4">
                 {customLimit !== null && (
                   <button onClick={resetToAuto} className="text-xs text-gray-500 hover:text-white mr-auto underline decoration-dotted">
                     Resetar (Auto)
                   </button>
                 )}
                 <button onClick={cancelEdit} className="p-1.5 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-white"><X size={14}/></button>
                 <button onClick={saveLimit} className="p-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-white shadow-lg shadow-purple-900/50"><Check size={14}/></button>
               </div>
             </div>
           ) : (
             <p className="text-xs text-gray-400 mb-6 self-start">
               {customLimit !== null ? 'Valor definido manualmente' : 'Calculado (80% da Renda)'}
             </p>
           )}
           
           <div className="relative w-48 h-48">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={data}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={80}
                   startAngle={180}
                   endAngle={0}
                   paddingAngle={5}
                   dataKey="value"
                   stroke="none"
                 >
                   <Cell fill={isOverBudget ? '#ef4444' : '#8b5cf6'} />
                   <Cell fill="#372f47" />
                 </Pie>
                 <Tooltip cursor={false} contentStyle={{display: 'none'}} />
               </PieChart>
             </ResponsiveContainer>
             
             <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                <span className={`text-3xl font-bold ${isOverBudget ? 'text-rose-400' : 'text-white'}`}>
                  {percentageSpent.toFixed(0)}%
                </span>
                <span className="text-xs text-gray-400">do limite</span>
             </div>
           </div>

           <div className="w-full mt-4 flex justify-between text-sm px-4 pt-4 border-t border-white/5">
              <div className="text-center">
                <p className="text-gray-500 text-xs uppercase mb-1">Gasto Atual</p>
                <p className={`font-bold ${isOverBudget ? 'text-rose-400' : 'text-white'}`}>
                  R$ {expense.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 text-xs uppercase mb-1">Teto Máximo</p>
                <p className="text-purple-300 font-bold">
                  R$ {spendingLimit.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </p>
              </div>
           </div>
        </div>

        {/* Top Gastos (Mantido igual) */}
        <div className="bg-[#1f1630]/60 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-xl">
           <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
             <TrendingDown size={18} className="text-rose-400" /> Onde Economizar?
           </h3>
           <div className="space-y-4">
             {topCategories.length > 0 ? (
               topCategories.map(([cat, val], idx) => (
                 <div key={idx} className="group">
                   <div className="flex justify-between items-center mb-1">
                     <span className="text-sm text-gray-300 capitalize flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500/50"></span> {cat}
                     </span>
                     <span className="text-sm font-bold text-white">R$ {val.toFixed(2)}</span>
                   </div>
                   <div className="h-2 w-full bg-[#130b20] rounded-full overflow-hidden">
                     <div 
                        className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full" 
                        style={{ width: `${Math.min((val / expense) * 100, 100)}%` }}
                     />
                   </div>
                   <p className="text-[10px] text-gray-500 mt-1 text-right">{(val / expense * 100).toFixed(1)}% dos gastos</p>
                 </div>
               ))
             ) : (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500 gap-2">
                    <Wallet opacity={0.5} />
                    <span className="text-sm">Sem gastos registrados</span>
                </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}