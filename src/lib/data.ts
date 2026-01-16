import { prisma } from '@/lib/prisma';
import { unstable_cache } from 'next/cache';
import { startOfMonth, endOfMonth } from 'date-fns';

export async function getDashboardData(userId: string, month: number, year: number) {
  const fetchData = async () => {
    // 1. Buscar Usuário e Parceiro
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        spendingLimit: true,
        partnerId: true,
        savingsGoal: true,
        partner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!user) return null;

    const userIds = [user.id];
    if (user.partnerId) userIds.push(user.partnerId);

    const startDate = startOfMonth(new Date(year, month, 1));
    const endDate = endOfMonth(new Date(year, month, 1));

    // 2. Buscar Transações do Mês (Para a lista detalhada)
    // Aqui buscamos TODAS (pagas e pendentes) para mostrar no extrato e gráficos
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: { in: userIds },
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    // 3. Calcular Saldo Acumulado (Total Geral de todos os tempos)
    const balanceAgg = await prisma.transaction.groupBy({
      by: ['type'],
      where: {
        userId: { in: userIds },
        isPaid: true // <--- AQUI ESTÁ O SEGREDO
      },
      _sum: {
        amount: true
      }
    });

    const totalIncome = Number(balanceAgg.find(b => b.type === 'INCOME')?._sum.amount || 0);
    const totalExpense = Number(balanceAgg.find(b => b.type === 'EXPENSE')?._sum.amount || 0);
    const totalInvested = Number(balanceAgg.find(b => b.type === 'INVESTMENT')?._sum.amount || 0);

    // Saldo real disponível agora na conta
    const accumulatedBalance = totalIncome - totalExpense - totalInvested;

    // 4. Calcular Total Guardado (Investimentos)
    const totalSavings = totalInvested;

    return {
      user,
      transactions,
      accumulatedBalance,
      totalSavings
    };
  };

  const getCachedData = unstable_cache(
    fetchData,
    [`dashboard-data-${userId}-${month}-${year}`],
    {
      tags: [`dashboard:${userId}`],
      revalidate: 3600
    }
  );

  return getCachedData();
}