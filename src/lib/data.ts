import 'server-only';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth } from 'date-fns';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';

// Função auxiliar para buscar usuário (Cacheada por Request Memoization)
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

// Lógica interna de busca (sem cache, apenas a query crua)
const fetchDashboardData = async (userId: string, month: number, year: number) => {
  const user = await getUserData(userId);
  if (!user) return null;
  
  const targetUserIds = [userId];
  if (user.partnerId) targetUserIds.push(user.partnerId);

  const queryDate = new Date(year, month, 1);
  const startDate = startOfMonth(queryDate);
  const endDate = endOfMonth(queryDate);

  const [transactions, financialSummary, savingsAgg] = await Promise.all([
    // 1. Transações do Mês
    prisma.transaction.findMany({
      where: {
        userId: { in: targetUserIds },
        date: { gte: startDate, lte: endDate }
      },
      orderBy: { date: 'desc' }
    }),

    // 2. Resumo para Saldo (Histórico Completo)
    prisma.transaction.groupBy({
      by: ['type'],
      where: { userId: { in: targetUserIds } },
      _sum: { amount: true }
    }),

    // 3. Total Guardado
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId: { in: targetUserIds }, type: 'INVESTMENT' }
    })
  ]);

  const totalIncome = Number(financialSummary.find(f => f.type === 'INCOME')?._sum.amount || 0);
  const totalExpense = Number(financialSummary.find(f => f.type === 'EXPENSE')?._sum.amount || 0);
  const totalInvested = Number(financialSummary.find(f => f.type === 'INVESTMENT')?._sum.amount || 0);
  const accumulatedBalance = totalIncome - totalExpense - totalInvested;

  return {
    transactions,
    accumulatedBalance,
    totalSavings: Number(savingsAgg._sum.amount || 0),
    user
  };
};

// --- AQUI ESTÁ A OTIMIZAÇÃO (Data Cache) ---
export const getDashboardData = async (userId: string, month: number, year: number) => {
  // Envolvemos a busca no unstable_cache
  return await unstable_cache(
    async () => fetchDashboardData(userId, month, year),
    [`dashboard-${userId}-${month}-${year}`], // Chave única do Cache (Key)
    {
      tags: [`dashboard:${userId}`], // TAG para invalidar tudo desse usuário de uma vez
      revalidate: 3600 // Revalidar automaticamente a cada 1 hora (opcional)
    }
  )();
};