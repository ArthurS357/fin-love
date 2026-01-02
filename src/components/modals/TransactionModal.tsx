'use client'

import { useEffect, useState } from 'react';
import { X, ArrowUpCircle, ArrowDownCircle, Check, Loader2, Settings } from 'lucide-react';
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
  
  // Estado do Formulário
  const [type, setType] = useState('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  // Estado das Categorias
  const [categories, setCategories] = useState<any[]>([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // Carregar dados iniciais e categorias
  useEffect(() => {
    if (isOpen) {
      loadCategories();

      if (initialData) {
        setType(initialData.type);
        setAmount(initialData.amount.toString());
        setDescription(initialData.description);
        setCategory(initialData.category);
      } else {
        // Reset
        setType('EXPENSE');
        setAmount('');
        setDescription('');
        setCategory('');
      }
    }
  }, [isOpen, initialData]);

  const loadCategories = async () => {
    const res = await getCategoriesAction();
    if (res.success) {
      setCategories(res.data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append('type', type);
    formData.append('amount', amount);
    formData.append('description', description);
    formData.append('category', category);

    let result;
    if (initialData) {
      formData.append('id', initialData.id);
      result = await updateTransaction(formData);
    } else {
      result = await addTransaction(formData);
    }

    if (result.success) {
      toast.success(initialData ? 'Atualizado com sucesso!' : 'Lançamento adicionado!');
      onClose();
    } else {
      toast.error(result.error || 'Ocorreu um erro.');
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        
        {/* Container do Modal */}
        <div className="bg-[#1a1025] w-full max-w-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
          
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-white/5 bg-[#1f1630]">
            <h3 className="text-xl font-bold text-white">
              {initialData ? 'Editar Lançamento' : 'Nova Transação'}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition p-1 hover:bg-white/10 rounded-full">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            
            {/* Seletor de Tipo */}
            <div className="grid grid-cols-2 gap-3 p-1 bg-[#130b20] rounded-2xl">
              <button
                type="button"
                onClick={() => setType('INCOME')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                  type === 'INCOME' 
                    ? 'bg-green-500/20 text-green-400 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <ArrowUpCircle size={18} /> Entrada
              </button>
              <button
                type="button"
                onClick={() => setType('EXPENSE')}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                  type === 'EXPENSE' 
                    ? 'bg-red-500/20 text-red-400 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <ArrowDownCircle size={18} /> Saída
              </button>
            </div>

            {/* Valor */}
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
                  className="w-full bg-[#130b20] text-white text-xl font-bold pl-11 pr-4 py-3.5 rounded-xl border border-gray-700 focus:border-pink-500 outline-none transition focus:ring-1 focus:ring-pink-500/30"
                />
              </div>
            </div>

            {/* Descrição e Categoria */}
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider ml-1 mb-1.5 block">Descrição</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Compras do mês"
                  className="w-full bg-[#130b20] text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-purple-500 outline-none transition placeholder:text-gray-600"
                />
              </div>

              {/* Seletor de Categoria Inteligente */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider ml-1">Categoria</label>
                  <button 
                    type="button" 
                    onClick={() => setShowCategoryManager(true)}
                    className="text-[10px] text-pink-400 hover:text-pink-300 flex items-center gap-1 hover:underline"
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
                    className="w-full bg-[#130b20] text-white px-4 py-3 rounded-xl border border-gray-700 focus:border-purple-500 outline-none transition placeholder:text-gray-600"
                  />
                  <datalist id="categories-list">
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Botão Salvar */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-purple-900/20 active:scale-[0.98] mt-2 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
              {initialData ? 'Salvar Alterações' : 'Adicionar'}
            </button>

          </form>
        </div>
      </div>

      {/* Modal de Gerenciamento de Categorias (Aninhado) */}
      {showCategoryManager && (
        <CategoryManagerModal 
          isOpen={showCategoryManager} 
          onClose={() => {
            setShowCategoryManager(false);
            loadCategories(); // Recarrega a lista ao fechar
          }} 
        />
      )}
    </>
  );
}