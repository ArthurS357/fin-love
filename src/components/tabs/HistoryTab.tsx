import React, { useMemo } from 'react';
import { 
  ArrowUpCircle, ArrowDownCircle, Pencil, Trash2, 
  ShoppingBag, Utensils, Car, Home, Zap, 
  Smartphone, Heart, Coffee, AlertCircle, FileText
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HistoryTabProps {
  transactions: any[];
  onEdit: (transaction: any) => void;
  onDelete: (id: string) => void;
}

// Mapa de ícones por categoria (Simples e eficiente)
const getCategoryIcon = (category: string) => {
  const normalized = category.toLowerCase();
  if (normalized.includes('mercado') || normalized.includes('compras')) return <ShoppingBag size={18} />;
  if (normalized.includes('food') || normalized.includes('restaurante') || normalized.includes('lanche')) return <Utensils size={18} />;
  if (normalized.includes('transporte') || normalized.includes('uber') || normalized.includes('gasolina')) return <Car size={18} />;
  if (normalized.includes('casa') || normalized.includes('aluguel')) return <Home size={18} />;
  if (normalized.includes('luz') || normalized.includes('internet')) return <Zap size={18} />;
  if (normalized.includes('celular')) return <Smartphone size={18} />;
  if (normalized.includes('date') || normalized.includes('amor')) return <Heart size={18} />;
  if (normalized.includes('lazer')) return <Coffee size={18} />;
  return <FileText size={18} />; // Ícone padrão
};

export default function HistoryTab({ transactions, onEdit, onDelete }: HistoryTabProps) {
  
  // Agrupar transações por Data
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, any[]> = {};
    
    // Ordenar por data (mais recente primeiro)
    const sorted = [...transactions].sort((a, b) => b.date.getTime() - a.date.getTime());

    sorted.forEach(t => {
      const dateKey = format(t.date, 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });

    return groups;
  }, [transactions]);

  const dates = Object.keys(groupedTransactions);

  // Função para formatar o título da data (Hoje, Ontem, etc.)
  const formatDateTitle = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00'); // Forçar timezone local simples
    if (isToday(date)) return 'Hoje';
    if (isYesterday(date)) return 'Ontem';
    return format(date, "dd 'de' MMMM", { locale: ptBR });
  };

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500 animate-in fade-in zoom-in duration-500">
        <div className="bg-white/5 p-6 rounded-full mb-4">
            <AlertCircle size={48} className="text-gray-600" />
        </div>
        <p className="text-lg font-medium">Nenhum lançamento neste mês</p>
        <p className="text-sm">Toque em "+" para adicionar o primeiro.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 md:pb-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {dates.map(dateKey => (
        <div key={dateKey} className="space-y-3">
          {/* Título da Data */}
          <div className="flex items-center gap-3 px-2">
             <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent flex-1" />
             <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-[#130b20] px-2">
               {formatDateTitle(dateKey)}
             </span>
             <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent flex-1" />
          </div>

          {/* Lista de Cards */}
          <div className="space-y-2">
            {groupedTransactions[dateKey].map((t) => (
              <div 
                key={t.id} 
                className="group relative bg-[#1f1630]/60 hover:bg-[#2a2235] backdrop-blur-sm border border-white/5 rounded-2xl p-4 flex items-center justify-between transition-all duration-300 hover:shadow-lg hover:border-white/10"
              >
                {/* Lado Esquerdo: Ícone + Info */}
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${
                      t.type === 'INCOME' 
                        ? 'bg-emerald-500/10 text-emerald-400' 
                        : 'bg-rose-500/10 text-rose-400'
                    }`}>
                    {getCategoryIcon(t.category)}
                  </div>
                  
                  <div>
                    <p className="font-semibold text-white text-sm md:text-base capitalize">
                        {t.category}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500">{t.description || 'Sem descrição'}</span>
                        <span className="text-[10px] text-gray-600">•</span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                             {t.type === 'INCOME' ? <ArrowUpCircle size={10} /> : <ArrowDownCircle size={10} />}
                             {t.type === 'INCOME' ? 'Entrada' : 'Saída'}
                        </span>
                    </div>
                  </div>
                </div>

                {/* Lado Direito: Valor + Ações (Hover) */}
                <div className="flex items-center gap-4">
                    <span className={`font-bold text-sm md:text-base whitespace-nowrap ${
                        t.type === 'INCOME' ? 'text-emerald-400' : 'text-white'
                    }`}>
                        {t.type === 'EXPENSE' && '- '}
                        R$ {t.amount.toFixed(2)}
                    </span>

                    {/* Botões de Ação - Visíveis no Hover (Desktop) ou Slide (Mobile) 
                        Para simplificar UX Mobile e Desktop simultaneamente, vamos criar um container 
                        que aparece suavemente */}
                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity absolute right-4 md:relative md:right-auto bg-[#1f1630] md:bg-transparent shadow-xl md:shadow-none p-1 rounded-lg md:p-0 border border-white/10 md:border-none">
                        <button 
                            onClick={() => onEdit(t)} 
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition"
                            title="Editar"
                        >
                            <Pencil size={16} />
                        </button>
                        <button 
                            onClick={() => onDelete(t.id)} 
                            className="p-2 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                            title="Excluir"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}