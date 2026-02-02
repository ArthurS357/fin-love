'use server'
import 'server-only';

import { prisma } from '@/lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { addMonths, isBefore, setDate, subMonths, startOfMonth, endOfMonth, format } from 'date-fns'

// --- SCHEMAS E TIPOS ---
import {
  registerSchema,
  loginSchema,
  transactionSchema,
  categorySchema,
  passwordSchema,
  budgetDataSchema
} from '@/lib/schemas'

import type { BudgetData } from '@/lib/schemas';
export type { BudgetData };

// --- SERVICES (CAMADA DE NEGÓCIO) ---
import * as authService from '@/services/authService';
import * as transactionService from '@/services/transactionService';
import * as aiService from '@/services/aiService';
import * as investmentService from '@/services/investmentService';
import * as budgetService from '@/services/budgetService';
import * as userService from '@/services/userService';
import * as creditCardService from '@/services/creditCardService';

import { getUserId } from '@/lib/auth';

type ActionState = {
  success: boolean
  error: string
  message?: string
  details?: string
  data?: any
}

// ==========================================
// 1. AUTENTICAÇÃO (AUTH)
// ==========================================

export async function registerUser(prevState: any, formData: FormData): Promise<ActionState> {
  const data = Object.fromEntries(formData);
  const validation = registerSchema.safeParse(data);

  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  try {
    const { token } = await authService.registerService(validation.data);

    const cookieStore = await cookies();
    cookieStore.set('token', token, { httpOnly: true, path: '/' });

    return { success: true, error: '' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao criar conta.' };
  }
}

export async function loginUser(prevState: any, formData: FormData): Promise<ActionState> {
  const data = Object.fromEntries(formData);
  const validation = loginSchema.safeParse(data);

  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message };
  }

  try {
    const { token } = await authService.loginService(validation.data);

    const cookieStore = await cookies();
    cookieStore.set('token', token, { httpOnly: true, path: '/' });

    return { success: true, error: '' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao entrar.' };
  }
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete('token');
  redirect('/login');
}

// ==========================================
// 2. TRANSAÇÕES (CRUD + PARCELAMENTO)
// ==========================================

export async function addTransaction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Usuário não autenticado' };

  const rawData = Object.fromEntries(formData);
  const validation = transactionSchema.safeParse(rawData);

  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  try {
    // Delega a lógica complexa (parcelas, cartão, recorrência) para o serviço
    await transactionService.createTransactionService(userId, validation.data);

    // Efeitos colaterais de UI
    await checkBadgesAction();
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (error: any) {
    console.error(error);
    return { error: error.message || 'Erro ao salvar transação.' };
  }
}

export async function updateTransaction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  const id = formData.get('id') as string;
  const rawData = Object.fromEntries(formData);
  const validation = transactionSchema.safeParse(rawData);

  if (!validation.success) return { error: validation.error.issues[0].message };

  const existingTransaction = await prisma.transaction.findUnique({ where: { id } });
  if (!existingTransaction || existingTransaction.userId !== userId) {
    return { error: 'Não autorizado.' };
  }

  const { type, amount, description, category, date, creditCardId, isPaid } = validation.data;

  let finalDate = undefined;
  if (date) {
    finalDate = new Date(date);
    finalDate.setUTCHours(12, 0, 0, 0);
  }

  await prisma.transaction.update({
    where: { id },
    data: {
      type: type as any,
      amount,
      description,
      category,
      date: finalDate,
      creditCardId: creditCardId || null,
      isPaid: isPaid
    },
  });

  revalidateTag(`dashboard:${userId}`, 'default');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteTransaction(id: string) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  const transaction = await prisma.transaction.findUnique({ where: { id } });
  if (!transaction || transaction.userId !== userId) return { error: 'Não autorizado.' };

  await prisma.transaction.delete({ where: { id } });

  revalidateTag(`dashboard:${userId}`, 'default');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteInstallmentGroupAction(installmentId: string) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  try {
    await prisma.transaction.deleteMany({
      where: { installmentId: installmentId, userId: userId }
    });

    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard');
    return { success: true, message: 'Todas as parcelas foram removidas.' };
  } catch (error) {
    return { error: 'Erro ao excluir parcelas.' };
  }
}

