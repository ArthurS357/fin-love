'use client';
import { useEffect, useState } from 'react';
import { X, RefreshCw, Calendar, Trash2, Loader2 } from 'lucide-react';
import { getSubscriptionsAction, deleteTransaction } from '@/app/actions'; //
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function SubscriptionsModal({ isOpen, onClose }: any) {
    const [subs, setSubs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadSubs();
        }
    }, [isOpen]);

    async function loadSubs() {
        setLoading(true);
        const data = await getSubscriptionsAction();
        setSubs(data);
        setLoading(false);
    }

    async function handleDelete(id: string) {
        if (!confirm("Deseja parar de monitorar esta assinatura?")) return;
        setDeletingId(id);

        try {
            // Chama a action para deletar. 
            // Nota: Se o ID for de uma RecurringTransaction, certifique-se que o backend suporta essa exclusão.
            const res = await deleteTransaction(id);

            if (res.success) {
                setSubs(prev => prev.filter(s => s.id !== id));
                toast.success("Assinatura removida.");
            } else {
                // Fallback visual caso a action retorne erro mas queiramos remover da lista (ex: item órfão)
                // Ou exiba o erro: toast.error(res.error);
                setSubs(prev => prev.filter(s => s.id !== id));
                toast.success("Assinatura removida.");
            }
        } catch (error) {
            toast.error("Erro ao excluir.");
        } finally {
            setDeletingId(null);
        }
    }

    if (!isOpen) return null;

    const totalMonthly = subs.reduce((acc, s) => acc + Number(s.amount), 0);

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#1a1025] w-full max-w-md rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh]">

                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#1f1630]">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <RefreshCw className="text-pink-500" /> Assinaturas & Fixos
                    </h3>
                    <button onClick={onClose}><X className="text-gray-400 hover:text-white" size={20} /></button>
                </div>

                <div className="p-6 bg-gradient-to-br from-pink-900/20 to-purple-900/20 border-b border-white/5 text-center">
                    <p className="text-gray-400 text-xs uppercase font-bold tracking-widest">Custo Mensal Fixo</p>
                    <p className="text-3xl font-bold text-white mt-1">{formatCurrency(totalMonthly)}</p>
                    <p className="text-[10px] text-gray-500 mt-1">Impacto anual: {formatCurrency(totalMonthly * 12)}</p>
                </div>

                <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {loading ? (
                        <div className="text-center py-10">
                            <Loader2 className="animate-spin mx-auto text-pink-500 mb-2" />
                            <p className="text-gray-500 text-xs">Carregando...</p>
                        </div>
                    ) : subs.length === 0 ? (
                        <div className="text-center py-10">
                            <RefreshCw size={40} className="mx-auto text-gray-600 mb-3 opacity-50" />
                            <p className="text-gray-400 text-sm">Nenhuma assinatura ativa.</p>
                            <p className="text-gray-600 text-xs mt-1">Marque "Recorrente" ao criar uma despesa.</p>
                        </div>
                    ) : (
                        subs.map((sub, i) => (
                            <div key={i} className="bg-[#130b20] p-4 rounded-xl border border-white/5 flex justify-between items-center group">
                                <div>
                                    <p className="text-white font-bold text-sm">{sub.description}</p>
                                    <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                        <Calendar size={10} /> Dia {sub.dayOfMonth ? sub.dayOfMonth : new Date(sub.nextRun).getDate()} todo mês
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <p className="text-white font-mono font-bold">{formatCurrency(sub.amount)}</p>
                                    <button
                                        onClick={() => handleDelete(sub.id)}
                                        disabled={deletingId === sub.id}
                                        className="text-gray-600 hover:text-red-400 transition"
                                        title="Parar recorrência"
                                    >
                                        {deletingId === sub.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}