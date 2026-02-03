"use client";

import { useState, useMemo, useOptimistic, startTransition, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Home, Heart, ChevronLeft, ChevronRight, Calendar,
  Clock, Plus, Target, LogOut, User as UserIcon, Sparkles, Menu,
  Eye, EyeOff, History, CreditCard as CardIcon
} from 'lucide-react';
import { format, isSameMonth, parseISO, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { deleteTransaction, logoutUser } from '@/app/actions';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

// --- TIPAGEM ---
export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'INVESTMENT';
  category: string;
  date: string | Date;
  userId: string;
  paymentMethod?: string | null;
  installments?: number | null;
  currentInstallment?: number | null;
  isPaid: boolean;
  installmentId?: string | null;
  creditCardId?: string | null;
}

export interface CreditCardData {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
}

interface DashboardProps {
  initialTransactions: Transaction[];
  userName: string;
  userEmail: string;
  partner?: { id: string; name: string | null; email: string } | null;
  spendingLimit: number;
  totalSavings: number;
  savingsGoalName: string;
  accumulatedBalance: number; // Saldo Global vindo do Server
  selectedDate: { month: number; year: number; };
  creditCards: CreditCardData[];
  totalCreditOpen: number;
}

// --- UTILS MATEMÁTICOS ---
const toCents = (amount: number) => Math.round(amount * 100);
const fromCents = (cents: number) => cents / 100;
const safeAdd = (a: number, b: number) => fromCents(toCents(a) + toCents(b));

// --- COMPONENTES DE LOADING ---
const TabSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Skeleton className="h-40 rounded-3xl bg-white/5" />
      <Skeleton className="h-40 rounded-3xl bg-white/5" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Skeleton className="h-64 md:col-span-2 rounded-3xl bg-white/5" />
      <Skeleton className="h-64 rounded-3xl bg-white/5" />
    </div>
  </div>
);

const ListSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-14 w-full rounded-2xl bg-white/5" />
    <Skeleton className="h-14 w-full rounded-2xl bg-white/5" />
  </div>
);

// --- LAZY LOADING ---
import HomeTab from './tabs/HomeTab';

const HistoryTab = dynamic(() => import('./tabs/HistoryTab'), { loading: () => <ListSkeleton /> });
const PartnerTab = dynamic(() => import('./tabs/PartnerTab'), { loading: () => <TabSkeleton /> });
const GoalsTab = dynamic(() => import('./tabs/GoalsTab'), { loading: () => <TabSkeleton /> });
const ProfileTab = dynamic(() => import('./tabs/ProfileTab'), { loading: () => <TabSkeleton /> });
const TransactionModal = dynamic(() => import('./modals/TransactionModal'), { ssr: false });
const AIReportModal = dynamic(() => import('./modals/AIReportModal'), { ssr: false });
const CreditCardModal = dynamic(() => import('./modals/CreditCardModal'), { ssr: false });

