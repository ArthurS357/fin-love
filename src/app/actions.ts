'use server'
import 'server-only';

import { prisma } from '@/lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { addMonths, isBefore, setDate, subMonths, startOfMonth, endOfMonth, format } from 'date-fns'
import { randomBytes, randomUUID } from 'crypto'
import { sendPasswordResetEmail } from '@/lib/mail'
import { investmentSchema } from '@/lib/schemas';

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

// --- TIPOS ---
import type { BudgetData, BudgetItem } from '@/lib/schemas';
export type { BudgetData, BudgetItem };

import { getUserId, JWT_SECRET } from '@/lib/auth';

type ActionState = {
  success: boolean
  error: string
  message?: string
  details?: string
  data?: any
}

// ==========================================
// FUNÇÃO AUXILIAR: IA COM FALLBACK (GEMINI 2.0)
// ==========================================
async function generateSmartAdvice(apiKey: string, prompt: string) {
  const modelsToTry = ["gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
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

      if (error.message?.includes('API key') || error.message?.includes('403')) {
        throw new Error('Chave de API inválida ou sem permissão.');
      }
    }
  }
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
// 2. TRANSAÇÕES (CRUD + PARCELAMENTO) - ATUALIZADO
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
    recurringDay,
    creditCardId
  } = validation.data;

  // --- CORREÇÃO DE FUSO HORÁRIO (Timezone Fix) ---
  // Forçamos o horário para 12:00 UTC.
  // Isso evita que 00:00 UTC vire "Ontem às 21:00" no Brasil (UTC-3).
  let baseDate = new Date();
  if (date) {
    baseDate = new Date(date);
    baseDate.setUTCHours(12, 0, 0, 0);
  }
  // -----------------------------------------------

  // --- LÓGICA DE CARTÃO DE CRÉDITO ---
  let finalIsPaid = true; // Padrão: Pago (Débito/Pix)

  if (paymentMethod === 'CREDIT') {
    finalIsPaid = false; // Crédito nasce Pendente

    // Se tiver cartão, verifica fechamento
    if (creditCardId) {
      try {
        const card = await prisma.creditCard.findUnique({ where: { id: creditCardId } });
        if (card) {
          // Se a compra for feita DEPOIS ou NO DIA do fechamento, joga para o próximo mês
          if (baseDate.getDate() >= card.closingDay) {
            baseDate = addMonths(baseDate, 1);
            // Mantém o horário seguro de meio-dia ao avançar o mês
            baseDate.setUTCHours(12, 0, 0, 0);
          }
        }
      } catch (e) {
        console.error("Erro ao buscar cartão:", e);
      }
    }
  }

  try {
    // 1. LÓGICA DE PARCELAMENTO
    if (type === 'EXPENSE' && paymentMethod === 'CREDIT' && installments && installments > 1) {
      const installmentId = randomUUID();
      const transactionsToCreate = [];
      const totalCents = Math.round(amount * 100);
      const installmentValueCents = Math.floor(totalCents / installments);
      const remainderCents = totalCents % installments;

      for (let i = 0; i < installments; i++) {
        const futureDate = addMonths(baseDate, i);
        // Garante que as parcelas futuras também fiquem no meio-dia UTC
        futureDate.setUTCHours(12, 0, 0, 0);

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
          installmentId,
          creditCardId: creditCardId || null
        });
      }
      await prisma.transaction.createMany({ data: transactionsToCreate });

    } else {
      // 2. TRANSAÇÃO ÚNICA
      await prisma.transaction.create({
        data: {
          userId,
          description,
          amount,
          type,
          category,
          date: baseDate,
          paymentMethod: paymentMethod || 'DEBIT',
          isPaid: finalIsPaid,
          creditCardId: creditCardId || null
        },
      })
    }

    // 3. RECORRÊNCIA
    if (isRecurring === 'true' || isRecurring === 'on') {
      let nextRun = addMonths(baseDate, 1);
      nextRun.setUTCHours(12, 0, 0, 0); // Segurança na recorrência também

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
    revalidateTag(`dashboard:${userId}`, 'default');
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

  if (!validation.success) return { error: validation.error.issues[0].message }

  const existingTransaction = await prisma.transaction.findUnique({ where: { id } });
  if (!existingTransaction || existingTransaction.userId !== userId) {
    return { error: 'Não autorizado.' };
  }

  const { type, amount, description, category, date, creditCardId, isPaid } = validation.data

  // --- CORREÇÃO DE FUSO HORÁRIO NA EDIÇÃO ---
  let finalDate = undefined;
  if (date) {
    finalDate = new Date(date);
    finalDate.setUTCHours(12, 0, 0, 0);
  }
  // ------------------------------------------

  await prisma.transaction.update({
    where: { id },
    data: {
      type: type as any,
      amount,
      description,
      category,
      date: finalDate, // Usa a data corrigida
      creditCardId: creditCardId || null,
      isPaid: isPaid
    },
  })

  revalidateTag(`dashboard:${userId}`, 'default');
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteTransaction(id: string) {
  const userId = await getUserId()
  if (!userId) return { error: 'Auth error' }
  const transaction = await prisma.transaction.findUnique({ where: { id } });
  if (!transaction || transaction.userId !== userId) return { error: 'Não autorizado.' };

  await prisma.transaction.delete({ where: { id } })

  revalidateTag(`dashboard:${userId}`, 'default');
  revalidatePath('/dashboard')
  return { success: true }
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

export async function getFinancialSummaryAction() {
  const userId = await getUserId();
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { partnerId: true } });
  const userIds = [userId];
  if (user?.partnerId) userIds.push(user.partnerId);

  // 1. Resumo Geral (Saldo Acumulado)
  const summary = await prisma.transaction.groupBy({
    by: ['type'],
    where: { userId: { in: userIds } },
    _sum: { amount: true }
  });

  const totalIncome = Number(summary.find(s => s.type === 'INCOME')?._sum.amount || 0);
  const totalExpense = Number(summary.find(s => s.type === 'EXPENSE')?._sum.amount || 0);
  const totalInvested = Number(summary.find(s => s.type === 'INVESTMENT')?._sum.amount || 0);
  const accumulatedBalance = totalIncome - totalExpense - totalInvested;

  // 2. NOVO: Soma das Faturas em Aberto (Cartão de Crédito)
  // Soma tudo que é Despesa, no Crédito e ainda não foi pago (isPaid: false)
  const creditSummary = await prisma.transaction.aggregate({
    where: {
      userId: { in: userIds },
      type: 'EXPENSE',
      paymentMethod: 'CREDIT',
      isPaid: false
    },
    _sum: { amount: true }
  });

  const totalCreditOpen = Number(creditSummary._sum.amount || 0);

  return { accumulatedBalance, totalCreditOpen };
}

