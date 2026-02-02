import { prisma } from '@/lib/prisma';
import { creditCardSchema } from '@/lib/schemas';
import { startOfMonth, endOfMonth } from 'date-fns';
import { z } from 'zod';

type CreditCardInput = z.infer<typeof creditCardSchema>;

// ==========================================
// CRUD BÁSICO
// ==========================================

export async function createCreditCardService(userId: string, data: CreditCardInput) {
    const validation = creditCardSchema.safeParse(data);
    if (!validation.success) {
        throw new Error(validation.error.issues[0].message);
    }

    await prisma.creditCard.create({
        data: {
            userId,
            name: data.name,
            closingDay: data.closingDay,
            dueDay: data.dueDay,
            limit: data.limit || 0
        }
    });

    return { success: true };
}

export async function getCreditCardsService(userId: string) {
    return await prisma.creditCard.findMany({
        where: { userId },
        orderBy: { name: 'asc' }
    });
}

export async function deleteCreditCardService(userId: string, id: string) {
    const card = await prisma.creditCard.findUnique({ where: { id } });

    if (!card || card.userId !== userId) {
        throw new Error('Cartão não encontrado ou sem permissão.');
    }

    // O schema do Prisma deve estar configurado com onDelete: Cascade ou SetNull
    // Caso contrário, isso pode falhar se houver transações vinculadas.
    // Assumimos aqui que a intenção é excluir o cartão e manter o histórico (se SetNull) 
    // ou apagar tudo (se Cascade). No seu schema original não tinha Cascade explícito na relação inversa,
    // mas vamos proceder com o delete padrão.
    await prisma.creditCard.delete({ where: { id } });

    return { success: true };
}

// ==========================================
// LÓGICA DE PAGAMENTO DE FATURA (CRÍTICO)
// ==========================================

export async function payCreditCardBillService(userId: string, cardId: string, month: number, year: number) {
    // 1. Validação de Segurança
    const card = await prisma.creditCard.findUnique({ where: { id: cardId } });
    if (!card || card.userId !== userId) {
        throw new Error('Cartão inválido.');
    }

    // 2. Definição do Período da Fatura
    const start = startOfMonth(new Date(year, month, 1));
    const end = endOfMonth(new Date(year, month, 1));

    // Vamos usar transaction para garantir consistência:
    // (Atualizar status das compras + Criar o débito do pagamento)
    await prisma.$transaction(async (tx) => {

        // A. Marca todas as transações pendentes deste cartão/mês como PAGAS
        // Isso evita que elas continuem somando como "Fatura Aberta"
        await tx.transaction.updateMany({
            where: {
                userId,
                creditCardId: cardId,
                date: { gte: start, lte: end },
                isPaid: false
            },
            data: { isPaid: true }
        });

        // B. Calcula o valor total da fatura (Soma de todos os gastos no período)
        // Nota: Somamos tudo (mesmo o que já estava pago manualmente) para garantir
        // que o valor debitado da conta seja o total real da fatura gerada pelo banco.
        // Se quiser somar apenas o que foi pago AGORA, teria que mudar a lógica.
        const totalInvoice = await tx.transaction.aggregate({
            where: {
                userId,
                creditCardId: cardId,
                date: { gte: start, lte: end },
                type: 'EXPENSE'
            },
            _sum: { amount: true }
        });

        const totalValue = Number(totalInvoice._sum.amount || 0);

        // C. Cria a transação de saída na Conta Corrente
        if (totalValue > 0) {
            await tx.transaction.create({
                data: {
                    userId,
                    description: `Pagamento Fatura: ${card.name}`,
                    amount: totalValue,
                    type: 'EXPENSE',
                    category: 'Pagamento de Fatura', // Categoria fixa para facilitar relatórios
                    date: new Date(), // Sai da conta HOJE
                    paymentMethod: 'DEBIT',
                    isPaid: true
                }
            });
        }
    });

    return { success: true, message: 'Fatura paga e saldo debitado!' };
}