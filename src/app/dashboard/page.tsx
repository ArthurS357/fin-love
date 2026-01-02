import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import Dashboard from '@/components/Dashboard';
import { checkRecurringTransactionsAction } from '@/app/actions'; // <--- Importante

const secretStr = process.env.JWT_SECRET;
if (!secretStr) {
  throw new Error('CONFIG ERROR: JWT_SECRET ausente.');
}
const JWT_SECRET = new TextEncoder().encode(secretStr);

async function getUserFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.sub as string;
  } catch (error) {
    return null;
  }
}

export default async function DashboardPage() {
  const userId = await getUserFromToken();

  if (!userId) {
    redirect('/login');
  }

  // 1. Verificar recorrências pendentes (Gatilho Automático)
  await checkRecurringTransactionsAction();

  // 2. Buscar dados do utilizador
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      spendingLimit: true,
      savingsGoal: true,
      partnerId: true,
      partner: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  });

  // 3. Definir IDs para buscar transações (usuário + parceiro)
  const userIds = [userId];
  if (user?.partnerId) {
    userIds.push(user.partnerId);
  }

  // 4. Buscar transações recentes
  const transactions = await prisma.transaction.findMany({
    where: {
      userId: { in: userIds }
    },
    orderBy: { date: 'desc' },
    take: 100,
  });

  // Serialização dos dados (datas para string)
  const serializedTransactions = transactions.map(t => ({
    ...t,
    amount: t.amount,
    date: t.date.toISOString(),
  }));

  // 5. Calcular o total da "Caixinha"
  const totalSavings = transactions
    .filter(t => t.type === 'INVESTMENT')
    .reduce((acc, t) => acc + t.amount, 0);

  return (
    <Dashboard
      initialTransactions={serializedTransactions}
      userName={user?.name?.split(' ')[0] || 'Visitante'}
      userEmail={user?.email || ''}
      partner={user?.partner}
      spendingLimit={user?.spendingLimit || 0}
      totalSavings={totalSavings}
      savingsGoalName={user?.savingsGoal || "Caixinha dos Sonhos"}
    />
  );
}