export async function toggleTransactionStatus(id: string, currentStatus: boolean) {
  const userId = await getUserId();
  if (!userId) return;

  await prisma.transaction.update({
    where: { id, userId },
    data: { isPaid: !currentStatus }
  });

  revalidateTag(`dashboard:${userId}`, 'default');
  revalidatePath('/dashboard');
}

// ==========================================
// 3. RESUMO E ANÁLISE FINANCEIRA
// ==========================================

export async function getFinancialSummaryAction(month?: number, year?: number) {
  const userId = await getUserId();
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { partnerId: true } });
  const userIds = [userId];
  if (user?.partnerId) userIds.push(user.partnerId);

  // 1. Resumo Geral
  const summary = await prisma.transaction.groupBy({
    by: ['type'],
    where: { userId: { in: userIds } },
    _sum: { amount: true }
  });

  const totalIncome = Number(summary.find(s => s.type === 'INCOME')?._sum.amount || 0);
  const totalExpense = Number(summary.find(s => s.type === 'EXPENSE')?._sum.amount || 0);
  const totalInvested = Number(summary.find(s => s.type === 'INVESTMENT')?._sum.amount || 0);
  const accumulatedBalance = totalIncome - totalExpense - totalInvested;

  // 2. Fatura Atual
  let dateFilter = {};
  if (month !== undefined && year !== undefined) {
    const end = endOfMonth(new Date(year, month, 1));
    dateFilter = { date: { lte: end } };
  }

  const creditSummary = await prisma.transaction.aggregate({
    where: {
      userId: { in: userIds },
      type: 'EXPENSE',
      paymentMethod: 'CREDIT',
      isPaid: false,
      ...dateFilter
    },
    _sum: { amount: true }
  });

  const totalCreditOpen = Number(creditSummary._sum.amount || 0);

  return { accumulatedBalance, totalCreditOpen };
}

export async function getMonthlyComparisonAction(month: number, year: number) {
  const userId = await getUserId();
  if (!userId) return { success: false, data: null };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { partnerId: true } });
  const userIds = [userId, user?.partnerId].filter(Boolean) as string[];

  const currentDate = new Date(year, month, 1);
  const prevDate = subMonths(currentDate, 1);

  const getMonthTotal = async (date: Date) => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);

    const result = await prisma.transaction.aggregate({
      where: {
        userId: { in: userIds },
        date: { gte: start, lte: end },
        type: 'EXPENSE'
      },
      _sum: { amount: true }
    });
    return Number(result._sum.amount || 0);
  };

  try {
    const currentTotal = await getMonthTotal(currentDate);
    const prevTotal = await getMonthTotal(prevDate);

    let diffPercent = 0;
    if (prevTotal > 0) {
      diffPercent = ((currentTotal - prevTotal) / prevTotal) * 100;
    } else if (currentTotal > 0) {
      diffPercent = 100;
    }

    return {
      success: true,
      data: {
        currentTotal,
        prevTotal,
        diffPercent: Number(diffPercent.toFixed(1)),
        increased: currentTotal > prevTotal
      }
    };
  } catch (e) {
    return { success: false, data: null };
  }
}

