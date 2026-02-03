import { prisma } from '@/lib/prisma';
import { spendingLimitSchema, partnerSchema } from '@/lib/schemas';
import { z } from 'zod';

// ==========================================
// SALDO E CONTEXTO FINANCEIRO (NOVO)
// ==========================================

export async function getUserBalanceService(userId: string) {
    // 1. Identifica se é conta conjunta
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { partnerId: true }
    });

    const userIds = [userId];
    if (user?.partnerId) userIds.push(user.partnerId);

    // 2. Agrupa valores por tipo (apenas pagos)
    const summary = await prisma.transaction.groupBy({
        by: ['type'],
        where: {
            userId: { in: userIds },
            isPaid: true
        },
        _sum: { amount: true }
    });

    // 3. Converte e calcula
    const totalIncome = Number(summary.find(s => s.type === 'INCOME')?._sum.amount || 0);
    const totalExpense = Number(summary.find(s => s.type === 'EXPENSE')?._sum.amount || 0);
    const totalInvested = Number(summary.find(s => s.type === 'INVESTMENT')?._sum.amount || 0);

    // Saldo disponível
    const total = totalIncome - totalExpense - totalInvested;

    return { total, totalIncome, totalExpense, totalInvested };
}

// ==========================================
// GESTÃO DE PERFIL
// ==========================================

export async function updateProfileNameService(userId: string, name: string) {
    if (!name || name.trim().length < 2) {
        throw new Error('Nome deve ter pelo menos 2 caracteres.');
    }

    await prisma.user.update({
        where: { id: userId },
        data: { name: name.trim() }
    });

    return { success: true };
}

export async function deleteAccountService(userId: string) {
    // O delete do Prisma com CASCADE (configurado no schema) deve limpar 
    // transações e dados relacionados automaticamente.
    await prisma.user.delete({ where: { id: userId } });
    return { success: true };
}

// ==========================================
// CONFIGURAÇÕES FINANCEIRAS
// ==========================================

export async function updateSpendingLimitService(userId: string, limit: number) {
    // Validação via Zod manual para garantir consistência
    const result = spendingLimitSchema.safeParse({ limit });
    if (!result.success) throw new Error(result.error.issues[0].message);

    await prisma.user.update({
        where: { id: userId },
        data: { spendingLimit: limit }
    });

    return { success: true };
}

export async function updateSavingsGoalNameService(userId: string, name: string) {
    if (!name || name.trim().length === 0) throw new Error('Nome da meta inválido.');

    const me = await prisma.user.findUnique({ where: { id: userId } });
    if (!me) throw new Error('Usuário não encontrado.');

    // Atualiza a meta para o usuário
    await prisma.user.update({
        where: { id: userId },
        data: { savingsGoal: name }
    });

    // Se tiver parceiro, sincroniza a meta (opcional, mas recomendado para casais)
    if (me.partnerId) {
        await prisma.user.update({
            where: { id: me.partnerId },
            data: { savingsGoal: name }
        });
    }

    return { success: true, partnerId: me.partnerId }; // Retorna partnerId para revalidação
}

// ==========================================
// GESTÃO DE PARCEIRO (CONEXÃO)
// ==========================================

export async function linkPartnerService(userId: string, email: string) {
    // Valida email
    const result = partnerSchema.safeParse({ email });
    if (!result.success) throw new Error(result.error.issues[0].message);

    const me = await prisma.user.findUnique({ where: { id: userId } });
    if (!me) throw new Error('Usuário autenticado não encontrado.');

    // Regras de Negócio para Conexão
    if (me.email === email) throw new Error('Você não pode se conectar a si mesmo.');
    if (me.partnerId) throw new Error('Você já possui uma conexão ativa.');

    const partner = await prisma.user.findUnique({ where: { email } });
    if (!partner) throw new Error('Usuário com este email não encontrado.');
    if (partner.partnerId) throw new Error('Este usuário já tem um parceiro.');

    // Transação Atômica: Conecta ambos os lados
    await prisma.$transaction([
        prisma.user.update({ where: { id: me.id }, data: { partnerId: partner.id } }),
        prisma.user.update({ where: { id: partner.id }, data: { partnerId: me.id } })
    ]);

    return { success: true, partnerId: partner.id };
}

export async function unlinkPartnerService(userId: string) {
    const me = await prisma.user.findUnique({ where: { id: userId } });
    if (!me || !me.partnerId) throw new Error('Nenhuma conexão ativa para desfazer.');

    const partnerId = me.partnerId;

    // Transação Atômica: Desconecta ambos os lados
    await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { partnerId: null } }),
        prisma.user.update({ where: { id: partnerId }, data: { partnerId: null } })
    ]);

    return { success: true, partnerId };
}

// ==========================================
// MENSAGENS (Love/Finance/Alert)
// ==========================================

export async function sendPartnerMessageService(userId: string, category: 'LOVE' | 'FINANCE' | 'ALERT', message: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { partnerId: true }
    });

    if (!user?.partnerId) throw new Error('Sem parceiro conectado para enviar mensagem.');

    await prisma.partnerMessage.create({
        data: {
            senderId: userId,
            receiverId: user.partnerId,
            category,
            message
        }
    });

    return { success: true, partnerId: user.partnerId };
}

export async function getPartnerMessagesService(userId: string) {
    // Busca as últimas 10 mensagens entre o casal
    const messages = await prisma.partnerMessage.findMany({
        where: {
            OR: [
                { receiverId: userId },
                { senderId: userId }
            ]
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { sender: { select: { name: true } } }
    });

    // Reverte para ordem cronológica (chat style) se necessário no front,
    // ou mantém desc para timeline. Aqui retornamos bruto do banco.
    return messages.reverse();
}