import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import Dashboard from '@/components/Dashboard';
import { 
  checkRecurringTransactionsAction, 
  getFinancialSummaryAction 
} from '@/app/actions';

const secretStr = process.env.JWT_SECRET;
if (!secretStr) throw new Error('CONFIG ERROR: JWT_SECRET ausente.');
const JWT_SECRET = new TextEncoder().encode(secretStr);

async function getUserFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.sub as string;
  } catch { return null; }
}

export default async function DashboardPage() {
  const userId = await getUserFromToken();
  if (!userId) redirect('/login');

  // ETAPA 1: Buscar o usuário primeiro (Necessário para saber quem é o parceiro)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true, 
      email: true, 
      spendingLimit: true, 
      savingsGoal: true, 
      partnerId: true,
      partner: { select: { id: true, name: true, email: true } }
    }
  });

  // Define quais IDs vamos consultar (Eu + Parceiro)
  const targetUserIds = [userId];
  if (user?.partnerId) {
    targetUserIds.push(user.partnerId);
  }

  // ETAPA 2: Buscar o restante em paralelo (Agora temos o targetUserIds pronto)
  const [
    _, // Resultado da recorrência
    financialSummary,
    rawTransactions,
    savingsAgg
  ] = await Promise.all([
    checkRecurringTransactionsAction(),
    
    getFinancialSummaryAction(),

    // Agora usamos targetUserIds que já foi calculado
    prisma.transaction.findMany({
      where: { 
        userId: { in: targetUserIds } 
      },
      orderBy: { date: 'desc' },
      take: 100,
    }),

    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { 
        userId: { in: targetUserIds },
        type: 'INVESTMENT'
      }
    })
  ]);

  // Serialização dos dados
  const serializedTransactions = rawTransactions.map(t => ({
    ...t,
    amount: Number(t.amount),
    date: t.date.toISOString(),
  }));

  const totalSavings = Number(savingsAgg._sum.amount || 0);
  const spendingLimit = Number(user?.spendingLimit || 0);
  const accumulatedBalance = Number(financialSummary?.accumulatedBalance || 0);

  return (
    <Dashboard
      initialTransactions={serializedTransactions}
      userName={user?.name?.split(' ')[0] || 'Visitante'}
      userEmail={user?.email || ''}
      partner={user?.partner}
      spendingLimit={spendingLimit}
      totalSavings={totalSavings}
      savingsGoalName={user?.savingsGoal || "Caixinha dos Sonhos"}
      accumulatedBalance={accumulatedBalance}
    />
  );
}