export async function exportTransactionsCsvAction(month: number, year: number) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: 'Auth error' };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { partnerId: true, name: true, partner: { select: { name: true } } }
  });

  const userIds = [userId];
  if (user?.partnerId) userIds.push(user.partnerId);

  const start = startOfMonth(new Date(year, month, 1));
  const end = endOfMonth(new Date(year, month, 1));

  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: { in: userIds },
        date: { gte: start, lte: end }
      },
      orderBy: { date: 'desc' },
      include: { user: { select: { name: true } } }
    });

    const safeString = (str: string) => {
      if (!str) return '';
      let clean = str.replace(/,/g, ' ').replace(/\n/g, ' ');
      if (/^[=+\-@]/.test(clean)) return `'${clean}`;
      return clean;
    };

    const header = "Data,Quem,Descrição,Categoria,Tipo,Valor,Status\n";

    const rows = transactions.map(t => {
      const dateStr = format(t.date, 'dd/MM/yyyy');
      const ownerName = t.userId === userId ? 'Você' : (t.user?.name?.split(' ')[0] || 'Parceiro');
      const amountStr = t.amount.toFixed(2).replace('.', ',');
      const status = t.isPaid ? 'Pago' : 'Pendente';
      return `${dateStr},${ownerName},${safeString(t.description)},${safeString(t.category)},${t.type},${amountStr},${status}`;
    }).join('\n');

    return { success: true, csv: header + rows };
  } catch (error) {
    return { success: false, error: 'Erro ao gerar arquivo.' };
  }
}

// ==========================================
// 4. PARCEIRO & METAS
// ==========================================

export async function linkPartnerAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  const email = formData.get('email') as string;

  try {
    const { partnerId } = await userService.linkPartnerService(userId, email);

    await checkBadgesAction();
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidateTag(`dashboard:${partnerId}`, 'default');
    revalidatePath('/dashboard');
    return { success: true, message: 'Conectado!' };
  } catch (error: any) {
    return { error: error.message || 'Erro ao conectar.' };
  }
}

export async function unlinkPartnerAction() {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  try {
    const { partnerId } = await userService.unlinkPartnerService(userId);

    revalidateTag(`dashboard:${userId}`, 'default');
    if (partnerId) revalidateTag(`dashboard:${partnerId}`, 'default');
    revalidatePath('/dashboard');
    return { success: true, message: 'Desconectado.' };
  } catch (error: any) {
    return { error: error.message || 'Erro ao desconectar.' };
  }
}

export async function updateSpendingLimitAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  const limit = parseFloat(formData.get('limit') as string);

  try {
    await userService.updateSpendingLimitService(userId, limit);
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard');
    return { success: true, message: 'Limite atualizado!' };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function addSavingsAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  const amount = parseFloat(formData.get('amount') as string);
  if (isNaN(amount) || amount <= 0) return { error: 'Valor inválido.' };
  const description = formData.get('description') as string || 'Caixinha';

  // Mantemos criação simples aqui pois é só uma transação específica
  await prisma.transaction.create({
    data: { userId, type: 'INVESTMENT', amount, description, category: 'Caixinha', date: new Date() }
  });

  await checkBadgesAction();
  revalidateTag(`dashboard:${userId}`, 'default');
  revalidatePath('/dashboard');
  return { success: true, message: 'Valor guardado!' };
}

export async function updateSavingsGoalNameAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  const name = formData.get('name') as string;

  try {
    const { partnerId } = await userService.updateSavingsGoalNameService(userId, name);

    revalidateTag(`dashboard:${userId}`, 'default');
    if (partnerId) revalidateTag(`dashboard:${partnerId}`, 'default');
    revalidatePath('/dashboard');
    return { success: true, message: 'Meta atualizada!' };
  } catch (error: any) {
    return { error: error.message };
  }
}

// ==========================================
// 5. INTELIGÊNCIA ARTIFICIAL
// ==========================================

export async function getAiHistoryAction(context: string = 'GENERAL') {
  const userId = await getUserId();
  if (!userId) return [];
  return await aiService.getAiHistoryService(userId, context);
}

export async function clearAiHistoryAction(context: string = 'GENERAL') {
  const userId = await getUserId();
  if (!userId) return { success: false };

  await aiService.clearAiHistoryService(userId, context);
  revalidatePath('/dashboard');
  return { success: true };
}