export default function Dashboard({
  initialTransactions, userName, userEmail, partner,
  spendingLimit, totalSavings, savingsGoalName, accumulatedBalance, selectedDate,
  creditCards, totalCreditOpen
}: DashboardProps) {

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get('tab') as 'home' | 'history' | 'partner' | 'goals' | 'profile') || 'home';

  const [privacyMode, setPrivacyMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const createQueryString = useCallback((name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(name, value);
    return params.toString();
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    router.push(`${pathname}?${createQueryString('tab', tab)}`, { scroll: false });
  };

  const currentDate = useMemo(() => new Date(selectedDate.year, selectedDate.month, 1), [selectedDate]);

  const handleChangeMonth = (offset: number) => {
    const newDate = addMonths(currentDate, offset);
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', newDate.getMonth().toString());
    params.set('year', newDate.getFullYear().toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  // --- DADOS E ESTADO ---
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

  const monthlyTransactions = useMemo(() => {
    return transactions.filter(t => isSameMonth(t.date as Date, currentDate));
  }, [transactions, currentDate]);

  const partnerId = partner?.id;

  // --- CÁLCULO DE ESTATÍSTICAS ---
  // Função pura para somar os valores
  const calculateFlow = useCallback((txs: Transaction[]) => {
    // 1. Fluxo de Caixa MENSAL (Entradas e Saídas do mês selecionado)
    const income = txs.filter(t => t.type === 'INCOME').reduce((acc, t) => safeAdd(acc, Number(t.amount)), 0);
    const expense = txs.filter(t => t.type === 'EXPENSE').reduce((acc, t) => safeAdd(acc, Number(t.amount)), 0);

    // 2. Saldo Calculado (Apenas para referência interna, será sobrescrito pelo Global)
    const paidIncome = txs.filter(t => t.type === 'INCOME' && t.isPaid).reduce((acc, t) => safeAdd(acc, Number(t.amount)), 0);
    const paidExpense = txs.filter(t => t.type === 'EXPENSE' && t.isPaid).reduce((acc, t) => safeAdd(acc, Number(t.amount)), 0);
    const paidInvestments = txs.filter(t => t.type === 'INVESTMENT' && t.isPaid).reduce((acc, t) => safeAdd(acc, Number(t.amount)), 0);

    const calculatedBalance = fromCents(toCents(paidIncome) - toCents(paidExpense) - toCents(paidInvestments));

    return { income, expense, balance: calculatedBalance };
  }, []);

  const myTransactions = useMemo(() => monthlyTransactions.filter(t => !partnerId || t.userId !== partnerId), [monthlyTransactions, partnerId]);
  const partnerTransactions = useMemo(() => monthlyTransactions.filter(t => partnerId && t.userId === partnerId), [monthlyTransactions, partnerId]);

  // CORREÇÃO CRÍTICA: O Saldo não pode ser o do mês. Deve ser o acumulado global.
  const myStats = useMemo(() => {
    const stats = calculateFlow(myTransactions);
    // Sobrescreve o saldo calculado do mês pelo SALDO GLOBAL vindo do banco
    // Isso impede que o saldo "zere" ao virar o mês
    return { ...stats, balance: accumulatedBalance };
  }, [calculateFlow, myTransactions, accumulatedBalance]);

  const partnerStats = useMemo(() => {
    return calculateFlow(partnerTransactions);
    // Nota: Se tivéssemos o saldo global do parceiro vindo nas props, usaríamos aqui.
    // Por enquanto, mostra o fluxo do mês ou saldo calculado do período.
  }, [calculateFlow, partnerTransactions]);


  // --- HANDLERS ---
  const handleOpenNew = () => { setEditingTransaction(null); setIsModalOpen(true); };
  const handleEdit = (t: Transaction) => { setEditingTransaction(t); setIsModalOpen(true); };
  const handleDelete = async (id: string) => {
    startTransition(() => { deleteOptimisticTransaction(id); });
    toast.promise(deleteTransaction(id), { loading: 'Excluindo...', success: 'Removido!', error: 'Erro ao excluir.' });
  };

  return (
    <div className={`min-h-screen bg-[#130b20] text-gray-100 font-sans relative overflow-hidden selection:bg-pink-500/30 ${privacyMode ? 'privacy-active' : ''}`}>
      <div className="fixed top-0 left-0 w-full h-[500px] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 z-0" />

      {/* HEADER */}
      <header className="sticky top-0 z-30 w-full backdrop-blur-xl bg-[#130b20]/80 border-b border-white/5 supports-[backdrop-filter]:bg-[#130b20]/60">
        <div className="max-w-7xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between relative">
          <div className="flex items-center gap-3 cursor-pointer group active:scale-95 transition-transform z-50" onClick={() => handleTabChange('home')}>
            <div className="relative">
              <div className="absolute inset-0 bg-pink-500 blur-md opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
              <Heart size={28} className="text-pink-500 fill-pink-500/20 group-hover:scale-110 transition-transform duration-300" />
            </div>
            <span className="font-bold text-white text-xl tracking-tight">Fin<span className="text-pink-500">Love</span></span>
          </div>

          <nav className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-full p-1.5 shadow-xl items-center gap-1 z-40">
            <TabButton active={activeTab === 'home'} onClick={() => handleTabChange('home')} label="Início" icon={<Home size={18} />} />
            <TabButton active={activeTab === 'goals'} onClick={() => handleTabChange('goals')} label="Metas" icon={<Target size={18} />} />
            <TabButton active={activeTab === 'history'} onClick={() => handleTabChange('history')} label="Extrato" icon={<Clock size={18} />} />
            <TabButton active={activeTab === 'partner'} onClick={() => handleTabChange('partner')} label="Conexão" icon={<Heart size={18} />} />
          </nav>

          <div className="flex items-center gap-3 md:gap-4 z-50 relative">
            <button onClick={() => setPrivacyMode(!privacyMode)} className={`p-2 transition rounded-full hover:bg-white/5 ${privacyMode ? 'text-pink-400' : 'text-purple-300 hover:text-white'}`}>
              {privacyMode ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            <button onClick={() => setIsAIModalOpen(true)} className="p-2 text-purple-300 hover:text-white transition rounded-full hover:bg-white/5" title="Histórico IA">
              <History size={20} />
            </button>
            <button onClick={() => setIsAIModalOpen(true)} className="flex items-center gap-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 px-3 py-1.5 rounded-full text-xs font-bold transition border border-purple-500/20 active:scale-95">
              <Sparkles size={14} /><span className="hidden md:inline">IA</span>
            </button>
            <button onClick={handleOpenNew} className="hidden md:flex items-center gap-2 bg-white text-purple-950 px-5 py-2.5 rounded-full text-sm font-bold hover:bg-pink-50 transition hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              <Plus size={18} strokeWidth={3} /><span>Novo</span>
            </button>

            <div className="relative">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`p-2 rounded-full transition-all border ${isMenuOpen ? 'bg-white/10 text-white border-white/10' : 'text-gray-300 border-transparent hover:bg-white/5'}`}>
                <Menu size={24} />
              </button>
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-[#1a1025] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-white/5 bg-[#1f1630]">
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Conta</p>
                      <p className="text-sm font-bold text-white truncate">{userName}</p>
                    </div>
                    <div className="p-2 space-y-1">
                      <button onClick={() => { handleTabChange('profile'); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-200 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                        <UserIcon size={16} className="text-purple-400" /> Meu Perfil
                      </button>

                      <button onClick={() => { setIsCardModalOpen(true); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-200 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                        <CardIcon size={16} className="text-pink-400" /> Cartões
                      </button>

                      <div className="h-px bg-white/5 my-1" />
                      <button onClick={async () => { await logoutUser(); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                {activeTab === 'home' && `Olá, ${userName.split(' ')[0]}`}
                {activeTab === 'goals' && 'Minhas Metas'}
                {activeTab === 'history' && 'Extrato Detalhado'}
              </h1>
              <p className="text-gray-400 text-sm hidden md:block">
                {activeTab === 'home' ? 'Aqui está o resumo financeiro de vocês.' : 'Gestão financeira inteligente.'}
              </p>
            </div>
            <div className="flex items-center bg-[#1f1630] border border-white/5 rounded-full p-1 shadow-lg">
              <button onClick={() => handleChangeMonth(-1)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white"><ChevronLeft size={18} /></button>
              <div className="px-4 py-1 flex items-center gap-2 min-w-[140px] justify-center border-x border-white/5">
                <Calendar size={14} className="text-purple-400" />
                <span className="text-sm font-semibold capitalize text-gray-200">{format(currentDate, 'MMM yyyy', { locale: ptBR })}</span>
              </div>
              <button onClick={() => handleChangeMonth(1)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white"><ChevronRight size={18} /></button>
            </div>
          </div>
        )}

        <div key={activeTab} className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
          {activeTab === 'home' && (
            <HomeTab
              transactions={monthlyTransactions}
              myStats={myStats}
              partnerStats={partnerStats}
              partnerName={partner?.name || 'Parceiro'}
              hasPartner={!!partnerId}
              privacyMode={privacyMode}
              month={selectedDate.month}
              year={selectedDate.year}
              partnerId={partnerId}
              totalCreditOpen={totalCreditOpen}
              creditCards={creditCards}
              spendingLimit={spendingLimit}
            />
          )}
          {activeTab === 'goals' && <GoalsTab income={myStats.income + partnerStats.income} expense={myStats.expense + partnerStats.expense} transactions={monthlyTransactions} currentLimit={spendingLimit} privacyMode={privacyMode} />}
          {activeTab === 'history' && <HistoryTab transactions={monthlyTransactions} onEdit={handleEdit} onDelete={handleDelete} partnerId={partnerId} partnerName={partner?.name || 'Parceiro'} month={selectedDate.month} year={selectedDate.year} />}
          {activeTab === 'partner' && <PartnerTab partner={partner} totalSavings={totalSavings} savingsGoalName={savingsGoalName} />}
          {activeTab === 'profile' && <ProfileTab userName={userName} userEmail={userEmail} />}
        </div>
      </main>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={editingTransaction}
        creditCards={creditCards}
      />
      <AIReportModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} userName={userName} />
      <CreditCardModal isOpen={isCardModalOpen} onClose={() => setIsCardModalOpen(false)} cards={creditCards} />

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 md:hidden w-[94%] max-w-[380px]">
        <nav className="relative bg-[#1a1025]/90 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] px-2 py-3 flex justify-between items-end">
          <NavIcon active={activeTab === 'home'} onClick={() => handleTabChange('home')} icon={<Home size={22} />} label="Início" />
          <NavIcon active={activeTab === 'goals'} onClick={() => handleTabChange('goals')} icon={<Target size={22} />} label="Metas" />
          <div className="relative -top-8 mx-0.5">
            <button onClick={handleOpenNew} className="bg-gradient-to-tr from-pink-600 to-purple-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_25px_rgba(236,72,153,0.4)] border-4 border-[#130b20] active:scale-90 transition-all duration-300 group">
              <Plus size={28} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform" />
            </button>
          </div>
          <NavIcon active={activeTab === 'history'} onClick={() => handleTabChange('history')} icon={<Clock size={22} />} label="Extrato" />
          <NavIcon active={activeTab === 'partner'} onClick={() => handleTabChange('partner')} icon={<Heart size={22} />} label="Nós" />
        </nav>
      </div>
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}

function TabButton({ active, onClick, label, icon }: TabButtonProps) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${active ? 'text-white bg-white/10 shadow-inner' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
      <span className={active ? 'text-pink-400' : ''}>{icon}</span><span className="hidden lg:inline">{label}</span>
    </button>
  );
}

interface NavIconProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function NavIcon({ active, onClick, icon, label }: NavIconProps) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 min-w-[3rem] transition-all duration-300 ${active ? 'text-white scale-110' : 'text-gray-500 hover:text-gray-300'}`}>
      <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-pink-500/20 shadow-[0_0_10px_rgba(236,72,153,0.2)]' : ''}`}>{icon}</div>
      <span className="text-[9px] font-medium">{label}</span>
    </button>
  );
}