'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose' // Importar jwtVerify também

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

// --- REGISTRO ---
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
        spendingLimit: 2000,
      },
    })

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

// --- LOGIN ---
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

// --- TRANSAÇÕES (NOVAS FUNÇÕES ADICIONADAS) ---

export async function addTransaction(formData: FormData) {
  const userId = await getUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  const type = formData.get('type') as string
  const amount = parseFloat(formData.get('amount') as string)
  const description = formData.get('description') as string
  // Se for INCOME, a categoria pode vir vazia, então definimos um padrão
  const category = formData.get('category') as string || (type === 'INCOME' ? 'Receita' : 'Outros')

  if (!amount || !description) return { error: 'Preencha os dados obrigatórios' }

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
}

export async function updateTransaction(formData: FormData) {
  const userId = await getUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  const id = formData.get('id') as string
  const type = formData.get('type') as string
  const amount = parseFloat(formData.get('amount') as string)
  const description = formData.get('description') as string
  const category = formData.get('category') as string || (type === 'INCOME' ? 'Receita' : 'Outros')

  // Segurança: Verificar se a transação pertence ao usuário antes de editar
  const existing = await prisma.transaction.findUnique({ where: { id } })
  if (!existing || existing.userId !== userId) {
     return { error: 'Acesso negado' }
  }

  await prisma.transaction.update({
    where: { id },
    data: {
      type,
      amount,
      description,
      category,
    },
  })

  revalidatePath('/dashboard')
}

export async function deleteTransaction(id: string) {
  const userId = await getUserId()
  if (!userId) return { error: 'Usuário não autenticado' }

  const existing = await prisma.transaction.findUnique({ where: { id } })
  if (existing && existing.userId === userId) {
    await prisma.transaction.delete({ where: { id } })
    revalidatePath('/dashboard')
  }
}

// --- LOGOUT ---
export async function logoutUser() {
  const cookieStore = await cookies()
  cookieStore.delete('token')
  redirect('/login')
}