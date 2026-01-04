import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addMonths, isBefore, setDate } from 'date-fns';

// Garante que a rota seja dinâmica e não estática
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // --- SEGURANÇA ATIVADA ---
  // Verifica se o header Authorization contém o segredo definido na Vercel
  const authHeader = request.headers.get('authorization');
  
  // Se não houver segredo configurado (dev) ou o header não bater, bloqueia
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 1. Busca recorrências ativas e vencidas
    const pending = await prisma.recurringTransaction.findMany({
      where: {
        active: true,
        nextRun: { lte: new Date() }
      }
    });

    if (pending.length === 0) {
      return NextResponse.json({ ok: true, message: 'Nenhuma pendência encontrada.' });
    }

    const newTransactions = [];
    const updates = [];
    const MAX_MONTHS_LOOKAHEAD = 12;

    for (const rec of pending) {
      let runDate = new Date(rec.nextRun);
      const now = new Date();
      let safetyCounter = 0;

      while (
        (isBefore(runDate, now) || runDate.getTime() <= now.getTime()) && 
        safetyCounter < MAX_MONTHS_LOOKAHEAD
      ) {
        newTransactions.push({
          userId: rec.userId,
          type: rec.type,
          amount: rec.amount,
          description: `${rec.description} (Auto)`,
          category: rec.category,
          date: new Date(runDate),
          isPaid: true, // Recorrências fixas já entram pagas ou a vencer conforme lógica
        });
        
        // Lógica de avanço de mês
        runDate = addMonths(runDate, 1);
        if (rec.dayOfMonth) {
            runDate = setDate(runDate, rec.dayOfMonth); 
        }
        
        safetyCounter++;
      }
      
      updates.push(
        prisma.recurringTransaction.update({ 
          where: { id: rec.id }, 
          data: { nextRun: runDate } 
        })
      );
    }

    // 2. Executa em lote
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