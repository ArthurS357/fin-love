'use client';

import { useState } from 'react';
import { forgotPasswordAction } from '@/app/actions';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function ForgotPassword() {
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        setLoading(true);
        await forgotPasswordAction(formData);
        setLoading(false);
        setSent(true);
        toast.success('Se o email existir, enviamos um link!');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#130b20] p-4">
            <div className="w-full max-w-md bg-[#1f1630] p-8 rounded-2xl border border-white/5 shadow-xl animate-in fade-in slide-in-from-bottom-4">

                <Link href="/login" className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm transition">
                    <ArrowLeft size={16} /> Voltar para Login
                </Link>

                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-pink-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Mail className="text-pink-500" size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Recuperar Senha</h1>
                    <p className="text-gray-400 text-sm mt-2">
                        Digite seu email para receber um link de redefinição.
                    </p>
                </div>

                {sent ? (
                    <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl text-center">
                        <p className="text-green-400 font-medium">Email enviado!</p>
                        <p className="text-gray-400 text-xs mt-2">Verifique sua caixa de entrada (e spam). O link expira em 1 hora.</p>
                        <p className="text-xs text-gray-500 mt-4 italic">Nota: Verifique o console do servidor se estiver rodando localmente.</p>
                    </div>
                ) : (
                    <form action={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Seu Email</label>
                            <input
                                name="email"
                                type="email"
                                required
                                className="mt-1 w-full bg-[#130b20] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-pink-500 outline-none transition"
                                placeholder="exemplo@email.com"
                            />
                        </div>

                        <button
                            disabled={loading}
                            className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Enviar Link'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}