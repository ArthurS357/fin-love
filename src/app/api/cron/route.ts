import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addMonths, isBefore, setDate } from 'date-fns';

// Garante que a rota seja dinâmica e não estática
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Segurança Opcional: Verificar se a chamada vem da Vercel
  // const authHeader = request.headers.get('authorization');
  // if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new Response('Unauthorized', { status: 401 });
  // }

  try {
    // 1. Busca TODAS as recorrências ativas e vencidas (de qualquer usuário)
    const pending = await prisma.recurringTransaction.findMany({
      where: {
        active: true,
        nextRun: { lte: new Date() } // Data de execução menor ou igual a agora
      }
    });

    if (pending.length === 0) {
      return NextResponse.json({ ok: true, message: 'Nenhuma pendência encontrada.' });
    }

    const newTransactions = [];
    const updates = [];
    const MAX_MONTHS_LOOKAHEAD = 12; // Trava de segurança para não criar infinitas

    for (const rec of pending) {
      let runDate = new Date(rec.nextRun);
      const now = new Date();
      let safetyCounter = 0;

      // Gera as transações atrasadas até a data atual
      while (
        (isBefore(runDate, now) || runDate.getTime() <= now.getTime()) && 
        safetyCounter < MAX_MONTHS_LOOKAHEAD
      ) {
        newTransactions.push({
          userId: rec.userId, // Importante: Atribui ao dono correto
          type: rec.type, // INCOME ou EXPENSE
          amount: rec.amount,
          description: `${rec.description} (Auto)`,
          category: rec.category,
          date: new Date(runDate),
          isPaid: true, // Recorrências fixas geralmente já entram como "Lançadas/Pagas" ou a vencer
        });
        
        // Calcula a próxima data
        runDate = addMonths(runDate, 1);
        if (rec.dayOfMonth) {
            // Tenta manter o dia preferido (ex: dia 10)
            runDate = setDate(runDate, rec.dayOfMonth); 
        }
        
        safetyCounter++;
      }
      
      // Agenda a atualização da data no banco
      updates.push(
        prisma.recurringTransaction.update({ 
          where: { id: rec.id }, 
          data: { nextRun: runDate } 
        })
      );
    }

    // 2. Executa tudo em lote (Alta Performance)
    if (newTransactions.length > 0) {
      await prisma.transaction.createMany({
        data: newTransactions
      });
    }

    await Promise.all(updates);

    return NextResponse.json({ 
      ok: true, 
      created: newTransactions.length, 
      nextRunsUpdated: updates.length 
    });

  } catch (error) {
    console.error('CRON ERROR:', error);
    return NextResponse.json({ ok: false, error: 'Erro interno no Cron.' }, { status: 500 });
  }
}