export async function generateFinancialAdviceAction(tone: string = 'FRIENDLY') {
  const userId = await getUserId();
  if (!userId) return { success: false, error: 'Auth error' };

  try {
    const advice = await aiService.generateFinancialAdviceService(userId, tone);
    revalidatePath('/dashboard');
    return { success: true, message: advice };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// 6. CATEGORIAS
// ==========================================

export async function getCategoriesAction() {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error', data: [] };
  const categories = await prisma.category.findMany({ where: { userId }, orderBy: { name: 'asc' } });
  return { success: true, data: categories };
}

export async function createCategoryAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };
  const rawData = Object.fromEntries(formData);
  const validation = categorySchema.safeParse(rawData);
  if (!validation.success) return { error: validation.error.issues[0].message };

  const { name, color, icon, type } = validation.data;

  try {
    await prisma.category.create({
      data: { userId, name, color, icon: icon || 'Tag', type: type || 'EXPENSE' }
    });
    await checkBadgesAction();
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard');
    return { success: true, message: 'Categoria criada!' };
  } catch (err) {
    return { error: 'Erro ao criar categoria.' };
  }
}

export async function deleteCategoryAction(id: string) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };
  await prisma.category.delete({ where: { id, userId } });
  revalidateTag(`dashboard:${userId}`, 'default');
  revalidatePath('/dashboard');
  return { success: true };
}

// ==========================================
// 7. CRON JOBS (RECORRÊNCIA)
// ==========================================

export async function checkRecurringTransactionsAction() {
  const userId = await getUserId();
  if (!userId) return;

  try {
    const pending = await prisma.recurringTransaction.findMany({
      where: { userId, active: true, nextRun: { lte: new Date() } }
    });

    if (pending.length === 0) return;

    const newTransactions = [];
    const updates = [];
    const MAX_MONTHS_LOOKAHEAD = 12;

    for (const rec of pending) {
      let runDate = new Date(rec.nextRun);
      const now = new Date();
      let safetyCounter = 0;

      while ((isBefore(runDate, now) || runDate.getTime() <= now.getTime()) && safetyCounter < MAX_MONTHS_LOOKAHEAD) {
        newTransactions.push({
          userId,
          type: rec.type,
          amount: rec.amount,
          description: `${rec.description} (Auto)`,
          category: rec.category,
          date: new Date(runDate)
        });
        runDate = addMonths(runDate, 1);
        if (rec.dayOfMonth) runDate = setDate(runDate, rec.dayOfMonth);
        safetyCounter++;
      }
      updates.push(prisma.recurringTransaction.update({
        where: { id: rec.id },
        data: { nextRun: runDate }
      }));
    }

    if (newTransactions.length > 0) {
      await prisma.transaction.createMany({ data: newTransactions });
      revalidateTag(`dashboard:${userId}`, 'default');
    }
    await Promise.all(updates);
    revalidatePath('/dashboard');
  } catch (err) { console.error("Erro recorrência:", err) }
}

// ==========================================
// 8. GAMIFICAÇÃO (BADGES)
// ==========================================

const BADGES_RULES = [
  { code: 'FIRST_TRX', name: 'Primeiro Passo', desc: 'Criou a primeira transação', icon: '🚀' },
  { code: 'SAVER_1', name: 'Poupador Iniciante', desc: 'Guardou dinheiro na caixinha', icon: '🐷' },
  { code: 'COUPLE_GOALS', name: 'Dupla Dinâmica', desc: 'Conectou com o parceiro', icon: '👩‍❤️‍👨' },
  { code: 'BIG_SAVER', name: 'Magnata', desc: 'Acumulou mais de R$ 1.000', icon: '💎' },
  { code: 'CAT_MASTER', name: 'Organizado', desc: 'Criou uma categoria personalizada', icon: '🏷️' },
];

