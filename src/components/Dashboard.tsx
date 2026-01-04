"use client";

import { useState, useMemo, useOptimistic, startTransition } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation'; // <--- 1. Import necessário
import {
  Home, Heart, ChevronLeft, ChevronRight, Calendar,
  Clock, Plus, Target, LogOut, User as UserIcon, Sparkles, Menu,
  Eye, EyeOff
} from 'lucide-react';
import { format, isSameMonth, parseISO, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { deleteTransaction, logoutUser } from '@/app/actions';
import { toast } from 'sonner';

// --- DEFINIÇÃO DE TIPOS ---
export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'INVESTMENT';
  category: string;
  date: string | Date;
  paymentMethod?: string | null;
  installments?: number | null;
  currentInstallment?: number | null;
  isPaid: boolean;
  userId: string;
}

interface DashboardProps {
  initialTransactions: Transaction[];
  userName: string;
  userEmail: string;
  partner?: { name: string | null; email: string } | null;
  spendingLimit: number;
  totalSavings: number;
  savingsGoalName: string;
  accumulatedBalance: number;
  // --- 2. Nova prop para receber a data da URL ---
  selectedDate: {
    month: number;
    year: number;
  };
}

// --- LAZY LOADING ---
import HomeTab from './tabs/HomeTab';

const HistoryTab = dynamic(() => import('./tabs/HistoryTab'), { 
  loading: () => <div className="p-12 text-center text-gray-500 animate-pulse">Carregando histórico...</div>
});
const PartnerTab = dynamic(() => import('./tabs/PartnerTab'), {
  loading: () => <div className="p-12 text-center text-gray-500 animate-pulse">Carregando conexão...</div>
});
const GoalsTab = dynamic(() => import('./tabs/GoalsTab'), {
  loading: () => <div className="p-12 text-center text-gray-500 animate-pulse">Carregando metas...</div>
});
const ProfileTab = dynamic(() => import('./tabs/ProfileTab'), {
  loading: () => <div className="p-12 text-center text-gray-500 animate-pulse">Carregando perfil...</div>
});

const TransactionModal = dynamic(() => import('./modals/TransactionModal'), { ssr: false });
const AIReportModal = dynamic(() => import('./modals/AIReportModal'), { ssr: false });

