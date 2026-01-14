import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addMonths, isBefore, setDate, addDays } from 'date-fns';
import { sendRecurringBillsNotification } from '@/lib/mail';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // --- 1. SEGURANÇA ---
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const notificationsMap: Record<string, { name: string; items: any[] }> = {};
    const now = new Date();

    // ====================================================
    // BLOCO A: VERIFICAÇÃO DE FATURAS DE CARTÃO (Vencem Hoje)
    // ====================================================
    const todayDay = now.getDate();

    const cardsDueToday = await prisma.creditCard.findMany({
      where: { dueDay: todayDay },
      include: { user: { select: { email: true, name: true } } }
    });

    for (const card of cardsDueToday) {
      // Soma gastos pendentes deste cartão
      const invoiceTotal = await prisma.transaction.aggregate({
        where: {
          creditCardId: card.id,
          isPaid: false, // Fatura em aberto
          type: 'EXPENSE'
        },
        _sum: { amount: true }
      });

      const total = Number(invoiceTotal._sum.amount || 0);

      if (total > 0 && card.user.email) {
        if (!notificationsMap[card.user.email]) {
          notificationsMap[card.user.email] = {
            name: card.user.name || 'Usuário',
            items: []
          };
        }

        // Adiciona a fatura como um item de notificação
        notificationsMap[card.user.email].items.push({
          description: `💳 Fatura ${card.name} (Vence Hoje)`,
          amount: total,
          date: now // Data de hoje
        });
      }
    }

    // ====================================================
    // BLOCO B: CONTAS RECORRENTES (Próximos 7 Dias)
    // ====================================================
    const limitDate = addDays(now, 7); // Olha até a próxima semana

    const pendingRecurring = await prisma.recurringTransaction.findMany({
      where: {
        active: true,
        nextRun: { lte: limitDate }
      },
      include: {
        user: { select: { email: true, name: true } }
      }
    });

    const newTransactions = [];
    const updates = [];
    const MAX_MONTHS_LOOKAHEAD = 12;

    for (const rec of pendingRecurring) {
      let runDate = new Date(rec.nextRun);
      let safetyCounter = 0;
      let hasCreated = false;

      // Cria transações futuras (até o limite de 7 dias)
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
          date: new Date(runDate),
          isPaid: false, // Cria como Pendente pois é futuro
        };

        newTransactions.push(transactionData);

        // Adiciona ao mapa de notificações
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

        // Avança a data para o próximo mês
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

    // ====================================================
    // FINALIZAÇÃO: SALVAR NO BANCO E ENVIAR EMAILS
    // ====================================================

    // 1. Salva novas transações e atualiza datas (Atômico)
    if (newTransactions.length > 0 || updates.length > 0) {
      await prisma.$transaction([
        prisma.transaction.createMany({ data: newTransactions }),
        ...updates
      ]);
    }

    // 2. Dispara emails (Recorrências + Faturas)
    const emailPromises = Object.entries(notificationsMap).map(([email, data]) =>
      sendRecurringBillsNotification(email, data.name, data.items)
    );

    await Promise.allSettled(emailPromises);

    return NextResponse.json({
      ok: true,
      period: 'Weekly Lookahead (7 days) + Credit Card Due Check',
      invoicesFound: cardsDueToday.length,
      recurringCreated: newTransactions.length,
      emailsSent: emailPromises.length
    });

  } catch (error) {
    console.error('CRON ERROR:', error);
    return NextResponse.json({ ok: false, error: 'Erro interno no Cron.' }, { status: 500 });
  }
}