// --- COMPARATIVO MENSAL (MELHORIA 2) ---
export async function getMonthlyComparisonAction(month: number, year: number) {
  const userId = await getUserId();
  if (!userId) return { success: false, data: null };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { partnerId: true } });
  const userIds = [userId, user?.partnerId].filter(Boolean) as string[];

  // Datas
  const currentDate = new Date(year, month, 1);
  const prevDate = subMonths(currentDate, 1);

  // Helper de cálculo
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

    // Cálculo da Variação
    let diffPercent = 0;
    if (prevTotal > 0) {
      diffPercent = ((currentTotal - prevTotal) / prevTotal) * 100;
    } else if (currentTotal > 0) {
      diffPercent = 100; // Se antes era 0 e agora gastou, aumentou 100% (simbólico)
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

// --- EXPORTAR CSV (COM DADOS DO CASAL + SEGURANÇA) ---
export async function exportTransactionsCsvAction(month: number, year: number) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: 'Auth error' };

  // 1. Busca o parceiro para incluir no relatório (Consistência)
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
        userId: { in: userIds }, // Agora busca de ambos!
        date: { gte: start, lte: end }
      },
      orderBy: { date: 'desc' },
      include: { user: { select: { name: true } } } // Inclui nome para identificar de quem é
    });

    // 2. Função de Sanitização (Segurança contra CSV Injection)
    const safeString = (str: string) => {
      if (!str) return '';
      let clean = str.replace(/,/g, ' ').replace(/\n/g, ' '); // Remove vírgulas e quebras
      // Se começar com caracteres de fórmula, adiciona aspas simples para forçar texto
      if (/^[=+\-@]/.test(clean)) {
        return `'${clean}`;
      }
      return clean;
    };

    // Cabeçalho CSV
    const header = "Data,Quem,Descrição,Categoria,Tipo,Valor,Status\n";

    // Linhas
    const rows = transactions.map(t => {
      const dateStr = format(t.date, 'dd/MM/yyyy');
      // Identifica se é do usuário ou do parceiro
      const ownerName = t.userId === userId ? 'Você' : (t.user?.name?.split(' ')[0] || 'Parceiro');

      const amountStr = t.amount.toFixed(2).replace('.', ',');
      const status = t.isPaid ? 'Pago' : 'Pendente';

      // Aplica sanitização
      const desc = safeString(t.description);
      const cat = safeString(t.category);

      return `${dateStr},${ownerName},${desc},${cat},${t.type},${amountStr},${status}`;
    }).join('\n');

    return { success: true, csv: header + rows };
  } catch (error) {
    console.error("Erro export CSV:", error);
    return { success: false, error: 'Erro ao gerar arquivo.' };
  }
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
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidateTag(`dashboard:${partner.id}`, 'default');
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

    revalidateTag(`dashboard:${userId}`, 'default');
    revalidateTag(`dashboard:${partnerId}`, 'default');
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
  revalidateTag(`dashboard:${userId}`, 'default');
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
  revalidateTag(`dashboard:${userId}`, 'default');
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
    revalidateTag(`dashboard:${me.partnerId}`, 'default');
  }
  revalidateTag(`dashboard:${userId}`, 'default');
  revalidatePath('/dashboard')
  return { success: true, message: 'Meta atualizada!' }
}