export default function Dashboard({ 
  initialTransactions, 
  userName, 
  userEmail, 
  partner, 
  spendingLimit, 
  totalSavings, 
  savingsGoalName,
  accumulatedBalance,
  selectedDate // <--- Recebendo a prop
}: DashboardProps) {
  
  const router = useRouter(); // <--- Hook de navegação
  
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'partner' | 'goals' | 'profile'>('home');
  const [privacyMode, setPrivacyMode] = useState(false); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // --- 3. Lógica de Data Atualizada ---
  // A data visual é derivada da prop, não mais um estado local isolado
  const currentDate = useMemo(() => {
    return new Date(selectedDate.year, selectedDate.month, 1);
  }, [selectedDate]);

  // Função para navegar e atualizar a URL
  const handleChangeMonth = (offset: number) => {
    const newDate = addMonths(currentDate, offset);
    router.push(`/dashboard?month=${newDate.getMonth()}&year=${newDate.getFullYear()}`);
  };

  const normalizedTransactions = useMemo(() => {
    return initialTransactions.map(t => ({
      ...t,
      date: typeof t.date === 'string' ? parseISO(t.date) : t.date
    }));
  }, [initialTransactions]);

  const [transactions, deleteOptimisticTransaction] = useOptimistic(
    normalizedTransactions,
    (state, idToDelete: string) => state.filter((t) => t.id !== idToDelete)
  );

  // Mantemos o filtro visual por segurança, caso venham dados extras
  const monthlyTransactions = useMemo(() => {
    return transactions.filter(t => isSameMonth(t.date as Date, currentDate));
  }, [transactions, currentDate]);

  // Cálculos Financeiros
  const income = monthlyTransactions
    .filter(t => t.type === 'INCOME')
    .reduce((acc, t) => acc + Number(t.amount), 0);
    
  const expense = monthlyTransactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((acc, t) => acc + Number(t.amount), 0);
    
  const balance = income - expense;

  const pieData = useMemo(() => {
    const categories: Record<string, number> = {};
    monthlyTransactions
      .filter(t => t.type === 'EXPENSE')
      .forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + Number(t.amount);
      });
    return Object.keys(categories).map((key) => ({ name: key, value: categories[key] }));
  }, [monthlyTransactions]);

  const barData = [
    { name: 'Entradas', valor: income },
    { name: 'Saídas', valor: expense },
  ];

  // Handlers
  const handleOpenNew = () => { setEditingTransaction(null); setIsModalOpen(true); };

  const handleEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    startTransition(() => {
      deleteOptimisticTransaction(id);
    });
    toast.promise(deleteTransaction(id), {
      loading: 'Sincronizando...',
      success: 'Transação removida!',
      error: 'Erro ao excluir.'
    });
  };

  const handleLogout = async () => {
    await logoutUser();
  };

  return (
    <div className="min-h-screen bg-[#130b20] text-gray-100 font-sans relative overflow-hidden selection:bg-pink-500/30">
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-[500px] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 z-0" />
      <div className="fixed bottom-0 right-0 w-[300px] h-[300px] bg-pink-900/10 blur-[100px] rounded-full pointer-events-none translate-y-1/2 z-0" />

      <header className="sticky top-0 z-30 w-full backdrop-blur-xl bg-[#130b20]/80 border-b border-white/5 supports-[backdrop-filter]:bg-[#130b20]/60">
        <div className="max-w-7xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between relative">
          
          <div className="flex items-center gap-3 cursor-pointer group active:scale-95 transition-transform z-50" onClick={() => setActiveTab('home')}>
            <div className="relative">
              <div className="absolute inset-0 bg-pink-500 blur-md opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
              <Heart size={28} className="text-pink-500 fill-pink-500/20 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <span className="font-bold text-white text-xl tracking-tight">Fin<span className="text-pink-500">Love</span></span>
          </div>

          <nav className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-full p-1.5 shadow-xl items-center gap-1 z-40">
            <TabButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} label="Visão Geral" icon={<Home size={18} />} />
            <TabButton active={activeTab === 'goals'} onClick={() => setActiveTab('goals')} label="Metas" icon={<Target size={18} />} />
            <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="Extrato" icon={<Clock size={18} />} />
            <TabButton active={activeTab === 'partner'} onClick={() => setActiveTab('partner')} label="Conexão" icon={<Heart size={18} />} />
          </nav>

          <div className="flex items-center gap-3 md:gap-4 z-50 relative">
            <button
              onClick={() => setPrivacyMode(!privacyMode)}
              className="p-2 text-purple-300 hover:text-white transition active:scale-95 hover:bg-white/5 rounded-full"
              aria-label={privacyMode ? "Mostrar valores" : "Esconder valores"}
              title={privacyMode ? "Mostrar valores" : "Esconder valores"}
            >
              {privacyMode ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>

            <button
              onClick={() => setIsAIModalOpen(true)}
              className="flex items-center gap-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 px-3 py-1.5 rounded-full text-xs font-bold transition border border-purple-500/20 active:scale-95 hover:text-white"
              aria-label="Consultor IA"
            >
              <Sparkles size={14} />
              <span className="hidden md:inline">IA</span>
            </button>

            <button 
              onClick={handleOpenNew} 
              className="hidden md:flex items-center gap-2 bg-white text-purple-950 px-5 py-2.5 rounded-full text-sm font-bold hover:bg-pink-50 transition shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95"
            >
              <Plus size={18} strokeWidth={3} />
              <span>Novo</span>
            </button>

            <div className="relative">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)} 
                className={`p-2 rounded-full transition-all border ${isMenuOpen ? 'bg-white/10 text-white border-white/10' : 'bg-transparent text-gray-300 border-transparent hover:bg-white/5'}`}
                aria-label="Menu principal"
              >
                <Menu size={24} />
              </button>

              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-[#1a1025] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-white/5 bg-[#1f1630]">
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Logado como</p>
                      <p className="text-sm font-bold text-white truncate">{userName}</p>
                      <p className="text-xs text-gray-400 truncate">{userEmail}</p>
                    </div>
                    <div className="p-2">
                      <button 
                        onClick={() => { setActiveTab('profile'); setIsMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-200 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                      >
                        <UserIcon size={16} className="text-pink-400" /> Meu Perfil
                      </button>
                      <button 
                        onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
                      >
                        <LogOut size={16} /> Sair
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 md:space-y-8 mt-2 relative z-10 pb-32 md:pb-10">
        
        {activeTab !== 'partner' && activeTab !== 'profile' && (
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 animate-in fade-in slide-in-from-top-2 duration-500 gap-4 md:gap-0">
            <div className="w-full md:w-auto flex justify-between items-center">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                  {activeTab === 'home' && 'Resumo Financeiro'}
                  {activeTab === 'goals' && 'Minhas Metas'}
                  {activeTab === 'history' && 'Extrato Detalhado'}
                </h1>
                <p className="text-gray-400 text-sm hidden md:block">
                  {activeTab === 'history' ? 'Visualize e gerencie seus lançamentos.' : 'Acompanhe suas finanças.'}
                </p>
              </div>
              <div className="flex gap-2 md:hidden">
                <button 
                  onClick={() => setIsAIModalOpen(true)} 
                  className="p-2 text-purple-400 bg-purple-500/10 rounded-full border border-purple-500/20 active:scale-95 transition"
                  aria-label="Abrir consultor IA"
                >
                  <Sparkles size={20} />
                </button>
              </div>
            </div>

            <div className="flex items-center bg-[#1f1630] border border-white/5 rounded-full p-1 shadow-lg self-center md:self-auto">
              <button 
                // --- 4. Botão Anterior usando a nova função ---
                onClick={() => handleChangeMonth(-1)} 
                className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition"
                aria-label="Mês anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="px-4 py-1 flex items-center gap-2 min-w-[140px] justify-center border-x border-white/5">
                <Calendar size={14} className="text-purple-400" />
                <span className="text-sm font-semibold capitalize text-gray-200">
                  {format(currentDate, 'MMM yyyy', { locale: ptBR })}
                </span>
              </div>
              <button 
                // --- 4. Botão Próximo usando a nova função ---
                onClick={() => handleChangeMonth(1)} 
                className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition"
                aria-label="Próximo mês"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
          {activeTab === 'home' && (
            <HomeTab 
              income={income} 
              expense={expense} 
              balance={balance} 
              accumulatedBalance={accumulatedBalance}
              pieData={pieData} 
              barData={barData} 
              privacyMode={privacyMode} 
            />
          )}
          {activeTab === 'goals' && (
            <GoalsTab income={income} expense={expense} transactions={monthlyTransactions} currentLimit={spendingLimit} />
          )}
          {activeTab === 'history' && (
            <HistoryTab transactions={monthlyTransactions} onEdit={handleEdit} onDelete={handleDelete} />
          )}
          {activeTab === 'partner' && (
            <PartnerTab partner={partner} totalSavings={totalSavings} savingsGoalName={savingsGoalName} />
          )}
          {activeTab === 'profile' && (
            <ProfileTab userName={userName} userEmail={userEmail} />
          )}
        </div>
      </main>

      {/* MODAIS */}
      <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialData={editingTransaction} />
      <AIReportModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} userName={userName} />

      {/* Menu Mobile Flutuante */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 md:hidden w-[94%] max-w-[380px]">
        <nav className="relative bg-[#1a1025]/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] px-2 py-3 flex justify-between items-end">
          <NavIcon active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Home size={22} />} label="Início" />
          <NavIcon active={activeTab === 'goals'} onClick={() => setActiveTab('goals')} icon={<Target size={22} />} label="Metas" />
          
          <div className="relative -top-8 mx-0.5">
            <button 
              onClick={handleOpenNew} 
              className="bg-gradient-to-tr from-pink-600 to-purple-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_25px_rgba(236,72,153,0.4)] border-4 border-[#130b20] active:scale-90 transition-all duration-300 group"
              aria-label="Nova transação"
            >
              <Plus size={28} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform" />
            </button>
          </div>
          
          <NavIcon active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<Clock size={22} />} label="Extrato" />
          <NavIcon active={activeTab === 'partner'} onClick={() => setActiveTab('partner')} icon={<Heart size={22} />} label="Nós" />
        </nav>
      </div>
    </div>
  );
}

// Subcomponentes utilitários
function TabButton({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 relative ${active ? 'text-white bg-white/10 shadow-inner' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
    >
      <span className={active ? 'text-pink-400' : ''}>{icon}</span>
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

function NavIcon({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center gap-1 min-w-[3rem] transition-all duration-300 ${active ? 'text-white scale-110' : 'text-gray-500 hover:text-gray-300'}`}
    >
      <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-pink-500/20 shadow-[0_0_10px_rgba(236,72,153,0.2)]' : ''}`}>{icon}</div>
      <span className="text-[9px] font-medium">{label}</span>
    </button>
  );
}