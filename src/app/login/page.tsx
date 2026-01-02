'use client'

import { useActionState } from 'react';
import Link from 'next/link';
import { loginUser } from '../actions';
import { Heart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const initialState = { error: '', success: false };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginUser, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error);
    }
    if (state?.success) {
      toast.success("Login realizado com sucesso!");
      router.push('/dashboard');
    }
  }, [state, router]);

  return (
    <div className="min-h-screen bg-[#130b20] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-900/20 rounded-full blur-[100px]" />

      <div className="w-full max-w-md bg-[#1f1630] border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-500/10 mb-4 ring-1 ring-pink-500/30">
            <Heart className="text-pink-500 fill-pink-500/20" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">Bem-vindo de volta</h1>
          <p className="text-gray-400 text-sm mt-2">Acesse sua conta para continuar</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Email</label>
            <input 
              name="email" 
              type="email" 
              required 
              className="w-full bg-[#130b20] text-white border border-gray-700 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 rounded-xl px-4 py-3 outline-none transition"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Senha</label>
            <input 
              name="password" 
              type="password" 
              required 
              className="w-full bg-[#130b20] text-white border border-gray-700 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 rounded-xl px-4 py-3 outline-none transition"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={isPending}
            className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-pink-900/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {isPending ? <Loader2 className="animate-spin" size={20} /> : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-8">
          Ainda não tem conta?{' '}
          <Link href="/register" className="text-pink-400 hover:text-pink-300 font-semibold hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}