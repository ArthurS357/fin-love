import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import Dashboard from '@/components/Dashboard';
import { checkRecurringTransactionsAction } from '@/app/actions';

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

  // OTIMIZAÇÃO 1: Paralelismo (Promise.all)
  // Executa a verificação de recorrencia e a busca do usuário ao mesmo tempo
  // em vez de esperar um acabar para começar o outro.
  const [_, user] = await Promise.all([
    checkRecurringTransactionsAction(), // Roda em background (side-effect)
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true, email: true, spendingLimit: true, savingsGoal: true, partnerId: true,
        partner: { select: { id: true, name: true, email: true } }
      }
    })
  ]);

  const userIds = [userId];
  if (user?.partnerId) userIds.push(user.partnerId);

  // OTIMIZAÇÃO 2: Agregação no Banco (Mais rápido e CORRETO)
  // Buscamos as últimas 100 para exibir no histórico,
  // MAS calculamos o total investido via banco de dados (soma total real).
  const [transactions, savingsAgg] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: { in: userIds } },
      orderBy: { date: 'desc' },
      take: 100,
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { 
        userId: { in: userIds },
        type: 'INVESTMENT'
      }
    })
  ]);

  // Serialização
  const serializedTransactions = transactions.map(t => ({
    ...t,
    // Se mudou para Decimal, converta aqui: amount: Number(t.amount)
    amount: typeof t.amount === 'object' ? Number(t.amount) : t.amount,
    date: t.date.toISOString(),
  }));

  // Pega o valor agregado do banco (ou 0 se for null)
  // Se estiver usando Decimal, converta com Number()
  const totalSavings = Number(savingsAgg._sum.amount || 0);

  return (
    <Dashboard
      initialTransactions={serializedTransactions}
      userName={user?.name?.split(' ')[0] || 'Visitante'}
      userEmail={user?.email || ''}
      partner={user?.partner}
      spendingLimit={Number(user?.spendingLimit || 0)}
      totalSavings={totalSavings}
      savingsGoalName={user?.savingsGoal || "Caixinha dos Sonhos"}
    />
  );
}