export async function checkBadgesAction() {
  const userId = await getUserId();
  if (!userId) return;

  try {
    const [earnedBadges, trxCount, userStats, investments, categoriesCount] = await Promise.all([
      prisma.badge.findMany({ where: { userId }, select: { code: true } }),
      prisma.transaction.count({ where: { userId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { partnerId: true } }),
      prisma.transaction.aggregate({ where: { userId, type: 'INVESTMENT' }, _sum: { amount: true } }),
      prisma.category.count({ where: { userId } })
    ]);

    const earnedCodes = earnedBadges.map(b => b.code);
    const newBadges = [];
    const totalSaved = Number(investments._sum.amount || 0);

    if (trxCount > 0 && !earnedCodes.includes('FIRST_TRX')) newBadges.push(BADGES_RULES[0]);
    if (userStats?.partnerId && !earnedCodes.includes('COUPLE_GOALS')) newBadges.push(BADGES_RULES[2]);
    if (totalSaved > 0 && !earnedCodes.includes('SAVER_1')) newBadges.push(BADGES_RULES[1]);
    if (totalSaved >= 1000 && !earnedCodes.includes('BIG_SAVER')) newBadges.push(BADGES_RULES[3]);
    if (categoriesCount > 0 && !earnedCodes.includes('CAT_MASTER')) newBadges.push(BADGES_RULES[4]);

    if (newBadges.length > 0) {
      for (const badge of newBadges) {
        await prisma.badge.create({
          data: { userId, code: badge.code, name: badge.name, description: badge.desc, icon: badge.icon }
        });
      }
      revalidatePath('/dashboard');
      return { success: true, newBadges };
    }
  } catch (error) { console.error("Erro gamificação:", error); }
}

export async function getBadgesAction() {
  const userId = await getUserId();
  if (!userId) return [];
  return await prisma.badge.findMany({ where: { userId }, orderBy: { earnedAt: 'desc' } });
}

// ==========================================
// 9. PLANEJAMENTO MENSAL
// ==========================================

export async function getMonthlyBudgetAction(month: number, year: number, targetUserId?: string) {
  const userId = await getUserId();
  if (!userId) return null;
  return await budgetService.getMonthlyBudgetService(userId, month, year, targetUserId);
}

export async function saveMonthlyBudgetAction(month: number, year: number, data: BudgetData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Não autorizado', success: false };

  try {
    await budgetService.saveMonthlyBudgetService(userId, month, year, data);
    revalidatePath('/dashboard');
    return { success: true, message: 'Planejamento salvo!', error: '' };
  } catch (error: any) {
    return { error: error.message, success: false };
  }
}

export async function generatePlanningAdviceAction(month: number, year: number) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error', success: false };

  try {
    const advice = await aiService.generatePlanningAdviceService(userId, month, year);
    return { success: true, message: advice, error: '' };
  } catch (error: any) {
    return { error: error.message, success: false };
  }
}

// ==========================================
// 10. GESTÃO DE PERFIL E SEGURANÇA
// ==========================================

