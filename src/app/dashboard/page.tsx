import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth'; // Usando a lib criada acima
import Dashboard from '@/components/Dashboard';
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';

// 1. Definição das Props para pegar Query Params (searchParams)
interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function DashboardPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const userId = await getUserId();
  if (!userId) redirect('/login');

  // 2. Determinar o intervalo de data baseado na URL ou Data Atual
  const now = new Date();
  const monthParam = Number(searchParams.month) || now.getMonth(); // 0-11
  const yearParam = Number(searchParams.year) || now.getFullYear();

  // Criar datas de início e fim para o filtro do Prisma
  const queryDate = new Date(yearParam, monthParam, 1);
  const startDate = startOfMonth(queryDate);
  const endDate = endOfMonth(queryDate);

  // 3. Buscar usuário e parceiro
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true, email: true, spendingLimit: true, savingsGoal: true, partnerId: true,
      partner: { select: { id: true, name: true, email: true } }
    }
  });

  const targetUserIds = [userId];
  if (user?.partnerId) targetUserIds.push(user.partnerId);

  // 4. Queries Otimizadas (Filtrando por data NO BANCO)
  const [transactions, savingsAgg, financialSummary] = await Promise.all([
    // A. Transações apenas do mês selecionado
    prisma.transaction.findMany({
      where: { 
        userId: { in: targetUserIds },
        date: { gte: startDate, lte: endDate } // <--- O PULO DO GATO
      },
      orderBy: { date: 'desc' },
      // Removemos o 'take: 100' para pegar todas do mês, ou aumentamos para um numero seguro como 1000
    }),

    // B. Total guardado (Geral, independente do mês)
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId: { in: targetUserIds }, type: 'INVESTMENT' }
    }),

    // C. Saldo Acumulado (Entradas - Saídas até o momento atual)
    // Para ser preciso, precisamos calcular o saldo TOTAL da história até hoje
    prisma.transaction.groupBy({
        by: ['type'],
        where: { userId: { in: targetUserIds } },
        _sum: { amount: true }
    })
  ]);

  // Cálculo do Saldo Acumulado
  const totalIncome = Number(financialSummary.find(f => f.type === 'INCOME')?._sum.amount || 0);
  const totalExpense = Number(financialSummary.find(f => f.type === 'EXPENSE')?._sum.amount || 0);
  // Nota: Investimentos geralmente saem do saldo corrente ou são considerados despesa dependendo da lógica.
  // Vou assumir que INVESTIMENTO reduz o saldo disponível em conta corrente:
  const totalInvested = Number(financialSummary.find(f => f.type === 'INVESTMENT')?._sum.amount || 0);
  
  const accumulatedBalance = totalIncome - totalExpense - totalInvested;

  // Serialização
  const serializedTransactions = transactions.map(t => ({
    ...t,
    amount: Number(t.amount),
    date: t.date.toISOString(),
    type: t.type as 'INCOME' | 'EXPENSE' | 'INVESTMENT',
  }));

  return (
    <Dashboard
      initialTransactions={serializedTransactions}
      userName={user?.name?.split(' ')[0] || 'Visitante'}
      userEmail={user?.email || ''}
      partner={user?.partner}
      spendingLimit={Number(user?.spendingLimit || 0)}
      totalSavings={Number(savingsAgg._sum.amount || 0)}
      savingsGoalName={user?.savingsGoal || "Caixinha"}
      accumulatedBalance={accumulatedBalance}
      // Passamos o mês atual para o Dashboard controlar a UI
      selectedDate={{ month: monthParam, year: yearParam }}
    />
  );
}