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
    // BLOCO A: VERIFICAÇÃO DE FATURAS (Hoje e Amanhã)
    // ====================================================

    const todayDay = now.getDate();
    const tomorrow = addDays(now, 1);
    const tomorrowDay = tomorrow.getDate();

    // 1. Busca todos os cartões que vencem hoje ou amanhã
    const [cardsDueToday, cardsDueTomorrow] = await Promise.all([
      prisma.creditCard.findMany({
        where: { dueDay: todayDay },
        include: { user: { select: { email: true, name: true } } }
      }),
      prisma.creditCard.findMany({
        where: { dueDay: tomorrowDay },
        include: { user: { select: { email: true, name: true } } }
      })
    ]);

    // 2. Coleta IDs de todos os cartões envolvidos para fazer UMA única consulta
    const allCardIds = [
      ...cardsDueToday.map(c => c.id),
      ...cardsDueTomorrow.map(c => c.id)
    ];

    // 3. Busca transações pendentes de TODOS os cartões de uma vez (Otimização N+1)
    let pendingTransactions: { creditCardId: string | null; amount: any }[] = [];

    if (allCardIds.length > 0) {
      pendingTransactions = await prisma.transaction.findMany({
        where: {
          creditCardId: { in: allCardIds },
          isPaid: false,
          type: 'EXPENSE'
        },
        select: {
          creditCardId: true,
          amount: true
        }
      });
    }

    // 4. Função auxiliar para somar em memória (sem ir ao banco)
    const processCardsInMemory = (cards: typeof cardsDueToday, label: string, dateReference: Date) => {
      for (const card of cards) {
        // Filtra na lista em memória
        const cardExpenses = pendingTransactions.filter(t => t.creditCardId === card.id);

        // Soma os valores
        const total = cardExpenses.reduce((acc, t) => acc + Number(t.amount), 0);

        if (total > 0 && card.user.email) {
          if (!notificationsMap[card.user.email]) {
            notificationsMap[card.user.email] = {
              name: card.user.name || 'Usuário',
              items: []
            };
          }

          notificationsMap[card.user.email].items.push({
            description: `💳 Fatura ${card.name} (${label})`,
            amount: total,
            date: dateReference
          });
        }
      }
    };

    // Processa Hoje
    processCardsInMemory(cardsDueToday, 'Vence Hoje', now);

    // Processa Amanhã
    processCardsInMemory(cardsDueTomorrow, 'Vence Amanhã', tomorrow);


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
      period: 'Weekly Lookahead (7 days) + Credit Card Due Check (Today/Tomorrow)',
      invoicesFoundToday: cardsDueToday.length,
      invoicesFoundTomorrow: cardsDueTomorrow.length,
      recurringCreated: newTransactions.length,
      emailsSent: emailPromises.length
    });

  } catch (error) {
    console.error('CRON ERROR:', error);
    return NextResponse.json({ ok: false, error: 'Erro interno no Cron.' }, { status: 500 });
  }
}