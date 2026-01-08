'use client';

import { useState } from 'react';
import { resetPasswordAction } from '@/app/actions';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Lock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ResetPassword() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#130b20] text-gray-400">
                Token inválido.
            </div>
        );
    }

    const handleSubmit = async (formData: FormData) => {
        setLoading(true);
        const res = await resetPasswordAction(token, formData);
        setLoading(false);

        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success('Senha atualizada com sucesso!');
            router.push('/login');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#130b20] p-4">
            <div className="w-full max-w-md bg-[#1f1630] p-8 rounded-2xl border border-white/5 shadow-xl animate-in fade-in">

                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="text-purple-500" size={24} />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Nova Senha</h1>
                    <p className="text-gray-400 text-sm mt-2">
                        Crie uma nova senha segura para sua conta.
                    </p>
                </div>

                <form action={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Nova Senha</label>
                        <input
                            name="password"
                            type="password"
                            required
                            minLength={6}
                            className="mt-1 w-full bg-[#130b20] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none transition"
                            placeholder="Mínimo 6 caracteres"
                        />
                    </div>

                    <button
                        disabled={loading}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : 'Redefinir Senha'}
                    </button>
                </form>
            </div>
        </div>
    );
}