import { prisma } from '@/lib/prisma';

const BADGES_RULES = [
    { code: 'FIRST_TRX', name: 'Primeiro Passo', desc: 'Criou a primeira transação', icon: '🚀' },
    { code: 'SAVER_1', name: 'Poupador Iniciante', desc: 'Guardou dinheiro na caixinha', icon: '🐷' },
    { code: 'COUPLE_GOALS', name: 'Dupla Dinâmica', desc: 'Conectou com o parceiro', icon: '👩‍❤️‍👨' },
    { code: 'BIG_SAVER', name: 'Magnata', desc: 'Acumulou mais de R$ 1.000', icon: '💎' },
    { code: 'CAT_MASTER', name: 'Organizado', desc: 'Criou uma categoria personalizada', icon: '🏷️' },
];

export async function checkBadgesService(userId: string) {
    // 1. Busca dados otimizados em paralelo
    const [earnedBadges, trxCount, userStats, investments, categoriesCount] = await Promise.all([
        prisma.badge.findMany({ where: { userId }, select: { code: true } }),
        prisma.transaction.count({ where: { userId } }),
        prisma.user.findUnique({ where: { id: userId }, select: { partnerId: true } }),
        prisma.transaction.aggregate({ where: { userId, type: 'INVESTMENT' }, _sum: { amount: true } }),
        prisma.category.count({ where: { userId } })
    ]);

    const earnedCodes = earnedBadges.map(b => b.code);
    const newBadges = [];
    const totalSaved = Number(investments._sum.amount || 0);

    // 2. Verifica as regras
    if (trxCount > 0 && !earnedCodes.includes('FIRST_TRX')) {
        newBadges.push(BADGES_RULES.find(b => b.code === 'FIRST_TRX')!);
    }

    if (userStats?.partnerId && !earnedCodes.includes('COUPLE_GOALS')) {
        newBadges.push(BADGES_RULES.find(b => b.code === 'COUPLE_GOALS')!);
    }

    if (totalSaved > 0 && !earnedCodes.includes('SAVER_1')) {
        newBadges.push(BADGES_RULES.find(b => b.code === 'SAVER_1')!);
    }

    if (totalSaved >= 1000 && !earnedCodes.includes('BIG_SAVER')) {
        newBadges.push(BADGES_RULES.find(b => b.code === 'BIG_SAVER')!);
    }

    if (categoriesCount > 0 && !earnedCodes.includes('CAT_MASTER')) {
        newBadges.push(BADGES_RULES.find(b => b.code === 'CAT_MASTER')!);
    }

    // 3. Salva se houver novidades
    if (newBadges.length > 0) {
        for (const badge of newBadges) {
            await prisma.badge.create({
                data: { userId, code: badge.code, name: badge.name, description: badge.desc, icon: badge.icon }
            });
        }
        return newBadges;
    }

    return null;
}

export async function getBadgesService(userId: string) {
    return await prisma.badge.findMany({ where: { userId }, orderBy: { earnedAt: 'desc' } });
}