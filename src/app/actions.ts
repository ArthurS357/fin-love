'use server'
import 'server-only';

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { revalidatePath, revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { addMonths, isBefore, setDate } from 'date-fns'
import { randomBytes, randomUUID } from 'crypto'
import { sendPasswordResetEmail } from '@/lib/mail'

import {
  registerSchema,
  loginSchema,
  transactionSchema,
  categorySchema,
  partnerSchema,
  spendingLimitSchema,
  passwordSchema,
  budgetDataSchema
} from '@/lib/schemas'

import { getUserId, JWT_SECRET } from '@/lib/auth';

type ActionState = {
  success: boolean
  error: string
  message?: string
  details?: string
}

// ==========================================
// FUNÇÃO AUXILIAR: IA COM FALLBACK
// ==========================================
// Tenta múltiplos modelos caso o principal falhe (404, sobrecarga, etc)
async function generateSmartAdvice(apiKey: string, prompt: string) {
  const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
  const genAI = new GoogleGenerativeAI(apiKey);

  let lastError;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error: any) {
      console.warn(`[IA] Falha ao tentar modelo ${modelName}:`, error.message);
      lastError = error;

      // Se o erro for de autenticação (API Key inválida), não adianta tentar outros
      if (error.message?.includes('API key') || error.message?.includes('403')) {
        throw new Error('Chave de API inválida ou sem permissão.');
      }
      // Se não for erro de chave, continua para o próximo modelo do loop
    }
  }

  // Se saiu do loop, todos falharam
  throw lastError;
}

// ==========================================
// 1. AUTENTICAÇÃO (AUTH)
// ==========================================

export async function registerUser(prevState: any, formData: FormData): Promise<ActionState> {
  const data = Object.fromEntries(formData)
  const validation = registerSchema.safeParse(data)

  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message }
  }

  const { name, email, password } = validation.data

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) return { success: false, error: 'Email já em uso.' }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, spendingLimit: 2000 },
    })

    const token = await new SignJWT({ sub: user.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(JWT_SECRET)

    const cookieStore = await cookies()
    cookieStore.set('token', token, { httpOnly: true, path: '/' })

    return { success: true, error: '' }
  } catch {
    return { success: false, error: 'Erro ao criar conta.' }
  }
}

export async function loginUser(prevState: any, formData: FormData): Promise<ActionState> {
  const data = Object.fromEntries(formData)
  const validation = loginSchema.safeParse(data)

  if (!validation.success) {
    return { success: false, error: validation.error.issues[0].message }
  }

  const { email, password } = validation.data

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return { success: false, error: 'Credenciais inválidas.' }
    }

    const token = await new SignJWT({ sub: user.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(JWT_SECRET)

    const cookieStore = await cookies()
    cookieStore.set('token', token, { httpOnly: true, path: '/' })

    return { success: true, error: '' }
  } catch {
    return { success: false, error: 'Erro ao entrar.' }
  }
}

export async function logoutUser() {
  const cookieStore = await cookies()
  cookieStore.delete('token')
  redirect('/login')
}

// ==========================================
// 2. TRANSAÇÕES (CRUD + PARCELAMENTO)
// ==========================================

