import { prisma } from '@/lib/prisma';
import { transactionSchema } from '@/lib/schemas';
import { addMonths } from 'date-fns';
import { randomUUID } from 'crypto';
import { z } from 'zod';

// Inferimos o tipo diretamente do schema para garantir tipagem forte
type TransactionInput = z.infer<typeof transactionSchema>;

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

    // 1. Normalização de Data (Fuso Horário)
    let baseDate = new Date();
    if (date) {
        baseDate = new Date(date);
        baseDate.setUTCHours(12, 0, 0, 0);
    }

    // 2. Lógica de Cartão de Crédito (Vencimento da Fatura)
    let finalIsPaid = true;

    if (paymentMethod === 'CREDIT') {
        finalIsPaid = false;
        if (creditCardId) {
            const card = await prisma.creditCard.findUnique({ where: { id: creditCardId } });
            if (card) {
                // Se o dia da compra for maior ou igual ao fechamento, joga para o próximo mês
                if (baseDate.getDate() >= card.closingDay) {
                    baseDate = addMonths(baseDate, 1);
                    baseDate.setUTCHours(12, 0, 0, 0);
                }
            }
        }
    }

    // 3. Processamento: Parcelado vs Único
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

        // Batch Insert para performance
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

    // 4. Configuração de Recorrência (Se houver)
    if (isRecurring === 'true' || isRecurring === 'on') {
        let nextRun = addMonths(baseDate, 1);
        nextRun.setUTCHours(12, 0, 0, 0);

        if (recurringDay) {
            const d = new Date(nextRun);
            d.setDate(recurringDay);
            // Ajuste para meses mais curtos (ex: 31/02 -> 28/02)
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

    // Normalização de data se vier no payload
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