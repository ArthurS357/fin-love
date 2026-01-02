"use client";

import { useState, useMemo } from 'react';
import {
  Home, Heart, ChevronLeft, ChevronRight, Calendar,
  Clock, Plus, Target, LogOut, User as UserIcon, Sparkles
} from 'lucide-react';
import { format, isSameMonth, parseISO, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { deleteTransaction, logoutUser } from '@/app/actions';
import { toast } from 'sonner';

// Componentes Modulares
import HomeTab from './tabs/HomeTab';
import HistoryTab from './tabs/HistoryTab';
import PartnerTab from './tabs/PartnerTab';
import GoalsTab from './tabs/GoalsTab';
import ProfileTab from './tabs/ProfileTab';
import TransactionModal from './modals/TransactionModal';
import AIReportModal from './modals/AIReportModal';

interface DashboardProps {
  initialTransactions: any[];
  userName: string;
  userEmail: string;
  partner?: { name: string | null; email: string } | null;
  spendingLimit: number;
  totalSavings: number;
  savingsGoalName: string;
}

export default function Dashboard({ 
  initialTransactions, 
  userName, 
  userEmail,
  partner, 
  spendingLimit, 
  totalSavings,
  savingsGoalName 
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'partner' | 'goals' | 'profile'>('home');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Estados dos Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);

  // --- Processamento de Dados ---
  const transactions = useMemo(() => {
    return initialTransactions.map(t => ({
      ...t,
      date: typeof t.date === 'string' ? parseISO(t.date) : t.date
    }));
  }, [initialTransactions]);

  const monthlyTransactions = useMemo(() => {
    return transactions.filter(t => isSameMonth(t.date, currentDate));
  }, [transactions, currentDate]);

  const income = monthlyTransactions
    .filter(t => t.type === 'INCOME')
    .reduce((acc, t) => acc + t.amount, 0);
    
  const expense = monthlyTransactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((acc, t) => acc + t.amount, 0);
    
  const balance = income - expense;

  const pieData = useMemo(() => {
    const categories: Record<string, number> = {};
    monthlyTransactions
      .filter(t => t.type === 'EXPENSE')
      .forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
      });
    return Object.keys(categories).map((key) => ({ name: key, value: categories[key] }));
  }, [monthlyTransactions]);

  const barData = [
    { name: 'Entradas', valor: income },
    { name: 'Saídas', valor: expense },
  ];

  // --- Handlers ---
  const handleOpenNew = () => { setEditingTransaction(null); setIsModalOpen(true); };

  const handleEdit = (t: any) => {
    setEditingTransaction(t);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    toast.promise(deleteTransaction(id), {
      loading: 'Excluindo...',
      success: 'Transação removida!',
      error: 'Erro ao excluir.'
    });
  };

  const handleLogout = async () => {
    await logoutUser();
  };

  return (
    <div className="min-h-screen bg-[#130b20] text-gray-100 font-sans pb-28 md:pb-10 relative overflow-hidden">

      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-[500px] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 z-0" />
      <div className="fixed bottom-0 right-0 w-[300px] h-[300px] bg-pink-900/10 blur-[100px] rounded-full pointer-events-none translate-y-1/2 z-0" />

      {/* Header Desktop */}
      <header className="sticky top-0 z-30 w-full backdrop-blur-xl bg-[#130b20]/70 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setActiveTab('home')}>
            <div className="relative">
              <div className="absolute inset-0 bg-pink-500 blur-md opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
              <Heart size={28} className="text-pink-500 fill-pink-500/20 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <span className="font-bold text-white text-xl tracking-tight">Fin<span className="text-pink-500">Love</span></span>
          </div>

          {/* Nav Central */}
          <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-full p-1.5 shadow-xl items-center gap-1">
            <TabButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} label="Visão Geral" icon={<Home size={18} />} />
            <TabButton active={activeTab === 'goals'} onClick={() => setActiveTab('goals')} label="Metas" icon={<Target size={18} />} />
            <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="Extrato" icon={<Clock size={18} />} />
            <TabButton active={activeTab === 'partner'} onClick={() => setActiveTab('partner')} label="Conexão" icon={<Heart size={18} />} />
            <TabButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} label="Perfil" icon={<UserIcon size={18} />} />
          </nav>

          {/* User Area */}
          <div className="flex items-center gap-4">
            
            {/* Botão IA (Desktop) */}
            <button
              onClick={() => setIsAIModalOpen(true)}
              className="hidden md:flex items-center gap-2 bg-gradient-to-r from-purple-700 to-indigo-600 text-white px-4 py-2 rounded-full text-sm font-bold hover:brightness-110 transition shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:scale-105 active:scale-95"
            >
              <Sparkles size={16} />
              <span>IA Advisor</span>
            </button>

            <div className="hidden md:flex items-center gap-3 mr-2 pl-4 border-l border-white/10">
              <div className="text-right cursor-pointer hover:opacity-80 transition" onClick={() => setActiveTab('profile')}>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Olá,</p>
                <p className="text-sm font-bold text-white leading-none">{userName}</p>
              </div>
              <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-400 hover:bg-white/5 rounded-full transition-colors" title="Sair">
                <LogOut size={20} />
              </button>
            </div>

            <button onClick={handleOpenNew} className="hidden md:flex items-center gap-2 bg-white text-purple-950 px-5 py-2.5 rounded-full text-sm font-bold hover:bg-pink-50 transition shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95">
              <Plus size={18} strokeWidth={3} />
              <span>Novo</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 mt-2 relative z-10">

        {/* Controle de Data (Oculto em Perfil/Parceiro) */}
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

              {/* Ações Mobile */}
              <div className="flex gap-2 md:hidden">
                <button onClick={() => setIsAIModalOpen(true)} className="p-2 text-purple-400 bg-purple-500/10 rounded-full border border-purple-500/20">
                  <Sparkles size={20} />
                </button>
                <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-400 bg-white/5 rounded-full border border-white/5">
                  <LogOut size={20} />
                </button>
              </div>
            </div>

            <div className="flex items-center bg-[#1f1630] border border-white/5 rounded-full p-1 shadow-lg self-center md:self-auto">
              <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition"><ChevronLeft size={18} /></button>
              <div className="px-4 py-1 flex items-center gap-2 min-w-[140px] justify-center border-x border-white/5">
                <Calendar size={14} className="text-purple-400" />
                <span className="text-sm font-semibold capitalize text-gray-200">
                  {format(currentDate, 'MMM yyyy', { locale: ptBR })}
                </span>
              </div>
              <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition"><ChevronRight size={18} /></button>
            </div>
          </div>
        )}

        {/* Renderização das Abas */}
        <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
          {activeTab === 'home' && (
            <HomeTab income={income} expense={expense} balance={balance} pieData={pieData} barData={barData} />
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

      {/* Modais Globais */}
      <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialData={editingTransaction} />
      <AIReportModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} userName={userName} />

      {/* Menu Mobile Inferior */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 md:hidden w-full max-w-[360px]">
        <nav className="relative bg-[#1a1025]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] px-3 py-3 flex justify-between items-end">
          <NavIcon active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Home size={20} />} label="Início" />
          <NavIcon active={activeTab === 'goals'} onClick={() => setActiveTab('goals')} icon={<Target size={20} />} label="Metas" />
          
          <div className="relative -top-6 mx-1">
            <button onClick={handleOpenNew} className="bg-gradient-to-t from-pink-600 to-purple-600 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(236,72,153,0.5)] border-4 border-[#130b20] active:scale-90 transition-all duration-300 group">
              <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
          
          <NavIcon active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<Clock size={20} />} label="Extrato" />
          <NavIcon active={activeTab === 'partner'} onClick={() => setActiveTab('partner')} icon={<Heart size={20} />} label="Nós" />
          <NavIcon active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<UserIcon size={20} />} label="Perfil" />
        </nav>
      </div>
    </div>
  );
}

// Sub-componentes
function TabButton({ active, onClick, label, icon }: any) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 relative ${active ? 'text-white bg-white/10 shadow-inner' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
      <span className={active ? 'text-pink-400' : ''}>{icon}</span>
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

function NavIcon({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 min-w-[3rem] transition-all duration-300 ${active ? 'text-white scale-110' : 'text-gray-500 hover:text-gray-300'}`}>
      <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-pink-500/20 shadow-[0_0_10px_rgba(236,72,153,0.2)]' : ''}`}>{icon}</div>
      <span className="text-[9px] font-medium">{label}</span>
    </button>
  );
}