'use client';

import { useState } from 'react';
import { X, Save, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { addInvestmentAction } from '@/app/actions';

interface InvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InvestmentModal({ isOpen, onClose, onSuccess }: InvestmentModalProps) {
  const [loading, setLoading] = useState(false);
  
  if (!isOpen) return null;

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    const res = await addInvestmentAction(formData);
    setLoading(false);

    if (res.success) {
      toast.success("Investimento adicionado!");
      onSuccess();
      onClose();
    } else {
      toast.error(res.error || "Erro ao salvar.");
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#1a1025] w-full max-w-md rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#1f1630]">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="text-pink-500" /> Novo Investimento
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        <form action={handleSubmit} className="p-6 space-y-4">
          
          {/* Nome */}
          <div>
            <label className="text-xs text-gray-400 font-bold ml-1 mb-1 block">NOME DO ATIVO</label>
            <input 
              name="name" 
              required 
              placeholder="Ex: CDB Nubank, Bitcoin, PETR4..." 
              className="w-full bg-[#130b20] border border-white/10 rounded-xl p-3 text-white focus:border-pink-500 outline-none transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Categoria */}
            <div>
              <label className="text-xs text-gray-400 font-bold ml-1 mb-1 block">CATEGORIA</label>
              <select 
                name="category" 
                className="w-full bg-[#130b20] border border-white/10 rounded-xl p-3 text-white outline-none appearance-none"
              >
                <option value="RENDA_FIXA">Renda Fixa</option>
                <option value="ACOES">Ações</option>
                <option value="FII">Fundos Imob. (FII)</option>
                <option value="CRIPTO">Criptomoedas</option>
                <option value="OUTROS">Outros</option>
              </select>
            </div>

            {/* Data */}
            <div>
              <label className="text-xs text-gray-400 font-bold ml-1 mb-1 block">DATA</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="date" 
                  name="date" 
                  defaultValue={new Date().toISOString().split('T')[0]}
                  className="w-full bg-[#130b20] border border-white/10 rounded-xl p-3 pl-10 text-white outline-none text-sm"
                />
              </div>
            </div>
          </div>

          {/* Valor */}
          <div>
            <label className="text-xs text-gray-400 font-bold ml-1 mb-1 block">VALOR INVESTIDO (R$)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500 font-bold">R$</span>
              <input 
                name="investedAmount" 
                type="number" 
                step="0.01" 
                required 
                placeholder="0.00" 
                className="w-full bg-[#130b20] border border-white/10 rounded-xl p-3 pl-12 text-white text-lg font-bold outline-none focus:border-pink-500 transition"
              />
            </div>
          </div>

          {/* Checkbox Integração */}
          <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-4 flex items-start gap-3">
            <input 
              type="checkbox" 
              name="createTransaction" 
              id="createTransaction" 
              defaultChecked 
              className="mt-1 w-4 h-4 accent-pink-500"
            />
            <label htmlFor="createTransaction" className="text-sm text-gray-300 cursor-pointer select-none">
              <span className="block font-bold text-pink-200">Debitar do Saldo?</span>
              Criar automaticamente uma despesa no extrato referente a este investimento.
            </label>
          </div>

          {/* Botão Salvar */}
          <button 
            disabled={loading}
            type="submit" 
            className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-pink-900/20 transition active:scale-95 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"/> : <Save size={20} />}
            Salvar Investimento
          </button>

        </form>
      </div>
    </div>
  );
}