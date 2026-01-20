'use client';
import { useState, useEffect } from 'react';
import { X, MessageCircle, Send, Trash2 } from 'lucide-react';
import { getTransactionChatAction, sendTransactionMessageAction } from '@/app/actions';
import { formatCurrency } from '@/lib/utils';

export default function TransactionDetailsModal({ isOpen, onClose, transaction, onDelete }: any) {
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && transaction) {
            loadChat();
        }
    }, [isOpen, transaction]);

    async function loadChat() {
        const msgs = await getTransactionChatAction(transaction.id);
        setMessages(msgs);
    }

    async function handleSend() {
        if (!newMessage.trim()) return;
        setLoading(true);
        await sendTransactionMessageAction(transaction.id, newMessage);
        setNewMessage('');
        await loadChat();
        setLoading(false);
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#1a1025] w-full max-w-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="p-5 border-b border-white/5 bg-[#1f1630] flex justify-between items-center">
                    <h3 className="font-bold text-white">Detalhes da Transação</h3>
                    <button onClick={onClose}><X className="text-gray-400 hover:text-white" size={20} /></button>
                </div>

                {/* Info */}
                <div className="p-6 bg-gradient-to-b from-[#1f1630] to-[#1a1025]">
                    <p className="text-gray-400 text-xs uppercase tracking-widest font-bold mb-1">{transaction.category}</p>
                    <h2 className="text-2xl font-bold text-white mb-1">{transaction.description}</h2>
                    <p className={`text-xl font-mono ${transaction.type === 'EXPENSE' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {formatCurrency(transaction.amount)}
                    </p>
                    <div className="mt-4 flex gap-3">
                        <button onClick={onDelete} className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2"><Trash2 size={14} /> Excluir</button>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 bg-[#130b20] flex flex-col min-h-[300px]">
                    <div className="p-3 border-b border-white/5 bg-[#1a1025]">
                        <p className="text-xs font-bold text-gray-400 flex items-center gap-2"><MessageCircle size={14} className="text-pink-500" /> Comentários do Casal</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.length === 0 && <p className="text-center text-gray-600 text-xs py-10">Nenhum comentário ainda. Pergunte algo!</p>}
                        {messages.map((m, i) => (
                            <div key={i} className={`flex flex-col ${m.senderId === transaction.userId ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-xs ${m.senderId === transaction.userId ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-white/10 text-gray-200 rounded-tl-none'}`}>
                                    <p className="font-bold text-[9px] opacity-50 mb-0.5">{m.sender.name}</p>
                                    {m.message}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Input */}
                    <div className="p-3 bg-[#1a1025] border-t border-white/5 flex gap-2">
                        <input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Escreva um comentário..."
                            className="flex-1 bg-[#130b20] text-white text-sm px-4 py-2 rounded-full border border-white/10 focus:border-pink-500 outline-none"
                        />
                        <button onClick={handleSend} disabled={loading} className="bg-pink-600 text-white p-2 rounded-full hover:scale-105 transition shadow-lg">
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}