// ==========================================
// 5. INTELIGÊNCIA ARTIFICIAL (GERAL, HISTÓRICO & TONE)
// ==========================================

// --- BUSCAR HISTÓRICO ---
export async function getAiHistoryAction(context: string = 'GENERAL') {
  const userId = await getUserId();
  if (!userId) return [];

  try {
    const history = await prisma.aiChat.findMany({
      where: { userId, context },
      orderBy: { createdAt: 'asc' },
      take: 50
    });
    return history;
  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
    return [];
  }
}

// --- LIMPAR HISTÓRICO (DO PASSO ANTERIOR) ---
export async function clearAiHistoryAction(context: string = 'GENERAL') {
  const userId = await getUserId();
  if (!userId) return { success: false, error: 'Auth error' };
  try {
    await prisma.aiChat.deleteMany({ where: { userId, context } });
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Erro ao limpar histórico.' };
  }
}

// --- ATUALIZADO: GERAR CONSELHO COM TONE (MELHORIA 1) ---
export async function generateFinancialAdviceAction(tone: string = 'FRIENDLY') {
  const userId = await getUserId()
  if (!userId) return { success: false, error: 'Auth error' }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return { success: false, error: 'Chave de API não configurada.' };

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { partner: true }
    })
    if (!user) return { success: false, error: 'Usuário não encontrado.' }

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

    // Lógica de Personalidade
    let personalityInstruction = "";
    switch (tone) {
      case 'STRICT': // Auditor
        personalityInstruction = "Aja como um auditor financeiro rigoroso e sério. Seja direto, aponte erros sem rodeios e foque em corte de gastos, eficiência e compliance.";
        break;
      case 'COACH': // Motivacional
        personalityInstruction = "Aja como um coach financeiro motivacional e energético. Use emojis, celebre pequenas vitórias e inspire o usuário a guardar dinheiro para o futuro com entusiasmo.";
        break;
      case 'POETIC': // Filósofo
        personalityInstruction = "Responda de forma poética e filosófica, usando metáforas sobre o dinheiro, o tempo e a vida.";
        break;
      case 'FRIENDLY': // Padrão
      default:
        personalityInstruction = "Aja como um amigo conselheiro, tom leve, empático e prestativo.";
        break;
    }

    const prompt = `
      ${personalityInstruction}
      Analise estas transações de um casal/pessoa:
      ${txSummary}
      Meta de Gastos (Limite): R$ ${Number(user.spendingLimit)}.
      Responda em Markdown curto. Estrutura obrigatória: "Onde foi o dinheiro", "Pontos de Atenção" e "Dica de Ouro".
    `;

    const adviceText = await generateSmartAdvice(apiKey, prompt);

    await prisma.aiChat.create({
      data: {
        userId,
        role: 'model',
        message: adviceText,
        context: 'GENERAL'
      }
    });

    // Legado
    await prisma.user.update({
      where: { id: userId },
      data: { lastAdvice: adviceText, lastAdviceDate: new Date() }
    });

    revalidatePath('/dashboard');
    return { success: true, message: adviceText }
  } catch (error: any) {
    console.error("Erro na IA Geral:", error);
    return { success: false, error: 'IA indisponível no momento.' }
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
  const finalIcon = icon || 'Tag';
  const finalType = type || 'EXPENSE';

  try {
    await prisma.category.create({
      data: { userId, name, color, icon: finalIcon, type: finalType }
    });
    await checkBadgesAction()
    revalidateTag(`dashboard:${userId}`, 'default');
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
    // 1. Busca dados otimizados em paralelo (sem carregar arrays gigantes)
    const [earnedBadges, trxCount, userStats, investments, categoriesCount] = await Promise.all([
      prisma.badge.findMany({ where: { userId }, select: { code: true } }),
      prisma.transaction.count({ where: { userId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { partnerId: true } }),
      prisma.transaction.aggregate({
        where: { userId, type: 'INVESTMENT' },
        _sum: { amount: true }
      }),
      prisma.category.count({ where: { userId } })
    ]);

    const earnedCodes = earnedBadges.map(b => b.code);
    const newBadges = [];
    const totalSaved = Number(investments._sum.amount || 0);

    // 2. Verifica as regras com os contadores
    if (trxCount > 0 && !earnedCodes.includes('FIRST_TRX')) {
      newBadges.push(BADGES_RULES.find(b => b.code === 'FIRST_TRX')!);
    }

    if (userStats?.partnerId && !earnedCodes.includes('COUPLE_GOALS')) {
      newBadges.push(BADGES_RULES.find(b => b.code === 'COUPLE_GOALS')!);
    }

    if (totalSaved > 0 && !earnedCodes.includes('SAVER_1')) {
      newBadges.push(BADGES_RULES.find(b => b.code === 'SAVER_1')!);
    }

    if (totalSaved >= 1000 && !earnedCodes.includes('BIG_SAVER')) {
      newBadges.push(BADGES_RULES.find(b => b.code === 'BIG_SAVER')!);
    }

    if (categoriesCount > 0 && !earnedCodes.includes('CAT_MASTER')) {
      newBadges.push(BADGES_RULES.find(b => b.code === 'CAT_MASTER')!);
    }

    // 3. Salva se houver novidades
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
      where: { userId_month_year: { userId: userIdToFetch, month, year } }
    });

    const emptyBudget: BudgetData = { incomes: [], fixedExpenses: [], variableExpenses: [] };
    if (!budget || !budget.data) return emptyBudget;

    let parsedData = budget.data;
    if (typeof parsedData === 'string') {
      try { parsedData = JSON.parse(parsedData); } catch { return emptyBudget; }
    }

    const validation = budgetDataSchema.safeParse(parsedData);
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
    const dataToSave = process.env.NODE_ENV === 'development' ? JSON.stringify(data) : data;
    await prisma.monthlyBudget.upsert({
      where: { userId_month_year: { userId, month, year } },
      update: { data: dataToSave as any },
      create: { userId, month, year, data: dataToSave as any }
    });
    revalidatePath('/dashboard');
    return { success: true, message: 'Planejamento salvo com sucesso!', error: '' };
  } catch (error) {
    console.error("Erro ao salvar planejamento:", error);
    if (String(error).includes('Expected String') || String(error).includes('Invalid value')) {
      try {
        await prisma.monthlyBudget.upsert({
          where: { userId_month_year: { userId, month, year } },
          update: { data: JSON.stringify(data) as any },
          create: { userId, month, year, data: JSON.stringify(data) as any }
        });
        revalidatePath('/dashboard');
        return { success: true, message: 'Planejamento salvo (modo compatibilidade)!', error: '' };
      } catch (e) {
        return { error: 'Erro crítico de compatibilidade no banco de dados.', success: false };
      }
    }
    return { error: 'Erro ao salvar.', success: false };
  }
}

