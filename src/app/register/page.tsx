'use client'

import { useActionState, useState, useEffect } from 'react'
import { registerUser } from '@/app/actions'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Eye, EyeOff, Heart } from 'lucide-react'
import { toast } from 'sonner'

const initialState = { success: false, error: '' }

export default function Register() {
  const [state, action, isPending] = useActionState(registerUser, initialState)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (state.success) {
      toast.success('Conta criada com sucesso!')
      router.push('/dashboard') // Redirecionamento forçado via cliente
    }
  }, [state.success, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#130b20] p-4">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center">
          <div className="mx-auto bg-pink-500/10 w-16 h-16 flex items-center justify-center rounded-full mb-4">
            <Heart className="w-8 h-8 text-pink-500 fill-pink-500/20" />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Crie sua conta</h2>
          <p className="mt-2 text-gray-400">Comece a organizar suas finanças com amor.</p>
        </div>

        <form action={action} className="space-y-6 bg-[#1f1630] p-8 rounded-2xl border border-white/5 shadow-xl">
          <div>
            <label className="text-sm font-medium text-gray-300">Nome</label>
            <input
              name="name"
              required
              className="mt-1 w-full bg-[#130b20] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition"
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300">Email</label>
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full bg-[#130b20] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300">Senha</label>
            <div className="relative mt-1">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                required
                className="w-full bg-[#130b20] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition pr-10"
                placeholder="******"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {state.error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
              {state.error}
            </div>
          )}

          <button
            disabled={isPending}
            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 className="animate-spin" /> : 'Criar Conta'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-pink-400 hover:text-pink-300 font-medium hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}