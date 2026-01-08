'use client'

import { useActionState, useState, useEffect } from 'react'
import { loginUser } from '@/app/actions'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Eye, EyeOff, LogIn } from 'lucide-react'
import { toast } from 'sonner'

const initialState = { success: false, error: '' }

export default function Login() {
  const [state, action, isPending] = useActionState(loginUser, initialState)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (state.success) {
      toast.success('Bem-vindo de volta!')
      router.push('/dashboard')
    }
  }, [state.success, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#130b20] p-4">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="text-center">
           <div className="mx-auto bg-purple-500/10 w-16 h-16 flex items-center justify-center rounded-full mb-4">
             <LogIn className="w-8 h-8 text-purple-500" />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Acesse sua conta</h2>
        </div>

        <form action={action} className="space-y-6 bg-[#1f1630] p-8 rounded-2xl border border-white/5 shadow-xl">
          <div>
            <label className="text-sm font-medium text-gray-300">Email</label>
            <input 
              name="email" 
              type="email" 
              required 
              className="mt-1 w-full bg-[#130b20] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition" 
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
                className="w-full bg-[#130b20] border border-white/10 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition pr-10" 
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
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? <Loader2 className="animate-spin" /> : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400">
          Não tem uma conta?{' '}
          <Link href="/register" className="text-purple-400 hover:text-purple-300 font-medium hover:underline">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  )
}