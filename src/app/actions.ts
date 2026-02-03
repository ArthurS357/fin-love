'use server'
import 'server-only';

import { revalidatePath, revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// --- SCHEMAS ---
import {
  registerSchema,
  loginSchema,
  transactionSchema,
  categorySchema,
  passwordSchema,
  creditCardSchema,
  investmentSchema
} from '@/lib/schemas'

// CORREÇÃO: Exportando os tipos necessários para o frontend
import type { BudgetData, BudgetItem } from '@/lib/schemas';
export type { BudgetData, BudgetItem };

// --- SERVICES ---
import * as authService from '@/services/authService';
import * as transactionService from '@/services/transactionService';
import * as aiService from '@/services/aiService';
import * as investmentService from '@/services/investmentService';
import * as budgetService from '@/services/budgetService';
import * as userService from '@/services/userService';
import * as creditCardService from '@/services/creditCardService';
import * as analyticsService from '@/services/analyticsService';
import * as gamificationService from '@/services/gamificationService';
import * as categoryService from '@/services/categoryService';

import { getUserId } from '@/lib/auth';

type ActionState = {
  success: boolean
  error: string
  message?: string
  data?: any
}

// ==========================================
// 1. AUTENTICAÇÃO
// ==========================================

export async function registerUser(prevState: any, formData: FormData): Promise<ActionState> {
  const data = Object.fromEntries(formData);
  const validation = registerSchema.safeParse(data);
  if (!validation.success) return { success: false, error: validation.error.issues[0].message };

  try {
    const { token } = await authService.registerService(validation.data);
    const cookieStore = await cookies();
    cookieStore.set('token', token, { httpOnly: true, path: '/' });
    return { success: true, error: '' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao criar conta.' };
  }
}

export async function loginUser(prevState: any, formData: FormData): Promise<ActionState> {
  const data = Object.fromEntries(formData);
  const validation = loginSchema.safeParse(data);
  if (!validation.success) return { success: false, error: validation.error.issues[0].message };

  try {
    const { token } = await authService.loginService(validation.data);
    const cookieStore = await cookies();
    cookieStore.set('token', token, { httpOnly: true, path: '/' });
    return { success: true, error: '' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao entrar.' };
  }
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete('token');
  redirect('/login');
}

// ==========================================
// 2. TRANSAÇÕES
// ==========================================

export async function addTransaction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Usuário não autenticado' };

  const rawData = Object.fromEntries(formData);
  const validation = transactionSchema.safeParse(rawData);
  if (!validation.success) return { error: validation.error.issues[0].message };

  try {
    await transactionService.createTransactionService(userId, validation.data);
    await gamificationService.checkBadgesService(userId);

    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard', 'page');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Erro ao salvar transação.' };
  }
}

export async function updateTransaction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  const id = formData.get('id') as string;
  const rawData = Object.fromEntries(formData);
  const validation = transactionSchema.safeParse(rawData);
  if (!validation.success) return { error: validation.error.issues[0].message };

  try {
    await transactionService.updateTransactionService(userId, id, validation.data);
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard', 'page');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteTransaction(id: string) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  try {
    await transactionService.deleteTransactionService(userId, id);
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard', 'page');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteInstallmentGroupAction(installmentId: string) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  try {
    await transactionService.deleteInstallmentGroupService(userId, installmentId);
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard', 'page');
    return { success: true, message: 'Todas as parcelas foram removidas.' };
  } catch (error) {
    return { error: 'Erro ao excluir parcelas.' };
  }
}

export async function toggleTransactionStatus(id: string, currentStatus: boolean) {
  const userId = await getUserId();
  if (!userId) return;

  await transactionService.toggleTransactionStatusService(userId, id, currentStatus);
  revalidateTag(`dashboard:${userId}`, 'default');
  revalidatePath('/dashboard', 'page');
}

export async function deleteTransactionsAction(ids: string[]) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  try {
    const count = await transactionService.deleteTransactionsService(userId, ids);
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard', 'page');
    return { success: true, message: `${count} transações excluídas!` };
  } catch (error) {
    return { error: 'Erro ao excluir itens.' };
  }
}

// ==========================================
// 3. ANÁLISE E RELATÓRIOS
// ==========================================

export async function getFinancialSummaryAction(month?: number, year?: number) {
  const userId = await getUserId();
  if (!userId) return null;
  return await analyticsService.getFinancialSummaryService(userId, month, year);
}

export async function getMonthlyComparisonAction(month: number, year: number) {
  const userId = await getUserId();
  if (!userId) return { success: false, data: null };
  try {
    const data = await analyticsService.getMonthlyComparisonService(userId, month, year);
    return { success: true, data };
  } catch (e) {
    return { success: false, data: null };
  }
}

