import Link from 'next/link';
import { Lock, Mail, ArrowRight, Heart } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#130b20] flex items-center justify-center p-4 font-sans relative overflow-hidden">
      
      {/* Elementos de Fundo Decorativos */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-pink-600/10 rounded-full blur-[100px]" />

      <div className="bg-[#1f1630] border border-purple-900/30 p-8 rounded-2xl shadow-2xl w-full max-w-md relative z-10 backdrop-blur-sm">
        
        {/* Cabeçalho do Card */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-900/30 mb-4 text-purple-400">
            <Heart size={32} className="fill-purple-500/20" />
          </div>
          <h1 className="text-2xl font-bold text-white">Bem-vindo de volta</h1>
          <p className="text-gray-400 text-sm mt-2">Gerencie as finanças do casal com amor.</p>
        </div>

        {/* Formulário Visual (Sem lógica por enquanto) */}
        <form className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="email" 
                className="w-full bg-[#130b20] border border-purple-900/50 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-purple-500 transition placeholder-gray-700"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="password" 
                className="w-full bg-[#130b20] border border-purple-900/50 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-purple-500 transition placeholder-gray-700"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <a href="#" className="text-xs text-purple-400 hover:text-purple-300">Esqueceu a senha?</a>
          </div>

          <button className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2 group">
            Entrar
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        {/* Rodapé do Card */}
        <div className="mt-8 text-center text-sm text-gray-500 border-t border-purple-900/30 pt-6">
          Não tem uma conta?{' '}
          <Link href="/register" className="text-purple-400 hover:text-purple-300 font-semibold transition">
            Criar conta
          </Link>
        </div>
      </div>
    </div>
  );
}