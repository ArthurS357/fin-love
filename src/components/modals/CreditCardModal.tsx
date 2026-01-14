'use client';

import { useState } from 'react';
import { X, CreditCard as CardIcon, Save, Trash2 } from 'lucide-react';
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
    cards: CreditCard[];
}

export default function CreditCardModal({ isOpen, onClose, cards }: CreditCardModalProps) {
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        const res = await createCreditCardAction(formData);
        if (res.success) {
            toast.success('Cartão adicionado!');
            // Reset form manually or close
            const form = document.getElementById('card-form') as HTMLFormElement;
            form?.reset();
        } else {
            toast.error(res.error);
        }
        setLoading(false);
    }

    async function handleDelete(id: string) {
        if (!confirm('Excluir este cartão?')) return;
        const res = await deleteCreditCardAction(id);
        if (res.success) toast.success('Cartão removido.');
        else toast.error('Erro ao remover.');
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#1f1630] w-full max-w-md rounded-3xl border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <CardIcon className="text-purple-400" /> Meus Cartões
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content Scrollable */}
                <div className="p-6 overflow-y-auto space-y-6">

                    {/* Form de Cadastro */}
                    <form id="card-form" action={handleSubmit} className="space-y-4 bg-white/5 p-4 rounded-xl border border-white/5">
                        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Novo Cartão</h3>

                        <div>
                            <label className="text-xs text-gray-400 mb-1 block">Nome do Cartão</label>
                            <input name="name" type="text" placeholder="Ex: Nubank, Inter..." required className="w-full bg-[#130b20] border border-white/10 rounded-lg p-2 text-white text-sm focus:border-purple-500 outline-none" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Dia Fechamento</label>
                                <input name="closingDay" type="number" min="1" max="31" placeholder="Ex: 25" required className="w-full bg-[#130b20] border border-white/10 rounded-lg p-2 text-white text-sm focus:border-purple-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Dia Vencimento</label>
                                <input name="dueDay" type="number" min="1" max="31" placeholder="Ex: 05" required className="w-full bg-[#130b20] border border-white/10 rounded-lg p-2 text-white text-sm focus:border-purple-500 outline-none" />
                            </div>
                        </div>

                        <button disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2">
                            {loading ? 'Salvando...' : <><Save size={16} /> Adicionar Cartão</>}
                        </button>
                    </form>

                    {/* Lista de Cartões */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Cartões Ativos</h3>
                        {cards.length === 0 ? (
                            <p className="text-gray-500 text-sm italic">Nenhum cartão cadastrado.</p>
                        ) : (
                            cards.map(card => (
                                <div key={card.id} className="flex items-center justify-between bg-[#130b20] p-3 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                                            <CardIcon size={14} />
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm">{card.name}</p>
                                            <p className="text-xs text-gray-400">Fecha dia {card.closingDay} • Vence dia {card.dueDay}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDelete(card.id)} className="text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}