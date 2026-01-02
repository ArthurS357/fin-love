"use client";

import React, { useState, useMemo } from 'react';
import { 
  Home, Heart, ChevronLeft, ChevronRight, Calendar, 
  LayoutDashboard, Clock, Plus 
} from 'lucide-react';
import { format, isSameMonth, parseISO, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { deleteTransaction } from '@/app/actions';

// Componentes Modulares
import HomeTab from './tabs/HomeTab';
import HistoryTab from './tabs/HistoryTab';
import PartnerTab from './tabs/PartnerTab';
import TransactionModal from './modals/TransactionModal';

export default function Dashboard({ initialTransactions }: { initialTransactions: any[] }) {
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'partner'>('home');
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
  const handleEdit = (t: any) => { setEditingTransaction(t); setIsModalOpen(true); };
  const handleDelete = async (id: string) => { if (confirm('Excluir registro?')) await deleteTransaction(id); };

  return (
    <div className="min-h-screen bg-[#130b20] text-gray-100 font-sans pb-32 md:pb-0 relative">
      
      {/* 1. Header Desktop (Fixo) */}
      <div className="bg-[#1f1630]/90 border-b border-purple-900/30 sticky top-0 z-20 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between relative">
          
          {/* Esquerda: Logo */}
          <div className="flex items-center gap-2 w-48">
            <LayoutDashboard size={24} className="text-purple-500" />
            <span className="font-bold text-white text-lg tracking-tight">FinLove</span>
          </div>
          
          {/* CENTRO: Abas de Navegação (Estilo Ilha Flutuante igual Mobile) */}
          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 bg-[#130b20]/80 backdrop-blur-xl border border-purple-500/20 rounded-full px-2 py-1 shadow-2xl items-center gap-1">
             <TabButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} label="Home" icon={<Home size={20} />} />
             <div className="w-px h-6 bg-purple-900/30 mx-1"></div>
             <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="Histórico" icon={<Clock size={20} />} />
             <div className="w-px h-6 bg-purple-900/30 mx-1"></div>
             <TabButton active={activeTab === 'partner'} onClick={() => setActiveTab('partner')} label="Nós" icon={<Heart size={20} />} />
          </div>

          {/* Direita: Botão Nova Transação (Mantido como você pediu) */}
          <div className="w-48 flex justify-end">
            <button 
              onClick={handleOpenNew}
              className="hidden md:flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-full text-sm font-bold transition shadow-lg shadow-purple-600/20 hover:scale-105 active:scale-95"
            >
              <Plus size={18} strokeWidth={3} /> 
              <span>Nova Transação</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 mt-4">
        
        {/* 2. Barra de Controle de Data */}
        {activeTab !== 'partner' && (
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-8 bg-[#1f1630] md:bg-transparent p-4 md:p-0 rounded-2xl border border-purple-900/30 md:border-none shadow-lg md:shadow-none animate-in fade-in slide-in-from-top-4 duration-500">
             <div className="flex items-center gap-6">
               <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 bg-[#2a2235] rounded-full hover:bg-purple-600 hover:text-white text-purple-300 transition border border-purple-900/30"><ChevronLeft size={20} /></button>
               <div className="flex items-center gap-3 min-w-[180px] justify-center">
                  <Calendar className="text-purple-500" size={24} />
                  <span className="text-xl font-bold capitalize text-white">
                    {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                  </span>
               </div>
               <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 bg-[#2a2235] rounded-full hover:bg-purple-600 hover:text-white text-purple-300 transition border border-purple-900/30"><ChevronRight size={20} /></button>
             </div>
          </div>
        )}

        {/* 3. Conteúdo das Abas */}
        {activeTab === 'home' && <HomeTab income={income} expense={expense} balance={balance} pieData={pieData} barData={barData} />}
        {activeTab === 'history' && <HistoryTab transactions={monthlyTransactions} onEdit={handleEdit} onDelete={handleDelete} />}
        {activeTab === 'partner' && <PartnerTab />}

      </main>

      {/* 4. Modal de Transação */}
      <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} initialData={editingTransaction} />

      {/* 5. Menu Mobile Inferior (Mantido igual) */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[350px] bg-[#1f1630]/90 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-2xl px-2 py-2 z-40 md:hidden flex justify-between items-center">
        <NavIcon active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Home size={24} />} label="Home" />
        <button 
          onClick={handleOpenNew}
          className="bg-purple-600 text-white p-4 rounded-xl shadow-lg shadow-purple-600/40 -translate-y-6 border-4 border-[#130b20] active:scale-95 transition-transform"
        >
          <Plus size={28} />
        </button>
        <NavIcon active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<Clock size={24} />} label="Histórico" />
        <NavIcon active={activeTab === 'partner'} onClick={() => setActiveTab('partner')} icon={<Heart size={24} />} label="Nós" />
      </nav>
    </div>
  );
}

// --- Componentes Visuais ---

// Botão de Aba Unificado (Usado no Desktop agora com estilo visual aprimorado)
function TabButton({ active, onClick, label, icon }: any) {
  return (
    <button 
      onClick={onClick} 
      className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 relative overflow-hidden group ${
        active 
          ? 'text-white bg-purple-600 shadow-lg shadow-purple-900/50' 
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {/* Ícone com animação leve */}
      <span className={`relative z-10 ${active ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-300`}>
        {icon}
      </span>
      <span className="relative z-10">{label}</span>
      
      {/* Efeito de brilho fundo se ativo */}
      {active && <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-purple-500 opacity-100" />}
    </button>
  );
}

// Botão do Menu Mobile (Ícone Vertical)
function NavIcon({ active, onClick, icon, label }: any) {
  // Ajuste para 4 itens no mobile (Home, Botão, Hist, Nós) requer layout cuidadoso
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all ${
        active ? 'text-purple-400 -translate-y-1' : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      <div className={`transition-transform duration-300 ${active ? 'scale-110 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]' : ''}`}>
        {icon}
      </div>
      <span className="text-[10px] font-medium mt-1">{label}</span>
    </button>
  );
}