export async function generatePlanningAdviceAction(month: number, year: number) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error', success: false };
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return { error: 'Configuração de IA ausente.', success: false };

  const contextKey = `PLANNING_${month}_${year}`;

  try {
    const budget = await prisma.monthlyBudget.findUnique({
      where: { userId_month_year: { userId, month, year } }
    });
    if (!budget || !budget.data) return { error: 'Nenhum planejamento encontrado.', success: false };

    let parsedData = budget.data;
    if (typeof parsedData === 'string') {
      try { parsedData = JSON.parse(parsedData); } catch { return { error: 'Dados corrompidos.', success: false }; }
    }

    const validation = budgetDataSchema.safeParse(parsedData);
    if (!validation.success) return { error: 'Dados inconsistentes.', success: false };

    const data = validation.data;
    const itemCount = data.fixedExpenses.length + data.variableExpenses.length;

    // Formatação auxiliar para incluir o DIA
    const fmt = (item: any) => {
      const dayStr = item.day ? `[Dia ${item.day}] ` : '';
      return `${dayStr}${item.name}: R$ ${Number(item.amount).toFixed(2)}`;
    };

    const incomeStr = data.incomes.map(fmt).join('; ');
    const fixedStr = data.fixedExpenses.map(fmt).join('; ');
    const varStr = data.variableExpenses.map(fmt).join('; ');

    const prompt = `
      CONTEXTO: Planejamento Financeiro para ${month + 1}/${year}.
      
      DADOS:
      - Entradas: ${incomeStr || 'Nenhuma'}
      - Despesas Fixas: ${fixedStr || 'Nenhuma'}
      - Despesas Variáveis: ${varStr || 'Nenhuma'}
      
      TAREFA: Analise o fluxo de caixa considerando os dias de vencimento (se fornecidos).
      1. Verifique se o dinheiro entra antes de sair.
      2. Aponte gargalos ou riscos de ficar no vermelho em dias específicos.
      3. Dê uma sugestão prática.
      
      Responda em Markdown claro, usando tópicos e negrito para destacar valores e datas críticas. Seja direto.
    `;

    const adviceText = await generateSmartAdvice(apiKey, prompt);

    await prisma.aiChat.create({
      data: {
        userId,
        role: 'model',
        message: adviceText,
        context: contextKey
      }
    });

    return { success: true, message: adviceText, error: '' };
  } catch (error: any) {
    console.error("Erro IA de Planejamento:", error);
    return { error: `Erro na IA: ${error.message}`, success: false };
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

  // --- CORREÇÃO: Invalidar a TAG específica do usuário ---
  revalidateTag(`dashboard:${userId}`, 'default');
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
  } catch (error) { return { error: 'Erro ao excluir conta.' }; }
}

