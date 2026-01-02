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

  // 1. Buscar dados do usuário e do parceiro
  // Precisamos do spendingLimit para a aba de Metas
  // Precisamos do ID do parceiro para buscar as transações dele também
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      spendingLimit: true, // <--- Importante para a Meta
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

  // 2. Definir de quem vamos buscar as transações
  // Se tiver parceiro, o array userIds terá [idDoUsuario, idDoParceiro]
  // Se não, apenas [idDoUsuario]
  const userIds = [userId];
  if (user?.partnerId) {
    userIds.push(user.partnerId);
  }

  // 3. Buscar transações (Do casal ou individual)
  const transactions = await prisma.transaction.findMany({
    where: {
      userId: { in: userIds }
    },
    orderBy: { date: 'desc' },
  });

  // Serialização dos dados (Date -> String para passar pro Client Component)
  const serializedTransactions = transactions.map(t => ({
    ...t,
    amount: t.amount,
    date: t.date.toISOString(),
  }));

  // 4. Calcular o total da "Caixinha"
  // Filtramos apenas as transações do tipo INVESTMENT
  const totalSavings = transactions
    .filter(t => t.type === 'INVESTMENT')
    .reduce((acc, t) => acc + t.amount, 0);

  // Passamos todos os dados para o componente Client-Side
  return (
    <Dashboard
      initialTransactions={serializedTransactions}
      userName={user?.name?.split(' ')[0] || 'Visitante'}
      partner={user?.partner}
      spendingLimit={user?.spendingLimit || 0} // <--- Passando a meta
      totalSavings={totalSavings} // <--- Passando o total da caixinha
    />
  );
}