export async function addTransaction(formData: FormData) {
  const userId = await getUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  const rawData = Object.fromEntries(formData);
  const validation = transactionSchema.safeParse(rawData);

  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const {
    description,
    amount,
    type,
    category,
    date,
    paymentMethod,
    installments,
    isRecurring,
    recurringDay
  } = validation.data;

  const baseDate = date ? new Date(date) : new Date();

  try {
    // 1. Lógica de Parcelamento (Cartão de Crédito) com GROUP ID
    if (type === 'EXPENSE' && paymentMethod === 'CREDIT' && installments && installments > 1) {

      const installmentId = randomUUID();
      const transactionsToCreate = [];

      const totalCents = Math.round(amount * 100);
      const installmentValueCents = Math.floor(totalCents / installments);
      const remainderCents = totalCents % installments;

      for (let i = 0; i < installments; i++) {
        const futureDate = addMonths(baseDate, i);

        const isLast = i === installments - 1;
        const currentAmount = (installmentValueCents + (isLast ? remainderCents : 0)) / 100;

        transactionsToCreate.push({
          userId,
          description: `${description} (${i + 1}/${installments})`,
          amount: currentAmount,
          type,
          category,
          date: futureDate,
          paymentMethod: 'CREDIT',
          installments,
          currentInstallment: i + 1,
          isPaid: false,
          installmentId
        });
      }
      await prisma.transaction.createMany({ data: transactionsToCreate });
    }

    // 2. Lógica Padrão (À vista/Débito)
    else {
      await prisma.transaction.create({
        data: {
          userId,
          description,
          amount,
          type,
          category,
          date: baseDate,
          paymentMethod: paymentMethod || 'DEBIT',
          isPaid: paymentMethod !== 'CREDIT'
        },
      })
    }

    // 3. Lógica de Recorrência (Assinaturas)
    if (isRecurring === 'true' || isRecurring === 'on') {
      let nextRun = addMonths(baseDate, 1);
      if (recurringDay) {
        nextRun = setDate(nextRun, recurringDay);
      }

      await prisma.recurringTransaction.create({
        data: {
          userId,
          type,
          amount,
          description,
          category,
          frequency: 'MONTHLY',
          nextRun,
          dayOfMonth: recurringDay
        }
      })
    }

    await checkBadgesAction()

    revalidateTag(`dashboard:${userId}`, 'max');
    revalidatePath('/dashboard');

    return { success: true }
  } catch (error) {
    console.error(error);
    return { error: 'Erro ao salvar transação.' }
  }
}

export async function updateTransaction(formData: FormData) {
  const userId = await getUserId()
  if (!userId) return { error: 'Auth error' }

  const id = formData.get('id') as string
  const rawData = Object.fromEntries(formData)
  const validation = transactionSchema.safeParse(rawData)

  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const existingTransaction = await prisma.transaction.findUnique({ where: { id } });
  if (!existingTransaction || existingTransaction.userId !== userId) {
    return { error: 'Não autorizado ou transação não encontrada.' };
  }

  const { type, amount, description, category, date } = validation.data

  await prisma.transaction.update({
    where: { id },
    data: {
      type: type as any,
      amount,
      description,
      category,
      date: date ? new Date(date) : undefined
    },
  })

  revalidateTag(`dashboard:${userId}`, 'max');
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteTransaction(id: string) {
  const userId = await getUserId()
  if (!userId) return { error: 'Auth error' }

  const transaction = await prisma.transaction.findUnique({ where: { id } });
  if (!transaction || transaction.userId !== userId) {
    return { error: 'Não autorizado.' };
  }

  await prisma.transaction.delete({ where: { id } })

  revalidateTag(`dashboard:${userId}`, 'max');
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteInstallmentGroupAction(installmentId: string) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  try {
    await prisma.transaction.deleteMany({
      where: {
        installmentId: installmentId,
        userId: userId
      }
    });

    revalidateTag(`dashboard:${userId}`, 'max');
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

  revalidateTag(`dashboard:${userId}`, 'max');
  revalidatePath('/dashboard');
}

// ==========================================
// 3. RESUMO FINANCEIRO
// ==========================================

export async function getFinancialSummaryAction() {
  const userId = await getUserId();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { partnerId: true }
  });

  const userIds = [userId];
  if (user?.partnerId) userIds.push(user.partnerId);

  const summary = await prisma.transaction.groupBy({
    by: ['type'],
    where: { userId: { in: userIds } },
    _sum: { amount: true }
  });

  const totalIncome = Number(summary.find(s => s.type === 'INCOME')?._sum.amount || 0);
  const totalExpense = Number(summary.find(s => s.type === 'EXPENSE')?._sum.amount || 0);
  const totalInvested = Number(summary.find(s => s.type === 'INVESTMENT')?._sum.amount || 0);

  const accumulatedBalance = totalIncome - totalExpense - totalInvested;

  return { accumulatedBalance };
}

