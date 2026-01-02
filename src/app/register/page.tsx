'use client'

import { useActionState } from 'react';
import Link from 'next/link';
import { registerUser } from '../actions'; // Importando a ação de registro
import { Heart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const initialState = { error: '', success: false };

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerUser, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error);
    }
    if (state?.success) {
      toast.success("Conta criada com sucesso! Faça login.");
      router.push('/login');
    }
  }, [state, router]);

  return (
    <div className="min-h-screen bg-[#130b20] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[100px]" />

      <div className="w-full max-w-md bg-[#1f1630] border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 mb-4 ring-1 ring-purple-500/30">
            <Heart className="text-purple-500 fill-purple-500/20" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">Criar Nova Conta</h1>
          <p className="text-gray-400 text-sm mt-2">Comece sua jornada financeira a dois</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Nome</label>
            <input
              name="name"
              type="text"
              required
              className="w-full bg-[#130b20] text-white border border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-3 outline-none transition"
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full bg-[#130b20] text-white border border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-3 outline-none transition"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Senha</label>
            <input
              name="password"
              type="password"
              required
              className="w-full bg-[#130b20] text-white border border-gray-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-4 py-3 outline-none transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {isPending ? <Loader2 className="animate-spin" size={20} /> : 'Cadastrar'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-8">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-purple-400 hover:text-purple-300 font-semibold hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}