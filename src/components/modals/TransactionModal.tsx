'use client'

import { useEffect, useState, FormEvent } from 'react';
import { 
  X, ArrowUpCircle, ArrowDownCircle, Check, Loader2, 
  Settings, CreditCard, Wallet 
} from 'lucide-react';
import { addTransaction, updateTransaction, getCategoriesAction } from '@/app/actions';
import { toast } from 'sonner';
import CategoryManagerModal from './CategoryManagerModal';

// 1. Definição das Interfaces (Adeus 'any')
export interface TransactionData {
  id: string;
  type: 'INCOME' | 'EXPENSE' | 'INVESTMENT' | string; // Flexibilidade controlada
  amount: number | string | any; // Aceita Decimal do Prisma convertido
  description: string;
  category: string;
  date: string | Date;
  paymentMethod?: string | null;
  installments?: number | null;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: TransactionData | null;
}

export default function TransactionModal({ isOpen, onClose, initialData }: TransactionModalProps) {
  const [loading, setLoading] = useState(false);

  // Estados do Formulário
  const [type, setType] = useState('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); 
  
  // Estados Avançados (Despesas)
  const [paymentMethod, setPaymentMethod] = useState('DEBIT');
  const [installments, setInstallments] = useState(1);
  
  // Recorrência
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDay, setRecurringDay] = useState(new Date().getDate());

  // Gerenciamento de Categorias
  const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // Carregar dados ao abrir
  useEffect(() => {
    if (isOpen) {
      loadCategories();

      if (initialData) {
        // MODO EDIÇÃO
        setType(initialData.type);
        setAmount(initialData.amount ? String(initialData.amount) : ''); 
        setDescription(initialData.description || '');
        setCategory(initialData.category || '');
        
        // Tratamento robusto para data (pode vir do Prisma como Date ou String ISO)
        if (initialData.date) {
            const d = new Date(initialData.date);
            if (!isNaN(d.getTime())) {
                setDate(d.toISOString().split('T')[0]);
            }
        }
        
        // Preenche campos opcionais se existirem
        setPaymentMethod(initialData.paymentMethod || 'DEBIT');
        setInstallments(initialData.installments || 1);
        
        // Na edição, desativamos a recorrência rápida para evitar complexidade
        // (Geralmente recorrência se edita em outra tela específica, ou mantemos false)
        setIsRecurring(false);
      } else {
        // MODO CRIAÇÃO (Reset)
        setType('EXPENSE');
        setAmount('');
        setDescription('');
        setCategory('');
        setDate(new Date().toISOString().split('T')[0]);
        setPaymentMethod('DEBIT');
        setInstallments(1);
        setIsRecurring(false);
        setRecurringDay(new Date().getDate());
      }
    }
  }, [isOpen, initialData]);

  const loadCategories = async () => {
    try {
        const res = await getCategoriesAction();
        if (res.success && Array.isArray(res.data)) {
             setCategories(res.data);
        }
    } catch (error) {
        console.error("Falha ao carregar categorias", error);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append('type', type);
    formData.append('amount', amount);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('date', date);

    if (type === 'EXPENSE') {
      formData.append('paymentMethod', paymentMethod);
      if (paymentMethod === 'CREDIT') {
        formData.append('installments', installments.toString());
      }
    }

    // Só envia recorrência se for criação nova
    if (isRecurring && !initialData) {
      formData.append('isRecurring', 'true');
      formData.append('recurringDay', recurringDay.toString());
    }

    let result;
    if (initialData?.id) {
      formData.append('id', initialData.id);
      result = await updateTransaction(formData);
    } else {
      result = await addTransaction(formData);
    }

    if (result.success) {
      toast.success(initialData ? 'Atualizado com sucesso!' : 'Lançamento salvo!');
      onClose();
    } else {
      toast.error(result.error || 'Erro ao processar transação.');
    }
    setLoading(false);
  };
  
  if (!isOpen) return null;
  
  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          
          {/* Container do Modal */}
          <div className="bg-[#1a1025] w-full max-w-md rounded-t-[2rem] rounded-b-none md:rounded-3xl border-t md:border border-white/10 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 relative max-h-[90vh] flex flex-col">
            
             {/* Header */}
             <div className="flex justify-between items-center px-6 py-4 md:py-6 border-b border-white/5 bg-[#1f1630] shrink-0">
                <h3 className="text-lg md:text-xl font-bold text-white">
                {initialData ? 'Editar Lançamento' : 'Nova Transação'}
                </h3>
                <button 
                  onClick={onClose} 
                  className="text-gray-400 hover:text-white transition p-2 hover:bg-white/10 rounded-full bg-white/5 md:bg-transparent"
                  type="button"
                >
                  <X size={20} />
                </button>
            </div>
            
             {/* Corpo com Scroll */}
             <div className="overflow-y-auto custom-scrollbar p-6 space-y-5">
                <form onSubmit={handleSubmit} className="space-y-5 pb-safe">
                    
                     {/* Seletor de Tipo */}
                     <div className="grid grid-cols-2 gap-3 p-1 bg-[#130b20] rounded-2xl">
                        <button 
                          type="button" 
                          onClick={() => setType('INCOME')} 
                          className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${type === 'INCOME' ? 'bg-green-500/20 text-green-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                          <ArrowUpCircle size={18} /> Entrada
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setType('EXPENSE')} 
                          className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${type === 'EXPENSE' ? 'bg-red-500/20 text-red-400 shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
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
                            className="w-full bg-[#130b20] text-white text-3xl font-bold pl-11 pr-4 py-4 rounded-2xl border border-gray-700 focus:border-pink-500 outline-none transition" 
                            style={{ appearance: 'textfield' }} 
                          />
                        </div>
                    </div>

                    {/* Descrição */}
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

                    {/* Opções de Pagamento (Apenas para Despesas) */}
                    {type === 'EXPENSE' && (
                        <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2">
                            <label className="text-xs text-gray-500 font-bold uppercase tracking-wider ml-1 block">Método de Pagamento</label>
                            <div className="flex gap-3">
                                <button 
                                  type="button" 
                                  onClick={() => setPaymentMethod('DEBIT')} 
                                  className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border transition active:scale-95 ${paymentMethod === 'DEBIT' ? 'border-pink-500 bg-pink-500/10 text-white shadow-[0_0_15px_rgba(236,72,153,0.2)]' : 'border-gray-700 text-gray-400 hover:bg-white/5'}`}
                                >
                                  <Wallet size={20} className={paymentMethod === 'DEBIT' ? 'text-pink-400' : ''} />
                                  <span className="text-xs font-bold">Débito / Pix</span>
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => setPaymentMethod('CREDIT')} 
                                  className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl border transition active:scale-95 ${paymentMethod === 'CREDIT' ? 'border-purple-500 bg-purple-500/10 text-white shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'border-gray-700 text-gray-400 hover:bg-white/5'}`}
                                >
                                  <CreditCard size={20} className={paymentMethod === 'CREDIT' ? 'text-purple-400' : ''} />
                                  <span className="text-xs font-bold">Crédito</span>
                                </button>
                            </div>
                            
                            {paymentMethod === 'CREDIT' && (
                                <div className="animate-in slide-in-from-top-2 pt-1">
                                    <label className="text-xs text-gray-500 font-bold uppercase tracking-wider ml-1 mb-1.5 block">Parcelamento</label>
                                    <select 
                                      value={installments} 
                                      onChange={(e) => setInstallments(Number(e.target.value))} 
                                      className="w-full bg-[#130b20] text-white px-4 py-3.5 rounded-xl border border-gray-700 focus:border-purple-500 outline-none transition appearance-none cursor-pointer"
                                    >
                                        {[1,2,3,4,5,6,7,8,9,10,11,12,18,24].map(n => (
                                          <option key={n} value={n} className="bg-[#1a1025]">
                                            {n === 1 ? 'À vista (1x)' : `${n}x parcelas`}
                                          </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Data e Categoria */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-500 font-bold uppercase tracking-wider ml-1 mb-1.5 block">Data</label>
                            <div className="relative">
                              <input 
                                type="date" 
                                required 
                                value={date} 
                                onChange={(e) => setDate(e.target.value)} 
                                className="w-full bg-[#130b20] text-white px-3 py-3.5 rounded-xl border border-gray-700 focus:border-purple-500 outline-none transition text-sm [color-scheme:dark]" 
                              />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider ml-1">Categoria</label>
                                <button 
                                  type="button" 
                                  onClick={() => setShowCategoryManager(true)} 
                                  className="text-xs text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-lg active:scale-95 transition"
                                >
                                  <Settings size={12} />
                                </button>
                            </div>
                            <div className="relative">
                                <input 
                                  list="categories-list" 
                                  type="text" 
                                  required 
                                  value={category} 
                                  onChange={(e) => setCategory(e.target.value)} 
                                  placeholder="Selecione..." 
                                  className="w-full bg-[#130b20] text-white px-3 py-3.5 rounded-xl border border-gray-700 focus:border-purple-500 outline-none transition placeholder:text-gray-600 text-sm truncate" 
                                />
                                <datalist id="categories-list">
                                  {categories.map((cat) => (<option key={cat.id} value={cat.name} />))}
                                </datalist>
                            </div>
                        </div>
                    </div>
                    
                    {/* Recorrência (Apenas Criação) */}
                    {!initialData && (
                        <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isRecurring ? 'bg-purple-500/20 border-purple-500/50' : 'bg-[#130b20] border-gray-700'}`}>
                            <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setIsRecurring(!isRecurring)}>
                                <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition ${isRecurring ? 'bg-purple-500 border-purple-500' : 'border-gray-500'}`}>
                                  {isRecurring && <Check size={14} className="text-white" />}
                                </div>
                                <div className="flex flex-col">
                                  <span className={`text-sm font-bold ${isRecurring ? 'text-white' : 'text-gray-300'}`}>Assinatura</span>
                                  <span className="text-xs text-gray-500">Repetir todo mês{isRecurring ? ` (Dia ${recurringDay})` : ''}</span>
                                </div>
                            </div>
                            {isRecurring && (
                              <div className="flex flex-col items-end gap-1 animate-in fade-in">
                                <span className="text-[10px] text-gray-400 font-bold uppercase">Dia</span>
                                <input 
                                  type="number" 
                                  min="1" 
                                  max="31" 
                                  value={recurringDay} 
                                  onChange={(e) => setRecurringDay(Number(e.target.value))} 
                                  className="w-12 bg-black/30 border border-white/20 rounded-lg py-1 text-center text-white text-sm focus:border-purple-500 outline-none" 
                                />
                              </div>
                            )}
                        </div>
                    )}

                    {/* Botão Salvar */}
                    <button 
                      type="submit" 
                      disabled={loading} 
                      className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl transition shadow-lg shadow-purple-900/20 active:scale-[0.98] mt-4 flex items-center justify-center gap-2 text-lg"
                    >
                      {loading ? <Loader2 className="animate-spin" size={24} /> : <Check size={24} />}
                      {initialData ? 'Salvar Alterações' : 'Confirmar Transação'}
                    </button>
                    
                    {/* Espaçador Mobile */}
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