export async function getFinancialProjectionAction() {
  const userId = await getUserId();
  if (!userId) return [];
  return await analyticsService.getFinancialProjectionService(userId);
}

export async function exportTransactionsCsvAction(month: number, year: number) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: 'Auth error' };
  try {
    const csv = await analyticsService.exportTransactionsCsvService(userId, month, year);
    return { success: true, csv };
  } catch (error) {
    return { success: false, error: 'Erro ao gerar arquivo.' };
  }
}

// ==========================================
// 4. PARCEIRO & PERFIL
// ==========================================

export async function linkPartnerAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  const email = formData.get('email') as string;

  try {
    const { partnerId } = await userService.linkPartnerService(userId, email);
    await gamificationService.checkBadgesService(userId);
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidateTag(`dashboard:${partnerId}`, 'default');
    revalidatePath('/dashboard', 'page');
    return { success: true, message: 'Conectado!' };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function unlinkPartnerAction() {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };
  try {
    const { partnerId } = await userService.unlinkPartnerService(userId);
    revalidateTag(`dashboard:${userId}`, 'default');
    if (partnerId) revalidateTag(`dashboard:${partnerId}`, 'default');
    revalidatePath('/dashboard', 'page');
    return { success: true, message: 'Desconectado.' };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateProfileNameAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  const name = formData.get('name') as string;
  try {
    await userService.updateProfileNameService(userId, name);
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard', 'page');
    return { success: true, message: 'Nome atualizado!' };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateSpendingLimitAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  const limit = parseFloat(formData.get('limit') as string);
  try {
    await userService.updateSpendingLimitService(userId, limit);
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard', 'page');
    return { success: true, message: 'Limite atualizado!' };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateSavingsGoalNameAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  const name = formData.get('name') as string;
  try {
    const { partnerId } = await userService.updateSavingsGoalNameService(userId, name);
    revalidateTag(`dashboard:${userId}`, 'default');
    if (partnerId) revalidateTag(`dashboard:${partnerId}`, 'default');
    revalidatePath('/dashboard', 'page');
    return { success: true, message: 'Meta atualizada!' };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updatePasswordAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };

  const validation = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!validation.success) return { error: validation.error.issues[0].message };

  try {
    await authService.updatePasswordService(userId, validation.data);
    return { success: true, message: 'Senha atualizada!' };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteAccountAction() {
  const userId = await getUserId();
  if (!userId) return { error: 'Não autorizado' };
  try {
    await userService.deleteAccountService(userId);
    const cookieStore = await cookies();
    cookieStore.delete('token');
    return { success: true };
  } catch (error) {
    return { error: 'Erro ao excluir conta.' };
  }
}

export async function forgotPasswordAction(formData: FormData) {
  try {
    await authService.forgotPasswordService(formData.get('email') as string);
    return { success: true };
  } catch (error) { return { success: true }; }
}

export async function resetPasswordAction(token: string, formData: FormData) {
  try {
    await authService.resetPasswordService(token, formData.get('password') as string);
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

// ==========================================
// 5. INTELIGÊNCIA ARTIFICIAL
// ==========================================

export async function getAiHistoryAction(context: string = 'GENERAL') {
  const userId = await getUserId();
  if (!userId) return [];
  return await aiService.getAiHistoryService(userId, context);
}

export async function clearAiHistoryAction(context: string = 'GENERAL') {
  const userId = await getUserId();
  if (!userId) return { success: false };
  await aiService.clearAiHistoryService(userId, context);
  revalidatePath('/dashboard', 'page');
  return { success: true };
}

export async function generateFinancialAdviceAction(tone: string = 'FRIENDLY') {
  const userId = await getUserId();
  if (!userId) return { success: false, error: 'Auth error' };
  try {
    const advice = await aiService.generateFinancialAdviceService(userId, tone);
    revalidatePath('/dashboard', 'page');
    return { success: true, message: advice };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==========================================
// 6. CATEGORIAS & EXTRAS
// ==========================================

export async function getCategoriesAction() {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error', data: [] };
  const categories = await categoryService.getCategoriesService(userId);
  return { success: true, data: categories };
}

export async function createCategoryAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };
  const rawData = Object.fromEntries(formData);
  const validation = categorySchema.safeParse(rawData);
  if (!validation.success) return { error: validation.error.issues[0].message };

  try {
    await categoryService.createCategoryService(userId, validation.data);
    await gamificationService.checkBadgesService(userId);
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard', 'page');
    return { success: true, message: 'Categoria criada!' };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function deleteCategoryAction(id: string) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };
  try {
    await categoryService.deleteCategoryService(userId, id);
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard', 'page');
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

// ==========================================
// 7. RECORRÊNCIA
// ==========================================

export async function checkRecurringTransactionsAction() {
  const userId = await getUserId();
  if (!userId) return;

  try {
    // Implementar se necessário, sem revalidatePath
  } catch (err) {
    console.error("Erro recorrência:", err)
  }
}

// ==========================================
// 8. PLANEJAMENTO E INVESTIMENTOS
// ==========================================

export async function getMonthlyBudgetAction(month: number, year: number, targetUserId?: string) {
  const userId = await getUserId();
  if (!userId) return null;
  return await budgetService.getMonthlyBudgetService(userId, month, year, targetUserId);
}

export async function saveMonthlyBudgetAction(month: number, year: number, data: BudgetData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error', success: false };
  try {
    await budgetService.saveMonthlyBudgetService(userId, month, year, data);
    revalidatePath('/dashboard', 'page');
    return { success: true, message: 'Planejamento salvo!', error: '' };
  } catch (error: any) {
    return { error: error.message, success: false };
  }
}

export async function importLastMonthBudgetAction(targetMonth: number, targetYear: number) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error', success: false };
  try {
    await budgetService.importLastMonthBudgetService(userId, targetMonth, targetYear);
    revalidatePath('/dashboard', 'page');
    return { success: true, message: 'Dados importados!' };
  } catch (error: any) {
    return { error: error.message, success: false };
  }
}

export async function generatePlanningAdviceAction(month: number, year: number) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error', success: false };
  try {
    const advice = await aiService.generatePlanningAdviceService(userId, month, year);
    return { success: true, message: advice, error: '' };
  } catch (error: any) {
    return { error: error.message, success: false };
  }
}

// --- CORREÇÃO APLICADA AQUI ---
export async function addInvestmentAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: 'Auth error' };
  const rawData = Object.fromEntries(formData);
  const validation = investmentSchema.safeParse(rawData);
  if (!validation.success) return { success: false, error: validation.error.issues[0].message };

  try {
    await investmentService.createInvestmentService(userId, validation.data);
    await gamificationService.checkBadgesService(userId);
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard', 'page');
    return { success: true, message: 'Investimento realizado!' };
  } catch (error: any) {
    let currentBalance = undefined;
    if (error.message.includes('Saldo insuficiente') || error.message.includes('R$')) {
      try {
        const balanceData = await userService.getUserBalanceService(userId);
        currentBalance = balanceData.total;
      } catch (ignored) { }
    }
    // Retorno padronizado com success: false
    return { success: false, error: error.message, currentBalance };
  }
}

export async function addSavingsAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: 'Auth error' };
  const amount = parseFloat(formData.get('amount') as string);

  try {
    await investmentService.createInvestmentService(userId, {
      name: formData.get('description') as string || 'Caixinha',
      category: 'OUTROS',
      investedAmount: amount,
      createTransaction: 'true',
      date: new Date().toISOString()
    } as any);

    await gamificationService.checkBadgesService(userId);
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard', 'page');
    return { success: true, message: 'Valor guardado!' };
  } catch (error: any) {
    let currentBalance = undefined;
    if (error.message.includes('Saldo insuficiente') || error.message.includes('R$')) {
      try {
        const balanceData = await userService.getUserBalanceService(userId);
        currentBalance = balanceData.total;
      } catch (ignored) { }
    }
    // Retorno padronizado com success: false
    return { success: false, error: error.message, currentBalance };
  }
}

export async function redeemInvestmentAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };
  try {
    await investmentService.redeemInvestmentService(userId, formData.get('id') as string, parseFloat(formData.get('amount') as string));
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard', 'page');
    return { success: true, message: 'Resgate realizado!' };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getInvestmentsAction() {
  const userId = await getUserId();
  if (!userId) return { myInvestments: [], partnerInvestments: [] };
  return await investmentService.getInvestmentsService(userId);
}

export async function updateInvestmentBalanceAction(id: string, newCurrentAmount: number) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };
  try {
    await investmentService.updateInvestmentBalanceService(userId, id, newCurrentAmount);
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard', 'page');
    return { success: true, message: 'Saldo atualizado!' };
  } catch (error) {
    return { error: 'Erro ao atualizar.' };
  }
}

