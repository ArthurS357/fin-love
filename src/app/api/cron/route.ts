import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addMonths, isBefore, setDate, addDays } from 'date-fns'; // <--- ADICIONE addDays
import { sendRecurringBillsNotification } from '@/lib/mail';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // --- MUDANÇA 1: DEFINIR O LIMITE DE 7 DIAS À FRENTE ---
    const now = new Date();
    const limitDate = addDays(now, 7); // Olha até a próxima semana

    const pending = await prisma.recurringTransaction.findMany({
      where: {
        active: true,
        // Busca contas que vencem HOJE ou nos próximos 7 DIAS
        nextRun: { lte: limitDate }
      },
      include: {
        user: { select: { email: true, name: true } }
      }
    });

    if (pending.length === 0) {
      return NextResponse.json({ ok: true, message: 'Nenhuma conta para os próximos 7 dias.' });
    }

    const newTransactions = [];
    const updates = [];
    const MAX_MONTHS_LOOKAHEAD = 12;
    const notificationsMap: Record<string, { name: string; items: any[] }> = {};

    for (const rec of pending) {
      let runDate = new Date(rec.nextRun);
      let safetyCounter = 0;
      let hasCreated = false;

      // --- MUDANÇA 2: USAR limitDate NO LOOP ---
      // Enquanto a data da conta for menor ou igual ao limite (semana que vem)
      while (
        (isBefore(runDate, limitDate) || runDate.getTime() <= limitDate.getTime()) &&
        safetyCounter < MAX_MONTHS_LOOKAHEAD
      ) {

        const transactionData = {
          userId: rec.userId,
          type: rec.type,
          amount: rec.amount,
          description: `${rec.description} (Auto)`,
          category: rec.category,
          date: new Date(runDate), // A data será a futura (ex: Sexta-feira), perfeito para o Planejamento
          isPaid: false, // SUGESTÃO: Se é futuro, talvez seja melhor criar como "Pendente" (false)
        };

        newTransactions.push(transactionData);

        if (rec.user?.email) {
          if (!notificationsMap[rec.user.email]) {
            notificationsMap[rec.user.email] = {
              name: rec.user.name || 'Usuário',
              items: []
            };
          }
          notificationsMap[rec.user.email].items.push({
            description: rec.description,
            amount: Number(rec.amount),
            date: transactionData.date
          });
        }

        runDate = addMonths(runDate, 1);
        if (rec.dayOfMonth) {
          runDate = setDate(runDate, rec.dayOfMonth);
        }

        safetyCounter++;
        hasCreated = true;
      }

      if (hasCreated) {
        updates.push(
          prisma.recurringTransaction.update({
            where: { id: rec.id },
            data: { nextRun: runDate }
          })
        );
      }
    }

    if (newTransactions.length > 0 || updates.length > 0) {
      await prisma.$transaction([
        prisma.transaction.createMany({ data: newTransactions }),
        ...updates
      ]);
    }

    const emailPromises = Object.entries(notificationsMap).map(([email, data]) =>
      sendRecurringBillsNotification(email, data.name, data.items)
    );

    await Promise.allSettled(emailPromises);

    return NextResponse.json({
      ok: true,
      period: 'Weekly Lookahead (7 days)',
      created: newTransactions.length,
      emailsSent: emailPromises.length
    });

  } catch (error) {
    console.error('CRON ERROR:', error);
    return NextResponse.json({ ok: false, error: 'Erro interno no Cron.' }, { status: 500 });
  }
}