export async function forgotPasswordAction(formData: FormData) {
  const email = formData.get('email') as string;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return { success: true };
  const token = randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 3600000); // 1 hora
  await prisma.user.update({ where: { id: user.id }, data: { resetToken: token, resetTokenExpiry: expiry } });
  await sendPasswordResetEmail(email, token);
  return { success: true };
}

export async function resetPasswordAction(token: string, formData: FormData) {
  const password = formData.get('password') as string;
  if (password.length < 6) return { error: 'Mínimo 6 caracteres.' };
  const user = await prisma.user.findFirst({ where: { resetToken: token, resetTokenExpiry: { gt: new Date() } } });
  if (!user) return { error: 'Link inválido ou expirado.' };
  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword, resetToken: null, resetTokenExpiry: null }
  });
  return { success: true };
}

// ==========================================
// 11. GESTÃO DE INVESTIMENTOS (CORRIGIDO)
// ==========================================

export async function addInvestmentAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  const rawData = Object.fromEntries(formData);
  const validation = investmentSchema.safeParse(rawData);

  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const { name, category, investedAmount, createTransaction, date } = validation.data;
  const currentAmount = validation.data.currentAmount || investedAmount;
  const txDate = date ? new Date(date) : new Date();

  try {
    const newInvestment = await prisma.investment.create({
      data: {
        userId,
        name,
        category,
        investedAmount,
        currentAmount
      }
    });

    if (createTransaction === 'on' || createTransaction === 'true') {
      await prisma.transaction.create({
        data: {
          userId,
          description: `Investimento: ${name}`,
          amount: investedAmount,
          type: 'INVESTMENT',
          category: 'Investimentos',
          date: txDate,
          isPaid: true,
        }
      });
    }

    // --- CORREÇÃO AQUI: Adicionado o argumento 'max' ---
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard');
    return { success: true, message: 'Investimento criado!' };

  } catch (error) {
    console.error("Erro ao criar investimento:", error);
    return { error: 'Erro ao salvar.' };
  }
}

