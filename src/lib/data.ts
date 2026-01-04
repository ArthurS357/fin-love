import 'server-only';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth } from 'date-fns';
import { cache } from 'react';

// Use 'cache' do React para garantir que se chamarmos a função 
// várias vezes na mesma renderização, o banco só é acessado uma vez (Deduping).

export const getUserData = cache(async (userId: string) => {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      spendingLimit: true,
      savingsGoal: true,
      partnerId: true,
      partner: { select: { id: true, name: true, email: true } }
    }
  });
});

export const getDashboardData = cache(async (userId: string, month: number, year: number) => {
  // 1. Identificar Usuários (Eu + Parceiro)
  const user = await getUserData(userId);
  if (!user) return null;
  
  const targetUserIds = [userId];
  if (user.partnerId) targetUserIds.push(user.partnerId);

  // 2. Definir Intervalo de Datas
  const queryDate = new Date(year, month, 1);
  const startDate = startOfMonth(queryDate);
  const endDate = endOfMonth(queryDate);

  // 3. Executar Queries em Paralelo (Mais rápido)
  const [transactions, financialSummary, savingsAgg] = await Promise.all([
    // A. Transações do Mês (Filtradas por data corretamente!)
    prisma.transaction.findMany({
      where: {
        userId: { in: targetUserIds },
        date: { gte: startDate, lte: endDate }
      },
      orderBy: { date: 'desc' }
    }),

    // B. Resumo Financeiro Global (Para Saldo Acumulado Histórico)
    prisma.transaction.groupBy({
      by: ['type'],
      where: { userId: { in: targetUserIds } },
      _sum: { amount: true }
    }),

    // C. Total Investido (Geral)
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId: { in: targetUserIds }, type: 'INVESTMENT' }
    })
  ]);

  // 4. Processar Saldo Acumulado
  const totalIncome = Number(financialSummary.find(f => f.type === 'INCOME')?._sum.amount || 0);
  const totalExpense = Number(financialSummary.find(f => f.type === 'EXPENSE')?._sum.amount || 0);
  const totalInvested = Number(financialSummary.find(f => f.type === 'INVESTMENT')?._sum.amount || 0);
  
  // Saldo = Entradas - Saídas - Investimentos (se considerar investimento como saída de caixa)
  // Ajuste essa lógica conforme sua preferência de negócio
  const accumulatedBalance = totalIncome - totalExpense - totalInvested;

  return {
    transactions,
    accumulatedBalance,
    totalSavings: Number(savingsAgg._sum.amount || 0),
    user // Retornamos o user também para aproveitar o fetch
  };
});