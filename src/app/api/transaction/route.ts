import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

// Helper para extrair usuário do token (Reutilize ou importe de um utils)
async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;

  try {
    const secretStr = process.env.JWT_SECRET;
    if (!secretStr) throw new Error('JWT_SECRET missing');
    const key = new TextEncoder().encode(secretStr);

    const { payload } = await jwtVerify(token, key);
    return payload.sub as string;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    // SEGURANÇA: Pegar ID do token, não da URL
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const transactions = await prisma.transaction.findMany({
      where: { userId }, // Garante que só busca dados do usuário logado
      orderBy: { date: 'desc' },
      take: 50, // OTIMIZAÇÃO: Limitar resultados para não travar o front
    });

    return NextResponse.json(transactions);
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar transações' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { description, amount, type, category, date } = body;

    // Validação básica
    if (!description || !amount || !type || !category) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      );
    }

    const transaction = await prisma.transaction.create({
      data: {
        description,
        amount: parseFloat(amount),
        type,
        category,
        date: date ? new Date(date) : new Date(),
        userId, // SEGURANÇA: Usa o ID forçado do token
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao criar transação' },
      { status: 500 }
    );
  }
}