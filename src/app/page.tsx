import { Heart, ArrowRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#130b20] text-white selection:bg-purple-500 selection:text-white overflow-hidden">
      
      {/* Navbar Simplificada */}
      <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="text-pink-500 fill-pink-500" size={24} />
          <span className="font-bold text-xl">FinLove</span>
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="px-5 py-2 text-sm font-medium text-gray-300 hover:text-white transition">
            Entrar
          </Link>
          <Link href="/register" className="px-5 py-2 text-sm font-bold bg-white text-purple-900 rounded-full hover:bg-gray-100 transition shadow-lg shadow-white/10">
            Começar
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center relative">
        
        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/20 blur-[130px] rounded-full -z-10 animate-pulse" />
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-purple-300 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
          </span>
          Controle financeiro para casais inteligentes
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-purple-200 max-w-4xl animate-in fade-in slide-in-from-bottom-8 duration-1000">
          O amor não tem preço, <br/> mas o futuro tem.
        </h1>
        
        <p className="text-lg text-gray-400 max-w-2xl mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          Conecte-se com seu parceiro, defina metas conjuntas e acompanhe gastos sem brigas. 
          A forma mais simples de construir sonhos a dois.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          <Link 
            href="/register" 
            className="group px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white font-bold text-lg hover:shadow-[0_0_40px_rgba(168,85,247,0.4)] transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            Criar conta grátis
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Features Rápidas */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 text-left animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
          {[
            { title: "Sincronização em Tempo Real", desc: "Veja os gastos do parceiro instantaneamente." },
            { title: "Metas Compartilhadas", desc: "Defina objetivos (viagens, casa, carro) juntos." },
            { title: "Zero Configuração Complexa", desc: "Interface simples e direta ao ponto." }
          ].map((item, i) => (
            <div key={i} className="bg-white/5 border border-white/5 p-6 rounded-2xl hover:bg-white/10 transition">
              <CheckCircle className="text-pink-500 mb-4" size={24} />
              <h3 className="font-bold text-lg mb-2">{item.title}</h3>
              <p className="text-gray-400 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>

      </main>
    </div>
  );
}