'use client';

import { useState, useRef } from 'react';
import { X, CreditCard as CardIcon, Save, Trash2, Loader2 } from 'lucide-react';
import { createCreditCardAction, deleteCreditCardAction } from '@/app/actions';
import { toast } from 'sonner';

interface CreditCard {
    id: string;
    name: string;
    closingDay: number;
    dueDay: number;
    limit?: number | null;
}

interface CreditCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void | Promise<void>; // Aceita função de reload
    cards?: CreditCard[]; // Opcional, valor padrão []
}

export default function CreditCardModal({ isOpen, onClose, onSuccess, cards = [] }: CreditCardModalProps) {
    const [loading, setLoading] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    if (!isOpen) return null;

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        const res = await createCreditCardAction(formData);

        if (res.success) {
            toast.success('Cartão adicionado!');
            formRef.current?.reset(); // Limpa o formulário
            if (onSuccess) await onSuccess(); // Atualiza a lista na tela anterior
            // Opcional: onClose(); // Se quiser fechar ao salvar, descomente
        } else {
            toast.error(res.error);
        }
        setLoading(false);
    }

    async function handleDelete(id: string) {
        if (!confirm('Excluir este cartão?')) return;

        const res = await deleteCreditCardAction(id);
        if (res.success) {
            toast.success('Cartão removido.');
            if (onSuccess) await onSuccess(); // Atualiza a lista
        } else {
            toast.error('Erro ao remover.');
        }
    }

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#1f1630] w-full max-w-md rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#251a3a]">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <CardIcon className="text-purple-400" /> Gerenciar Cartões
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content Scrollable */}
                <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">

                    {/* Form de Cadastro */}
                    <form ref={formRef} action={handleSubmit} className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/5">
                        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Novo Cartão</h3>

                        <div>
                            <label className="text-xs text-gray-400 mb-1 block uppercase font-bold">Nome / Bandeira</label>
                            <input
                                name="name"
                                type="text"
                                placeholder="Ex: Nubank, Inter..."
                                required
                                className="w-full bg-[#130b20] border border-white/10 rounded-lg p-3 text-white text-sm focus:border-purple-500 outline-none transition"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block uppercase font-bold">Dia Fechamento</label>
                                <input
                                    name="closingDay"
                                    type="number"
                                    min="1"
                                    max="31"
                                    placeholder="Ex: 25"
                                    required
                                    className="w-full bg-[#130b20] border border-white/10 rounded-lg p-3 text-white text-sm focus:border-purple-500 outline-none transition"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block uppercase font-bold">Dia Vencimento</label>
                                <input
                                    name="dueDay"
                                    type="number"
                                    min="1"
                                    max="31"
                                    placeholder="Ex: 05"
                                    required
                                    className="w-full bg-[#130b20] border border-white/10 rounded-lg p-3 text-white text-sm focus:border-purple-500 outline-none transition"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <label className="text-xs text-gray-400 mb-1 block uppercase font-bold">Limite (Opcional)</label>
                            <input
                                name="limit"
                                type="number"
                                step="0.01"
                                placeholder="R$ 0,00"
                                className="w-full bg-[#130b20] border border-white/10 rounded-lg p-3 text-white text-sm focus:border-purple-500 outline-none transition"
                            />
                        </div>

                        <button
                            disabled={loading}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-purple-900/20 active:scale-95"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            {loading ? 'Salvando...' : 'Adicionar Cartão'}
                        </button>
                    </form>

                    {/* Lista de Cartões (Exibe apenas se houver cartões passados) */}
                    {cards.length > 0 && (
                        <div className="space-y-3 pt-4 border-t border-white/5">
                            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Cartões Existentes</h3>
                            {cards.map(card => (
                                <div key={card.id} className="flex items-center justify-between bg-[#130b20] p-3 rounded-xl border border-white/5 group hover:border-white/10 transition">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
                                            <CardIcon size={18} />
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm">{card.name}</p>
                                            <p className="text-[10px] text-gray-400">Fecha dia {card.closingDay} • Vence dia {card.dueDay}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(card.id)}
                                        className="text-gray-600 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="Excluir cartão"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}