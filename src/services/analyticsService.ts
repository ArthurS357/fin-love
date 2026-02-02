import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth, subMonths, addMonths, format } from 'date-fns';

// ==========================================
// RESUMOS E DASHBOARD
// ==========================================

export async function getFinancialSummaryService(userId: string, month?: number, year?: number) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { partnerId: true } });
    const userIds = [userId];
    if (user?.partnerId) userIds.push(user.partnerId);

    // 1. CÁLCULO DE SALDO REAL (Cash Flow)
    // Agrupamos também por método de pagamento para filtrar o cartão de crédito.
    const summary = await prisma.transaction.groupBy({
        by: ['type', 'paymentMethod'],
        where: { userId: { in: userIds } },
        _sum: { amount: true }
    });

    let totalIncome = 0;
    let totalExpense = 0; // Saída real de dinheiro
    let totalInvested = 0;

    summary.forEach(group => {
        const val = Number(group._sum.amount || 0);

        if (group.type === 'INCOME') {
            totalIncome += val;
        } else if (group.type === 'EXPENSE') {
            // LÓGICA DE CAIXA:
            // Se for CREDIT, o dinheiro ainda não saiu da conta (é dívida).
            // O dinheiro só sai quando houver uma transação de "Pagamento de Fatura" (que é DEBIT).
            // Portanto, ignoramos 'CREDIT' aqui para não duplicar a subtração no saldo.
            if (group.paymentMethod !== 'CREDIT') {
                totalExpense += val;
            }
        } else if (group.type === 'INVESTMENT') {
            totalInvested += val;
        }
    });

    const accumulatedBalance = totalIncome - totalExpense - totalInvested;

    // 2. CÁLCULO DE FATURAS (Dívida Aberta)
    // Aqui somamos tudo que é Crédito e ainda não foi pago (isPaid: false)
    // Isso mostra ao usuário quanto ele tem comprometido no cartão.
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
            isPaid: false, // Importante: Soma apenas o que está em aberto
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

    // Helper para somar gastos do mês (Competência)
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

    // Busca despesas futuras para montar o gráfico de projeção
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
// PERFORMANCE: DADOS PRONTOS PARA O FRONT
// ==========================================

export async function getDashboardStatsService(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { partnerId: true } });
    const userIds = [userId, user?.partnerId].filter(Boolean) as string[];

    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());

    // Agregação por Categoria (para o gráfico de rosca)
    // Faz o cálculo pesado no banco, não no navegador
    const categoryStats = await prisma.transaction.groupBy({
        by: ['category'],
        where: {
            userId: { in: userIds },
            date: { gte: start, lte: end },
            type: 'EXPENSE'
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 5 // Top 5 categorias
    });

    const chartData = categoryStats.map(stat => ({
        name: stat.category,
        value: Number(stat._sum.amount || 0),
        fill: '#8884d8' // O front pode sobrescrever as cores se necessário
    }));

    return { chartData };
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