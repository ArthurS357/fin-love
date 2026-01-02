'use client'

import { useActionState, useEffect } from 'react'
import { registerUser } from '@/app/actions'
import { Heart, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const initialState = {
  error: '',
  success: false
}

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(registerUser, initialState)
  const router = useRouter()

  useEffect(() => {
    if (state.success) {
      toast.success('Conta criada com sucesso!')
      router.push('/dashboard')
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state, router])

  return (
    <div className="min-h-screen bg-[#130b20] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-purple-900/30 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-pink-900/20 blur-[120px] rounded-full translate-x-1/2 translate-y-1/2" />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#1f1630]/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Crie sua conta</h1>
            <p className="text-gray-400 text-sm">Comece a planejar o futuro a dois.</p>
          </div>

          <form action={formAction} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300 ml-1">Nome</label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 text-gray-500" size={18} />
                <input 
                  name="name" 
                  type="text" 
                  placeholder="Como quer ser chamado?" 
                  required
                  className="w-full bg-[#130b20] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-gray-600"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300 ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-gray-500" size={18} />
                <input 
                  name="email" 
                  type="email" 
                  placeholder="seu@email.com" 
                  required
                  className="w-full bg-[#130b20] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-gray-600"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300 ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-gray-500" size={18} />
                <input 
                  name="password" 
                  type="password" 
                  placeholder="Mínimo 6 caracteres" 
                  required
                  minLength={6}
                  className="w-full bg-[#130b20] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-gray-600"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isPending}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-purple-900/50 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 mt-6"
            >
              {isPending ? <Loader2 className="animate-spin" /> : 'Criar Conta Grátis'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-400">
              Já tem uma conta?{' '}
              <Link href="/login" className="text-pink-400 hover:text-pink-300 font-semibold transition-colors">
                Fazer Login
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}