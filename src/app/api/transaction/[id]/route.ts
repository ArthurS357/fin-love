import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Params {
  params: {
    id: string;
  };
}

// PUT: Atualizar uma transação existente
export async function PUT(request: Request, { params }: any) {
  try {
    // Em Next.js 15+ params pode ser uma Promise, mas mantendo compatibilidade padrão:
    const { id } = params; 
    const body = await request.json();
    
    // Filtramos apenas os campos que podem ser atualizados
    const { description, amount, type, category, date } = body;

    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        description,
        amount: amount ? parseFloat(amount) : undefined,
        type,
        category,
        date: date ? new Date(date) : undefined,
      },
    });

    return NextResponse.json(updatedTransaction);
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao atualizar transação ou ID não encontrado' },
      { status: 500 }
    );
  }
}

// DELETE: Remover uma transação
export async function DELETE(request: Request, { params }: any) {
  try {
    const { id } = params;

    await prisma.transaction.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Transação excluída com sucesso' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao excluir transação' },
      { status: 500 }
    );
  }
}