// ==========================================
// 4. PARCEIRO & METAS
// ==========================================

export async function linkPartnerAction(formData: FormData) {
  const userId = await getUserId()
  if (!userId) return { error: 'Auth error' }

  const validation = partnerSchema.safeParse({ email: formData.get('email') })
  if (!validation.success) return { error: validation.error.issues[0].message }

  const { email } = validation.data

  try {
    const me = await prisma.user.findUnique({ where: { id: userId } })
    if (!me) return { error: 'Usuário não encontrado.' }

    const partner = await prisma.user.findUnique({ where: { email } })
    if (!partner || partner.partnerId || me.partnerId || me.email === email) return { error: 'Parceiro inválido ou já conectado.' }

    await prisma.$transaction([
      prisma.user.update({ where: { id: me.id }, data: { partnerId: partner.id } }),
      prisma.user.update({ where: { id: partner.id }, data: { partnerId: me.id } })
    ])

    await checkBadgesAction()

    revalidateTag(`dashboard:${userId}`, 'max');
    revalidateTag(`dashboard:${partner.id}`, 'max');
    revalidatePath('/dashboard')

    return { success: true, message: 'Conectado!' }
  } catch { return { error: 'Erro ao conectar.' } }
}

export async function unlinkPartnerAction() {
  const userId = await getUserId()
  if (!userId) return { error: 'Auth error' }
  try {
    const me = await prisma.user.findUnique({ where: { id: userId } })
    if (!me || !me.partnerId) return { error: 'Sem conexão ativa.' }

    const partnerId = me.partnerId;

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { partnerId: null } }),
      prisma.user.update({ where: { id: me.partnerId }, data: { partnerId: null } })
    ])

    revalidateTag(`dashboard:${userId}`, 'max');
    revalidateTag(`dashboard:${partnerId}`, 'max');
    revalidatePath('/dashboard')

    return { success: true, message: 'Desconectado.' }
  } catch { return { error: 'Erro.' } }
}

export async function updateSpendingLimitAction(formData: FormData) {
  const userId = await getUserId()
  if (!userId) return { error: 'Auth error' }

  const validation = spendingLimitSchema.safeParse({ limit: formData.get('limit') })
  if (!validation.success) return { error: validation.error.issues[0].message }

  await prisma.user.update({ where: { id: userId }, data: { spendingLimit: validation.data.limit } })

  revalidateTag(`dashboard:${userId}`, 'max');
  revalidatePath('/dashboard')
  return { success: true, message: 'Limite atualizado!' }
}

export async function addSavingsAction(formData: FormData) {
  const userId = await getUserId()
  if (!userId) return { error: 'Auth error' }

  const amount = parseFloat(formData.get('amount') as string)
  if (isNaN(amount) || amount <= 0) return { error: 'Valor inválido.' }

  const description = formData.get('description') as string || 'Caixinha'

  await prisma.transaction.create({
    data: { userId, type: 'INVESTMENT', amount, description, category: 'Caixinha', date: new Date() }
  })

  await checkBadgesAction()

  revalidateTag(`dashboard:${userId}`, 'max');
  revalidatePath('/dashboard')
  return { success: true, message: 'Valor guardado!' }
}

export async function updateSavingsGoalNameAction(formData: FormData) {
  const userId = await getUserId()
  if (!userId) return { error: 'Auth error' }
  const name = formData.get('name') as string
  if (!name) return { error: 'Nome inválido' }

  const me = await prisma.user.findUnique({ where: { id: userId } })
  if (!me) return { error: 'Usuário não encontrado' }

  await prisma.user.update({ where: { id: userId }, data: { savingsGoal: name } })

  if (me.partnerId) {
    await prisma.user.update({ where: { id: me.partnerId }, data: { savingsGoal: name } })
    revalidateTag(`dashboard:${me.partnerId}`, 'max');
  }

  revalidateTag(`dashboard:${userId}`, 'max');
  revalidatePath('/dashboard')
  return { success: true, message: 'Meta atualizada!' }
}

