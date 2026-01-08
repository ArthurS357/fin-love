'use client';

import { useState } from 'react';
import {
  ArrowUpCircle, ArrowDownCircle, Search, Filter,
  Trash2, Edit2, Calendar, CreditCard, Wallet,
  PiggyBank, User, Heart
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Reutilizando a tipagem ou definindo compatível
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
}

export default function HistoryTab({ transactions, onEdit, onDelete, partnerId, partnerName }: HistoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'INVESTMENT'>('ALL');

  // Filtragem
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
      {/* BARRA DE FILTROS */}
      <div className="flex flex-col md:flex-row gap-4 justify-between bg-[#1f1630] p-4 rounded-2xl border border-white/5 shadow-lg">
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

        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <Filter size={18} className="text-gray-400 mr-2" />
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
            <p>Nenhuma transação encontrada.</p>
          </div>
        ) : (
          sortedTransactions.map((t) => {
            // Lógica para identificar dono da transação
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
                      {/* IDENTIFICADOR DE QUEM FEZ A TRANSAÇÃO */}
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

                  {/* Ações só aparecem se for SUA transação ou se a lógica de negócio permitir editar parceiro */}
                  {/* Assumindo que só pode editar o seu por segurança, ou ambos se preferir */}
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
                    <div className="w-[72px]"></div> // Espaçador para alinhar
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