import { redirect } from 'next/navigation';
import { getUserId } from '@/lib/auth';
import { getDashboardData } from '@/lib/data';
import Dashboard from '@/components/Dashboard';

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

  // 2. Buscar Dados Otimizados
  const data = await getDashboardData(userId, monthParam, yearParam);
  
  if (!data) {
    // Caso de erro extremo (usuário deletado durante a sessão)
    redirect('/login');
  }

  const { transactions, accumulatedBalance, totalSavings, user } = data;

  // 3. Serializar para o Cliente
  const serializedTransactions = transactions.map(t => ({
    ...t,
    amount: Number(t.amount),
    date: t.date.toISOString(),
    type: t.type as 'INCOME' | 'EXPENSE' | 'INVESTMENT',
  }));

  return (
    <Dashboard
      initialTransactions={serializedTransactions}
      userName={user.name?.split(' ')[0] || 'Visitante'}
      userEmail={user.email || ''}
      partner={user.partner}
      spendingLimit={Number(user.spendingLimit || 0)}
      totalSavings={totalSavings}
      savingsGoalName={user.savingsGoal || "Caixinha dos Sonhos"}
      accumulatedBalance={accumulatedBalance}
      selectedDate={{ month: monthParam, year: yearParam }}
    />
  );
}