// ==========================================
// 5. INTELIGÊNCIA ARTIFICIAL (GERAL) - COM FALLBACK
// ==========================================

export async function generateFinancialAdviceAction() {
  const userId = await getUserId()
  if (!userId) return { success: false, error: 'Auth error' }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return { success: false, error: 'Chave de API da IA não configurada.' };

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { partner: true }
    })

    if (!user) return { success: false, error: 'Usuário não encontrado.' }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (user.lastAdvice && user.lastAdviceDate && user.lastAdviceDate > oneDayAgo) {
      return { success: true, message: user.lastAdvice };
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: { in: [userId, user.partnerId || ''].filter(Boolean) },
        date: { gte: thirtyDaysAgo }
      },
      orderBy: { date: 'desc' },
      take: 50
    })

    if (transactions.length === 0) return { success: false, error: 'Sem dados suficientes.' }

    const txSummary = transactions.map(t => `- ${t.description} (${t.category}): R$ ${Number(t.amount)} [${t.type}]`).join('\n')

    const prompt = `Analise estas transações de um casal/pessoa:\n${txSummary}\nMeta: R$ ${Number(user.spendingLimit)}. Responda em Markdown curto com: Onde foi o dinheiro, Pontos de Atenção e Dica de Ouro. Tom amigável e direto.`;

    // USANDO FUNÇÃO COM FALLBACK
    const adviceText = await generateSmartAdvice(apiKey, prompt);

    await prisma.user.update({
      where: { id: userId },
      data: {
        lastAdvice: adviceText,
        lastAdviceDate: new Date()
      }
    });

    return { success: true, message: adviceText }
  } catch (error: any) {
    console.error("Erro na IA Geral:", error);
    return { success: false, error: 'IA indisponível no momento. Tente mais tarde.' }
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

  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const { name, color, icon, type } = validation.data;
  const finalIcon = icon || 'Tag';
  const finalType = type || 'EXPENSE';

  try {
    await prisma.category.create({
      data: {
        userId,
        name,
        color,
        icon: finalIcon,
        type: finalType
      }
    });
    await checkBadgesAction()

    revalidateTag(`dashboard:${userId}`, 'max');
    revalidatePath('/dashboard');
    return { success: true, message: 'Categoria criada!' };
  } catch (err) {
    console.error(err);
    return { error: 'Erro ao criar categoria.' };
  }
}

