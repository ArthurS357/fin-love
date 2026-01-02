'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { addMonths, isBefore } from 'date-fns'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key')

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

// 1. Registro
export async function registerUser(prevState: any, formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!name || !email || !password) return { error: 'Preencha todos os campos.' }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) return { error: 'Email já em uso.' }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, spendingLimit: 2000 },
    })

    const token = await new SignJWT({ sub: user.id }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('7d').sign(JWT_SECRET)
    const cookieStore = await cookies()
    cookieStore.set('token', token, { httpOnly: true, path: '/' })

    return { success: true }
  } catch {
    return { error: 'Erro ao criar conta.' }
  }
}

// 2. Login
export async function loginUser(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !(await bcrypt.compare(password, user.password))) return { error: 'Credenciais inválidas.' }

    const token = await new SignJWT({ sub: user.id }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('7d').sign(JWT_SECRET)
    const cookieStore = await cookies()
    cookieStore.set('token', token, { httpOnly: true, path: '/' })

    return { success: true }
  } catch {
    return { error: 'Erro ao entrar.' }
  }
}

// 3. Logout
export async function logoutUser() {
  const cookieStore = await cookies()
  cookieStore.delete('token')
  redirect('/login')
}

// 4. Adicionar Transação (Com Recorrência)
export async function addTransaction(formData: FormData) {
  const userId = await getUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  const type = formData.get('type') as string
  const amount = parseFloat(formData.get('amount') as string)
  const description = formData.get('description') as string
  const category = formData.get('category') as string || 'Outros'
  const isRecurring = formData.get('isRecurring') === 'on'

  if (isNaN(amount)) return { error: 'Valor inválido' }

  const date = new Date()

  try {
    await prisma.transaction.create({
      data: { userId, type, amount, description, category, date },
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
  const type = formData.get('type') as string
  const amount = parseFloat(formData.get('amount') as string)
  const description = formData.get('description') as string
  const category = formData.get('category') as string

  await prisma.transaction.update({
    where: { id },
    data: { type, amount, description, category },
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

// 7. Link Partner (CORRIGIDO)
export async function linkPartnerAction(formData: FormData) {
  const userId = await getUserId()
  if (!userId) return { error: 'Auth error' }
  const email = formData.get('email') as string

  try {
    const me = await prisma.user.findUnique({ where: { id: userId } })
    if (!me) return { error: 'Usuário não encontrado.' } // <--- Correção aqui

    const partner = await prisma.user.findUnique({ where: { email } })

    // Agora 'me' é seguro de usar
    if (!partner || partner.partnerId || me.partnerId || me.email === email) return { error: 'Inválido.' }

    await prisma.$transaction([
      prisma.user.update({ where: { id: me.id }, data: { partnerId: partner.id } }),
      prisma.user.update({ where: { id: partner.id }, data: { partnerId: me.id } })
    ])
    revalidatePath('/dashboard')
    return { success: true, message: 'Conectado!' }
  } catch { return { error: 'Erro ao conectar.' } }
}

// 8. Unlink Partner (CORRIGIDO)
export async function unlinkPartnerAction() {
  const userId = await getUserId()
  if (!userId) return { error: 'Auth error' }
  try {
    const me = await prisma.user.findUnique({ where: { id: userId } })
    if (!me || !me.partnerId) return { error: 'Sem conexão ativa.' } // <--- Correção aqui

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { partnerId: null } }),
      prisma.user.update({ where: { id: me.partnerId }, data: { partnerId: null } })
    ])
    revalidatePath('/dashboard')
    return { success: true, message: 'Desconectado.' }
  } catch { return { error: 'Erro.' } }
}

// 9. Update Limit
export async function updateSpendingLimitAction(formData: FormData) {
  const userId = await getUserId()
  if (!userId) return { error: 'Auth error' }
  const limit = parseFloat(formData.get('limit') as string)
  await prisma.user.update({ where: { id: userId }, data: { spendingLimit: limit } })
  revalidatePath('/dashboard')
  return { success: true }
}

// 10. Add Savings
export async function addSavingsAction(formData: FormData) {
  const userId = await getUserId()
  if (!userId) return { error: 'Auth error' }
  const amount = parseFloat(formData.get('amount') as string)
  const description = formData.get('description') as string || 'Caixinha'

  await prisma.transaction.create({
    data: { userId, type: 'INVESTMENT', amount, description, category: 'Caixinha', date: new Date() }
  })
  revalidatePath('/dashboard')
  return { success: true }
}

// 11. Update Goal Name (CORRIGIDO)
export async function updateSavingsGoalNameAction(formData: FormData) {
  const userId = await getUserId()
  if (!userId) return { error: 'Auth error' }
  const name = formData.get('name') as string

  const me = await prisma.user.findUnique({ where: { id: userId } })
  if (!me) return { error: 'Usuário não encontrado' } // <--- Correção aqui

  await prisma.user.update({ where: { id: userId }, data: { savingsGoal: name } })

  // Agora é seguro acessar me.partnerId
  if (me.partnerId) {
    await prisma.user.update({ where: { id: me.partnerId }, data: { savingsGoal: name } })
  }

  revalidatePath('/dashboard')
  return { success: true }
}

// 12. Update Password
export async function updatePasswordAction(formData: FormData) {
  const userId = await getUserId()
  if (!userId) return { error: 'Auth error' }
  const current = formData.get('currentPassword') as string
  const newPass = formData.get('newPassword') as string

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || !(await bcrypt.compare(current, user.password))) return { error: 'Senha incorreta.' }

  const hashed = await bcrypt.hash(newPass, 10)
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } })
  return { success: true, message: 'Senha atualizada!' }
}

