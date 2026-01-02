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

// 1. Registro de Usuário
export async function registerUser(prevState: any, formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!name || !email || !password) return { error: 'Preencha todos os campos.' }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) return { error: 'Este email já está em uso.' }

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

    return { success: true }
  } catch {
    return { error: 'Erro ao criar conta.' }
  }
}

// 2. Login de Usuário
export async function loginUser(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return { error: 'Credenciais inválidas.' }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) return { error: 'Credenciais inválidas.' }

    const token = await new SignJWT({ sub: user.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(JWT_SECRET)

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
  const category = formData.get('category') as string || (type === 'INCOME' ? 'Receita' : 'Outros')
  const isRecurring = formData.get('isRecurring') === 'on'

  if (isNaN(amount)) return { error: 'Valor inválido' }

  const date = new Date()

  try {
    // 1. Cria a transação de hoje
    await prisma.transaction.create({
      data: { userId, type, amount, description, category, date },
    })

    // 2. Se for recorrente, cria o agendamento para o próximo mês
    if (isRecurring) {
      await prisma.recurringTransaction.create({
        data: {
          userId,
          type,
          amount,
          description,
          category,
          nextRun: addMonths(date, 1) // Próxima em 1 mês
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
  if (!userId) return { error: 'Usuário não autenticado' }

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
  if (!userId) return { error: 'Usuário não autenticado' }

  await prisma.transaction.delete({ where: { id } })
  revalidatePath('/dashboard')
  return { success: true }
}

// 7. Conectar Parceiro
export async function linkPartnerAction(formData: FormData) {
  const userId = await getUserId()
  if (!userId) return { error: 'Usuário não autenticado.' }

  const partnerEmail = formData.get('email') as string
  if (!partnerEmail) return { error: 'Insira o email do parceiro.' }

  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, partnerId: true }
    })

    if (!currentUser || currentUser.partnerId || currentUser.email === partnerEmail) {
      return { error: 'Operação inválida.' }
    }

    const partnerUser = await prisma.user.findUnique({ where: { email: partnerEmail } })
    if (!partnerUser || partnerUser.partnerId) return { error: 'Parceiro indisponível.' }

    await prisma.$transaction([
      prisma.user.update({ where: { id: currentUser.id }, data: { partnerId: partnerUser.id } }),
      prisma.user.update({ where: { id: partnerUser.id }, data: { partnerId: currentUser.id } })
    ])

    revalidatePath('/dashboard')
    return { success: true, message: `Conectado com ${partnerUser.name}!` }
  } catch {
    return { error: 'Erro ao conectar.' }
  }
}

// 8. Desconectar Parceiro
export async function unlinkPartnerAction() {
  const userId = await getUserId()
  if (!userId) return { error: 'Usuário não autenticado.' }

  try {
    const currentUser = await prisma.user.findUnique({ where: { id: userId }, select: { partnerId: true } })
    if (!currentUser?.partnerId) return { error: 'Sem conexão ativa.' }

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { partnerId: null } }),
      prisma.user.update({ where: { id: currentUser.partnerId }, data: { partnerId: null } })
    ])

    revalidatePath('/dashboard')
    return { success: true, message: 'Desconectado.' }
  } catch {
    return { error: 'Erro ao desconectar.' }
  }
}

// 9. Atualizar Meta de Gastos
export async function updateSpendingLimitAction(formData: FormData) {
  const userId = await getUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  const limit = parseFloat(formData.get('limit') as string)
  if (isNaN(limit) || limit < 0) return { error: 'Valor inválido' }

  try {
    await prisma.user.update({ where: { id: userId }, data: { spendingLimit: limit } })
    revalidatePath('/dashboard')
    return { success: true, message: 'Meta atualizada!' }
  } catch {
    return { error: 'Erro ao atualizar meta.' }
  }
}

// 10. Adicionar à Caixinha
export async function addSavingsAction(formData: FormData) {
  const userId = await getUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  const amount = parseFloat(formData.get('amount') as string)
  const description = formData.get('description') as string || 'Investimento na Caixinha'

  if (isNaN(amount) || amount <= 0) return { error: 'Valor inválido' }

  try {
    await prisma.transaction.create({
      data: { userId, type: 'INVESTMENT', amount, description, category: 'Caixinha', date: new Date() }
    })
    revalidatePath('/dashboard')
    return { success: true, message: 'Valor guardado!' }
  } catch {
    return { error: 'Erro ao guardar valor.' }
  }
}