export async function getInvestmentsAction() {
  const userId = await getUserId();
  if (!userId) return { myInvestments: [], partnerInvestments: [] };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { partnerId: true }
  });

  const myInvestments = await prisma.investment.findMany({
    where: { userId },
    orderBy: { currentAmount: 'desc' }
  });

  let partnerInvestments: any[] = [];
  if (user?.partnerId) {
    partnerInvestments = await prisma.investment.findMany({
      where: { userId: user.partnerId },
      orderBy: { currentAmount: 'desc' }
    });
  }

  return { myInvestments, partnerInvestments };
}

export async function updateInvestmentBalanceAction(id: string, newCurrentAmount: number) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  try {
    const investment = await prisma.investment.findUnique({ where: { id } });
    if (!investment || investment.userId !== userId) return { error: 'Não autorizado.' };

    await prisma.investment.update({
      where: { id },
      data: { currentAmount: newCurrentAmount }
    });

    // --- CORREÇÃO AQUI: Adicionado o argumento 'max' ---
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard');
    return { success: true, message: 'Saldo atualizado!' };
  } catch (error) {
    return { error: 'Erro ao atualizar.' };
  }
}

export async function deleteInvestmentAction(id: string) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  try {
    const investment = await prisma.investment.findMany({ where: { id, userId } });
    if (!investment.length) return { error: 'Não autorizado.' };

    await prisma.investment.delete({ where: { id } });

    // --- CORREÇÃO AQUI: Adicionado o argumento 'max' ---
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard');
    return { success: true, message: 'Investimento removido.' };
  } catch (error) {
    return { error: 'Erro ao excluir.' };
  }
}

// ==========================================
// 12. MENSAGENS DO PARCEIRO (NOVO)
// ==========================================

export async function sendPartnerMessageAction(category: 'LOVE' | 'FINANCE' | 'ALERT', message: string) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { partnerId: true } });
  if (!user?.partnerId) return { error: 'Sem parceiro conectado.' };

  try {
    await prisma.partnerMessage.create({
      data: {
        senderId: userId,
        receiverId: user.partnerId,
        category,
        message
      }
    });

    // --- CORREÇÃO AQUI: Adicionado 'default' ---
    revalidateTag(`dashboard:${user.partnerId}`, 'default');
    revalidateTag(`dashboard:${userId}`, 'default');
    // ---------------------------------------

    revalidatePath('/dashboard');
    return { success: true, message: 'Enviado!' };
  } catch (error) {
    return { error: 'Erro ao enviar.' };
  }
}

