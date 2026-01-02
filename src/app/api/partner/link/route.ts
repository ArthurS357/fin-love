import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST: Conectar com um parceiro via email
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, partnerEmail } = body;

    if (!userId || !partnerEmail) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // 1. Encontrar o utilizador atual
    const currentUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!currentUser) return NextResponse.json({ error: 'Utilizador atual inválido' }, { status: 404 });
    if (currentUser.partnerId) return NextResponse.json({ error: 'Já possui um parceiro conectado' }, { status: 409 });

    // 2. Encontrar o parceiro pelo email
    const partnerUser = await prisma.user.findUnique({
      where: { email: partnerEmail }
    });

    if (!partnerUser) return NextResponse.json({ error: 'Email do parceiro não encontrado' }, { status: 404 });
    if (partnerUser.id === currentUser.id) return NextResponse.json({ error: 'Não se pode conectar consigo mesmo' }, { status: 400 });
    if (partnerUser.partnerId) return NextResponse.json({ error: 'Este parceiro já tem uma conexão' }, { status: 409 });

    // 3. Realizar a conexão mútua (Transação Database)
    // Atualizamos ambos os utilizadores para apontarem um para o outro
    await prisma.$transaction([
      prisma.user.update({
        where: { id: currentUser.id },
        data: { partnerId: partnerUser.id }
      }),
      prisma.user.update({
        where: { id: partnerUser.id },
        data: { partnerId: currentUser.id }
      })
    ]);

    return NextResponse.json({ 
      message: 'Conexão realizada com sucesso!',
      partner: {
        name: partnerUser.name,
        email: partnerUser.email
      }
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro ao conectar parceiros' }, { status: 500 });
  }
}