// 11. Atualizar Nome da Caixinha
export async function updateSavingsGoalNameAction(formData: FormData) {
  const userId = await getUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  const name = formData.get('name') as string
  if (!name) return { error: 'Nome inválido' }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { partnerId: true } })
    
    await prisma.user.update({ where: { id: userId }, data: { savingsGoal: name } })
    if (user?.partnerId) {
      await prisma.user.update({ where: { id: user.partnerId }, data: { savingsGoal: name } })
    }

    revalidatePath('/dashboard')
    return { success: true, message: 'Nome atualizado!' }
  } catch {
    return { error: 'Erro ao atualizar nome.' }
  }
}

// 12. Atualizar Senha
export async function updatePasswordAction(formData: FormData) {
  const userId = await getUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  const current = formData.get('currentPassword') as string
  const newPass = formData.get('newPassword') as string
  if (!current || !newPass) return { error: 'Preencha os campos.' }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user || !(await bcrypt.compare(current, user.password))) return { error: 'Senha atual incorreta.' }

    const hashed = await bcrypt.hash(newPass, 10)
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } })

    return { success: true, message: 'Senha alterada!' }
  } catch {
    return { error: 'Erro ao alterar senha.' }
  }
}

// 13. Categorias: Listar
export async function getCategoriesAction() {
  const userId = await getUserId();
  if (!userId) return { error: 'Usuário não autenticado', data: [] };

  try {
    const categories = await prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' }
    });
    return { success: true, data: categories };
  } catch (error) {
    return { error: 'Erro ao buscar categorias', data: [] };
  }
}

// 14. Categorias: Criar
export async function createCategoryAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Usuário não autenticado' };

  const name = formData.get('name') as string;
  const color = formData.get('color') as string;
  const icon = formData.get('icon') as string || 'Tag';

  if (!name || !color) return { error: 'Preencha nome e cor.' };

  try {
    await prisma.category.create({
      data: { userId, name, color, icon }
    });
    revalidatePath('/dashboard');
    return { success: true, message: 'Categoria criada!' };
  } catch (error) {
    return { error: 'Erro ao criar categoria.' };
  }
}

// 15. Categorias: Deletar
export async function deleteCategoryAction(id: string) {
  const userId = await getUserId();
  if (!userId) return { error: 'Usuário não autenticado' };

  try {
    await prisma.category.delete({
      where: { id, userId }
    });
    revalidatePath('/dashboard');
    return { success: true, message: 'Categoria removida.' };
  } catch (error) {
    return { error: 'Erro ao remover categoria.' };
  }
}

// 16. IA: Gerar Conselho
export async function generateFinancialAdviceAction() {
  const userId = await getUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { partner: { select: { name: true } } }
    })

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: { in: [userId, user?.partnerId || ''].filter(Boolean) },
        date: { gte: thirtyDaysAgo }
      },
      orderBy: { date: 'desc' },
      take: 50
    })

    if (transactions.length === 0) return { success: false, error: 'Poucos dados para análise.' }

    const txSummary = transactions.map(t => 
      `- ${t.date.toLocaleDateString()}: ${t.description} (${t.category}) | R$ ${t.amount} [${t.type}]`
    ).join('\n')

    const prompt = `
      Atue como um consultor financeiro para um casal/pessoa.
      Analise estas transações (30 dias):
      ${txSummary}
      Meta: R$ ${user?.spendingLimit || 'N/A'}.
      Responda em Markdown curto:
      1. 🧐 **Onde foi o dinheiro?**
      2. ⚠️ **Atenção**
      3. 💡 **Dica de Ouro**
      Tom: Amigável e motivador.
    `

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '')
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
    const result = await model.generateContent(prompt)
    
    return { success: true, message: result.response.text() }
  } catch (error) {
    return { error: 'Erro na IA. Tente mais tarde.' }
  }
}

// 17. Processar Recorrência (Automático)
export async function checkRecurringTransactionsAction() {
  const userId = await getUserId();
  if (!userId) return;

  try {
    const pending = await prisma.recurringTransaction.findMany({
      where: {
        userId,
        active: true,
        nextRun: { lte: new Date() }
      }
    });

    if (pending.length === 0) return;

    for (const rec of pending) {
      let runDate = new Date(rec.nextRun);
      const now = new Date();

      while (isBefore(runDate, now) || runDate.getTime() === now.getTime()) {
        await prisma.transaction.create({
          data: {
            userId,
            type: rec.type,
            amount: rec.amount,
            description: `${rec.description} (Automático)`,
            category: rec.category,
            date: runDate
          }
        });
        runDate = addMonths(runDate, 1);
      }

      await prisma.recurringTransaction.update({
        where: { id: rec.id },
        data: { nextRun: runDate }
      });
    }
    
    revalidatePath('/dashboard');
    return { success: true, count: pending.length };
  } catch (error) {
    console.error("Erro ao processar recorrentes:", error);
  }
}