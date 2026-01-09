'use client';

import { useState } from 'react';
import {
  ArrowUpCircle, ArrowDownCircle, Search, Filter,
  Trash2, Edit2, Calendar, CreditCard, Wallet,
  PiggyBank, User, Heart, Download
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { exportTransactionsCsvAction } from '@/app/actions';
import { toast } from 'sonner';

// Reutilizando a tipagem
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
  month: number; // Necessário para a exportação CSV
  year: number;  // Necessário para a exportação CSV
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
  const [exporting, setExporting] = useState(false);

  // --- Lógica de Exportação CSV ---
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await exportTransactionsCsvAction(month, year);
      
      if (res.success && res.csv) {
        // Cria um Blob e dispara o download via navegador
        const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `extrato_finlove_${month + 1}_${year}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Download iniciado com sucesso!");
      } else {
        toast.error("Erro ao gerar o arquivo CSV.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erro de conexão ao exportar.");
    } finally {
      setExporting(false);
    }
  };

  // --- Lógica de Filtros ---
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  // Ordenar por data (mais recente primeiro)
  const sortedTransactions = filteredTransactions.sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // --- Helpers de Ícones ---
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

  return (
    <div className="space-y-6">
      {/* BARRA DE FILTROS E AÇÕES */}
      <div className="flex flex-col md:flex-row gap-4 justify-between bg-[#1f1630] p-4 rounded-2xl border border-white/5 shadow-lg">
        
        {/* Campo de Busca */}
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

        {/* Botões de Filtro e Exportar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          
          {/* Botão Exportar CSV (Novo) */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/5 transition-all text-xs font-bold whitespace-nowrap
              ${exporting ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white'}
            `}
            title="Baixar extrato em CSV"
          >
            <Download size={16} className={exporting ? 'animate-bounce' : ''} />
            {exporting ? 'Gerando...' : 'Exportar CSV'}
          </button>

          <div className="w-px h-6 bg-white/10 mx-1 hidden md:block" />

          {/* Filtros de Tipo */}
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
      <div className="space-y-3">
        {sortedTransactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>Nenhuma transação encontrada para este filtro.</p>
          </div>
        ) : (
          sortedTransactions.map((t) => {
            // Identifica quem fez a transação
            const isPartner = partnerId && t.userId === partnerId;
            const ownerName = isPartner ? (partnerName?.split(' ')[0] || 'Parceiro') : 'Você';
            const OwnerIcon = isPartner ? Heart : User;

            return (
              <div
                key={t.id}
                className="group bg-[#1f1630] hover:bg-[#251a3a] border border-white/5 p-4 rounded-2xl flex items-center justify-between transition-all hover:shadow-lg hover:border-purple-500/20 relative overflow-hidden"
              >
                {/* Indicador lateral de cor */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${t.type === 'INCOME' ? 'bg-green-500' : t.type === 'EXPENSE' ? 'bg-red-500' : 'bg-purple-500'}`} />

                <div className="flex items-center gap-4 pl-2">
                  <div className={`p-3 rounded-full bg-[#130b20] border border-white/5 shadow-inner`}>
                    {getIcon(t.type)}
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-200 text-sm md:text-base flex items-center gap-2">
                      {t.description}
                      {t.installments && t.installments > 1 && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-700 rounded-full text-gray-300">
                          {t.currentInstallment}/{t.installments}
                        </span>
                      )}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                      <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md">
                        <Calendar size={10} />
                        {format(new Date(t.date), "d 'de' MMM", { locale: ptBR })}
                      </span>
                      <span className="flex items-center gap-1">
                        {getPaymentIcon(t.paymentMethod)}
                        {t.category}
                      </span>
                      {partnerId && (
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md border ${isPartner
                            ? 'bg-pink-500/10 border-pink-500/20 text-pink-300'
                            : 'bg-purple-500/10 border-purple-500/20 text-purple-300'
                          }`}>
                          <OwnerIcon size={10} />
                          {ownerName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`font-bold whitespace-nowrap ${t.type === 'INCOME' ? 'text-green-400' : t.type === 'EXPENSE' ? 'text-red-400' : 'text-purple-400'
                      }`}>
                      {t.type === 'EXPENSE' ? '- ' : '+ '}
                      R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {t.isPaid ? 'Pago' : 'Pendente'}
                    </p>
                  </div>

                  {/* Ações (Editar/Excluir) - Apenas se não for do parceiro (regra de negócio comum) */}
                  {!isPartner ? (
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEdit(t)}
                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-full transition"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(t.id)}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-full transition"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-[72px]"></div> // Espaçador para manter alinhamento
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}