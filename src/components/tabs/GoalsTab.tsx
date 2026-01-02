'use client'

import React, { useState } from 'react';
import { Target, AlertTriangle, Save, Lightbulb } from 'lucide-react';
import { updateSpendingLimitAction } from '@/app/actions';
import { toast } from 'sonner';

interface GoalsTabProps {
  income: number;
  expense: number;
  transactions: any[];
  currentLimit: number;
}

const MOTIVATIONAL_TIPS = [
  "💡 Dica: A regra 50-30-20 sugere 50% para necessidades, 30% para desejos e 20% para poupança.",
  "💡 Dica: Pequenos gastos diários (o cafezinho) somam muito no fim do mês. Fique de olho!",
  "💡 Dica: Antes de comprar, espere 24h. Se a vontade passar, era impulso.",
  "💡 Dica: Use o cartão de crédito a seu favor, não como extensão do salário."
];

export default function GoalsTab({ income, expense, transactions, currentLimit }: GoalsTabProps) {
  const [limit, setLimit] = useState(currentLimit);
  const [loading, setLoading] = useState(false);
  
  // Seleciona uma dica aleatória baseada no dia (para não mudar a cada renderização)
  const tipOfTheDay = MOTIVATIONAL_TIPS[new Date().getDate() % MOTIVATIONAL_TIPS.length];

  const percentage = limit > 0 ? (expense / limit) * 100 : 0;
  const isOverLimit = expense > limit;

  const handleSave = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append('limit', limit.toString());
    
    const res = await updateSpendingLimitAction(formData);
    if (res.success) {
      toast.success(res.message);
    } else {
      toast.error(res.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Card de Definição de Meta */}
      <div className="bg-[#1f1630] p-6 rounded-2xl border border-purple-900/30 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Target className="text-pink-500" /> Teto de Gastos Mensal
          </h3>
          <span className="text-xs text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
            Planejamento
          </span>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="text-gray-400 text-sm mb-2 block">Qual seu limite máximo de gastos?</label>
            <div className="relative group">
              <span className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-pink-500 transition-colors">R$</span>
              <input 
                type="number" 
                value={limit}
                onChange={(e) => setLimit(parseFloat(e.target.value))}
                className="w-full bg-[#130b20] text-white text-xl font-bold pl-10 pr-4 py-3 rounded-xl border border-gray-700 focus:border-pink-500 outline-none transition ring-1 ring-transparent focus:ring-pink-500/20"
                placeholder="0.00"
              />
            </div>
          </div>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full md:w-auto bg-pink-600 hover:bg-pink-500 active:scale-95 text-white p-3.5 rounded-xl transition shadow-lg shadow-pink-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
            ) : (
              <>
                <Save size={20} />
                <span className="md:hidden lg:inline">Salvar Meta</span>
              </>
            )}
          </button>
        </div>

        {/* Barra de Progresso Visual */}
        <div className="mt-8">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">
              Gasto Atual: <b className="text-white">R$ {expense.toFixed(2)}</b>
            </span>
            <span className={`font-semibold ${percentage > 100 ? 'text-red-400' : 'text-green-400'}`}>
              {percentage.toFixed(1)}% do limite
            </span>
          </div>
          
          <div className="h-4 bg-gray-800 rounded-full overflow-hidden relative shadow-inner">
            <div 
              className={`h-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.5)] ${
                isOverLimit 
                  ? 'bg-gradient-to-r from-red-500 to-red-600' 
                  : 'bg-gradient-to-r from-green-400 to-blue-500'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>

          {isOverLimit && (
             <div className="mt-4 flex items-center gap-3 text-red-400 text-sm bg-red-400/10 p-4 rounded-xl border border-red-400/20 animate-in fade-in slide-in-from-top-2">
               <div className="p-2 bg-red-400/20 rounded-full">
                 <AlertTriangle size={18} />
               </div>
               <span>
                 <b>Atenção!</b> Você ultrapassou seu teto de gastos planejado.
               </span>
             </div>
          )}
        </div>
      </div>

      {/* Card de Dicas */}
      <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-500/20 p-5 rounded-2xl flex gap-4 items-start shadow-lg">
        <div className="bg-blue-500/20 p-3 rounded-xl text-blue-400 shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
          <Lightbulb size={24} />
        </div>
        <div>
          <h4 className="font-bold text-blue-100 mb-1 text-lg">Dica Financeira</h4>
          <p className="text-blue-200/80 text-sm leading-relaxed">{tipOfTheDay}</p>
        </div>
      </div>
    </div>
  );
}