export async function deleteInvestmentAction(id: string) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: 'Auth error' };
  try {
    await investmentService.deleteInvestmentService(userId, id);
    revalidateTag(`investments:${userId}`, 'default');
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard', 'page');
    return { success: true, message: 'Investimento removido!' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createCreditCardAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };
  const validation = creditCardSchema.safeParse(Object.fromEntries(formData));
  if (!validation.success) return { error: validation.error.issues[0].message };
  try {
    await creditCardService.createCreditCardService(userId, validation.data);
    revalidatePath('/dashboard', 'page');
    return { success: true, message: 'Cartão adicionado!' };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function getCreditCardsAction() {
  const userId = await getUserId();
  if (!userId) return [];
  return await creditCardService.getCreditCardsService(userId);
}

export async function deleteCreditCardAction(id: string) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };
  try {
    await creditCardService.deleteCreditCardService(userId, id);
    revalidatePath('/dashboard', 'page');
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function payCreditCardBillAction(cardId: string, month: number, year: number) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };
  try {
    const res = await creditCardService.payCreditCardBillService(userId, cardId, month, year);
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard', 'page');
    return res;
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function checkBadgesAction() {
  const userId = await getUserId();
  if (!userId) return;
  await gamificationService.checkBadgesService(userId);
}

export async function getBadgesAction() {
  const userId = await getUserId();
  if (!userId) return [];
  return await gamificationService.getBadgesService(userId);
}

export async function getSubscriptionsAction() {
  const userId = await getUserId();
  if (!userId) return [];
  return await transactionService.getSubscriptionsService(userId);
}

export async function createBulkTransactionsAction(transactions: any[]) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: 'Auth error' };
  try {
    const { count, partnerId } = await transactionService.createBulkTransactionsService(userId, transactions);
    revalidateTag(`dashboard:${userId}`, 'default');
    if (partnerId) revalidateTag(`dashboard:${partnerId}`, 'default');
    revalidatePath('/dashboard', 'page');
    return { success: true, count };
  } catch (error) {
    return { success: false, error: 'Erro ao importar dados.' };
  }
}

