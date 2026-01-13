'use client';

import { useState, useMemo } from 'react';
import {
  ArrowUpCircle, ArrowDownCircle, Search,
  Trash2, Edit2, Download, Filter,
  CreditCard, Wallet, PiggyBank, Heart, User, Users
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { exportTransactionsCsvAction } from '@/app/actions';
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
  
  // NOVO: Filtro de visualização (Eu, Parceiro, Todos)
  const [viewMode, setViewMode] = useState<'ME' | 'PARTNER' | 'BOTH'>('BOTH');
  
  const [exporting, setExporting] = useState(false);

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

  // Lógica de Filtragem Unificada
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Filtro de Texto
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 2. Filtro de Tipo (Entrada/Saída)
      const matchesType = filterType === 'ALL' || t.type === filterType;

      // 3. NOVO: Filtro de Dono (Eu vs Parceiro)
      let matchesOwner = true;
      const isPartnerTx = partnerId && t.userId === partnerId;

      if (viewMode === 'ME') {
        matchesOwner = !isPartnerTx; // Mostra se NÃO for do parceiro
      } else if (viewMode === 'PARTNER') {
        matchesOwner = !!isPartnerTx; // Mostra SÓ se for do parceiro
      }
      // Se for 'BOTH', matchesOwner continua true

      return matchesSearch && matchesType && matchesOwner;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, filterType, viewMode, partnerId]);

  // Agrupamento por Data
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

  const getIcon = (type: string) => {
    switch (type) {
      case 'INCOME': return <ArrowUpCircle className="text-green-400" size={24} />;
      case 'EXPENSE': return <ArrowDownCircle className="text-red-400" size={24} />;
      case 'INVESTMENT': return <PiggyBank className="text-purple-400" size={24} />;
      default: return <Wallet className="text-gray-400" size={24} />;
    }
  };

  const getPaymentIcon = (method?: string | null) => {
    if (method === 'CREDIT') return <CreditCard size={12} className="text-pink-400" />;
    return <Wallet size={12} className="text-gray-400" />;
  };

  const formatDateHeader = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const localDate = new Date(y, m - 1, d);
    if (isToday(localDate)) return "Hoje";
    if (isYesterday(localDate)) return "Ontem";
    return format(localDate, "d 'de' MMMM, EEEE", { locale: ptBR });
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* --- NOVO: SELETOR DE VISUALIZAÇÃO (SÓ APARECE SE TIVER PARCEIRO) --- */}
      {partnerId && (
        <div className="flex justify-center">
          <div className="bg-[#1f1630] p-1 rounded-xl border border-white/5 inline-flex shadow-lg">
            <button
              onClick={() => setViewMode('ME')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'ME' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              <User size={14} /> Eu
            </button>
            <button
              onClick={() => setViewMode('PARTNER')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'PARTNER' ? 'bg-pink-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Heart size={14} /> {partnerName?.split(' ')[0] || 'Parceiro'}
            </button>
            <button
              onClick={() => setViewMode('BOTH')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'BOTH' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users size={14} /> Juntos
            </button>
          </div>
        </div>
      )}

      {/* BARRA DE FILTROS & PESQUISA */}
      <div className="flex flex-col md:flex-row gap-4 justify-between bg-[#1f1630] p-4 rounded-2xl border border-white/5 shadow-lg sticky top-24 z-20 backdrop-blur-md bg-opacity-90">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Buscar transação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#130b20] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:ring-2 focus:ring-purple-500 outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all text-xs font-bold whitespace-nowrap"
          >
            <Download size={16} className={exporting ? 'animate-bounce' : ''} />
            CSV
          </button>

          <div className="w-px h-6 bg-white/10 mx-1 hidden md:block" />

          {['ALL', 'INCOME', 'EXPENSE', 'INVESTMENT'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type as any)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterType === type
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-[#130b20] text-gray-400 hover:text-white border border-white/5'
                }`}
            >
              {type === 'ALL' ? 'Todos' : type === 'INCOME' ? 'Entradas' : type === 'EXPENSE' ? 'Saídas' : 'Invest.'}
            </button>
          ))}
        </div>
      </div>

      {/* LISTA DE TRANSAÇÕES */}
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="text-gray-500" size={32} />
            </div>
            <p className="text-gray-400 font-medium">Nenhuma transação encontrada.</p>
            <p className="text-gray-600 text-sm mt-1">
              {viewMode === 'PARTNER' ? 'Seu parceiro ainda não lançou nada.' : 'Mude os filtros ou adicione um novo registro.'}
            </p>
          </div>
        ) : (
          Object.entries(groupedTransactions).map(([dateKey, txs]) => (
            <div key={dateKey} className="space-y-3">
              <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider px-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500/50"></span>
                {formatDateHeader(dateKey)}
              </h3>

              <div className="space-y-2">
                {txs.map((t) => {
                  const isPartner = partnerId && t.userId === partnerId;
                  const ownerName = isPartner ? (partnerName?.split(' ')[0] || 'Parceiro') : 'Você';
                  const OwnerIcon = isPartner ? Heart : User;

                  return (
                    <div
                      key={t.id}
                      className="group bg-[#1f1630] hover:bg-[#251a3a] border border-white/5 p-4 rounded-2xl flex items-center justify-between transition-all hover:shadow-lg hover:border-purple-500/20 relative overflow-hidden"
                    >
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${t.type === 'INCOME' ? 'bg-green-500' : t.type === 'EXPENSE' ? 'bg-red-500' : 'bg-purple-500'}`} />

                      <div className="flex items-center gap-4 pl-2">
                        <div className={`p-3 rounded-2xl bg-[#130b20] border border-white/5 shadow-inner group-hover:scale-105 transition-transform`}>
                          {getIcon(t.type)}
                        </div>

                        <div>
                          <h4 className="font-bold text-gray-200 text-sm md:text-base flex items-center gap-2">
                            {t.description}
                            {t.installments && t.installments > 1 && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-gray-700/50 border border-white/10 rounded-full text-gray-300">
                                {t.currentInstallment}/{t.installments}
                              </span>
                            )}
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-gray-400 mt-1.5">
                            <span className="flex items-center gap-1">
                              {getPaymentIcon(t.paymentMethod)}
                              {t.category}
                            </span>
                            {/* Chip indicando quem pagou (Útil no modo 'BOTH') */}
                            {partnerId && viewMode === 'BOTH' && (
                              <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium ${isPartner
                                ? 'bg-pink-500/10 border-pink-500/20 text-pink-300'
                                : 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                                }`}>
                                <OwnerIcon size={8} />
                                {ownerName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className={`font-bold whitespace-nowrap text-sm md:text-base ${t.type === 'INCOME' ? 'text-green-400' : t.type === 'EXPENSE' ? 'text-red-400' : 'text-purple-400'
                            }`}>
                            {t.type === 'EXPENSE' ? '- ' : '+ '}
                            R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className={`text-[10px] font-medium ${t.isPaid ? 'text-green-500/60' : 'text-yellow-500/60'}`}>
                            {t.isPaid ? 'Pago' : 'Pendente'}
                          </p>
                        </div>

                        {/* Botões de Ação (Só aparecem se for EU) */}
                        {!isPartner ? (
                          <div className="flex gap-1 md:gap-2 opacity-0 group-hover:opacity-100 transition-opacity absolute md:static right-4 bg-[#1f1630] md:bg-transparent p-1 md:p-0 rounded-lg shadow-xl md:shadow-none border border-white/10 md:border-none translate-x-2 group-hover:translate-x-0">
                            <button
                              onClick={() => onEdit(t)}
                              className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-xl transition"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => onDelete(t.id)}
                              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ) : <div className="w-0 md:w-[72px]"></div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}