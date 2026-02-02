import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { budgetDataSchema } from '@/lib/schemas';
import { differenceInHours } from 'date-fns';

// ==========================================
// HELPER PRIVADO: Comunicação com a API
// ==========================================
async function callGeminiApi(prompt: string): Promise<string> {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('Chave de API do Google não configurada.');

    // Lista de modelos para fallback (robustez)
    const modelsToTry = [
        "models/gemini-1.5-flash",
        "models/gemini-1.5-flash-8b",
        "gemini-2.0-flash-exp",
        "models/gemini-pro"
    ];

    const genAI = new GoogleGenerativeAI(apiKey);
    let lastError;

    for (const modelName of modelsToTry) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 400, // Ajustado para respostas concisas
                },
            });
            return result.response.text();
        } catch (error: any) {
            lastError = error;
            console.warn(`[IA Service] Falha em ${modelName}:`, error.message?.substring(0, 50));
            if (error.message?.includes('API key')) throw new Error('Chave de API inválida.');
            continue;
        }
    }

    if (lastError?.message?.includes('429')) {
        throw new Error('Muitas requisições. Aguarde um momento.');
    }
    throw new Error("Serviço de IA indisponível no momento.");
}

// ==========================================
// SERVIÇOS PÚBLICOS
// ==========================================

export async function getAiHistoryService(userId: string, context: string = 'GENERAL') {
    return await prisma.aiChat.findMany({
        where: { userId, context },
        orderBy: { createdAt: 'asc' },
        take: 50
    });
}

export async function clearAiHistoryService(userId: string, context: string = 'GENERAL') {
    await prisma.aiChat.deleteMany({ where: { userId, context } });
    return { success: true };
}

export async function generateFinancialAdviceService(userId: string, tone: string = 'FRIENDLY') {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { partner: true }
    });

    if (!user) throw new Error('Usuário não encontrado.');

    // --- CACHE INTELIGENTE ---
    // Verifica se já existe um conselho recente (menos de 24h)
    // Isso evita gastar cota da API se o usuário ficar recarregando a página.
    if (user.lastAdvice && user.lastAdviceDate) {
        const hoursSinceLast = differenceInHours(new Date(), new Date(user.lastAdviceDate));
        if (hoursSinceLast < 24) {
            return user.lastAdvice;
        }
    }

    // Busca dados recentes (30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transactions = await prisma.transaction.findMany({
        where: {
            userId: { in: [userId, user.partnerId || ''].filter(Boolean) },
            date: { gte: thirtyDaysAgo }
        },
        orderBy: { date: 'desc' },
        take: 15
    });

    if (transactions.length === 0) {
        // Retorna mensagem padrão sem chamar a IA se não tiver dados
        return "Você ainda não possui transações suficientes nos últimos 30 dias para uma análise detalhada. Comece registrando seus gastos!";
    }

    // Prepara o Prompt
    const txSummary = transactions.map(t => {
        const typeLabel = t.type === 'EXPENSE' ? 'Gasto' : 'Receita';
        return `- ${t.description} (${t.category}): R$ ${Number(t.amount).toFixed(2)} [${typeLabel}]`;
    }).join('\n');

    const instructions: Record<string, string> = {
        STRICT: "Seja um auditor financeiro rigoroso. Aponte erros e exija eficiência.",
        COACH: "Seja um coach motivacional. Use emojis, celebre vitórias e inspire.",
        POETIC: "Seja poético e filosófico sobre o dinheiro e o tempo.",
        FRIENDLY: "Seja um amigo conselheiro, tom leve e empático."
    };

    const personality = instructions[tone] || instructions.FRIENDLY;

    const prompt = `
    ${personality}
    CONTEXTO: Usuário ${user.name}. Meta de gastos: R$ ${Number(user.spendingLimit).toFixed(2)}.
    DADOS RECENTES:
    ${txSummary}
    
    REQUISITOS:
    - Markdown obrigatório.
    - Estrutura: ### 📊 Onde foi o dinheiro | ### ⚠️ Pontos de Atenção | ### 💡 Dica de Ouro
    - Máximo 250 palavras.
  `;

    // Chama a IA
    const adviceText = await callGeminiApi(prompt);

    // Salva no Histórico e no Perfil (Atualiza cache)
    await prisma.$transaction([
        prisma.aiChat.create({
            data: { userId, role: 'model', message: adviceText, context: 'GENERAL' }
        }),
        prisma.user.update({
            where: { id: userId },
            data: { lastAdvice: adviceText, lastAdviceDate: new Date() }
        })
    ]);

    return adviceText;
}

export async function generatePlanningAdviceService(userId: string, month: number, year: number) {
    const budget = await prisma.monthlyBudget.findUnique({
        where: { userId_month_year: { userId, month, year } }
    });

    if (!budget || !budget.data) throw new Error('Nenhum planejamento encontrado para este mês.');

    // Parse seguro dos dados
    let parsedData = budget.data;
    if (typeof parsedData === 'string') {
        try { parsedData = JSON.parse(parsedData); } catch { throw new Error('Dados corrompidos.'); }
    }

    const validation = budgetDataSchema.safeParse(parsedData);
    if (!validation.success) throw new Error('Formato de planejamento inválido.');

    const data = validation.data;

    // Formatação para o Prompt
    const fmt = (item: any) => `${item.day ? `[Dia ${item.day}] ` : ''}${item.name}: R$ ${Number(item.amount).toFixed(2)}`;

    const prompt = `
    CONTEXTO: Análise de Planejamento Financeiro para ${month + 1}/${year}.
    DADOS:
    - Entradas: ${data.incomes.map(fmt).join('; ') || 'Zero'}
    - Fixos: ${data.fixedExpenses.map(fmt).join('; ') || 'Zero'}
    - Variáveis: ${data.variableExpenses.map(fmt).join('; ') || 'Zero'}
    
    TAREFA:
    1. Verifique fluxo de caixa (Entradas cobrem Saídas?).
    2. Aponte dias críticos de vencimento.
    3. Dê uma sugestão prática.
    Responda em Markdown.
  `;

    const adviceText = await callGeminiApi(prompt);

    await prisma.aiChat.create({
        data: {
            userId,
            role: 'model',
            message: adviceText,
            context: `PLANNING_${month}_${year}`
        }
    });

    return adviceText;
}