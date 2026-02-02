import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth, subMonths, addMonths, format } from 'date-fns';

// ==========================================
// RESUMOS E DASHBOARD
// ==========================================

export async function getFinancialSummaryService(userId: string, month?: number, year?: number) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { partnerId: true } });
    const userIds = [userId];
    if (user?.partnerId) userIds.push(user.partnerId);

    // 1. Saldo Acumulado (Geral)
    const summary = await prisma.transaction.groupBy({
        by: ['type'],
        where: { userId: { in: userIds } },
        _sum: { amount: true }
    });

    const totalIncome = Number(summary.find(s => s.type === 'INCOME')?._sum.amount || 0);
    const totalExpense = Number(summary.find(s => s.type === 'EXPENSE')?._sum.amount || 0);
    const totalInvested = Number(summary.find(s => s.type === 'INVESTMENT')?._sum.amount || 0);
    const accumulatedBalance = totalIncome - totalExpense - totalInvested;

    // 2. Fatura em Aberto (Mês selecionado + Atrasados)
    let dateFilter = {};
    if (month !== undefined && year !== undefined) {
        const end = endOfMonth(new Date(year, month, 1));
        dateFilter = { date: { lte: end } };
    }

    const creditSummary = await prisma.transaction.aggregate({
        where: {
            userId: { in: userIds },
            type: 'EXPENSE',
            paymentMethod: 'CREDIT',
            isPaid: false,
            ...dateFilter
        },
        _sum: { amount: true }
    });

    const totalCreditOpen = Number(creditSummary._sum.amount || 0);

    return { accumulatedBalance, totalCreditOpen };
}

export async function getMonthlyComparisonService(userId: string, month: number, year: number) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { partnerId: true } });
    const userIds = [userId, user?.partnerId].filter(Boolean) as string[];

    const currentDate = new Date(year, month, 1);
    const prevDate = subMonths(currentDate, 1);

    const getMonthTotal = async (date: Date) => {
        const start = startOfMonth(date);
        const end = endOfMonth(date);

        const result = await prisma.transaction.aggregate({
            where: {
                userId: { in: userIds },
                date: { gte: start, lte: end },
                type: 'EXPENSE'
            },
            _sum: { amount: true }
        });
        return Number(result._sum.amount || 0);
    };

    const currentTotal = await getMonthTotal(currentDate);
    const prevTotal = await getMonthTotal(prevDate);

    let diffPercent = 0;
    if (prevTotal > 0) {
        diffPercent = ((currentTotal - prevTotal) / prevTotal) * 100;
    } else if (currentTotal > 0) {
        diffPercent = 100;
    }

    return {
        currentTotal,
        prevTotal,
        diffPercent: Number(diffPercent.toFixed(1)),
        increased: currentTotal > prevTotal
    };
}

export async function getFinancialProjectionService(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { partnerId: true } });
    const userIds = [userId];
    if (user?.partnerId) userIds.push(user.partnerId);

    const start = new Date();
    const end = addMonths(start, 12);

    const transactions = await prisma.transaction.findMany({
        where: {
            userId: { in: userIds },
            date: { gte: start, lte: end },
            type: 'EXPENSE'
        },
        select: { date: true, amount: true }
    });

    const projection: Record<string, number> = {};

    transactions.forEach(t => {
        const key = format(t.date, 'MM/yyyy');
        projection[key] = (projection[key] || 0) + Number(t.amount);
    });

    return Object.entries(projection)
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => {
            const [ma, ya] = a.date.split('/').map(Number);
            const [mb, yb] = b.date.split('/').map(Number);
            return new Date(ya, ma - 1).getTime() - new Date(yb, mb - 1).getTime();
        });
}

// ==========================================
// EXPORTAÇÃO
// ==========================================

export async function exportTransactionsCsvService(userId: string, month: number, year: number) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { partnerId: true, name: true, partner: { select: { name: true } } }
    });

    const userIds = [userId];
    if (user?.partnerId) userIds.push(user.partnerId);

    const start = startOfMonth(new Date(year, month, 1));
    const end = endOfMonth(new Date(year, month, 1));

    const transactions = await prisma.transaction.findMany({
        where: {
            userId: { in: userIds },
            date: { gte: start, lte: end }
        },
        orderBy: { date: 'desc' },
        include: { user: { select: { name: true } } }
    });

    const safeString = (str: string) => {
        if (!str) return '';
        let clean = str.replace(/,/g, ' ').replace(/\n/g, ' ');
        if (/^[=+\-@]/.test(clean)) return `'${clean}`;
        return clean;
    };

    const header = "Data,Quem,Descrição,Categoria,Tipo,Valor,Status\n";

    const rows = transactions.map(t => {
        const dateStr = format(t.date, 'dd/MM/yyyy');
        const ownerName = t.userId === userId ? 'Você' : (t.user?.name?.split(' ')[0] || 'Parceiro');
        const amountStr = t.amount.toFixed(2).replace('.', ',');
        const status = t.isPaid ? 'Pago' : 'Pendente';
        return `${dateStr},${ownerName},${safeString(t.description)},${safeString(t.category)},${t.type},${amountStr},${status}`;
    }).join('\n');

    return header + rows;
}