export async function updateProfileNameAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Não autorizado' };

  const name = formData.get('name') as string;
  try {
    await userService.updateProfileNameService(userId, name);
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard');
    return { success: true, message: 'Nome atualizado!' };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updatePasswordAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  const validation = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!validation.success) return { error: validation.error.issues[0].message };

  try {
    await authService.updatePasswordService(userId, validation.data);
    return { success: true, message: 'Senha atualizada!' };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteAccountAction() {
  const userId = await getUserId();
  if (!userId) return { error: 'Não autorizado' };

  try {
    await userService.deleteAccountService(userId);
    const cookieStore = await cookies();
    cookieStore.delete('token');
    return { success: true };
  } catch (error) {
    return { error: 'Erro ao excluir conta.' };
  }
}

export async function forgotPasswordAction(formData: FormData) {
  const email = formData.get('email') as string;
  try {
    await authService.forgotPasswordService(email);
    return { success: true };
  } catch (error) {
    // Retorna sucesso para não vazar emails
    return { success: true };
  }
}

export async function resetPasswordAction(token: string, formData: FormData) {
  const password = formData.get('password') as string;
  try {
    await authService.resetPasswordService(token, password);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

// ==========================================
// 11. GESTÃO DE INVESTIMENTOS
// ==========================================

export async function addInvestmentAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  const rawData = Object.fromEntries(formData);
  const validation = investmentSchema.safeParse(rawData);

  if (!validation.success) return { error: validation.error.issues[0].message };

  try {
    await investmentService.createInvestmentService(userId, validation.data);
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard');
    return { success: true, message: 'Investimento realizado!' };
  } catch (error: any) {
    return { error: error.message || 'Erro ao processar.' };
  }
}

export async function redeemInvestmentAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  const id = formData.get('id') as string;
  const amount = parseFloat(formData.get('amount') as string);

  if (!id || isNaN(amount) || amount <= 0) return { error: 'Dados inválidos.' };

  try {
    await investmentService.redeemInvestmentService(userId, id, amount);
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard');
    return { success: true, message: `Resgate de R$ ${amount.toFixed(2)} realizado!` };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getInvestmentsAction() {
  const userId = await getUserId();
  if (!userId) return { myInvestments: [], partnerInvestments: [] };
  return await investmentService.getInvestmentsService(userId);
}

export async function updateInvestmentBalanceAction(id: string, newCurrentAmount: number) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  try {
    await investmentService.updateInvestmentBalanceService(userId, id, newCurrentAmount);
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard');
    return { success: true, message: 'Saldo atualizado!' };
  } catch (error) {
    return { error: 'Erro ao atualizar.' };
  }
}

export async function deleteInvestmentAction(id: string) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: 'Não autorizado' };

  try {
    await investmentService.deleteInvestmentService(userId, id);
    revalidateTag(`investments:${userId}`, 'default');
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard');
    return { success: true, message: 'Investimento removido e extrato estornado!' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// 12. MENSAGENS DO PARCEIRO
// ==========================================

export async function sendPartnerMessageAction(category: 'LOVE' | 'FINANCE' | 'ALERT', message: string) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  try {
    const { partnerId } = await userService.sendPartnerMessageService(userId, category, message);
    revalidateTag(`dashboard:${partnerId}`, 'default');
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard');
    return { success: true, message: 'Enviado!' };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getPartnerMessagesAction() {
  const userId = await getUserId();
  if (!userId) return [];
  return await userService.getPartnerMessagesService(userId);
}

// ==========================================
// 13. IMPORTAÇÃO E BULK
// ==========================================

export async function importLastMonthBudgetAction(targetMonth: number, targetYear: number) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error', success: false };

  try {
    await budgetService.importLastMonthBudgetService(userId, targetMonth, targetYear);
    revalidatePath('/dashboard');
    return { success: true, message: 'Dados importados com sucesso!' };
  } catch (error: any) {
    return { error: error.message, success: false };
  }
}

export async function deleteTransactionsAction(ids: string[]) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  try {
    const result = await prisma.transaction.deleteMany({
      where: { id: { in: ids }, userId: userId }
    });
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard');
    return { success: true, message: `${result.count} transações excluídas!` };
  } catch (error) {
    return { error: 'Erro ao excluir itens.' };
  }
}

// ==========================================
// 14. GESTÃO DE CARTÕES DE CRÉDITO
// ==========================================

import { creditCardSchema } from '@/lib/schemas';

export async function createCreditCardAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  const rawData = Object.fromEntries(formData);
  const validation = creditCardSchema.safeParse(rawData);
  if (!validation.success) return { error: validation.error.issues[0].message };

  try {
    await creditCardService.createCreditCardService(userId, validation.data);
    revalidatePath('/dashboard');
    return { success: true, message: 'Cartão adicionado!' };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function getCreditCardsAction() {
  const userId = await getUserId();
  if (!userId) return [];
  return await creditCardService.getCreditCardsService(userId);
}

export async function deleteCreditCardAction(id: string) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };
  try {
    await creditCardService.deleteCreditCardService(userId, id);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function payCreditCardBillAction(cardId: string, month: number, year: number) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  try {
    const res = await creditCardService.payCreditCardBillService(userId, cardId, month, year);
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard');
    return res;
  } catch (error: any) {
    return { error: error.message };
  }
}

// ==========================================
// 15. IMPORTAÇÃO CSV
// ==========================================

export async function createBulkTransactionsAction(transactions: any[]) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: 'Auth error' };

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, partnerId: true, name: true, partner: { select: { name: true } } }
    });

    const dataToCreate = transactions.map(t => {
      let targetUserId = userId;
      const ownerName = t.owner ? t.owner.toLowerCase().trim() : '';
      if (user?.partnerId && user.partner?.name && ownerName.includes(user.partner.name.toLowerCase().split(' ')[0])) {
        targetUserId = user.partnerId;
      }

      return {
        userId: targetUserId,
        description: t.description,
        amount: Number(t.amount),
        type: t.type,
        category: t.category || 'Outros',
        date: new Date(t.date),
        isPaid: t.status === 'Pago',
        paymentMethod: t.paymentMethod || 'DEBIT'
      };
    });

    await prisma.transaction.createMany({ data: dataToCreate });

    revalidateTag(`dashboard:${userId}`, 'default');
    if (user?.partnerId) revalidateTag(`dashboard:${user.partnerId}`, 'default');
    revalidatePath('/dashboard');

    return { success: true, count: dataToCreate.length };
  } catch (error) {
    return { success: false, error: 'Erro ao importar dados.' };
  }
}

