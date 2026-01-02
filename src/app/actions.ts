'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Função para buscar transações
export async function getTransactions() {
    return await prisma.transaction.findMany({
        orderBy: { date: 'desc' },
        include: { user: true } // Traz dados do usuário se precisar
    });
}

export async function addTransaction(formData: FormData) {
  const description = formData.get('description') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const type = formData.get('type') as string;
  // Se for RECEITA, forçamos a categoria ser "Entrada" para não ficar null ou confuso
  const category = type === 'INCOME' ? 'Entrada' : (formData.get('category') as string);

  // Lógica de usuário (mantendo o dummy por enquanto)
  let user = await prisma.user.findFirst({ where: { email: 'eu@teste.com' }});
  if (!user) {
    user = await prisma.user.create({
      data: { email: 'eu@teste.com', password: '123', name: 'Admin' }
    });
  }

  await prisma.transaction.create({
    data: { description, amount, type, category, userId: user.id },
  });

  revalidatePath('/');
}

// --- NOVAS FUNÇÕES CRUD ---

export async function deleteTransaction(id: string) {
  await prisma.transaction.delete({
    where: { id }
  });
  revalidatePath('/');
}

export async function updateTransaction(formData: FormData) {
  const id = formData.get('id') as string;
  const description = formData.get('description') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const type = formData.get('type') as string;
  const category = type === 'INCOME' ? 'Entrada' : (formData.get('category') as string);

  await prisma.transaction.update({
    where: { id },
    data: { description, amount, type, category }
  });
  revalidatePath('/');
}