export async function getPartnerMessagesAction() {
  const userId = await getUserId();
  if (!userId) return [];

  // Busca as últimas 10 mensagens (recebidas OU enviadas) para o chat
  const messages = await prisma.partnerMessage.findMany({
    where: {
      OR: [
        { receiverId: userId },
        { senderId: userId }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { sender: { select: { name: true } } }
  });

  return messages.reverse(); // Para mostrar a mais antiga no topo (estilo chat) ou mantém desc para timeline
}

// --- NOVO: IMPORTAR DO MÊS ANTERIOR ---
export async function importLastMonthBudgetAction(targetMonth: number, targetYear: number) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error', success: false };

  try {
    // 1. Calcular data do mês anterior
    const targetDate = new Date(targetYear, targetMonth, 1);
    const prevDate = subMonths(targetDate, 1);
    const prevMonth = prevDate.getMonth();
    const prevYear = prevDate.getFullYear();

    // 2. Buscar o orçamento anterior
    const prevBudget = await prisma.monthlyBudget.findUnique({
      where: { userId_month_year: { userId, month: prevMonth, year: prevYear } }
    });

    if (!prevBudget || !prevBudget.data) {
      return { error: 'Não há planejamento no mês anterior para copiar.', success: false };
    }

    // 3. Parse e Limpeza (Gerar novos IDs para os itens copiados)
    let sourceData = prevBudget.data;
    if (typeof sourceData === 'string') sourceData = JSON.parse(sourceData);

    // Função para renovar IDs e limpar status de "pago"
    const renewItems = (items: any[]) => items.map(item => ({
      ...item,
      id: crypto.randomUUID(), // Gera novo ID
      isPaid: false,           // Reseta o status de pago
      amount: Number(item.amount) // Garante número
    }));

    const newData: BudgetData = {
      incomes: renewItems((sourceData as any).incomes || []),
      fixedExpenses: renewItems((sourceData as any).fixedExpenses || []),
      variableExpenses: renewItems((sourceData as any).variableExpenses || [])
    };

    // 4. Salvar no mês atual (Sobrescreve ou cria)
    // O Prisma aceita o objeto direto no campo Json, mas garantimos stringify se necessário
    const dataToSave = process.env.NODE_ENV === 'development' ? JSON.stringify(newData) : newData;

    await prisma.monthlyBudget.upsert({
      where: { userId_month_year: { userId, month: targetMonth, year: targetYear } },
      create: { userId, month: targetMonth, year: targetYear, data: dataToSave as any },
      update: { data: dataToSave as any }
    });

    revalidatePath('/dashboard');
    return { success: true, message: 'Dados importados com sucesso!' };

  } catch (error) {
    console.error("Erro importação:", error);
    return { error: 'Erro ao importar dados.', success: false };
  }
}

// ==========================================
// 13. AÇÕES EM MASSA (BULK ACTIONS)
// ==========================================

export async function deleteTransactionsAction(ids: string[]) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  try {
    // Deleta apenas se pertencerem ao usuário (Segurança)
    const result = await prisma.transaction.deleteMany({
      where: {
        id: { in: ids },
        userId: userId
      }
    });

    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard');
    return { success: true, message: `${result.count} transações excluídas!` };
  } catch (error) {
    console.error("Erro bulk delete:", error);
    return { error: 'Erro ao excluir itens.' };
  }
}

// ==========================================
// 14. GESTÃO DE CARTÕES DE CRÉDITO (NOVO)
// ==========================================

import { creditCardSchema } from '@/lib/schemas'; // Importe o schema novo

export async function createCreditCardAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  const rawData = Object.fromEntries(formData);
  const validation = creditCardSchema.safeParse(rawData);
  if (!validation.success) return { error: validation.error.issues[0].message };

  try {
    await prisma.creditCard.create({
      data: {
        userId,
        name: validation.data.name,
        closingDay: validation.data.closingDay,
        dueDay: validation.data.dueDay,
        limit: validation.data.limit || 0
      }
    });
    revalidatePath('/dashboard');
    return { success: true, message: 'Cartão adicionado!' };
  } catch (e) {
    return { error: 'Erro ao criar cartão.' };
  }
}

