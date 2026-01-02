"use client";

import React, { useState, useMemo } from 'react';
import {
  Home, Heart, ChevronLeft, ChevronRight, Calendar,
  Clock, Plus, Target, LogOut
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
import TransactionModal from './modals/TransactionModal';

// Interface atualizada para receber o nome do utilizador e dados do parceiro
interface DashboardProps {
  initialTransactions: any[];
  userName: string;
  partner?: { name: string | null; email: string } | null; // <--- NOVO: Tipo do parceiro
}

export default function Dashboard({ initialTransactions, userName, partner }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'partner' | 'goals'>('home');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any | null>(null);

  // --- Lógica de Dados ---
  const transactions = useMemo(() => {
    return initialTransactions.map(t => ({
      ...t,
      date: typeof t.date === 'string' ? parseISO(t.date) : t.date
    }));
  }, [initialTransactions]);

  const monthlyTransactions = useMemo(() => {
    return transactions.filter(t => isSameMonth(t.date, currentDate));
  }, [transactions, currentDate]);

  const income = monthlyTransactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
  const expense = monthlyTransactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
  const balance = income - expense;

  const pieData = useMemo(() => {
    const categories: Record<string, number> = {};
    monthlyTransactions.filter(t => t.type === 'EXPENSE').forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + t.amount;
    });
    return Object.keys(categories).map((key) => ({ name: key, value: categories[key] }));
  }, [monthlyTransactions]);

  const barData = [
    { name: 'Entradas', valor: income },
    { name: 'Saídas', valor: expense },
  ];

  // --- Funções Auxiliares ---
  const handleOpenNew = () => { setEditingTransaction(null); setIsModalOpen(true); };

  const handleEdit = (t: any) => {
    setEditingTransaction(t);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    toast.promise(deleteTransaction(id), {
      loading: 'Excluindo registro...',
      success: 'Transação removida com sucesso!',
      error: 'Erro ao excluir transação.'
    });
  };

  const handleLogout = async () => {
    await logoutUser();
  };

  return (
    <div className="min-h-screen bg-[#130b20] text-gray-100 font-sans pb-28 md:pb-10 relative overflow-hidden">

      {/* Background Gradients */}
      <div className="fixed top-0 left-0 w-full h-[500px] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 z-0" />
      <div className="fixed bottom-0 right-0 w-[300px] h-[300px] bg-pink-900/10 blur-[100px] rounded-full pointer-events-none translate-y-1/2 z-0" />

      {/* 1. Header Desktop */}
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

          {/* Navegação Central */}
          <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-full p-1.5 shadow-xl items-center gap-1">
            <TabButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} label="Visão Geral" icon={<Home size={18} />} />
            <TabButton active={activeTab === 'goals'} onClick={() => setActiveTab('goals')} label="Metas" icon={<Target size={18} />} />
            <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="Lançamentos" icon={<Clock size={18} />} />
            <TabButton active={activeTab === 'partner'} onClick={() => setActiveTab('partner')} label="Conexão" icon={<Heart size={18} />} />
          </nav>

          {/* Área do Usuário (Direita) */}
          <div className="flex items-center gap-4">

            {/* Saudação e Logout (Desktop) */}
            <div className="hidden md:flex items-center gap-3 mr-2 pl-4 border-l border-white/10">
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Olá,</p>
                <p className="text-sm font-bold text-white leading-none">{userName}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-white/5 rounded-full transition-colors"
                title="Sair"
              >
                <LogOut size={20} />
              </button>
            </div>

            {/* Botão Nova Transação */}
            <button
              onClick={handleOpenNew}
              className="hidden md:flex items-center gap-2 bg-white text-purple-950 px-5 py-2.5 rounded-full text-sm font-bold hover:bg-pink-50 transition shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95"
            >
              <Plus size={18} strokeWidth={3} />
              <span>Nova Transação</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 mt-2 relative z-10">

        {/* Controle de Data e Cabeçalho Mobile */}
        {activeTab !== 'partner' && (
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 animate-in fade-in slide-in-from-top-2 duration-500 gap-4 md:gap-0">

            <div className="w-full md:w-auto flex justify-between items-center">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                  {activeTab === 'home' && 'Resumo Financeiro'}
                  {activeTab === 'goals' && 'Minhas Metas'}
                  {activeTab === 'history' && 'Extrato Detalhado'}
                </h1>
                <p className="text-gray-400 text-sm hidden md:block">
                  {activeTab === 'history' ? 'Visualize e gerencie seus gastos.' : 'Acompanhe suas finanças.'}
                </p>
              </div>

              {/* Botão de Logout Mobile */}
              <button
                onClick={handleLogout}
                className="md:hidden p-2 text-gray-400 hover:text-red-400 bg-white/5 rounded-full border border-white/5"
              >
                <LogOut size={20} />
              </button>
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

        <div className="transition-all duration-500 ease-out">
          {activeTab === 'home' && <HomeTab income={income} expense={expense} balance={balance} pieData={pieData} barData={barData} />}
          {activeTab === 'goals' && <GoalsTab income={income} expense={expense} transactions={monthlyTransactions} />}
          {activeTab === 'history' && <HistoryTab transactions={monthlyTransactions} onEdit={handleEdit} onDelete={handleDelete} />}
          {/* Aqui passamos a propriedade partner para o componente */}
          {activeTab === 'partner' && <PartnerTab partner={partner} />}
        </div>

      </main>

      <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialData={editingTransaction} />

      {/* Menu Mobile Inferior */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 md:hidden w-full max-w-[340px]">
        <nav className="relative bg-[#1a1025]/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] px-4 py-3 flex justify-between items-end">
          <NavIcon active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Home size={22} />} label="Início" />
          <NavIcon active={activeTab === 'goals'} onClick={() => setActiveTab('goals')} icon={<Target size={22} />} label="Metas" />
          <div className="absolute left-1/2 -translate-x-1/2 -top-6">
            <button
              onClick={handleOpenNew}
              className="bg-gradient-to-t from-pink-600 to-purple-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(236,72,153,0.5)] border-4 border-[#130b20] active:scale-90 transition-all duration-300 group"
            >
              <Plus size={28} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>
          <div className="w-8"></div>
          <NavIcon active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<Clock size={22} />} label="Extrato" />
          <NavIcon active={activeTab === 'partner'} onClick={() => setActiveTab('partner')} icon={<Heart size={22} />} label="Nós" />
        </nav>
      </div>
    </div>
  );
}

// Componentes auxiliares
function TabButton({ active, onClick, label, icon }: any) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 relative ${active ? 'text-white bg-white/10 shadow-inner' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
      <span className={active ? 'text-pink-400' : ''}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function NavIcon({ active, onClick, icon, label }: any) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 min-w-[3.5rem] transition-all duration-300 ${active ? 'text-white scale-110' : 'text-gray-500 hover:text-gray-300'}`}>
      <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-pink-500/20 shadow-[0_0_10px_rgba(236,72,153,0.2)]' : ''}`}>{icon}</div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}