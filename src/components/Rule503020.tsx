'use client';

export default function Rule503020({ transactions }: { transactions: any[] }) {
  const total = transactions.filter(t => t.type === 'EXPENSE' || t.type === 'INVESTMENT').reduce((acc, t) => acc + Number(t.amount), 0);
  
  // Heurística simples por categoria (Você pode ajustar as strings)
  const needs = transactions.filter(t => t.type === 'EXPENSE' && ['Moradia', 'Alimento', 'Saúde', 'Transporte', 'Fatura', 'Fretado', 'Faculdade'].some(c => t.category.includes(c))).reduce((acc, t) => acc + Number(t.amount), 0);
  const savings = transactions.filter(t => t.type === 'INVESTMENT').reduce((acc, t) => acc + Number(t.amount), 0);
  const wants = total - needs - savings; // O resto é desejo

  const getPercent = (val: number) => total > 0 ? (val / total) * 100 : 0;

  return (
    <div className="bg-[#1f1630] rounded-3xl border border-white/5 p-6 shadow-lg">
      <h3 className="text-sm font-bold text-white mb-4">Regra 50/30/20</h3>
      <div className="space-y-4">
        {/* Necessidades (50%) */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-blue-300">Necessidades (Meta: 50%)</span>
            <span className="text-white">{getPercent(needs).toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500" style={{ width: `${Math.min(getPercent(needs), 100)}%` }} />
          </div>
        </div>
        {/* Desejos (30%) */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-pink-300">Estilo de Vida (Meta: 30%)</span>
            <span className="text-white">{getPercent(wants).toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-pink-500" style={{ width: `${Math.min(getPercent(wants), 100)}%` }} />
          </div>
        </div>
        {/* Investimentos (20%) */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-purple-300">Investimentos (Meta: 20%)</span>
            <span className="text-white">{getPercent(savings).toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500" style={{ width: `${Math.min(getPercent(savings), 100)}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}