export async function getCreditCardsAction() {
  const userId = await getUserId();
  if (!userId) return [];
  return await prisma.creditCard.findMany({ where: { userId }, orderBy: { name: 'asc' } });
}

export async function deleteCreditCardAction(id: string) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };
  // Atenção: Deletar cartão pode deletar transações se não tratar (Cascade no schema)
  await prisma.creditCard.delete({ where: { id, userId } });
  revalidatePath('/dashboard');
  return { success: true };
}

// ==========================================
// 15. PAGAMENTO DE FATURA (CORRIGIDO)
// ==========================================

export async function payCreditCardBillAction(cardId: string, month: number, year: number) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  // Datas da fatura
  const start = startOfMonth(new Date(year, month, 1));
  const end = endOfMonth(new Date(year, month, 1));

  try {
    // 1. Atualiza todas as transações desse cartão nesse mês para PAGO
    await prisma.transaction.updateMany({
      where: {
        userId,
        creditCardId: cardId,
        date: { gte: start, lte: end },
        isPaid: false
      },
      data: { isPaid: true }
    });

    // 2. Busca o valor total da fatura para lançar a saída no débito
    const totalInvoice = await prisma.transaction.aggregate({
      where: {
        userId,
        creditCardId: cardId,
        date: { gte: start, lte: end },
        type: 'EXPENSE'
      },
      _sum: { amount: true }
    });

    // CORREÇÃO AQUI: Converter Decimal para Number antes de comparar
    const totalValue = Number(totalInvoice._sum.amount || 0);

    if (totalValue > 0) {
      await prisma.transaction.create({
        data: {
          userId,
          description: `Pagamento Fatura Cartão`,
          amount: totalValue,
          type: 'EXPENSE',
          category: 'Fatura',
          date: new Date(),
          paymentMethod: 'DEBIT', // Sai da conta agora
          isPaid: true
        }
      });
    }

    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard');
    return { success: true, message: 'Fatura paga com sucesso!' };
  } catch (error) {
    console.error(error);
    return { error: 'Erro ao processar pagamento da fatura.' };
  }
}

// ==========================================
// 16. IMPORTAÇÃO EM MASSA (CSV)
// ==========================================

export async function createBulkTransactionsAction(transactions: any[]) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: 'Auth error' };

  try {
    // Busca o usuário para saber quem é o parceiro
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, partnerId: true, name: true, partner: { select: { name: true } } }
    });

    const dataToCreate = transactions.map(t => {
      // Lógica inteligente para definir de quem é a transação baseada no nome do CSV
      let targetUserId = userId;
      const ownerName = t.owner ? t.owner.toLowerCase().trim() : '';
      
      // Se o nome no CSV parecer com o do parceiro, atribui a ele
      if (user?.partnerId && user.partner?.name && ownerName.includes(user.partner.name.toLowerCase().split(' ')[0])) {
        targetUserId = user.partnerId;
      }

      return {
        userId: targetUserId,
        description: t.description,
        amount: Number(t.amount),
        type: t.type, // INCOME, EXPENSE, INVESTMENT
        category: t.category || 'Outros',
        date: new Date(t.date),
        isPaid: t.status === 'Pago', // Mapeia 'Pago' para true
        paymentMethod: t.paymentMethod || 'DEBIT' 
      };
    });

    await prisma.transaction.createMany({ data: dataToCreate });

    revalidateTag(`dashboard:${userId}`, 'default');
    if (user?.partnerId) revalidateTag(`dashboard:${user.partnerId}`, 'default');
    revalidatePath('/dashboard');

    return { success: true, count: dataToCreate.length };
  } catch (error) {
    console.error("Bulk create error:", error);
    return { success: false, error: 'Erro ao importar dados.' };
  }
}