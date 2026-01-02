import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Obter perfil
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; // Em Next.js 15, params é uma Promise

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 });
    }

    // Remover password
    const { password, ...userSafe } = user;

    return NextResponse.json(userSafe);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao carregar perfil' }, { status: 500 });
  }
}

// PUT: Atualizar (Meta de Gastos ou Nome)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { spendingLimit, name } = body;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        // O erro desaparecerá após o 'npx prisma db push'
        spendingLimit: spendingLimit !== undefined ? parseFloat(spendingLimit) : undefined,
        name: name || undefined,
      },
    });

    const { password, ...userSafe } = updatedUser;

    return NextResponse.json(userSafe);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 });
  }
}