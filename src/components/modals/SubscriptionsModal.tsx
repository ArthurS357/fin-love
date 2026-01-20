'use client';
import { useEffect, useState } from 'react';
import { X, RefreshCw, Calendar, Trash2 } from 'lucide-react';
import { getSubscriptionsAction } from '@/app/actions';
import { formatCurrency } from '@/lib/utils';

export default function SubscriptionsModal({ isOpen, onClose }: any) {
    const [subs, setSubs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            getSubscriptionsAction().then(data => {
                setSubs(data);
                setLoading(false);
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const totalMonthly = subs.reduce((acc, s) => acc + Number(s.amount), 0);

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#1a1025] w-full max-w-md rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col max-h-[80vh]">

                <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#1f1630]">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <RefreshCw className="text-pink-500" /> Assinaturas Recorrentes
                    </h3>
                    <button onClick={onClose}><X className="text-gray-400 hover:text-white" size={20} /></button>
                </div>

                <div className="p-6 bg-gradient-to-br from-pink-900/20 to-purple-900/20 border-b border-white/5 text-center">
                    <p className="text-gray-400 text-xs uppercase font-bold tracking-widest">Custo Mensal Fixo</p>
                    <p className="text-3xl font-bold text-white mt-1">{formatCurrency(totalMonthly)}</p>
                    <p className="text-[10px] text-gray-500 mt-1">Isso consome {(totalMonthly * 12).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} por ano.</p>
                </div>

                <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {loading ? <p className="text-center text-gray-500 text-xs">Carregando...</p> : subs.length === 0 ? (
                        <div className="text-center py-10">
                            <RefreshCw size={40} className="mx-auto text-gray-600 mb-3 opacity-50" />
                            <p className="text-gray-400 text-sm">Nenhuma assinatura encontrada.</p>
                            <p className="text-gray-600 text-xs mt-1">Marque "Recorrente" ao criar uma despesa para vê-la aqui.</p>
                        </div>
                    ) : (
                        subs.map((sub, i) => (
                            <div key={i} className="bg-[#130b20] p-4 rounded-xl border border-white/5 flex justify-between items-center">
                                <div>
                                    <p className="text-white font-bold text-sm">{sub.description}</p>
                                    <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                        <Calendar size={10} /> Renova todo dia {sub.dayOfMonth || new Date(sub.nextRun).getDate()}
                                    </p>
                                </div>
                                <p className="text-white font-mono font-bold">{formatCurrency(sub.amount)}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}