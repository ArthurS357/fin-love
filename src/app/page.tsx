import Link from "next/link";
import { Heart, ArrowRight, Lock, TrendingUp, PiggyBank } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#130b20] text-white selection:bg-pink-500/30">

      {/* Navbar Simplificada */}
      <nav className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="text-pink-500 fill-pink-500/20" />
          <span className="font-bold text-xl">Fin<span className="text-pink-500">Love</span></span>
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition">
            Entrar
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 text-sm font-medium bg-white text-purple-950 rounded-full hover:bg-gray-100 transition shadow-lg shadow-white/10"
          >
            Criar Conta
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-12 md:py-20 flex flex-col items-center text-center">

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs font-medium mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500"></span>
          </span>
          Finanças compartilhadas para casais modernos
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 max-w-4xl animate-in fade-in slide-in-from-bottom-6 duration-700">
          Realizem seus sonhos <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
            em perfeita sintonia.
          </span>
        </h1>

        <p className="text-lg text-gray-400 max-w-2xl mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700">
          O FinLove ajuda você e seu amor a organizarem as finanças, definirem metas de gastos e construírem uma reserva para o futuro, tudo em um só lugar.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center animate-in fade-in slide-in-from-bottom-10 duration-700">
          <Link
            href="/register"
            className="group flex items-center justify-center gap-2 bg-pink-600 hover:bg-pink-500 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-[0_0_40px_-10px_rgba(236,72,153,0.5)] hover:shadow-[0_0_60px_-10px_rgba(236,72,153,0.6)] hover:-translate-y-1"
          >
            Começar Agora
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 bg-[#1f1630] border border-white/10 hover:bg-white/5 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all hover:-translate-y-1"
          >
            Já tenho conta
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 w-full animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
          <FeatureCard
            icon={<Lock className="text-blue-400" />}
            title="Conexão Segura"
            desc="Conecte-se com seu parceiro(a) de forma privada e segura para visualizar o progresso do casal."
            color="bg-blue-500/10 border-blue-500/20"
          />
          <FeatureCard
            icon={<TrendingUp className="text-green-400" />}
            title="Metas de Gastos"
            desc="Definam um teto de gastos mensal e recebam alertas para manterem o orçamento em dia."
            color="bg-green-500/10 border-green-500/20"
          />
          <FeatureCard
            icon={<PiggyBank className="text-pink-400" />}
            title="Caixinha dos Sonhos"
            desc="Guardem dinheiro juntos para viagens, casa própria ou qualquer sonho que compartilharem."
            color="bg-pink-500/10 border-pink-500/20"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 text-center text-gray-500 text-sm mt-12">
        <p>&copy; {new Date().getFullYear()} FinLove. Feito com amor.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc, color }: any) {
  return (
    <div className={`p-6 rounded-2xl border ${color} bg-[#1f1630]/50 backdrop-blur-sm hover:bg-[#1f1630] transition text-left`}>
      <div className="w-12 h-12 rounded-lg bg-[#130b20] flex items-center justify-center mb-4 shadow-inner">
        {icon}
      </div>
      <h3 className="font-bold text-white text-lg mb-2">{title}</h3>
      <p className="text-gray-400 leading-relaxed text-sm">{desc}</p>
    </div>
  );
}