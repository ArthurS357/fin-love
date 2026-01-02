import Link from 'next/link';
import { User, Lock, Mail, ArrowRight, Smile } from 'lucide-react';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#130b20] flex items-center justify-center p-4 font-sans relative overflow-hidden">
      
      {/* Elementos de Fundo Decorativos */}
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px]" />

      <div className="bg-[#1f1630] border border-purple-900/30 p-8 rounded-2xl shadow-2xl w-full max-w-md relative z-10 backdrop-blur-sm">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-900/20 mb-4 text-green-400">
            <Smile size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">Criar nova conta</h1>
          <p className="text-gray-400 text-sm mt-2">Comece a organizar seu futuro hoje.</p>
        </div>

        <form className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Nome</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="text" 
                className="w-full bg-[#130b20] border border-purple-900/50 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-purple-500 transition placeholder-gray-700"
                placeholder="Seu nome"
              />
            </div>
          </div>

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
                placeholder="Mínimo 8 caracteres"
              />
            </div>
          </div>

          <button className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2 mt-6">
            Cadastrar
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500 border-t border-purple-900/30 pt-6">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-purple-400 hover:text-purple-300 font-semibold transition">
            Fazer login
          </Link>
        </div>
      </div>
    </div>
  );
}