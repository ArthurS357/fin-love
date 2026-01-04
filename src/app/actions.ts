'use server'
import 'server-only';

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose' 
import { GoogleGenerativeAI } from '@google/generative-ai'
import { addMonths, isBefore, setDate } from 'date-fns'
import {
  registerSchema,
  loginSchema,
  transactionSchema,
  categorySchema,
  partnerSchema,
  spendingLimitSchema,
  passwordSchema
} from '@/lib/schemas'

// --- OTIMIZAÇÃO: Importando lógica centralizada ---
import { getUserId, JWT_SECRET } from '@/lib/auth';

type ActionState = {
  success: boolean
  error: string
}

// 1. AUTHENTICATION

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

    // Usa o JWT_SECRET centralizado
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

    // Usa o JWT_SECRET centralizado
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

// 2. TRANSACTIONS (CRUD + PARCELAS)

export async function addTransaction(formData: FormData) {
  const userId = await getUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  // Validação Básica
  const description = formData.get('description') as string;
  const amountStr = formData.get('amount') as string;
  const type = formData.get('type') as string;
  const category = formData.get('category') as string;
  const dateStr = formData.get('date') as string;
  
  if (!description || !amountStr || !type || !category) {
      return { error: 'Dados inválidos' };
  }

  const amount = parseFloat(amountStr);
  const baseDate = dateStr ? new Date(dateStr) : new Date();

  // Campos Avançados
  const isRecurring = formData.get('isRecurring') === 'true';
  const paymentMethod = formData.get('paymentMethod') as string || 'DEBIT';
  const installments = parseInt(formData.get('installments') as string || '1');
  const recurringDay = parseInt(formData.get('recurringDay') as string || '1');

  try {
    // Lógica 1: Cartão de Crédito Parcelado
    if (type === 'EXPENSE' && paymentMethod === 'CREDIT' && installments > 1) {
      const transactionsToCreate = [];
      for (let i = 0; i < installments; i++) {
        const futureDate = addMonths(baseDate, i);
        transactionsToCreate.push({
          userId,
          description: `${description} (${i + 1}/${installments})`,
          amount: amount / installments,
          type,
          category,
          date: futureDate,
          paymentMethod: 'CREDIT',
          installments,
          currentInstallment: i + 1,
          isPaid: false
        });
      }
      await prisma.transaction.createMany({ data: transactionsToCreate });
    } 
    // Lógica 2: Transação Padrão
    else {
      await prisma.transaction.create({
        data: {
          userId,
          description,
          amount,
          type,
          category,
          date: baseDate,
          paymentMethod,
          isPaid: paymentMethod !== 'CREDIT'
        },
      })
    }

    // Lógica 3: Recorrência com Dia Específico
    if (isRecurring) {
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
    revalidatePath('/dashboard')
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

  const { type, amount, description, category } = validation.data

  await prisma.transaction.update({
    where: { id },
    data: { type: type as any, amount, description, category },
  })

  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteTransaction(id: string) {
  const userId = await getUserId()
  if (!userId) return { error: 'Auth error' }
  await prisma.transaction.delete({ where: { id } })
  revalidatePath('/dashboard')
  return { success: true }
}

export async function toggleTransactionStatus(id: string, currentStatus: boolean) {
  const userId = await getUserId();
  if (!userId) return;
  await prisma.transaction.update({
    where: { id, userId },
    data: { isPaid: !currentStatus }
  });
  revalidatePath('/dashboard');
}

// 3. FINANCIAL SUMMARY (CORRIGIDO PARA CASAL)

export async function getFinancialSummaryAction() {
  const userId = await getUserId();
  if (!userId) return null;

  // Busca parceiro
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { partnerId: true }
  });

  const userIds = [userId];
  if (user?.partnerId) userIds.push(user.partnerId);

  const totalIncome = await prisma.transaction.aggregate({
    where: { userId: { in: userIds }, type: 'INCOME' },
    _sum: { amount: true }
  });
  
  const totalExpense = await prisma.transaction.aggregate({
    where: { userId: { in: userIds }, type: 'EXPENSE' },
    _sum: { amount: true }
  });

  const accumulatedBalance = (Number(totalIncome._sum.amount) || 0) - (Number(totalExpense._sum.amount) || 0);
  return { accumulatedBalance };
}

// 4. PARTNER & PROFILE

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

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { partnerId: null } }),
      prisma.user.update({ where: { id: me.partnerId }, data: { partnerId: null } })
    ])
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
  }

  revalidatePath('/dashboard')
  return { success: true, message: 'Meta atualizada!' }
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

// 5. AI ADVICE

export async function generateFinancialAdviceAction() {
  const userId = await getUserId()
  if (!userId) return { error: 'Auth error' }

  try {
    const user = await prisma.user.findUnique({ 
      where: { id: userId }, 
      include: { partner: true } 
    })

    if (!user) return { error: 'Usuário não encontrado.' }

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

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
    const result = await model.generateContent(prompt)
    const adviceText = result.response.text();

    await prisma.user.update({
      where: { id: userId },
      data: { 
        lastAdvice: adviceText,
        lastAdviceDate: new Date()
      }
    });

    return { success: true, message: adviceText }
  } catch (error) { 
    console.error(error);
    return { error: 'IA indisponível no momento.' } 
  }
}

// 6. CATEGORIES

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

  // CORREÇÃO AQUI: Adicionado 'type' que estava faltando
  const { name, color, icon, type } = validation.data;
  const finalIcon = icon || 'Tag';
  
  // Se 'type' não vier do formulário, padrão é 'EXPENSE'
  const finalType = type || 'EXPENSE'; 

  try {
    await prisma.category.create({ 
        data: { 
            userId, 
            name, 
            color, 
            icon: finalIcon,
            type: finalType // Agora passamos o type obrigatório
        } 
    });
    await checkBadgesAction()
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
  revalidatePath('/dashboard');
  return { success: true };
}

// 7. RECURRING

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
    const MAX_MONTHS_LOOKAHEAD = 12; // Segurança: Processa no máximo 1 ano por vez

    for (const rec of pending) {
      let runDate = new Date(rec.nextRun);
      const now = new Date();
      let safetyCounter = 0;

      // Loop com trava de segurança
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
        
        // Avança para o próximo mês mantendo o dia original
        // Se o dia original era 31 e o mês seguinte não tem, o date-fns ajusta, 
        // mas idealmente usaríamos logica para manter o "dia de preferência"
        runDate = addMonths(runDate, 1);
        if (rec.dayOfMonth) {
            // Tenta forçar o dia escolhido se possível no mês novo
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
      // createMany é muito mais rápido que loop de create
      await prisma.transaction.createMany({
        data: newTransactions
      });
    }

    await Promise.all(updates);
    revalidatePath('/dashboard');
  } catch (err) { console.error("Erro recorrência:", err) }
}

// 8. GAMIFICATION

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
    
    // Correção: Converter Decimal para Number
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