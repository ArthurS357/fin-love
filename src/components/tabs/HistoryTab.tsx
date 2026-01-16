'use client';

import { useState, useMemo } from 'react';
import {
  ArrowUpCircle, ArrowDownCircle, Search,
  Trash2, Edit2, Download, Filter,
  CreditCard, Wallet, PiggyBank, Heart, User, Users,
  ArrowUpDown, Calendar, CheckSquare, Square, X
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { exportTransactionsCsvAction, deleteTransactionsAction } from '@/app/actions';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'INVESTMENT';
  category: string;
  date: string | Date;
  userId: string;
  paymentMethod?: string | null;
  installments?: number | null;
  currentInstallment?: number | null;
  isPaid: boolean;
}

interface HistoryTabProps {
  transactions: Transaction[];
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void; 
  partnerId?: string;
  partnerName?: string;
  month: number;
  year: number;
}

export default function HistoryTab({
  transactions,
  onEdit,
  onDelete, 
  partnerId,
  partnerName,
  month,
  year
}: HistoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'INVESTMENT'>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'DATE' | 'AMOUNT_DESC' | 'AMOUNT_ASC'>('DATE');
  const [viewMode, setViewMode] = useState<'ME' | 'PARTNER' | 'BOTH'>('BOTH');
  const [exporting, setExporting] = useState(false);

  // --- ESTADO DE SELEÇÃO EM MASSA ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // --- Lógica de Filtragem ---
  const filteredTransactions = useMemo(() => {
    let result = transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'ALL' || t.type === filterType;
      const matchesPayment = paymentFilter === 'ALL' || t.paymentMethod === paymentFilter;

      let matchesOwner = true;
      const isPartnerTx = partnerId && t.userId === partnerId;
      if (viewMode === 'ME') matchesOwner = !isPartnerTx;
      else if (viewMode === 'PARTNER') matchesOwner = !!isPartnerTx;

      return matchesSearch && matchesType && matchesOwner && matchesPayment;
    });

    return result.sort((a, b) => {
      if (sortBy === 'AMOUNT_DESC') return Number(b.amount) - Number(a.amount);
      if (sortBy === 'AMOUNT_ASC') return Number(a.amount) - Number(b.amount);
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [transactions, searchTerm, filterType, viewMode, partnerId, paymentFilter, sortBy]);

  // --- Resumo Financeiro Dinâmico ---
  const summary = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      const val = Number(t.amount);
      if (t.type === 'INCOME') acc.income += val;
      else if (t.type === 'EXPENSE') acc.expense += val;
      else if (t.type === 'INVESTMENT') acc.investment += val;
      return acc;
    }, { income: 0, expense: 0, investment: 0 });
  }, [filteredTransactions]);

  const balance = summary.income - summary.expense - summary.investment;

  // --- Agrupamento por Data ---
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach(t => {
      const date = new Date(t.date);
      const dateKey = format(date, 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    return groups;
  }, [filteredTransactions]);

  // --- FUNÇÕES DE SELEÇÃO ---
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set()); // Desmarcar tudo
    } else {
      const myIds = filteredTransactions
        .filter(t => !partnerId || t.userId !== partnerId)
        .map(t => t.id);
      setSelectedIds(new Set(myIds));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Tem certeza que deseja excluir ${selectedIds.size} itens?`)) return;
    
    setIsBulkDeleting(true);
    const ids = Array.from(selectedIds);
    
    const res = await deleteTransactionsAction(ids);
    
    if (res.success) {
      toast.success(res.message);
      setSelectedIds(new Set());
    } else {
      toast.error(res.error || 'Erro ao excluir.');
    }
    setIsBulkDeleting(false);
  };

  // --- Helpers UI ---
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await exportTransactionsCsvAction(month, year);
      if (res.success && res.csv) {
        const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `extrato_finlove_${month + 1}_${year}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Download iniciado!");
      } else {
        toast.error("Erro ao gerar arquivo.");
      }
    } catch (e) {
      toast.error("Erro de conexão.");
    } finally {
      setExporting(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'INCOME': return <ArrowUpCircle className="text-green-400" size={24} />;
      case 'EXPENSE': return <ArrowDownCircle className="text-red-400" size={24} />;
      case 'INVESTMENT': return <PiggyBank className="text-purple-400" size={24} />;
      default: return <Wallet className="text-gray-400" size={24} />;
    }
  };

  const formatDateHeader = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const localDate = new Date(y, m - 1, d);
    if (isToday(localDate)) return "Hoje";
    if (isYesterday(localDate)) return "Ontem";
    return format(localDate, "d 'de' MMMM, EEEE", { locale: ptBR });
  };

  return (
    <div className="space-y-6 pb-32">
      
      {/* SELETOR DE MODO (PARCEIRO) */}
      {partnerId && (
        <div className="flex justify-center">
          <div className="bg-[#1f1630] p-1 rounded-xl border border-white/5 inline-flex shadow-lg">
            <button onClick={() => setViewMode('ME')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'ME' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}><User size={14} /> Eu</button>
            <button onClick={() => setViewMode('PARTNER')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'PARTNER' ? 'bg-pink-600 text-white' : 'text-gray-400'}`}><Heart size={14} /> Parceiro</button>
            <button onClick={() => setViewMode('BOTH')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'BOTH' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}><Users size={14} /> Juntos</button>
          </div>
        </div>
      )}

      {/* RESUMO (KPIs) */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 animate-in fade-in zoom-in duration-300">
        <div className="bg-[#1f1630] border border-green-500/20 p-3 rounded-xl flex flex-col items-center justify-center shadow-lg">
          <span className="text-[10px] uppercase text-green-400 font-bold tracking-wider mb-1">Entradas</span>
          <span className="text-sm md:text-lg font-bold text-gray-100">
            R$ {summary.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="bg-[#1f1630] border border-red-500/20 p-3 rounded-xl flex flex-col items-center justify-center shadow-lg">
          <span className="text-[10px] uppercase text-red-400 font-bold tracking-wider mb-1">Saídas</span>
          <span className="text-sm md:text-lg font-bold text-gray-100">
            R$ {summary.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className={`bg-[#1f1630] border p-3 rounded-xl flex flex-col items-center justify-center shadow-lg ${balance >= 0 ? 'border-indigo-500/20' : 'border-red-500/20'}`}>
          <span className="text-[10px] uppercase text-indigo-400 font-bold tracking-wider mb-1">Saldo</span>
          <span className={`text-sm md:text-lg font-bold ${balance >= 0 ? 'text-indigo-100' : 'text-red-300'}`}>
            R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="bg-[#1f1630] p-4 rounded-2xl border border-white/5 shadow-lg sticky top-24 z-20 backdrop-blur-md bg-opacity-95 flex flex-col gap-3">
        <div className="flex gap-2">
           <button 
             onClick={toggleSelectAll} 
             className="bg-[#130b20] border border-white/10 text-gray-400 p-2.5 rounded-xl hover:text-white transition-colors"
             title="Selecionar Todos"
           >
             {selectedIds.size > 0 && selectedIds.size === filteredTransactions.length ? <CheckSquare size={20} className="text-purple-400" /> : <Square size={20} />}
           </button>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#130b20] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
          <button onClick={handleExport} disabled={exporting} className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 p-2.5 rounded-xl transition-all">
            <Download size={20} className={exporting ? 'animate-bounce' : ''} />
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <div className="relative shrink-0">
             <select 
               value={sortBy}
               onChange={(e) => setSortBy(e.target.value as any)}
               className="appearance-none bg-[#130b20] text-xs font-bold text-gray-300 border border-white/10 rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:border-purple-500"
             >
               <option value="DATE">Data</option>
               <option value="AMOUNT_DESC">Maior Valor</option>
               <option value="AMOUNT_ASC">Menor Valor</option>
             </select>
             <ArrowUpDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
          <div className="w-px h-5 bg-white/10 mx-1 shrink-0" />
          {['ALL', 'INCOME', 'EXPENSE', 'INVESTMENT'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type as any)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${filterType === type ? 'bg-purple-600 text-white' : 'bg-[#130b20] text-gray-400 border border-white/5'}`}
            >
              {type === 'ALL' ? 'Todos' : type === 'INCOME' ? 'Entradas' : type === 'EXPENSE' ? 'Saídas' : 'Invest.'}
            </button>
          ))}
          <div className="relative shrink-0 ml-1">
             <select 
               value={paymentFilter}
               onChange={(e) => setPaymentFilter(e.target.value)}
               className="appearance-none bg-[#130b20] text-xs font-bold text-gray-300 border border-white/10 rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:border-purple-500"
             >
               <option value="ALL">Pagamento: Todos</option>
               <option value="CREDIT">Crédito</option>
               <option value="DEBIT">Débito</option>
               <option value="PIX">Pix</option>
               <option value="CASH">Dinheiro</option>
             </select>
             <Filter size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* LISTA DE TRANSAÇÕES */}
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="text-center py-12 opacity-50">
             <Filter className="mx-auto mb-2" size={32} />
             <p>Nada encontrado com esses filtros.</p>
          </div>
        ) : (
          Object.entries(groupedTransactions).map(([dateKey, txs]) => (
            <div key={dateKey} className="space-y-3">
              <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider px-2 flex items-center gap-2">
                <Calendar size={12} /> {formatDateHeader(dateKey)}
              </h3>
              <div className="space-y-2">
                {txs.map((t) => {
                  const isPartner = partnerId && t.userId === partnerId;
                  const ownerName = isPartner ? (partnerName?.split(' ')[0] || 'Parceiro') : 'Você';
                  const isSelected = selectedIds.has(t.id);
                  
                  return (
                    <div 
                      key={t.id} 
                      className={`group bg-[#1f1630] border p-4 rounded-2xl flex items-center justify-between transition-all relative overflow-hidden ${isSelected ? 'border-purple-500 bg-[#2a1e3e]' : 'border-white/5 hover:bg-[#251a3a]'}`}
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${t.type === 'INCOME' ? 'bg-green-500' : t.type === 'EXPENSE' ? 'bg-red-500' : 'bg-purple-500'}`} />
                      
                      <div className="flex items-center gap-4 pl-2">
                        {!isPartner && (
                          <button onClick={() => toggleSelect(t.id)} className="text-gray-400 hover:text-white transition-colors">
                            {isSelected ? <CheckSquare className="text-purple-400" size={20} /> : <Square size={20} />}
                          </button>
                        )}

                        <div className="p-3 rounded-2xl bg-[#130b20] border border-white/5 shadow-inner">
                          {getIcon(t.type)}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-200 text-sm">{t.description}</h4>
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                            <span>{t.category}</span>
                            {isPartner && viewMode === 'BOTH' && (
                              <span className="px-1.5 py-0.5 rounded border bg-pink-500/10 border-pink-500/20 text-pink-300 text-[10px]">{ownerName}</span>
                            )}
                            
                            {/* --- STATUS DE PAGAMENTO (NOVIDADE) --- */}
                            {t.paymentMethod === 'CREDIT' && (
                              <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border ${t.isPaid ? 'border-green-500/20 text-green-400 bg-green-500/10' : 'border-orange-500/20 text-orange-400 bg-orange-500/10'}`}>
                                <CreditCard size={10} />
                                {t.isPaid ? 'Fatura Paga' : 'Pendente'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className={`font-bold text-sm ${t.type === 'INCOME' ? 'text-green-400' : t.type === 'EXPENSE' ? 'text-red-400' : 'text-purple-400'}`}>
                          {t.type === 'EXPENSE' ? '- ' : '+ '}
                          R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        
                        {!isPartner && selectedIds.size === 0 && (
                          <div className="flex gap-2 justify-end mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onEdit(t)}><Edit2 size={14} className="text-blue-400" /></button>
                            <button onClick={() => onDelete(t.id)}><Trash2 size={14} className="text-red-400" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- BARRA FLUTUANTE DE AÇÕES EM MASSA --- */}
      <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#130b20] border border-purple-500/30 shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 transition-all duration-300 z-50 ${selectedIds.size > 0 ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
        <span className="text-sm font-bold text-white whitespace-nowrap">
          {selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}
        </span>
        <div className="h-4 w-px bg-white/20"></div>
        <button 
          onClick={handleBulkDelete} 
          disabled={isBulkDeleting}
          className="flex items-center gap-2 text-red-400 hover:text-red-300 font-bold text-sm transition-colors"
        >
          {isBulkDeleting ? 'Excluindo...' : <><Trash2 size={16} /> Excluir</>}
        </button>
        <button 
          onClick={() => setSelectedIds(new Set())} 
          className="bg-white/10 p-1 rounded-full text-gray-400 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}