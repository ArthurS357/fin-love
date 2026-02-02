import { prisma } from '@/lib/prisma';
import { transactionSchema } from '@/lib/schemas';
import { addMonths } from 'date-fns';
import { randomUUID } from 'crypto';
import { z } from 'zod';

// Inferimos o tipo diretamente do schema
type TransactionInput = z.infer<typeof transactionSchema>;

// ==========================================
// 1. CRIAÇÃO E ATUALIZAÇÃO (CRUD)
// ==========================================

export async function createTransactionService(userId: string, data: TransactionInput) {
    const {
        description,
        amount,
        type,
        category,
        date,
        paymentMethod,
        installments,
        isRecurring,
        recurringDay,
        creditCardId
    } = data;

    // 1. Normalização de Data
    let baseDate = new Date();
    if (date) {
        baseDate = new Date(date);
        baseDate.setUTCHours(12, 0, 0, 0);
    }

    // 2. Lógica de Cartão de Crédito
    let finalIsPaid = true;
    if (paymentMethod === 'CREDIT') {
        finalIsPaid = false;
        if (creditCardId) {
            const card = await prisma.creditCard.findUnique({ where: { id: creditCardId } });
            if (card) {
                if (baseDate.getDate() >= card.closingDay) {
                    baseDate = addMonths(baseDate, 1);
                    baseDate.setUTCHours(12, 0, 0, 0);
                }
            }
        }
    }

    // 3. Parcelamento vs Único
    if (type === 'EXPENSE' && paymentMethod === 'CREDIT' && installments && installments > 1) {
        const installmentId = randomUUID();
        const transactionsToCreate = [];
        const totalCents = Math.round(amount * 100);
        const installmentValueCents = Math.floor(totalCents / installments);
        const remainderCents = totalCents % installments;

        for (let i = 0; i < installments; i++) {
            const futureDate = addMonths(baseDate, i);
            futureDate.setUTCHours(12, 0, 0, 0);

            const isLast = i === installments - 1;
            const currentAmount = (installmentValueCents + (isLast ? remainderCents : 0)) / 100;

            transactionsToCreate.push({
                userId,
                description: `${description} (${i + 1}/${installments})`,
                amount: currentAmount,
                type,
                category,
                date: futureDate,
                paymentMethod: 'CREDIT',
                installments,
                currentInstallment: i + 1,
                isPaid: false,
                installmentId,
                creditCardId: creditCardId || null
            });
        }

        await prisma.transaction.createMany({ data: transactionsToCreate });

    } else {
        // Transação Simples
        await prisma.transaction.create({
            data: {
                userId,
                description,
                amount,
                type,
                category,
                date: baseDate,
                paymentMethod: paymentMethod || 'DEBIT',
                isPaid: finalIsPaid,
                creditCardId: creditCardId || null
            },
        });
    }

    // 4. Recorrência
    if (isRecurring === 'true' || isRecurring === 'on') {
        let nextRun = addMonths(baseDate, 1);
        nextRun.setUTCHours(12, 0, 0, 0);

        if (recurringDay) {
            const d = new Date(nextRun);
            d.setDate(recurringDay);
            if (d.getMonth() !== nextRun.getMonth()) {
                d.setDate(0);
            }
            nextRun = d;
        }

        await prisma.recurringTransaction.create({
            data: {
                userId,
                type,
                amount,
                description,
                category,
                frequency: 'MONTHLY',
                nextRun,
                dayOfMonth: recurringDay
            }
        });
    }

    return { success: true };
}

export async function updateTransactionService(userId: string, id: string, data: any) {
    const existingTransaction = await prisma.transaction.findUnique({ where: { id } });

    if (!existingTransaction || existingTransaction.userId !== userId) {
        throw new Error('Transação não encontrada ou sem permissão.');
    }

    let finalDate = undefined;
    if (data.date) {
        finalDate = new Date(data.date);
        finalDate.setUTCHours(12, 0, 0, 0);
    }

    await prisma.transaction.update({
        where: { id },
        data: {
            type: data.type,
            amount: data.amount,
            description: data.description,
            category: data.category,
            date: finalDate,
            creditCardId: data.creditCardId || null,
            isPaid: data.isPaid
        },
    });

    return { success: true };
}

// ==========================================
// 2. EXCLUSÃO E STATUS
// ==========================================

