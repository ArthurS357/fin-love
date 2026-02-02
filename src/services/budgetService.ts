import { prisma } from '@/lib/prisma';
import { budgetDataSchema, BudgetData } from '@/lib/schemas';
import { subMonths } from 'date-fns';
import { randomUUID } from 'crypto';

// ==========================================
// LEITURA
// ==========================================

export async function getMonthlyBudgetService(userId: string, month: number, year: number, targetUserId?: string) {
    let userIdToFetch = userId;

    // Lógica de Permissão: Se pedir dados de outro, verifica se é o parceiro
    if (targetUserId && targetUserId !== userId) {
        const me = await prisma.user.findUnique({ where: { id: userId } });
        if (me?.partnerId === targetUserId) {
            userIdToFetch = targetUserId;
        } else {
            // Se não for parceiro, retorna nulo ou erro (aqui optamos por null para não quebrar a UI)
            return null;
        }
    }

    const budget = await prisma.monthlyBudget.findUnique({
        where: { userId_month_year: { userId: userIdToFetch, month, year } }
    });

    const emptyBudget: BudgetData = { incomes: [], fixedExpenses: [], variableExpenses: [] };

    if (!budget || !budget.data) return emptyBudget;

    // Parse seguro do JSON
    let parsedData = budget.data;
    if (typeof parsedData === 'string') {
        try {
            parsedData = JSON.parse(parsedData);
        } catch {
            return emptyBudget;
        }
    }

    const validation = budgetDataSchema.safeParse(parsedData);
    if (!validation.success) {
        console.warn("[Budget Service] Dados inválidos no banco:", validation.error);
        return emptyBudget;
    }

    return validation.data;
}

// ==========================================
// ESCRITA
// ==========================================

export async function saveMonthlyBudgetService(userId: string, month: number, year: number, data: BudgetData) {
    // Garante que estamos salvando uma string JSON válida se o banco exigir, 
    // ou objeto direto se o Prisma/Driver suportar.
    // Por segurança em ambientes serverless, forçamos o stringify se necessário ou deixamos o Prisma lidar.
    // O schema do Prisma define `data Json`, então passar o objeto direto costuma funcionar,
    // mas em alguns adapters (SQLite/Edge) stringify evita bugs.

    // Vamos validar antes de salvar para não sujar o banco
    const validation = budgetDataSchema.safeParse(data);
    if (!validation.success) {
        throw new Error('Dados de planejamento inválidos.');
    }

    // Upsert: Atualiza se existe, cria se não existe
    await prisma.monthlyBudget.upsert({
        where: { userId_month_year: { userId, month, year } },
        update: { data: data as any }, // 'as any' para calar o TS sobre JsonValue
        create: { userId, month, year, data: data as any }
    });

    return { success: true };
}

export async function importLastMonthBudgetService(userId: string, targetMonth: number, targetYear: number) {
    // 1. Calcular data do mês anterior
    const targetDate = new Date(targetYear, targetMonth, 1);
    const prevDate = subMonths(targetDate, 1);
    const prevMonth = prevDate.getMonth();
    const prevYear = prevDate.getFullYear();

    // 2. Buscar o orçamento anterior
    const prevBudget = await prisma.monthlyBudget.findUnique({
        where: { userId_month_year: { userId, month: prevMonth, year: prevYear } }
    });

    if (!prevBudget || !prevBudget.data) {
        throw new Error('Não há planejamento no mês anterior para copiar.');
    }

    // 3. Parse e Limpeza
    let sourceData = prevBudget.data;
    if (typeof sourceData === 'string') {
        sourceData = JSON.parse(sourceData);
    }

    // Função helper para renovar IDs e limpar status
    const renewItems = (items: any[]) => {
        if (!Array.isArray(items)) return [];
        return items.map(item => ({
            ...item,
            id: randomUUID(), // Gera novo ID único para o novo mês
            isPaid: false,    // Reseta status de pagamento (importante!)
            amount: Number(item.amount)
        }));
    };

    const newData: BudgetData = {
        incomes: renewItems((sourceData as any).incomes),
        fixedExpenses: renewItems((sourceData as any).fixedExpenses),
        variableExpenses: renewItems((sourceData as any).variableExpenses)
    };

    // 4. Salvar no mês atual
    await prisma.monthlyBudget.upsert({
        where: { userId_month_year: { userId, month: targetMonth, year: targetYear } },
        create: { userId, month: targetMonth, year: targetYear, data: newData as any },
        update: { data: newData as any }
    });

    return { success: true };
}