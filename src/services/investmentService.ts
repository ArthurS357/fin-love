import { prisma } from '@/lib/prisma';
import { investmentSchema } from '@/lib/schemas';
import { z } from 'zod';

type InvestmentInput = z.infer<typeof investmentSchema>;

// ==========================================
// SERVIÇOS DE LEITURA
// ==========================================

export async function getInvestmentsService(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { partnerId: true }
    });

    const myInvestments = await prisma.investment.findMany({
        where: { userId },
        orderBy: { currentAmount: 'desc' }
    });

    let partnerInvestments: any[] = [];
    if (user?.partnerId) {
        partnerInvestments = await prisma.investment.findMany({
            where: { userId: user.partnerId },
            orderBy: { currentAmount: 'desc' }
        });
    }

    return { myInvestments, partnerInvestments };
}

// ==========================================
// SERVIÇOS DE ESCRITA (CRÍTICO)
// ==========================================

export async function createInvestmentService(userId: string, data: InvestmentInput) {
    const { name, category, investedAmount, createTransaction, date, autoDeposit } = data;
    const currentAmount = data.currentAmount || investedAmount;

    const txDate = date ? new Date(date) : new Date();
    txDate.setUTCHours(12, 0, 0, 0);

    let transactionId: string | null = null;

    // 1. LÓGICA DE TRANSAÇÃO (Débito e Aporte)
    if (createTransaction === 'on' || createTransaction === 'true') {

        // Busca saldo atual (Conta Corrente)
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { partnerId: true } });
        const userIds = [userId];
        if (user?.partnerId) userIds.push(user.partnerId);

        const summary = await prisma.transaction.groupBy({
            by: ['type'],
            where: { userId: { in: userIds } },
            _sum: { amount: true }
        });

        const totalIncome = Number(summary.find(s => s.type === 'INCOME')?._sum.amount || 0);
        const totalExpense = Number(summary.find(s => s.type === 'EXPENSE')?._sum.amount || 0);
        const totalInvested = Number(summary.find(s => s.type === 'INVESTMENT')?._sum.amount || 0);

        const currentBalance = totalIncome - totalExpense - totalInvested;

        // Se o investimento for maior que o saldo
        if (investedAmount > currentBalance) {

            // Se NÃO autorizou aporte, bloqueia
            if (!autoDeposit || autoDeposit !== 'true') {
                throw new Error(`Saldo insuficiente (R$ ${currentBalance.toFixed(2)}). Ative o 'Aporte Automático' para completar.`);
            }

            // Se autorizou, cria o aporte da diferença (Gap)
            const balanceToConsider = currentBalance > 0 ? currentBalance : 0;
            const gap = investedAmount - balanceToConsider;

            if (gap > 0) {
                await prisma.transaction.create({
                    data: {
                        userId,
                        description: `Aporte Automático: ${name}`,
                        amount: gap,
                        type: 'INCOME',
                        category: 'Aporte Investimento',
                        date: txDate,
                        isPaid: true
                    }
                });
            }
        }

        // Cria a transação de saída (Investimento)
        const transaction = await prisma.transaction.create({
            data: {
                userId,
                description: `Investimento: ${name}`,
                amount: investedAmount,
                type: 'INVESTMENT',
                category: 'Investimentos',
                date: txDate,
                isPaid: true,
            }
        });

        transactionId = transaction.id;
    }

    // 2. Cria o registro de Patrimônio
    await prisma.investment.create({
        data: {
            userId,
            name,
            category,
            investedAmount,
            currentAmount,
            originTransactionId: transactionId
        }
    });

    return { success: true };
}

export async function redeemInvestmentService(userId: string, id: string, amount: number) {
    const investment = await prisma.investment.findUnique({ where: { id } });

    if (!investment || investment.userId !== userId) {
        throw new Error('Investimento não encontrado ou sem permissão.');
    }

    if (amount > investment.currentAmount) {
        throw new Error('Valor de resgate maior que o saldo atual do ativo.');
    }

    // 1. Reduz o saldo do Ativo
    await prisma.investment.update({
        where: { id },
        data: { currentAmount: { decrement: amount } }
    });

    // 2. Credita na Conta Corrente
    await prisma.transaction.create({
        data: {
            userId,
            description: `Resgate: ${investment.name}`,
            amount: amount,
            type: 'INCOME',
            category: 'Resgate Investimento',
            date: new Date(),
            isPaid: true
        }
    });

    return { success: true };
}

export async function updateInvestmentBalanceService(userId: string, id: string, newAmount: number) {
    const investment = await prisma.investment.findUnique({ where: { id } });

    if (!investment || investment.userId !== userId) {
        throw new Error('Não autorizado.');
    }

    await prisma.investment.update({
        where: { id },
        data: { currentAmount: newAmount }
    });

    return { success: true };
}

export async function deleteInvestmentService(userId: string, id: string) {
    const investment = await prisma.investment.findUnique({ where: { id } });

    if (!investment || investment.userId !== userId) {
        throw new Error('Investimento não encontrado.');
    }

    // 1. Remove o registro do Ativo
    await prisma.investment.delete({ where: { id } });

    // 2. LIMPEZA INTELIGENTE (Estorno)
    if (investment.originTransactionId) {
        const debitTransaction = await prisma.transaction.findUnique({
            where: { id: investment.originTransactionId }
        });

        if (debitTransaction) {
            // Remove a saída
            await prisma.transaction.delete({ where: { id: investment.originTransactionId } });

            // Remove o Aporte Automático associado (heurística de tempo e nome)
            const timeWindow = 5000; // 5 segundos
            const minDate = new Date(debitTransaction.createdAt.getTime() - timeWindow);
            const maxDate = new Date(debitTransaction.createdAt.getTime() + timeWindow);

            await prisma.transaction.deleteMany({
                where: {
                    userId,
                    category: 'Aporte Investimento',
                    type: 'INCOME',
                    description: { contains: investment.name },
                    createdAt: { gte: minDate, lte: maxDate }
                }
            });
        }
    }

    return { success: true };
}