// ==========================================
// 16. EXTRAS (Timeline, Chat, Import File)
// ==========================================

export async function getSubscriptionsAction() {
  const userId = await getUserId();
  if (!userId) return [];
  return await prisma.recurringTransaction.findMany({
    where: { userId, active: true },
    orderBy: { amount: 'desc' }
  });
}

export async function getFinancialProjectionAction() {
  const userId = await getUserId();
  if (!userId) return [];

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { partnerId: true } });
  const userIds = [userId];
  if (user?.partnerId) userIds.push(user.partnerId);

  const start = new Date();
  const end = addMonths(start, 12);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: { in: userIds },
      date: { gte: start, lte: end },
      type: 'EXPENSE'
    },
    select: { date: true, amount: true }
  });

  const projection: Record<string, number> = {};

  transactions.forEach(t => {
    const key = format(t.date, 'MM/yyyy');
    projection[key] = (projection[key] || 0) + Number(t.amount);
  });

  return Object.entries(projection)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => {
      const [ma, ya] = a.date.split('/').map(Number);
      const [mb, yb] = b.date.split('/').map(Number);
      return new Date(ya, ma - 1).getTime() - new Date(yb, mb - 1).getTime();
    });
}

export async function getTransactionChatAction(transactionId: string) {
  const userId = await getUserId();
  if (!userId) return [];

  const tag = `[TRX:${transactionId}]`;
  const messages = await prisma.partnerMessage.findMany({
    where: {
      OR: [
        { senderId: userId, message: { contains: tag } },
        { receiverId: userId, message: { contains: tag } }
      ]
    },
    orderBy: { createdAt: 'asc' },
    include: { sender: { select: { name: true } } }
  });

  return messages.map(m => ({
    ...m,
    message: m.message.replace(tag, '').trim()
  }));
}

export async function sendTransactionMessageAction(transactionId: string, text: string) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { partnerId: true } });
  if (!user?.partnerId) return { error: 'Sem parceiro.' };

  const tag = `[TRX:${transactionId}]`;
  const finalMessage = `${tag} ${text}`;

  await prisma.partnerMessage.create({
    data: {
      senderId: userId,
      receiverId: user.partnerId,
      category: 'FINANCE',
      message: finalMessage
    }
  });

  revalidateTag(`dashboard:${userId}`, 'default');
  return { success: true };
}

