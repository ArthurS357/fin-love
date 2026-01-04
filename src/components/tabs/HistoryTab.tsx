'use client'

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Trash2,
  PiggyBank,
  Search,
  Filter,
  Edit2,
  DownloadCloud,
  CheckCircle2,
  Circle,
  CreditCard,
  Wallet
} from 'lucide-react';
import { toggleTransactionStatus } from '@/app/actions';
import { toast } from 'sonner';

interface HistoryTabProps {
  transactions: any[];
  onEdit: (t: any) => void;
  onDelete: (id: string) => void;
}

export default function HistoryTab({ transactions, onEdit, onDelete }: HistoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'INVESTMENT'>('ALL');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Filtragem local
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'ALL' || t.type === filterType;

      return matchesSearch && matchesType;
    });
  }, [transactions, searchTerm, filterType]);

  // Função para marcar como Pago/Não Pago
  const handleToggleStatus = async (id: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadingId(id);
    try {
      await toggleTransactionStatus(id, currentStatus);
      toast.success(currentStatus ? 'Marcado como pendente' : 'Marcado como pago');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    } finally {
      setLoadingId(null);
    }
  };

  // Estilos baseados no tipo
  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'INCOME':
        return { icon: <ArrowUpCircle size={24} />, color: 'text-green-400', bg: 'bg-green-400/10' };
      case 'EXPENSE':
        return { icon: <ArrowDownCircle size={24} />, color: 'text-red-400', bg: 'bg-red-400/10' };
      case 'INVESTMENT':
        return { icon: <PiggyBank size={24} />, color: 'text-blue-400', bg: 'bg-blue-400/10' };
      default:
        return { icon: <div className="w-6 h-6 rounded-full bg-gray-500" />, color: 'text-gray-400', bg: 'bg-gray-500/10' };
    }
  };

  // Exportar CSV
  const handleExportCSV = () => {
    const headers = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'Status', 'Método'];
    const rows = filteredTransactions.map(t => [
      format(new Date(t.date), 'yyyy-MM-dd HH:mm'),
      `"${t.description.replace(/"/g, '""')}"`,
      t.category,
      t.type,
      Number(t.amount).toFixed(2),
      t.isPaid ? 'Pago' : 'Pendente',
      t.paymentMethod || 'DEBIT'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `extrato_finlove_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-0">

      {/* Header e Filtros */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-center bg-[#1f1630] p-4 rounded-2xl border border-white/5 shadow-lg">
        
        {/* Busca e Filtros */}
        <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-3 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Buscar no extrato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#130b20] text-gray-200 pl-10 pr-4 py-2.5 rounded-xl border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition text-sm"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            <FilterButton active={filterType === 'ALL'} onClick={() => setFilterType('ALL')} label="Tudo" />
            <FilterButton active={filterType === 'INCOME'} onClick={() => setFilterType('INCOME')} label="Entradas" color="text-green-400" />
            <FilterButton active={filterType === 'EXPENSE'} onClick={() => setFilterType('EXPENSE')} label="Saídas" color="text-red-400" />
            <FilterButton active={filterType === 'INVESTMENT'} onClick={() => setFilterType('INVESTMENT')} label="Guardado" color="text-blue-400" />
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="w-full xl:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition text-gray-300 hover:text-white group"
        >
          <DownloadCloud size={18} className="group-hover:text-purple-400 transition-colors" />
          <span>Exportar CSV</span>
        </button>
      </div>

      {/* Lista de Transações */}
      <div className="space-y-3">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map((t) => {
            const style = getTypeStyles(t.type);
            const isCredit = t.paymentMethod === 'CREDIT';
            const isInstallment = t.installments && t.installments > 1;

            return (
              <div
                key={t.id}
                // LAYOUT RESPONSIVO OTIMIZADO (flex-col no mobile, row no desktop)
                className={`group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#1f1630]/60 backdrop-blur-sm hover:bg-[#1f1630] border rounded-2xl transition-all duration-300 hover:shadow-lg gap-4 ${
                  !t.isPaid ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-white/5'
                }`}
              >
                {/* ESQUERDA: Ícone e Detalhes */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  
                  {/* Botão de Status / Ícone */}
                  <div className="shrink-0 mt-1 sm:mt-0">
                    {t.type === 'EXPENSE' ? (
                        <button 
                          onClick={(e) => handleToggleStatus(t.id, t.isPaid, e)}
                          disabled={loadingId === t.id}
                          className={`p-3 rounded-full transition-all ${t.isPaid ? style.bg + ' ' + style.color : 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20'}`}
                          title={t.isPaid ? "Pago" : "Pendente (Clique para pagar)"}
                        >
                          {loadingId === t.id ? (
                             <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : t.isPaid ? (
                             <CheckCircle2 size={24} />
                          ) : (
                             <Circle size={24} />
                          )}
                        </button>
                    ) : (
                      <div className={`p-3 rounded-full ${style.bg} ${style.color}`}>
                        {style.icon}
                      </div>
                    )}
                  </div>

                  {/* Textos e Badges */}
                  <div className="flex flex-col min-w-0 gap-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className={`font-bold text-sm md:text-base truncate pr-2 ${!t.isPaid ? 'text-yellow-100' : 'text-white'}`}>
                        {t.description}
                      </p>
                      {/* Badge de Parcela */}
                      {isInstallment && (
                        <span className="shrink-0 text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30 whitespace-nowrap">
                          {t.currentInstallment}/{t.installments}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      {/* Método de Pagamento e Categoria */}
                      <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md border border-white/5 max-w-full" title={isCredit ? "Cartão de Crédito" : "Débito/Dinheiro"}>
                          {isCredit ? <CreditCard size={10} className="shrink-0" /> : <Wallet size={10} className="shrink-0" />}
                          <span className="capitalize truncate max-w-[100px]">{t.category}</span>
                      </div>
                      
                      <span className="hidden xs:inline">•</span>
                      <span className="whitespace-nowrap">{format(new Date(t.date), "d 'de' MMM", { locale: ptBR })}</span>
                      
                      {!t.isPaid && (
                        <>
                          <span className="hidden xs:inline">•</span>
                          <span className="text-yellow-500 font-bold whitespace-nowrap">Pendente</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* DIREITA: Valor e Ações (Alinhamento corrigido para Mobile) */}
                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pl-16 sm:pl-0">
                  <span className={`font-bold text-sm md:text-base whitespace-nowrap ${style.color}`}>
                    {t.type === 'EXPENSE' ? '- ' : '+ '}
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(t.amount))}
                  </span>

                  <div className="flex items-center gap-2">
                    {t.type !== 'INVESTMENT' && (
                      <button
                        onClick={() => onEdit(t)}
                        className="p-2 text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(t.id)}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 bg-[#1f1630]/30 rounded-2xl border border-white/5 border-dashed">
            <Filter size={48} className="mb-4 opacity-20" />
            <p>Nenhum lançamento encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, label, color = "text-gray-300" }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${active
          ? `bg-white/10 text-white border-white/20 shadow-inner`
          : `bg-transparent text-gray-500 border-transparent hover:bg-white/5 hover:text-gray-300`
        }`}
    >
      <span className={active ? color : ''}>{label}</span>
    </button>
  );
}