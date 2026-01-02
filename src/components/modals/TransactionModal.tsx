'use client'

import { useEffect, useState } from 'react';
// Adicionado 'Repeat' aos imports
import { X, ArrowUpCircle, ArrowDownCircle, Check, Loader2, Settings, Repeat } from 'lucide-react';
import { addTransaction, updateTransaction, getCategoriesAction } from '@/app/actions';
import { toast } from 'sonner';
import CategoryManagerModal from './CategoryManagerModal';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
}

export default function TransactionModal({ isOpen, onClose, initialData }: TransactionModalProps) {
  const [loading, setLoading] = useState(false);

  const [type, setType] = useState('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isRecurring, setIsRecurring] = useState(false); // Estado da recorrência

  const [categories, setCategories] = useState<any[]>([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCategories();

      if (initialData) {
        setType(initialData.type);
        setAmount(initialData.amount.toString());
        setDescription(initialData.description);
        setCategory(initialData.category);
        setIsRecurring(false);
      } else {
        setType('EXPENSE');
        setAmount('');
        setDescription('');
        setCategory('');
        setIsRecurring(false);
      }
    }
  }, [isOpen, initialData]);

  const loadCategories = async () => {
    const res = await getCategoriesAction();
    if (res.success) setCategories(res.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append('type', type);
    formData.append('amount', amount);
    formData.append('description', description);
    formData.append('category', category);

    // Envia flag de recorrência
    if (isRecurring && !initialData) {
      formData.append('isRecurring', 'on');
    }

    let result;
    if (initialData) {
      formData.append('id', initialData.id);
      result = await updateTransaction(formData);
    } else {
      result = await addTransaction(formData);
    }

    if (result.success) {
      toast.success(initialData ? 'Atualizado!' : 'Lançamento salvo!');
      onClose();
    } else {
      toast.error(result.error || 'Erro ao salvar.');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">

        <div className="bg-[#1a1025] w-full max-w-md rounded-t-[2rem] rounded-b-none md:rounded-3xl border-t md:border border-white/10 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 relative max-h-[90vh] flex flex-col">

          <div className="md:hidden w-full flex justify-center pt-3 pb-1" onClick={onClose}>
            <div className="w-12 h-1.5 bg-gray-700/50 rounded-full" />
          </div>

          <div className="flex justify-between items-center px-6 py-4 md:py-6 border-b border-white/5 bg-[#1f1630] shrink-0">
            <h3 className="text-lg md:text-xl font-bold text-white">
              {initialData ? 'Editar Lançamento' : 'Nova Transação'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition p-2 hover:bg-white/10 rounded-full bg-white/5 md:bg-transparent">
              <X size={20} />
            </button>
          </div>

          <div className="overflow-y-auto custom-scrollbar p-6 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-5 pb-safe">

              <div className="grid grid-cols-2 gap-3 p-1 bg-[#130b20] rounded-2xl">
                <button
                  type="button"
                  onClick={() => setType('INCOME')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${type === 'INCOME' ? 'bg-green-500/20 text-green-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'
                    }`}
                >
                  <ArrowUpCircle size={18} /> Entrada
                </button>
                <button
                  type="button"
                  onClick={() => setType('EXPENSE')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${type === 'EXPENSE' ? 'bg-red-500/20 text-red-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'
                    }`}
                >
                  <ArrowDownCircle size={18} /> Saída
                </button>
              </div>

              <div>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider ml-1 mb-1.5 block">Valor</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold group-focus-within:text-pink-500 transition-colors">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#130b20] text-white text-3xl font-bold pl-11 pr-4 py-4 rounded-2xl border border-gray-700 focus:border-pink-500 outline-none transition"
                    style={{ appearance: 'textfield' }}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider ml-1 mb-1.5 block">Descrição</label>
                  <input
                    type="text"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Compras do mês"
                    className="w-full bg-[#130b20] text-white px-4 py-3.5 rounded-xl border border-gray-700 focus:border-purple-500 outline-none transition placeholder:text-gray-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs text-gray-500 font-bold uppercase tracking-wider ml-1">Categoria</label>
                    <button
                      type="button"
                      onClick={() => setShowCategoryManager(true)}
                      className="text-xs text-pink-400 bg-pink-500/10 px-2 py-1 rounded-lg flex items-center gap-1 active:scale-95 transition"
                    >
                      <Settings size={12} /> Gerenciar
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      list="categories-list"
                      type="text"
                      required
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="Selecione ou digite..."
                      className="w-full bg-[#130b20] text-white px-4 py-3.5 rounded-xl border border-gray-700 focus:border-purple-500 outline-none transition placeholder:text-gray-600"
                    />
                    <datalist id="categories-list">
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>

              {/* Checkbox Recorrência (Restaurado) */}
              {!initialData && (
                <div
                  onClick={() => setIsRecurring(!isRecurring)}
                  className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all select-none active:scale-[0.98] ${isRecurring
                      ? 'bg-purple-500/20 border-purple-500/50'
                      : 'bg-[#130b20] border-gray-700 hover:border-gray-600'
                    }`}
                >
                  <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition ${isRecurring ? 'bg-purple-500 border-purple-500' : 'border-gray-500'}`}>
                    {isRecurring && <Check size={14} className="text-white" />}
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-sm font-bold ${isRecurring ? 'text-white' : 'text-gray-300'}`}>Assinatura Mensal</span>
                    <span className="text-xs text-gray-500">Repetir transação todo mês</span>
                  </div>
                  <Repeat className={`ml-auto ${isRecurring ? 'text-purple-400' : 'text-gray-600'}`} size={20} />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-purple-900/20 active:scale-[0.98] mt-4 flex items-center justify-center gap-2 text-lg"
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : <Check size={24} />}
                {initialData ? 'Salvar' : 'Confirmar'}
              </button>

              <div className="h-6 md:hidden" />
            </form>
          </div>
        </div>
      </div>

      {showCategoryManager && (
        <CategoryManagerModal
          isOpen={showCategoryManager}
          onClose={() => {
            setShowCategoryManager(false);
            loadCategories();
          }}
        />
      )}
    </>
  );
}