export async function deleteTransactionService(userId: string, id: string) {
    const transaction = await prisma.transaction.findUnique({ where: { id } });

    if (!transaction || transaction.userId !== userId) {
        throw new Error('Transação não encontrada ou sem permissão.');
    }

    await prisma.transaction.delete({ where: { id } });
    return { success: true };
}

export async function deleteInstallmentGroupService(userId: string, installmentId: string) {
    await prisma.transaction.deleteMany({
        where: { installmentId, userId }
    });
    return { success: true };
}

export async function toggleTransactionStatusService(userId: string, id: string, currentStatus: boolean) {
    await prisma.transaction.update({
        where: { id, userId },
        data: { isPaid: !currentStatus }
    });
    return { success: true };
}

// ==========================================
// 3. FUNÇÕES QUE ESTAVAM FALTANDO (Bulk & CSV)
// ==========================================

export async function deleteTransactionsService(userId: string, ids: string[]) {
    const result = await prisma.transaction.deleteMany({
        where: {
            id: { in: ids },
            userId: userId
        }
    });
    return result.count;
}

export async function createBulkTransactionsService(currentUserId: string, transactions: any[]) {
    const user = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { partnerId: true, partner: { select: { name: true } } }
    });

    const dataToCreate = transactions.map(t => {
        let targetUserId = currentUserId;
        const ownerName = t.owner ? t.owner.toLowerCase().trim() : '';

        // Tenta identificar se a transação é do parceiro pelo nome
        if (user?.partnerId && user.partner?.name && ownerName.includes(user.partner.name.toLowerCase().split(' ')[0])) {
            targetUserId = user.partnerId;
        }

        return {
            userId: targetUserId,
            description: t.description,
            amount: Number(t.amount),
            type: t.type,
            category: t.category || 'Outros',
            date: new Date(t.date),
            isPaid: t.status === 'Pago',
            paymentMethod: t.paymentMethod || 'DEBIT'
        };
    });

    if (dataToCreate.length > 0) {
        await prisma.transaction.createMany({ data: dataToCreate });
    }

    return { count: dataToCreate.length, partnerId: user?.partnerId };
}

export async function processCsvImportService(userId: string, candidates: any[]) {
    // 1. Define intervalo de busca (Min e Max datas do arquivo)
    const timestamps = candidates.map((c: any) => c.date.getTime());
    const minDate = new Date(Math.min(...timestamps));
    const maxDate = new Date(Math.max(...timestamps));

    // Margem de segurança de 24h
    const searchStart = new Date(minDate); searchStart.setDate(searchStart.getDate() - 1);
    const searchEnd = new Date(maxDate); searchEnd.setDate(searchEnd.getDate() + 1);

    // 2. Busca transações existentes
    const existingTransactions = await prisma.transaction.findMany({
        where: { userId, date: { gte: searchStart, lte: searchEnd } },
        select: { date: true, amount: true, description: true, type: true }
    });

    // 3. Filtra duplicatas
    const transactionsToCreate = candidates.filter((candidate: any) => {
        const cDate = candidate.date.toISOString().split('T')[0];
        const cAmount = Number(candidate.amount).toFixed(2);
        const cDesc = candidate.description.toLowerCase().replace(/[^a-z0-9]/g, '');

        const isDuplicate = existingTransactions.some(existing => {
            const eDate = existing.date.toISOString().split('T')[0];
            const eAmount = Number(existing.amount).toFixed(2);

            if (eDate !== cDate || eAmount !== cAmount || existing.type !== candidate.type) return false;

            const eDesc = existing.description.toLowerCase().replace(/[^a-z0-9]/g, '');
            // Verifica similaridade na descrição
            if (eDesc === cDesc) return true;
            if (cDesc.length > 3 && eDesc.includes(cDesc)) return true;

            return false;
        });

        return !isDuplicate;
    });

    if (transactionsToCreate.length > 0) {
        await prisma.transaction.createMany({ data: transactionsToCreate });
    }

    return {
        total: candidates.length,
        imported: transactionsToCreate.length,
        ignored: candidates.length - transactionsToCreate.length
    };
}

export async function getSubscriptionsService(userId: string) {
    return await prisma.recurringTransaction.findMany({
        where: { userId, active: true },
        orderBy: { amount: 'desc' }
    });
}