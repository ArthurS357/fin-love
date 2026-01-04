'use client'

import React, { useState, useMemo } from 'react';
import { Target, AlertTriangle, Save, Lightbulb, Trophy } from 'lucide-react';
import { updateSpendingLimitAction } from '@/app/actions';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

interface GoalsTabProps {
  income: number;
  expense: number;
  transactions: any[];
  currentLimit: number;
}

// 1. Lista Expandida de Dicas (12 itens)
const MOTIVATIONAL_TIPS = [
  "💡 Regra 50-30-20: 50% para o essencial, 30% para desejos e 20% para o futuro.",
  "💡 Antes de comprar algo caro, espere 24h. Se a vontade passar, era impulso.",
  "💡 Pague-se primeiro: assim que receber, separe o valor do investimento antes de gastar.",
  "💡 Fundo de emergência: tente juntar o equivalente a 3 a 6 meses do seu custo de vida.",
  "💡 Revise suas assinaturas mensais. Você realmente usa todos esses streamings?",
  "💡 Pequenos gastos somam muito. Aquele café diário pode virar uma viagem no fim do ano.",
  "💡 Evite dívidas de cartão de crédito. Os juros compostos trabalham contra você.",
  "💡 Compare preços sempre. Ferramentas online encontram descontos em segundos.",
  "💡 Defina metas claras. 'Juntar dinheiro' é vago; 'Juntar R$ 5k para férias' é um plano.",
  "💡 Diversifique. Nunca coloque todos os seus ovos na mesma cesta de investimentos.",
  "💡 Negocie descontos à vista. O 'não' você já tem, busque o desconto.",
  "💡 Use a regra dos 30 dias para compras não essenciais. Se esperar, muitas vezes desiste."
];

export default function GoalsTab({ income, expense, transactions, currentLimit }: GoalsTabProps) {
  const [limit, setLimit] = useState(currentLimit);
  const [loading, setLoading] = useState(false);
  
  const percentage = limit > 0 ? (expense / limit) * 100 : 0;
  const isOverLimit = expense > limit;
  const remaining = Math.max(0, limit - expense);

  // 2. Lógica de Rotação por Hora
  // Usamos useMemo para calcular apenas na renderização (evita recálculos desnecessários)
  const currentTip = useMemo(() => {
    const currentHour = new Date().getHours();
    // O operador % (módulo) garante que o índice sempre esteja dentro do array (0 a 11)
    return MOTIVATIONAL_TIPS[currentHour % MOTIVATIONAL_TIPS.length];
  }, []);

  const handleSave = async () => {
    setLoading(true);
    const formData = new FormData();
    formData.append('limit', limit.toString());
    const res = await updateSpendingLimitAction(formData);
    if (res.success) toast.success(res.message);
    else toast.error(res.error);
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-0">
      
      {/* Coluna Principal: Definição e Gráfico */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Card Principal */}
        <div className="bg-[#1f1630] p-6 md:p-8 rounded-3xl border border-white/5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-pink-500/10 w-64 h-64 rounded-full blur-[80px] pointer-events-none" />

          <div className="flex items-center justify-between mb-8 relative z-10">
            <div>
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <Target className="text-pink-500" /> Meta Mensal
              </h3>
              <p className="text-gray-400 text-sm mt-1">Defina seu teto de gastos para manter a saúde financeira.</p>
            </div>
          </div>

          <div className="space-y-6 relative z-10">
            {/* Input */}
            <div className="flex gap-4">
              <div className="flex-1 relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold group-focus-within:text-pink-500 transition-colors">R$</span>
                <input 
                  type="number" 
                  value={limit}
                  onChange={(e) => setLimit(parseFloat(e.target.value))}
                  className="w-full bg-[#130b20] text-white text-2xl font-bold pl-11 pr-4 py-4 rounded-2xl border border-gray-700 focus:border-pink-500 outline-none transition shadow-inner"
                  placeholder="0.00"
                />
              </div>
              <button 
                onClick={handleSave}
                disabled={loading}
                className="bg-pink-600 hover:bg-pink-500 text-white p-4 rounded-2xl transition shadow-lg shadow-pink-900/20 flex items-center justify-center disabled:opacity-50"
              >
                {loading ? <span className="animate-spin w-6 h-6 border-2 border-white/30 border-t-white rounded-full"/> : <Save size={24} />}
              </button>
            </div>

            {/* Barra de Progresso Grande */}
            <div className="bg-[#130b20] p-6 rounded-2xl border border-white/5">
              <div className="flex justify-between text-sm mb-3">
                <span className="text-gray-400">Gasto Atual</span>
                <span className="text-white font-bold">{formatCurrency(expense)}</span>
              </div>
              
              <div className="h-6 bg-gray-800 rounded-full overflow-hidden relative shadow-inner mb-2">
                <div 
                  className={`h-full transition-all duration-1000 ease-out ${isOverLimit ? 'bg-red-500' : 'bg-gradient-to-r from-green-400 to-blue-500'}`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>

              <div className="flex justify-between text-xs">
                <span className={isOverLimit ? 'text-red-400 font-bold' : 'text-green-400'}>
                  {percentage.toFixed(1)}% utilizado
                </span>
                <span className="text-gray-500">Meta: {formatCurrency(limit)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Coluna Lateral: Status e Dicas */}
      <div className="space-y-6">
        {/* Card de Status */}
        <div className={`p-6 rounded-3xl border shadow-lg ${isOverLimit ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 rounded-full ${isOverLimit ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
              {isOverLimit ? <AlertTriangle size={24} /> : <Trophy size={24} />}
            </div>
            <h4 className={`font-bold text-lg ${isOverLimit ? 'text-red-100' : 'text-green-100'}`}>
              {isOverLimit ? 'Meta Ultrapassada' : 'No Controle'}
            </h4>
          </div>
          <p className={`text-sm leading-relaxed ${isOverLimit ? 'text-red-200/80' : 'text-green-200/80'}`}>
            {isOverLimit 
              ? `Você excedeu seu limite em ${formatCurrency(expense - limit)}. Tente rever seus gastos supérfluos.` 
              : `Parabéns! Você ainda tem ${formatCurrency(remaining)} disponíveis antes de atingir o teto.`}
          </p>
        </div>

        {/* Card Dica */}
        <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-500/20 p-6 rounded-3xl relative overflow-hidden">
          <Lightbulb className="text-blue-400 mb-3" size={28} />
          <h4 className="font-bold text-blue-100 mb-2">Dica Financeira</h4>
          <p className="text-blue-200/70 text-sm italic">
            {/* 3. Renderização da Dica Atual */}
            {currentTip}
          </p>
        </div>
      </div>
    </div>
  );
}