export async function deleteCategoryAction(id: string) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  await prisma.category.delete({ where: { id, userId } });

  revalidateTag(`dashboard:${userId}`, 'max');
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

      while (
        (isBefore(runDate, now) || runDate.getTime() <= now.getTime()) &&
        safetyCounter < MAX_MONTHS_LOOKAHEAD
      ) {
        newTransactions.push({
          userId,
          type: rec.type,
          amount: rec.amount,
          description: `${rec.description} (Auto)`,
          category: rec.category,
          date: new Date(runDate)
        });

        runDate = addMonths(runDate, 1);
        if (rec.dayOfMonth) {
          runDate = setDate(runDate, rec.dayOfMonth);
        }

        safetyCounter++;
      }

      updates.push(
        prisma.recurringTransaction.update({
          where: { id: rec.id },
          data: { nextRun: runDate }
        })
      );
    }

    if (newTransactions.length > 0) {
      await prisma.transaction.createMany({
        data: newTransactions
      });
      revalidateTag(`dashboard:${userId}`, 'max');
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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { transactions: true, badges: true, categories: true }
    });

    if (!user) return;

    const earnedCodes = user.badges.map(b => b.code);
    const newBadges = [];

    if (user.transactions.length > 0 && !earnedCodes.includes('FIRST_TRX')) {
      newBadges.push(BADGES_RULES.find(b => b.code === 'FIRST_TRX')!);
    }
    if (user.partnerId && !earnedCodes.includes('COUPLE_GOALS')) {
      newBadges.push(BADGES_RULES.find(b => b.code === 'COUPLE_GOALS')!);
    }

    const hasInvestment = user.transactions.some(t => t.type === 'INVESTMENT');
    if (hasInvestment && !earnedCodes.includes('SAVER_1')) {
      newBadges.push(BADGES_RULES.find(b => b.code === 'SAVER_1')!);
    }

    const totalSaved = user.transactions
      .filter(t => t.type === 'INVESTMENT')
      .reduce((acc, t) => acc + Number(t.amount), 0);

    if (totalSaved >= 1000 && !earnedCodes.includes('BIG_SAVER')) {
      newBadges.push(BADGES_RULES.find(b => b.code === 'BIG_SAVER')!);
    }

    if (user.categories.length > 0 && !earnedCodes.includes('CAT_MASTER')) {
      newBadges.push(BADGES_RULES.find(b => b.code === 'CAT_MASTER')!);
    }

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
// 9. PLANEJAMENTO MENSAL (BUDGET + IA) - COM FALLBACK
// ==========================================

export type BudgetItem = {
  id: string;
  name: string;
  amount: number;
};

export type BudgetData = {
  incomes: BudgetItem[];
  fixedExpenses: BudgetItem[];
  variableExpenses: BudgetItem[];
};

export async function getMonthlyBudgetAction(month: number, year: number, targetUserId?: string) {
  const currentUserId = await getUserId();
  if (!currentUserId) return null;

  let userIdToFetch = currentUserId;

  if (targetUserId && targetUserId !== currentUserId) {
    const me = await prisma.user.findUnique({ where: { id: currentUserId } });
    if (me?.partnerId === targetUserId) {
      userIdToFetch = targetUserId;
    } else {
      return null;
    }
  }

  try {
    const budget = await prisma.monthlyBudget.findUnique({
      where: {
        userId_month_year: { userId: userIdToFetch, month, year }
      }
    });

    const emptyBudget: BudgetData = { incomes: [], fixedExpenses: [], variableExpenses: [] };

    if (!budget || !budget.data) {
      return emptyBudget;
    }

    const validation = budgetDataSchema.safeParse(budget.data);

    if (!validation.success) {
      console.error("ALERTA: Dados de planejamento inválidos:", validation.error);
      return emptyBudget;
    }

    return validation.data as BudgetData;

  } catch (error) {
    console.error("Erro ao buscar planejamento:", error);
    return null;
  }
}

export async function saveMonthlyBudgetAction(month: number, year: number, data: BudgetData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Não autorizado', success: false };

  try {
    await prisma.monthlyBudget.upsert({
      where: {
        userId_month_year: { userId, month, year }
      },
      update: {
        data: data as unknown as Prisma.InputJsonValue
      },
      create: {
        userId,
        month,
        year,
        data: data as unknown as Prisma.InputJsonValue
      }
    });

    revalidatePath('/dashboard');
    return { success: true, message: 'Planejamento salvo com sucesso!', error: '' };
  } catch (error) {
    console.error("Erro ao salvar planejamento:", error);
    return { error: 'Erro ao salvar.', success: false };
  }
}

