import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getUserId } from '@/lib/auth';
import { getDashboardData } from '@/lib/data';
import { getCreditCardsAction, checkRecurringTransactionsAction } from '../actions';
import Dashboard from '@/components/Dashboard';
import { Skeleton } from '@/components/ui/skeleton';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function DashboardPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const userId = await getUserId();

  if (!userId) redirect('/login');

  // 1. Resolver Data (URL ou Atual)
  const now = new Date();
  const monthParam = searchParams.month ? Number(searchParams.month) : now.getMonth();
  const yearParam = searchParams.year ? Number(searchParams.year) : now.getFullYear();

  // 2. Executar verificações automáticas (Recorrência/Faturas)
  await checkRecurringTransactionsAction();

  // 3. Buscar Dados Otimizados em Paralelo (Dashboard + Cartões)
  const [data, rawCreditCards] = await Promise.all([
    getDashboardData(userId, monthParam, yearParam),
    getCreditCardsAction()
  ]);

  // Se não houver dados (ex: banco resetado mas cookie ativo), 
  // redireciona para a API que tem permissão para deletar o cookie.
  if (!data) {
    redirect('/api/logout');
  }

  const { transactions, accumulatedBalance, totalSavings, user } = data;

  // 4. Serializar Transações para o Cliente (Decimal -> Number)
  const serializedTransactions = transactions.map(t => ({
    ...t,
    amount: Number(t.amount),
    date: new Date(t.date).toISOString(),
    type: t.type as 'INCOME' | 'EXPENSE' | 'INVESTMENT',
    // Mapeia o cartão se existir na transação
    creditCardId: t.creditCardId || undefined 
  }));

  // 5. Serializar Cartões para o Cliente (CORREÇÃO DO ERRO)
  const serializedCreditCards = (rawCreditCards || []).map(card => ({
    ...card,
    limit: card.limit ? Number(card.limit) : 0, // Converte Decimal para Number
    createdAt: card.createdAt.toISOString(),    // Converte Date para String (segurança extra)
    updatedAt: card.updatedAt.toISOString()
  }));

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#130b20] p-4 md:p-8 flex flex-col gap-6">
        <div className="max-w-7xl mx-auto w-full space-y-6">
          {/* Skeleton Header */}
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48 bg-white/5 rounded-lg" />
              <Skeleton className="h-4 w-32 bg-white/5 rounded-lg" />
            </div>
            <Skeleton className="h-10 w-32 bg-white/5 rounded-full" />
          </div>

          {/* Skeleton Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-40 bg-white/5 rounded-3xl" />
            <Skeleton className="h-40 bg-white/5 rounded-3xl" />
          </div>

          {/* Skeleton List */}
          <div className="space-y-4 pt-4">
            <Skeleton className="h-16 w-full bg-white/5 rounded-2xl" />
            <Skeleton className="h-16 w-full bg-white/5 rounded-2xl" />
            <Skeleton className="h-16 w-full bg-white/5 rounded-2xl" />
          </div>
        </div>
      </div>
    }>
      <Dashboard
        initialTransactions={serializedTransactions}
        userName={user.name || 'Visitante'}
        userEmail={user.email || ''}
        partner={user.partner}
        spendingLimit={Number(user.spendingLimit || 0)}
        totalSavings={totalSavings}
        savingsGoalName={user.savingsGoal || "Caixinha dos Sonhos"}
        accumulatedBalance={accumulatedBalance}
        selectedDate={{ month: monthParam, year: yearParam }}
        creditCards={serializedCreditCards} // <--- Usando a lista serializada
      />
    </Suspense>
  );
}