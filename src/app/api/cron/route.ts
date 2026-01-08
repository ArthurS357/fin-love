import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addMonths, isBefore, setDate } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const pending = await prisma.recurringTransaction.findMany({
      where: {
        active: true,
        nextRun: { lte: new Date() }
      }
    });

    if (pending.length === 0) {
      return NextResponse.json({ ok: true, message: 'Nenhuma pendência.' });
    }

    const newTransactions = [];
    const updates = [];
    const MAX_MONTHS_LOOKAHEAD = 12;

    for (const rec of pending) {
      let runDate = new Date(rec.nextRun);
      const now = new Date();
      let safetyCounter = 0;
      let hasCreated = false; // Flag para saber se houve criação

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
          isPaid: true,
        });

        runDate = addMonths(runDate, 1);
        if (rec.dayOfMonth) {
          runDate = setDate(runDate, rec.dayOfMonth);
        }

        safetyCounter++;
        hasCreated = true;
      }

      // Só agendamos update se realmente avançou a data
      if (hasCreated) {
        updates.push(
          prisma.recurringTransaction.update({
            where: { id: rec.id },
            data: { nextRun: runDate }
          })
        );
      }
    }

    // --- CORREÇÃO DE ATOMICIDADE ---
    // Executa criações e atualizações numa única transação de banco de dados
    if (newTransactions.length > 0 || updates.length > 0) {
      await prisma.$transaction([
        prisma.transaction.createMany({ data: newTransactions }),
        ...updates
      ]);
    }

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