export async function generatePlanningAdviceAction(month: number, year: number) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error', success: false };

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("GOOGLE_API_KEY não configurada");
    return { error: 'Configuração de IA ausente no servidor.', success: false };
  }

  try {
    const budget = await prisma.monthlyBudget.findUnique({
      where: { userId_month_year: { userId, month, year } }
    });

    if (!budget || !budget.data) {
      return { error: 'Nenhum planejamento encontrado para analisar.', success: false };
    }

    const validation = budgetDataSchema.safeParse(budget.data);
    if (!validation.success) {
      console.error("Erro de validação Zod:", JSON.stringify(validation.error.format(), null, 2));
      return { error: 'Dados inconsistentes. Salve o planejamento novamente.', success: false };
    }

    const data = validation.data;
    const itemCount = data.fixedExpenses.length + data.variableExpenses.length;

    if (itemCount < 5) {
      return {
        error: 'Poucos dados',
        details: 'Adicione pelo menos 5 despesas para a IA analisar.',
        success: false
      };
    }

    const fmt = (val: number) => `R$ ${Number(val).toFixed(2)}`;
    const incomeStr = data.incomes.map(i => `${i.name}: ${fmt(i.amount)}`).join(', ');
    const fixedStr = data.fixedExpenses.map(i => `${i.name}: ${fmt(i.amount)}`).join(', ');
    const varStr = data.variableExpenses.map(i => `${i.name}: ${fmt(i.amount)}`).join(', ');

    const prompt = `
      Atue como um consultor financeiro pessoal. Analise este planejamento mensal:
      [ENTRADAS]: ${incomeStr || "Nenhuma"}
      [GASTOS FIXOS]: ${fixedStr || "Nenhum"}
      [GASTOS DIVERSOS]: ${varStr || "Nenhum"}
      
      Responda em Markdown (max 3 parágrafos):
      1. Identifique se o orçamento está saudável (sobra ou falta?).
      2. Aponte explicitamente onde é possível economizar.
      3. Dê uma nota de 0 a 10 para este planejamento.
      Seja direto e motivador.
    `;

    // USANDO FUNÇÃO COM FALLBACK
    const adviceText = await generateSmartAdvice(apiKey, prompt);

    return { success: true, message: adviceText, error: '' };

  } catch (error: any) {
    console.error("Erro CRÍTICO na IA de Planejamento:", error);
    return { error: `Erro na IA: ${error.message || 'Serviço indisponível no momento.'}`, success: false };
  }
}

// ==========================================
// 10. GESTÃO DE PERFIL E SEGURANÇA
// ==========================================

export async function updateProfileNameAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Não autorizado' };

  const name = formData.get('name') as string;
  if (!name || name.length < 3) return { error: 'Nome inválido.' };

  await prisma.user.update({ where: { id: userId }, data: { name } });
  revalidatePath('/dashboard');
  return { success: true, message: 'Nome atualizado!' };
}

export async function updatePasswordAction(formData: FormData) {
  const userId = await getUserId()
  if (!userId) return { error: 'Auth error' }

  const validation = passwordSchema.safeParse(Object.fromEntries(formData))
  if (!validation.success) return { error: validation.error.issues[0].message }

  const { currentPassword, newPassword } = validation.data

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) return { error: 'Senha atual incorreta.' }

  const hashed = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } })
  return { success: true, message: 'Senha atualizada!' }
}

export async function deleteAccountAction() {
  const userId = await getUserId();
  if (!userId) return { error: 'Não autorizado' };

  try {
    await prisma.user.delete({ where: { id: userId } });

    const cookieStore = await cookies();
    cookieStore.delete('token');

    return { success: true };
  } catch (error) {
    return { error: 'Erro ao excluir conta.' };
  }
}

export async function forgotPasswordAction(formData: FormData) {
  const email = formData.get('email') as string;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { success: true };

  const token = randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 3600000); // 1 hora

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpiry: expiry }
  });

  await sendPasswordResetEmail(email, token);

  return { success: true };
}

export async function resetPasswordAction(token: string, formData: FormData) {
  const password = formData.get('password') as string;
  if (password.length < 6) return { error: 'A senha deve ter no mínimo 6 caracteres.' };

  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gt: new Date() }
    }
  });

  if (!user) return { error: 'Link inválido ou expirado.' };

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null
    }
  });

  return { success: true };
}