export async function importTransactionsCsvAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: 'Auth error' };
  const file = formData.get('file') as File;
  if (!file) return { success: false, error: 'Arquivo inválido.' };

  try {
    const text = await file.text();
    const lines = text.split('\n');
    const candidates = [];
    const startIndex = (lines[0]?.toLowerCase().includes('data') || lines[0]?.toLowerCase().includes('valor')) ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      const parts = line.split(',');
      if (parts.length < 3) continue;
      const clean = (s: string) => s?.replace(/^"|"$/g, '').trim();
      const dateStr = clean(parts[0]);
      const description = clean(parts[1]);
      const amountStr = clean(parts[2]);
      if (!dateStr || !amountStr) continue;
      const [day, month, year] = dateStr.split('/').map(Number);
      if (!day || !month) continue;
      const currentYear = new Date().getFullYear();
      const finalYear = (year && year > 1900) ? year : currentYear;
      const dateObj = new Date(finalYear, month - 1, day);
      dateObj.setUTCHours(12, 0, 0, 0);
      const amount = parseFloat(amountStr);
      if (isNaN(amount)) continue;
      candidates.push({
        userId,
        description: description || 'Sem descrição',
        amount: Math.abs(amount),
        type: amount < 0 ? 'EXPENSE' : 'INCOME',
        category: 'Importado',
        date: dateObj,
        isPaid: true,
        paymentMethod: 'DEBIT'
      });
    }

    if (candidates.length === 0) return { success: false, error: 'Nenhuma transação válida encontrada.' };
    const res = await transactionService.processCsvImportService(userId, candidates);
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard', 'page');
    let msg = `${res.imported} importadas com sucesso!`;
    if (res.ignored > 0) msg += ` (${res.ignored} duplicadas ignoradas)`;
    return { success: true, count: res.imported, message: msg };
  } catch (error) {
    return { success: false, error: 'Erro ao processar arquivo.' };
  }
}

export async function sendPartnerMessageAction(category: 'LOVE' | 'FINANCE' | 'ALERT', message: string) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };
  try {
    const { partnerId } = await userService.sendPartnerMessageService(userId, category, message);
    revalidateTag(`dashboard:${partnerId}`, 'default');
    revalidateTag(`dashboard:${userId}`, 'default');
    revalidatePath('/dashboard', 'page');
    return { success: true, message: 'Enviado!' };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getPartnerMessagesAction() {
  const userId = await getUserId();
  if (!userId) return [];
  return await userService.getPartnerMessagesService(userId);
}

export async function getTransactionChatAction(transactionId: string) {
  const userId = await getUserId();
  if (!userId) return [];
  const tag = `[TRX:${transactionId}]`;
  const msgs = await userService.getPartnerMessagesService(userId);
  return msgs.filter((m: any) => m.message.includes(tag)).map((m: any) => ({
    ...m, message: m.message.replace(tag, '').trim()
  }));
}

export async function sendTransactionMessageAction(transactionId: string, text: string) {
  const userId = await getUserId();
  if (!userId) return { error: 'Auth error' };
  const tag = `[TRX:${transactionId}]`;
  return await sendPartnerMessageAction('FINANCE', `${tag} ${text}`);
}

export async function getDashboardStatsAction() {
  const userId = await getUserId();
  if (!userId) return { chartData: [] };
  return await analyticsService.getDashboardStatsService(userId);
}