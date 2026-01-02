import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import Dashboard from '@/components/Dashboard';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

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

  // Buscar usuário (apenas o nome) e transações em paralelo para ser mais rápido
  const [user, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    })
  ]);

  // Serialização dos dados
  const serializedTransactions = transactions.map(t => ({
    ...t,
    amount: t.amount,
    date: t.date.toISOString(),
  }));

  // Passamos o nome do usuário para o componente
  return (
    <Dashboard 
      initialTransactions={serializedTransactions} 
      userName={user?.name?.split(' ')[0] || 'Visitante'} 
    />
  );
}