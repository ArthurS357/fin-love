import React, { useMemo, useState } from 'react';
import { 
  ArrowUpCircle, ArrowDownCircle, Pencil, Trash2, 
  ShoppingBag, Utensils, Car, Home, Zap, 
  Smartphone, Heart, Coffee, AlertCircle, FileText, Search, X
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HistoryTabProps {
  transactions: any[];
  onEdit: (transaction: any) => void;
  onDelete: (id: string) => void;
}

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
  return <FileText size={18} />;
};

export default function HistoryTab({ transactions, onEdit, onDelete }: HistoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Filtrar transações antes de agrupar
  const filteredTransactions = useMemo(() => {
    if (!searchTerm) return transactions;
    const lowerTerm = searchTerm.toLowerCase();
    return transactions.filter(t => 
      t.category.toLowerCase().includes(lowerTerm) || 
      (t.description && t.description.toLowerCase().includes(lowerTerm))
    );
  }, [transactions, searchTerm]);
  
  // 2. Agrupar transações filtradas
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, any[]> = {};
    const sorted = [...filteredTransactions].sort((a, b) => b.date.getTime() - a.date.getTime());

    sorted.forEach(t => {
      const dateKey = format(t.date, 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });

    return groups;
  }, [filteredTransactions]);

  const dates = Object.keys(groupedTransactions);

  const formatDateTitle = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    if (isToday(date)) return 'Hoje';
    if (isYesterday(date)) return 'Ontem';
    return format(date, "dd 'de' MMMM", { locale: ptBR });
  };

  return (
    <div className="space-y-6 pb-24 md:pb-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Barra de Busca Fixa no Topo da Lista */}
      <div className="sticky top-0 z-20 bg-[#130b20]/95 backdrop-blur-xl py-2 -mx-4 px-4 md:mx-0 md:px-0 border-b border-white/5 md:border-none md:bg-transparent">
        <div className="relative group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-500 group-focus-within:text-purple-400 transition-colors" />
          </div>
          <input 
            type="text" 
            placeholder="Buscar por categoria ou descrição..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1f1630] border border-white/10 text-white text-sm rounded-xl py-3 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-gray-600 shadow-lg"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <AlertCircle size={48} className="mb-4 opacity-20" />
          <p>Nenhum lançamento neste mês</p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Search size={48} className="mb-4 opacity-20" />
          <p>Nenhuma transação encontrada para "{searchTerm}"</p>
        </div>
      ) : (
        dates.map(dateKey => (
          <div key={dateKey} className="space-y-3">
            <div className="flex items-center gap-3 px-2">
               <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent flex-1" />
               <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-[#130b20] px-2">
                 {formatDateTitle(dateKey)}
               </span>
               <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent flex-1" />
            </div>

            <div className="space-y-2">
              {groupedTransactions[dateKey].map((t) => (
                <div 
                  key={t.id} 
                  className="group relative bg-[#1f1630]/60 hover:bg-[#2a2235] backdrop-blur-sm border border-white/5 rounded-2xl p-4 flex items-center justify-between transition-all duration-300 hover:shadow-lg hover:border-white/10"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${
                        t.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
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

                  <div className="flex items-center gap-4">
                      <span className={`font-bold text-sm md:text-base whitespace-nowrap ${
                          t.type === 'INCOME' ? 'text-emerald-400' : 'text-white'
                      }`}>
                          {t.type === 'EXPENSE' && '- '}
                          R$ {t.amount.toFixed(2)}
                      </span>

                      <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity absolute right-4 md:relative md:right-auto bg-[#1f1630] md:bg-transparent shadow-xl md:shadow-none p-1 rounded-lg md:p-0 border border-white/10 md:border-none">
                          <button onClick={() => onEdit(t)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition"><Pencil size={16} /></button>
                          <button onClick={() => onDelete(t.id)} className="p-2 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"><Trash2 size={16} /></button>
                      </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}