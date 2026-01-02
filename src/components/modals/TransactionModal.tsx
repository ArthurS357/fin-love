import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, TrendingDown, TrendingUp, ChevronLeft, Pencil, Plus } from 'lucide-react';
import { addTransaction, updateTransaction } from '@/app/actions';

const CATEGORIAS_DESPESA = [
  "Alimentação", "Transporte", "Lazer", "Faculdade",
  "Fatura Cartão", "Luz", "Internet", "Água", "Outros"
];

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any | null; // Se vier dados, é Edição. Se null, é Criação.
}

export default function TransactionModal({ isOpen, onClose, initialData }: TransactionModalProps) {
  // Estados do Formulário
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIAS_DESPESA[0]);

  // Efeito para preencher o formulário quando abrir em modo de EDIÇÃO
  useEffect(() => {
    if (isOpen && initialData) {
      setType(initialData.type);
      setAmount(initialData.amount.toString());
      setDescription(initialData.description);
      setCategory(initialData.category);
    } else if (isOpen && !initialData) {
      // Reseta se for abrir como NOVO
      setType('EXPENSE');
      setAmount('');
      setDescription('');
      setCategory(CATEGORIAS_DESPESA[0]);
    }
  }, [isOpen, initialData]);

  // Função Wrapper para enviar ao servidor e fechar o modal
  async function handleSubmit(formData: FormData) {
    if (initialData) {
      formData.append('id', initialData.id);
      await updateTransaction(formData);
    } else {
      await addTransaction(formData);
    }
    onClose(); // Fecha o modal após o sucesso
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-0 md:p-4">
      {/* Fundo Escuro */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Card do Modal */}
      <div className="relative bg-[#1f1630] w-full max-w-md rounded-t-3xl md:rounded-2xl border border-purple-500/30 shadow-2xl p-6 animate-in slide-in-from-bottom-10 zoom-in-95 duration-300">

        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {initialData ? <Pencil className="text-blue-400" /> : <Plus className="text-purple-400" />}
            {initialData ? 'Editar Lançamento' : 'Novo Lançamento'}
          </h2>
          <button onClick={onClose} className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white p-2 rounded-full transition">
            <X size={20} />
          </button>
        </div>

        <form action={handleSubmit} className="space-y-5">

          {/* Seletor Tipo (Receita vs Despesa) */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-[#130b20] rounded-xl border border-purple-900/30">
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              className={`py-3 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${type === 'EXPENSE' ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <TrendingDown size={18} /> Despesa
            </button>
            <button
              type="button"
              onClick={() => setType('INCOME')}
              className={`py-3 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${type === 'INCOME' ? 'bg-green-500/20 text-green-400 border border-green-500/50' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <TrendingUp size={18} /> Receita
            </button>
            <input type="hidden" name="type" value={type} />
          </div>

          {/* Valor */}
          <div>
            <label className="block text-xs uppercase text-gray-500 font-bold mb-1 pl-1">Valor (R$)</label>
            <input
              name="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              required
              className="w-full bg-[#2a2235] border border-purple-900/50 text-white text-4xl font-bold p-4 rounded-xl focus:outline-none focus:border-purple-500 placeholder-gray-600 transition"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs uppercase text-gray-500 font-bold mb-1 pl-1">Descrição</label>
            <input
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === 'INCOME' ? "Ex: Salário, Bônus..." : "Ex: Mercado, Uber..."}
              required
              className="w-full bg-[#130b20] border border-purple-900/50 text-white p-4 rounded-xl focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          {/* Categoria (Some se for Receita) */}
          {type === 'EXPENSE' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-xs uppercase text-gray-500 font-bold mb-1 pl-1">Categoria</label>
              <div className="relative">
                <select
                  name="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full appearance-none bg-[#130b20] border border-purple-900/50 text-white p-4 rounded-xl focus:outline-none focus:border-purple-500 transition cursor-pointer"
                >
                  {CATEGORIAS_DESPESA.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                  <ChevronLeft className="-rotate-90" size={16} />
                </div>
              </div>
            </div>
          )}

          {/* Botão Confirmar */}
          <button
            type="submit"
            className={`w-full font-bold py-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 mt-2 text-lg ${type === 'EXPENSE' ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/30' : 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/30'}`}
          >
            <CheckCircle2 size={24} />
            {initialData ? 'Salvar Alterações' : (type === 'EXPENSE' ? 'Confirmar Despesa' : 'Confirmar Receita')}
          </button>

        </form>
      </div>
    </div>
  );
}