export async function importTransactionsCsvAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: 'Auth error' };

  const file = formData.get('file') as File;
  if (!file) return { success: false, error: 'Arquivo não encontrado.' };

  try {
    const text = await file.text();
    const lines = text.split('\n');
    const candidates = [];

    const startIndex = (lines[0]?.toLowerCase().includes('data') || lines[0]?.toLowerCase().includes('valor')) ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const parts = line.split(',');
      if (parts.length < 3) continue;

      const clean = (s: string) => s?.replace(/^"|"$/g, '').trim();

      const dateStr = clean(parts[0]);
      const description = clean(parts[1]);
      const amountStr = clean(parts[2]);

      if (!dateStr || !amountStr) continue;

      const [day, month, year] = dateStr.split('/').map(Number);
      if (!day || !month) continue;

      const currentYear = new Date().getFullYear();
      const finalYear = (year && year > 1900) ? year : currentYear;

      const dateObj = new Date(finalYear, month - 1, day);
      dateObj.setUTCHours(12, 0, 0, 0);

      const amount = parseFloat(amountStr);
      if (isNaN(amount)) continue;

      const type = amount < 0 ? 'EXPENSE' : 'INCOME';
      const finalAmount = Math.abs(amount);

      candidates.push({
        userId,
        description: description || 'Sem descrição',
        amount: finalAmount,
        type,
        category: 'Importado',
        date: dateObj,
        isPaid: true,
        paymentMethod: 'DEBIT'
      });
    }

    if (candidates.length === 0) {
      return { success: false, error: 'Nenhuma transação válida encontrada.' };
    }

    // Filtro de Duplicidade
    const timestamps = candidates.map(c => c.date.getTime());
    const minDate = new Date(Math.min(...timestamps));
    const maxDate = new Date(Math.max(...timestamps));

    const searchStart = new Date(minDate); searchStart.setDate(searchStart.getDate() - 1);
    const searchEnd = new Date(maxDate); searchEnd.setDate(searchEnd.getDate() + 1);

    const existingTransactions = await prisma.transaction.findMany({
      where: { userId, date: { gte: searchStart, lte: searchEnd } },
      select: { date: true, amount: true, description: true, type: true }
    });

    const transactionsToCreate = candidates.filter(candidate => {
      const cDate = candidate.date.toISOString().split('T')[0];
      const cAmount = Number(candidate.amount).toFixed(2);
      const cDesc = candidate.description.toLowerCase().replace(/[^a-z0-9]/g, '');

      const isDuplicate = existingTransactions.some(existing => {
        const eDate = existing.date.toISOString().split('T')[0];
        const eAmount = Number(existing.amount).toFixed(2);

        if (eDate !== cDate || eAmount !== cAmount || existing.type !== candidate.type) return false;

        const eDesc = existing.description.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (eDesc === cDesc) return true;
        if (cDesc.length > 3 && eDesc.includes(cDesc)) return true;
        if (eDesc.length > 3 && cDesc.includes(eDesc)) return true;

        return false;
      });

      return !isDuplicate;
    });

    if (transactionsToCreate.length === 0) {
      return { success: true, count: 0, message: 'Todas as transações já existem no sistema.' };
    }

    await prisma.transaction.createMany({ data: transactionsToCreate });

    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard');

    const ignoredCount = candidates.length - transactionsToCreate.length;
    let msg = `${transactionsToCreate.length} importadas com sucesso!`;
    if (ignoredCount > 0) msg += ` (${ignoredCount} duplicadas ignoradas)`;

    return { success: true, count: transactionsToCreate.length, message: msg };

  } catch (error) {
    return { success: false, error: 'Erro ao processar arquivo.' };
  }
}