// 13. IA Advice
export async function generateFinancialAdviceAction() {
  const userId = await getUserId()
  if (!userId) return { error: 'Auth error' }

  try {
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { partner: true } })
    const transactions = await prisma.transaction.findMany({
      where: { userId: { in: [userId, user?.partnerId || ''].filter(Boolean) }, date: { gte: thirtyDaysAgo } },
      orderBy: { date: 'desc' }, take: 50
    })

    if (transactions.length === 0) return { success: false, error: 'Sem dados suficientes.' }

    const txSummary = transactions.map(t => `- ${t.description} (${t.category}): R$ ${t.amount} [${t.type}]`).join('\n')
    const prompt = `Analise estas transações de um casal/pessoa:\n${txSummary}\nMeta: R$ ${user?.spendingLimit}. Responda em Markdown curto com: Onde foi o dinheiro, Pontos de Atenção e Dica de Ouro. Tom amigável.`

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
    const result = await model.generateContent(prompt)
    return { success: true, message: result.response.text() }
  } catch { return { error: 'IA indisponível.' } }
}

// 14. Categorias: Listar
export async function getCategoriesAction() {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error', data: [] };
  const categories = await prisma.category.findMany({ where: { userId }, orderBy: { name: 'asc' } });
  return { success: true, data: categories };
}

// 15. Categorias: Criar
export async function createCategoryAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  const name = formData.get('name') as string;
  const color = formData.get('color') as string;
  
  // CORREÇÃO AQUI: Adicionado " || 'Tag'" para garantir que nunca seja nulo/vazio
  const icon = (formData.get('icon') as string) || 'Tag'; 

  if (!name || !color) return { error: 'Preencha nome e cor.' };

  try {
    await prisma.category.create({
      data: { userId, name, color, icon } // Agora 'icon' tem sempre valor
    });
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error("Erro ao criar categoria:", error);
    return { error: 'Erro ao criar categoria.' };
  }
}

// 16. Categorias: Deletar
export async function deleteCategoryAction(id: string) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };
  await prisma.category.delete({ where: { id, userId } });
  revalidatePath('/dashboard');
  return { success: true };
}

// 17. Processar Recorrência (Automático)
export async function checkRecurringTransactionsAction() {
  const userId = await getUserId();
  if (!userId) return;

  try {
    const pending = await prisma.recurringTransaction.findMany({
      where: { userId, active: true, nextRun: { lte: new Date() } }
    });

    for (const rec of pending) {
      let runDate = new Date(rec.nextRun);
      const now = new Date();

      while (isBefore(runDate, now) || runDate.getTime() === now.getTime()) {
        await prisma.transaction.create({
          data: {
            userId,
            type: rec.type,
            amount: rec.amount,
            description: `${rec.description} (Auto)`,
            category: rec.category,
            date: runDate
          }
        });
        runDate = addMonths(runDate, 1);
      }
      await prisma.recurringTransaction.update({ where: { id: rec.id }, data: { nextRun: runDate } });
    }
    if (pending.length > 0) revalidatePath('/dashboard');
  } catch (err) { console.error(err) }
}

// 18. Gamificação: Verificar Medalhas 
const BADGES_RULES = [
  { code: 'FIRST_TRX', name: 'Primeiro Passo', desc: 'Criou a primeira transação', icon: '🚀' },
  { code: 'SAVER_1', name: 'Poupador Iniciante', desc: 'Guardou dinheiro na caixinha', icon: '🐷' },
  { code: 'COUPLE_GOALS', name: 'Dupla Dinâmica', desc: 'Conectou com o parceiro', icon: '👩‍❤️‍👨' },
  { code: 'BIG_SAVER', name: 'Magnata', desc: 'Acumulou mais de R$ 1.000', icon: '💎' },
];

export async function checkBadgesAction() {
  const userId = await getUserId();
  if (!userId) return;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        transactions: true, 
        badges: true,
        partner: true 
      }
    });

    if (!user) return;

    const earnedBadges = user.badges.map(b => b.code);
    const newBadges = [];

    // 1. Regra: Primeira Transação
    if (user.transactions.length > 0 && !earnedBadges.includes('FIRST_TRX')) {
      newBadges.push(BADGES_RULES.find(b => b.code === 'FIRST_TRX')!);
    }

    // 2. Regra: Conectou Parceiro
    if (user.partnerId && !earnedBadges.includes('COUPLE_GOALS')) {
      newBadges.push(BADGES_RULES.find(b => b.code === 'COUPLE_GOALS')!);
    }

    // 3. Regra: Guardou Dinheiro (Investimento)
    const hasInvestment = user.transactions.some(t => t.type === 'INVESTMENT');
    if (hasInvestment && !earnedBadges.includes('SAVER_1')) {
      newBadges.push(BADGES_RULES.find(b => b.code === 'SAVER_1')!);
    }

    // 4. Regra: Acumulou 1000+
    const totalSaved = user.transactions
      .filter(t => t.type === 'INVESTMENT')
      .reduce((acc, t) => acc + t.amount, 0);

    if (totalSaved >= 1000 && !earnedBadges.includes('BIG_SAVER')) {
      newBadges.push(BADGES_RULES.find(b => b.code === 'BIG_SAVER')!);
    }

    // Salvar novas medalhas
    for (const badge of newBadges) {
      await prisma.badge.create({
        data: {
          userId,
          code: badge.code,
          name: badge.name,
          description: badge.desc,
          icon: badge.icon
        }
      });
    }

    if (newBadges.length > 0) {
      revalidatePath('/dashboard');
      return { success: true, newBadges };
    }

  } catch (error) {
    console.error("Erro na gamificação", error);
  }
}

export async function getBadgesAction() {
  const userId = await getUserId();
  if (!userId) return [];
  return await prisma.badge.findMany({ where: { userId }, orderBy: { awardedAt: 'desc' } });
}