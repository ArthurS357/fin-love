'use client'

import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, Tag, FileText, DollarSign, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { addTransaction, updateTransaction } from '@/app/actions';
import { toast } from 'sonner';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any | null;
}

const CATEGORIES = {
  INCOME: ['Salário', 'Freelance', 'Investimentos', 'Presente', 'Outros'],
  EXPENSE: ['Alimentação', 'Moradia', 'Transporte', 'Lazer', 'Saúde', 'Educação', 'Compras', 'Outros']
};

export default function TransactionModal({ isOpen, onClose, initialData }: TransactionModalProps) {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  
  // Form States
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  // Carregar dados ao editar
  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setAmount(initialData.amount.toString());
      setDescription(initialData.description);
      setCategory(initialData.category);
    } else {
      // Reset para nova transação
      setType('EXPENSE');
      setAmount('');
      setDescription('');
      setCategory('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append('type', type);
    formData.append('amount', amount);
    formData.append('description', description);
    formData.append('category', category || 'Outros');

    let result;
    
    if (initialData) {
      // Edição
      formData.append('id', initialData.id);
      result = await updateTransaction(formData);
    } else {
      // Criação
      result = await addTransaction(formData);
    }

    if (result.success) {
      toast.success(initialData ? 'Transação atualizada!' : 'Transação criada com sucesso!');
      onClose();
    } else {
      toast.error('Erro ao salvar transação.');
    }
    
    setLoading(false);
  };

  const isExpense = type === 'EXPENSE';
  const themeColor = isExpense ? 'red' : 'green';
  const themeClass = isExpense ? 'text-red-400' : 'text-green-400';
  const bgClass = isExpense ? 'bg-red-500' : 'bg-green-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay com Blur */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-[#1f1630] rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-xl font-bold text-white">
            {initialData ? 'Editar Lançamento' : 'Nova Transação'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Seletor de Tipo */}
          <div className="grid grid-cols-2 gap-2 bg-[#130b20] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setType('INCOME')}
              className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${!isExpense ? 'bg-[#1f1630] text-green-400 shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <ArrowUpCircle size={18} />
              Entrada
            </button>
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${isExpense ? 'bg-[#1f1630] text-red-400 shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <ArrowDownCircle size={18} />
              Saída
            </button>
          </div>

          {/* Valor */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2 block">Valor</label>
            <div className="relative group">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold ${themeClass}`}>R$</span>
              <input 
                type="number"
                step="0.01"
                required
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`w-full bg-[#130b20] text-white text-2xl font-bold pl-12 pr-4 py-4 rounded-xl border border-transparent focus:border-${themeColor}-500/50 outline-none transition group-hover:bg-[#160d25]`}
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2 block">Descrição</label>
            <div className="relative">
              <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="text"
                required
                placeholder="Ex: Compras do mês"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#130b20] text-white pl-11 pr-4 py-3.5 rounded-xl border border-transparent focus:border-white/20 outline-none transition"
              />
            </div>
          </div>

          {/* Categoria */}
          <div>
             <label className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2 block">Categoria</label>
             <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
               {CATEGORIES[type].map((cat) => (
                 <button
                   key={cat}
                   type="button"
                   onClick={() => setCategory(cat)}
                   className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${category === cat ? `${bgClass} text-white border-transparent` : 'bg-[#130b20] text-gray-400 border-white/5 hover:border-white/20'}`}
                 >
                   {cat}
                 </button>
               ))}
             </div>
          </div>

          {/* Botão Salvar */}
          <button 
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg shadow-${themeColor}-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 ${bgClass} hover:opacity-90 disabled:opacity-50`}
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
            ) : (
              <>
                <Check size={20} />
                {initialData ? 'Salvar Alterações' : 'Confirmar Transação'}
              </>
            )}
          </button>

        </form>
      </div>
    </div>
  );
}