'use server'
'use server'
import 'server-only';

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { addMonths, isBefore } from 'date-fns'
import {
  registerSchema,
  loginSchema,
  transactionSchema,
  categorySchema,
  partnerSchema,
  spendingLimitSchema,
  passwordSchema
} from '@/lib/schemas'

const secretStr = process.env.JWT_SECRET;
if (!secretStr) throw new Error('JWT_SECRET não definida nas variáveis de ambiente.');
const JWT_SECRET = new TextEncoder().encode(secretStr);

// Helper: Obter ID do Usuário
async function getUserId() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload.sub as string
  } catch {
    return null
  }
}

// Tipo para satisfazer o useActionState (Login/Registro)
type ActionState = {
  success: boolean
  error: string
}

// ==========================================
// AUTHENTICATION
// ==========================================

// 1. Registro (Corrigido para ActionState)
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

    const token = await new SignJWT({ sub: user.id }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('7d').sign(JWT_SECRET)
    const cookieStore = await cookies()
    cookieStore.set('token', token, { httpOnly: true, path: '/' })

    return { success: true, error: '' }
  } catch {
    return { success: false, error: 'Erro ao criar conta.' }
  }
}

// 2. Login (Corrigido para ActionState)
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

    const token = await new SignJWT({ sub: user.id }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('7d').sign(JWT_SECRET)
    const cookieStore = await cookies()
    cookieStore.set('token', token, { httpOnly: true, path: '/' })

    return { success: true, error: '' }
  } catch {
    return { success: false, error: 'Erro ao entrar.' }
  }
}

// 3. Logout
export async function logoutUser() {
  const cookieStore = await cookies()
  cookieStore.delete('token')
  redirect('/login')
}

// ==========================================
// TRANSACTIONS
// ==========================================

// 4. Adicionar Transação
export async function addTransaction(formData: FormData) {
  const userId = await getUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  const rawData = Object.fromEntries(formData)
  const validation = transactionSchema.safeParse(rawData)

  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const { type, amount, description, category } = validation.data
  const isRecurring = formData.get('isRecurring') === 'on'

  const date = new Date()

  try {
    await prisma.transaction.create({
      data: { userId, type: type as any, amount, description, category, date },
    })

    if (isRecurring) {
      await prisma.recurringTransaction.create({
        data: {
          userId,
          type,
          amount,
          description,
          category,
          nextRun: addMonths(date, 1)
        }
      })
    }

    await checkBadgesAction()
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    return { error: 'Erro ao salvar transação.' }
  }
}

// 5. Atualizar Transação
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

// 6. Deletar Transação
export async function deleteTransaction(id: string) {
  const userId = await getUserId()
  if (!userId) return { error: 'Auth error' }
  await prisma.transaction.delete({ where: { id } })
  revalidatePath('/dashboard')
  return { success: true }
}

// ==========================================
// PARTNER & PROFILE
// ==========================================

// 7. Link Partner
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

// 8. Unlink Partner
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

// 9. Update Limit (CORRIGIDO: ADICIONADO MESSAGE)
export async function updateSpendingLimitAction(formData: FormData) {
  const userId = await getUserId()
  if (!userId) return { error: 'Auth error' }

  const validation = spendingLimitSchema.safeParse({ limit: formData.get('limit') })
  if (!validation.success) return { error: validation.error.issues[0].message }

  await prisma.user.update({ where: { id: userId }, data: { spendingLimit: validation.data.limit } })
  revalidatePath('/dashboard')
  // Correção: Agora retorna message
  return { success: true, message: 'Limite atualizado!' }
}

// 10. Add Savings (CORRIGIDO: ADICIONADO MESSAGE)
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

// 11. Update Goal Name (CORRIGIDO: ADICIONADO MESSAGE)
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

// 12. Update Password
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

// 13. IA Advice (OTIMIZADO COM CACHE)
export async function generateFinancialAdviceAction() {
  const userId = await getUserId()
  if (!userId) return { error: 'Auth error' }

  try {
    const user = await prisma.user.findUnique({ 
      where: { id: userId }, 
      include: { partner: true } 
    })

    if (!user) return { error: 'Usuário não encontrado.' }

    // OTIMIZAÇÃO: Verifica Cache (Evita chamadas desnecessárias à API)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (user.lastAdvice && user.lastAdviceDate && user.lastAdviceDate > oneDayAgo) {
      // Retorna o conselho salvo instantaneamente
      return { success: true, message: user.lastAdvice };
    }

    // Se não tiver cache ou for antigo, busca dados para gerar novo
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
    // Nota: Usei Number(t.amount) caso tenha mudado para Decimal no passo anterior

    const prompt = `Analise estas transações de um casal/pessoa:\n${txSummary}\nMeta: R$ ${Number(user.spendingLimit)}. Responda em Markdown curto com: Onde foi o dinheiro, Pontos de Atenção e Dica de Ouro. Tom amigável e direto.`;

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }) // Flash é mais rápido e barato
    const result = await model.generateContent(prompt)
    const adviceText = result.response.text();

    // Salva no banco para não gastar API na próxima vez (Cache)
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

// 14. Categorias: Listar
export async function getCategoriesAction() {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error', data: [] };
  const categories = await prisma.category.findMany({ where: { userId }, orderBy: { name: 'asc' } });
  return { success: true, data: categories };
}

// 15. Categorias: Criar (CORRIGIDO: ADICIONADO MESSAGE)
export async function createCategoryAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  const rawData = Object.fromEntries(formData);
  const validation = categorySchema.safeParse(rawData);

  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const { name, color, icon } = validation.data;
  const finalIcon = icon || 'Tag';

  try {
    await prisma.category.create({ data: { userId, name, color, icon: finalIcon } });
    await checkBadgesAction()
    revalidatePath('/dashboard');
    return { success: true, message: 'Categoria criada!' };
  } catch { return { error: 'Erro ao criar categoria.' }; }
}

// 16. Categorias: Deletar
export async function deleteCategoryAction(id: string) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };
  await prisma.category.delete({ where: { id, userId } });
  revalidatePath('/dashboard');
  return { success: true };
}

// 17. Processar Recorrência (OTIMIZADO COM BATCH INSERT)
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

    // Prepara os dados em memória (rápido)
    for (const rec of pending) {
      let runDate = new Date(rec.nextRun);
      const now = new Date();

      while (isBefore(runDate, now) || runDate.getTime() <= now.getTime()) {
        newTransactions.push({
          userId,
          type: rec.type, // Ajuste se seu TS reclamar de enum
          amount: rec.amount,
          description: `${rec.description} (Auto)`,
          category: rec.category,
          date: new Date(runDate) // Clona a data para evitar referência
        });
        runDate = addMonths(runDate, 1);
      }
      
      // Prepara atualização da data da recorrência
      updates.push(
        prisma.recurringTransaction.update({ 
          where: { id: rec.id }, 
          data: { nextRun: runDate } 
        })
      );
    }

    // Executa no banco de dados (Eficiente)
    // 1. Cria todas as transações de uma vez
    if (newTransactions.length > 0) {
      await prisma.transaction.createMany({
        data: newTransactions
      });
    }

    // 2. Atualiza as datas das recorrências (Paralelo)
    await Promise.all(updates);

    revalidatePath('/dashboard');
  } catch (err) { console.error("Erro recorrência:", err) }
}

// 18. Gamificação
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
    const totalSaved = user.transactions.filter(t => t.type === 'INVESTMENT').reduce((acc, t) => acc + t.amount.toNumber(), 0);
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
  return await prisma.badge.findMany({ where: { userId }, orderBy: { awardedAt: 'desc' } });
}