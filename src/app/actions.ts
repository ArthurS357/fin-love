'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key')

// --- HELPER: Obter ID do Usuário Logado ---
async function getUserId() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload.sub as string
  } catch (error) {
    return null
  }
}

// ==========================================
// AUTENTICAÇÃO
// ==========================================

export async function registerUser(prevState: any, formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!name || !email || !password) {
    return { error: 'Preencha todos os campos.' }
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) return { error: 'Este email já está em uso.' }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        spendingLimit: 2000, // Valor padrão inicial
      },
    })

    // Cria o token automaticamente após registro
    const token = await new SignJWT({ sub: user.id })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(JWT_SECRET)

    const cookieStore = await cookies()
    cookieStore.set('token', token, { httpOnly: true, path: '/' })

    return { success: true }
  } catch (error) {
    console.error(error)
    return { error: 'Erro ao criar conta.' }
  }
}

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
  } catch (error) {
    return { error: 'Erro ao entrar.' }
  }
}

export async function logoutUser() {
  const cookieStore = await cookies()
  cookieStore.delete('token')
  redirect('/login')
}

// ==========================================
// TRANSAÇÕES (CRUD)
// ==========================================

export async function addTransaction(formData: FormData) {
  const userId = await getUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  const type = formData.get('type') as string
  const amount = parseFloat(formData.get('amount') as string)
  const description = formData.get('description') as string
  const category = formData.get('category') as string || (type === 'INCOME' ? 'Receita' : 'Outros')

  if (isNaN(amount)) return { error: 'Valor inválido' }

  await prisma.transaction.create({
    data: {
      userId,
      type,
      amount,
      description,
      category,
      date: new Date(),
    },
  })

  revalidatePath('/dashboard')
  return { success: true }
}

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

export async function deleteTransaction(id: string) {
  const userId = await getUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  await prisma.transaction.delete({ where: { id } })
  revalidatePath('/dashboard')
  return { success: true }
}

// ==========================================
// PARCERIA (LINK / UNLINK)
// ==========================================

export async function linkPartnerAction(formData: FormData) {
  const userId = await getUserId()
  if (!userId) return { error: 'Usuário não autenticado.' }

  const partnerEmail = formData.get('email') as string

  if (!partnerEmail) {
    return { error: 'Por favor, insira o email do parceiro.' }
  }

  try {
    // 1. Validar usuário atual
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, partnerId: true }
    })

    if (!currentUser) return { error: 'Usuário inválido.' }
    if (currentUser.partnerId) return { error: 'Você já possui um parceiro conectado.' }
    if (currentUser.email === partnerEmail) return { error: 'Você não pode se conectar consigo mesmo.' }

    // 2. Buscar parceiro
    const partnerUser = await prisma.user.findUnique({
      where: { email: partnerEmail }
    })

    if (!partnerUser) return { error: 'Email do parceiro não encontrado. Peça para ele se cadastrar primeiro.' }
    if (partnerUser.partnerId) return { error: 'Este parceiro já tem uma conexão ativa.' }

    // 3. Criar conexão bidirecional
    await prisma.$transaction([
      prisma.user.update({
        where: { id: currentUser.id },
        data: { partnerId: partnerUser.id }
      }),
      prisma.user.update({
        where: { id: partnerUser.id },
        data: { partnerId: currentUser.id }
      })
    ])

    revalidatePath('/dashboard')
    return { success: true, message: `Conectado com ${partnerUser.name || partnerUser.email}!` }

  } catch (error) {
    console.error('Erro ao conectar parceiro:', error)
    return { error: 'Erro interno ao conectar parceiros.' }
  }
}

export async function unlinkPartnerAction() {
  const userId = await getUserId();
  if (!userId) return { error: 'Usuário não autenticado.' };

  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, partnerId: true }
    });

    if (!currentUser || !currentUser.partnerId) {
      return { error: 'Você não possui uma conexão ativa.' };
    }

    const partnerId = currentUser.partnerId;

    // Remove a conexão de AMBOS os lados
    await prisma.$transaction([
      prisma.user.update({
        where: { id: currentUser.id },
        data: { partnerId: null }
      }),
      prisma.user.update({
        where: { id: partnerId },
        data: { partnerId: null }
      })
    ]);

    revalidatePath('/dashboard');
    return { success: true, message: 'Conexão desfeita com sucesso.' };

  } catch (error) {
    console.error('Erro ao desconectar:', error);
    return { error: 'Erro ao tentar desconectar.' };
  }
}

// ==========================================
// METAS E CAIXINHA
// ==========================================

export async function updateSpendingLimitAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Usuário não autenticado' };

  const limit = parseFloat(formData.get('limit') as string);

  if (isNaN(limit) || limit < 0) {
    return { error: 'Valor inválido' };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { spendingLimit: limit }
    });
    revalidatePath('/dashboard');
    return { success: true, message: 'Meta de gastos atualizada!' };
  } catch (error) {
    return { error: 'Erro ao atualizar meta.' };
  }
}

export async function addSavingsAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Usuário não autenticado' };

  const amount = parseFloat(formData.get('amount') as string);
  const description = formData.get('description') as string || 'Investimento na Caixinha';

  if (isNaN(amount) || amount <= 0) return { error: 'Valor inválido' };

  try {
    // Criamos uma transação do tipo 'INVESTMENT' para diferenciar de gastos comuns
    await prisma.transaction.create({
      data: {
        userId,
        type: 'INVESTMENT',
        amount,
        description,
        category: 'Caixinha',
        date: new Date()
      }
    });

    revalidatePath('/dashboard');
    return { success: true, message: 'Valor guardado com sucesso!' };
  } catch (error) {
    return { error: 'Erro ao guardar valor.' };
  }
}

// ==========================================
// PERFIL & CONFIGURAÇÕES
// ==========================================

export async function updateSavingsGoalNameAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Usuário não autenticado' };

  const name = formData.get('name') as string;
  if (!name) return { error: 'Nome inválido' };

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { partnerId: true }
    });

    // Atualiza o nome para o usuário atual
    await prisma.user.update({
      where: { id: userId },
      data: { savingsGoal: name }
    });

    // Se tiver parceiro, atualiza o dele também para manter sincronizado
    if (user?.partnerId) {
      await prisma.user.update({
        where: { id: user.partnerId },
        data: { savingsGoal: name }
      });
    }

    revalidatePath('/dashboard');
    return { success: true, message: 'Nome da caixinha atualizado!' };
  } catch (error) {
    return { error: 'Erro ao atualizar nome.' };
  }
}

export async function updatePasswordAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Usuário não autenticado' };

  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;

  if (!currentPassword || !newPassword) return { error: 'Preencha todos os campos.' };

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { error: 'Usuário não encontrado.' };

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return { error: 'Senha atual incorreta.' };

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    return { success: true, message: 'Senha alterada com sucesso!' };
  } catch (error) {
    return { error: 'Erro ao alterar senha.' };
  }
}