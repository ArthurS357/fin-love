'use client';

import { useState, useRef } from 'react';
import { X, Save, TrendingUp, Calendar, AlertTriangle, ArrowDownCircle, Wallet, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { addInvestmentAction } from '@/app/actions';

interface InvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InvestmentModal({ isOpen, onClose, onSuccess }: InvestmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [lowBalanceData, setLowBalanceData] = useState<{ message: string, currentBalance: number } | null>(null);

  // Estado para persistir os dados quando o formulário sumir da tela (fluxo de decisão)
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);

  const formRef = useRef<HTMLFormElement>(null);

  if (!isOpen) return null;

  async function handleSubmit(formData: FormData) {
    setLoading(true);

    // Chama a Server Action
    const res = await addInvestmentAction(formData);

    setLoading(false);

    if (res.success) {
      toast.success(res.message);
      onSuccess();
      handleClose();
    } else {
      // CORREÇÃO DE TIPO E LÓGICA:
      // Verificamos se a resposta contém 'currentBalance'. Se tiver, é um erro de saldo.
      // Usamos (res as any) para contornar o erro de tipagem estrita do TypeScript temporariamente,
      // já que o retorno de erro do actions.ts pode variar.
      const responseWithBalance = res as { error: string; currentBalance?: number };

      if (responseWithBalance.currentBalance !== undefined) {
        // Salva os dados antes de trocar a tela do modal
        setPendingFormData(formData);

        setLowBalanceData({
          message: responseWithBalance.error || 'Saldo insuficiente na conta.',
          currentBalance: responseWithBalance.currentBalance
        });
      } else {
        // Erro genérico
        toast.error(res.error || "Erro ao salvar investimento.");
      }
    }
  }

  const handleClose = () => {
    setLowBalanceData(null);
    setPendingFormData(null);
    onClose();
  };

  const handleResolveLowBalance = async (resolution: 'DEPOSIT' | 'NO_DEBIT') => {
    if (!pendingFormData) return;

    // Clona o FormData para adicionar a decisão do usuário
    const newFormData = new FormData();
    for (const [key, value] of pendingFormData.entries()) {
      newFormData.append(key, value);
    }

    if (resolution === 'DEPOSIT') {
      // Flag para o backend criar uma transação de entrada (Aporte) antes
      newFormData.append('autoDeposit', 'true');
    } else {
      // Flag para o backend ignorar a transação de débito (apenas registra o ativo)
      // Definimos createTransaction como 'false' (sobrescrevendo o anterior se houver)
      newFormData.set('createTransaction', 'false');
    }

    // Reenvia
    setLowBalanceData(null);
    await handleSubmit(newFormData);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#1a1025] w-full max-w-md rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header Visual */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />

        {/* Topo do Modal */}
        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#1f1630]/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {lowBalanceData ? (
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                <AlertTriangle size={20} />
              </div>
            ) : (
              <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400">
                <TrendingUp size={20} />
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-white leading-none">
                {lowBalanceData ? 'Falta Liquidez' : 'Novo Investimento'}
              </h3>
              <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">
                {lowBalanceData ? 'Ação Necessária' : 'Adicionar Ativo'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* CORPO DO MODAL */}
        <div className="overflow-y-auto custom-scrollbar">

          {/* --- TELA DE DECISÃO (SALDO INSUFICIENTE) --- */}
          {lowBalanceData ? (
            <div className="p-6 space-y-5 animate-in slide-in-from-right duration-300">
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl">
                <p className="text-amber-200 text-sm leading-relaxed">
                  <span className="font-bold block mb-1">Ops! O caixa não fecha.</span>
                  {lowBalanceData.message}
                </p>
              </div>

              <div className="text-center space-y-1">
                <p className="text-white font-medium">De onde veio esse dinheiro?</p>
                <p className="text-gray-500 text-xs">Para manter seu saldo correto, precisamos saber a origem.</p>
              </div>

              <div className="space-y-3">
                {/* Opção 1: Aporte */}
                <button
                  onClick={() => handleResolveLowBalance('DEPOSIT')}
                  className="w-full group bg-gradient-to-br from-[#1f1630] to-[#130b20] hover:to-[#2d2145] border border-emerald-500/30 p-4 rounded-2xl flex items-center gap-4 transition-all hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] text-left"
                >
                  <div className="bg-emerald-500/20 p-3 rounded-full text-emerald-400 group-hover:scale-110 transition-transform">
                    <ArrowDownCircle size={24} />
                  </div>
                  <div>
                    <span className="block text-white font-bold text-sm">Transferi de outra conta</span>
                    <span className="block text-gray-500 text-xs mt-0.5">O sistema criará um "Aporte" e depois o investimento.</span>
                  </div>
                </button>

                {/* Opção 2: Apenas Registrar */}
                <button
                  onClick={() => handleResolveLowBalance('NO_DEBIT')}
                  className="w-full group bg-gradient-to-br from-[#1f1630] to-[#130b20] hover:to-[#2d2145] border border-white/10 p-4 rounded-2xl flex items-center gap-4 transition-all hover:border-white/30 text-left"
                >
                  <div className="bg-white/10 p-3 rounded-full text-gray-400 group-hover:scale-110 transition-transform">
                    <Wallet size={24} />
                  </div>
                  <div>
                    <span className="block text-white font-bold text-sm">Já estava investido / Externo</span>
                    <span className="block text-gray-500 text-xs mt-0.5">Apenas registrar o ativo, sem mexer no saldo da conta.</span>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setLowBalanceData(null)}
                className="w-full py-3 text-gray-500 text-xs font-bold hover:text-white flex items-center justify-center gap-2 transition"
              >
                <ArrowLeft size={14} /> Voltar e corrigir valor
              </button>
            </div>
          ) : (

            /* --- FORMULÁRIO PADRÃO --- */
            <form ref={formRef} action={handleSubmit} className="p-6 space-y-5 animate-in fade-in duration-300">

              {/* Nome */}
              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 font-bold ml-1 uppercase tracking-widest">Nome do Ativo</label>
                <input
                  name="name"
                  required
                  placeholder="Ex: Nubank, Bitcoin, Tesouro Direto..."
                  className="w-full bg-[#130b20] border border-white/10 rounded-xl p-4 text-white placeholder:text-gray-600 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all shadow-inner"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Categoria */}
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-400 font-bold ml-1 uppercase tracking-widest">Categoria</label>
                  <div className="relative">
                    <select
                      name="category"
                      className="w-full bg-[#130b20] border border-white/10 rounded-xl p-4 text-white outline-none appearance-none focus:border-pink-500 transition-all cursor-pointer"
                    >
                      <option value="RENDA_FIXA">Renda Fixa</option>
                      <option value="ACOES">Ações</option>
                      <option value="FII">Fundos Imob.</option>
                      <option value="CRIPTO">Criptomoedas</option>
                      <option value="OUTROS">Outros</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                  </div>
                </div>

                {/* Data */}
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-400 font-bold ml-1 uppercase tracking-widest">Data</label>
                  <div className="relative group">
                    <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-pink-500 transition-colors" />
                    <input
                      type="date"
                      name="date"
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="w-full bg-[#130b20] border border-white/10 rounded-xl p-4 pl-12 text-white outline-none text-sm focus:border-pink-500 transition-all [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>

              {/* Valor */}
              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 font-bold ml-1 uppercase tracking-widest">Valor Investido</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500 font-bold text-lg group-focus-within:scale-110 transition-transform">R$</span>
                  <input
                    name="investedAmount"
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    className="w-full bg-[#130b20] border border-white/10 rounded-xl p-4 pl-12 text-white text-xl font-bold outline-none focus:border-pink-500 transition-all placeholder:text-gray-700"
                  />
                </div>
              </div>

              {/* Checkbox Integração */}
              <div className="bg-pink-500/5 border border-pink-500/20 rounded-2xl p-4 flex gap-4 transition-colors hover:bg-pink-500/10">
                <div className="mt-1">
                  <input
                    type="checkbox"
                    name="createTransaction"
                    id="createTransaction"
                    defaultChecked
                    className="w-5 h-5 accent-pink-500 rounded cursor-pointer"
                  />
                </div>
                <label htmlFor="createTransaction" className="cursor-pointer select-none">
                  <span className="block text-sm font-bold text-pink-200">Debitar do Saldo?</span>
                  <span className="block text-xs text-gray-400 mt-1 leading-relaxed">
                    Se marcado, subtrai este valor da sua conta corrente na tela inicial. Se desmarcado, apenas registra o ativo.
                  </span>
                </label>
              </div>

              {/* Botão Salvar */}
              <button
                disabled={loading}
                type="submit"
                className="w-full bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-pink-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : <Save size={20} />}
                {loading ? 'Processando...' : 'Confirmar Investimento'}
              </button>

            </form>
          )}
        </div>
      </div>
    </div>
  );
}