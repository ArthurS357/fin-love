'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs' // Se não instalou, remova e use senha pura (não recomendado)
import { SignJWT } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key')

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

    // Criptografar senha
    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        spendingLimit: 2000, // Valor padrão inicial
      },
    })

    // Criar Sessão (Token simples)
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

    // Verificar senha
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) return { error: 'Credenciais inválidas.' }

    // Criar Sessão
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

// Manter a função de deletar transação que já existia
export async function deleteTransaction(id: string) {
  await prisma.transaction.delete({ where: { id } })
  revalidatePath('/')
}