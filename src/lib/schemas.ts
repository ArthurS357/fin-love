import { z } from 'zod';

// ==========================================
// AUTH SCHEMAS
// ==========================================

export const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual obrigatória"),
  newPassword: z.string().min(6, "Nova senha deve ter 6+ caracteres"),
  confirmPassword: z.string().min(6, "Confirme a senha")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"],
});

// ==========================================
// TRANSACTION SCHEMAS
// ==========================================

export const transactionSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória"),
  amount: z.coerce.number().min(0.01, "Valor deve ser maior que 0"),
  type: z.enum(['INCOME', 'EXPENSE', 'INVESTMENT']),
  category: z.string().min(1, "Categoria é obrigatória"),
  date: z.string().optional(),
  paymentMethod: z.string().optional().default("DEBIT"),
  installments: z.coerce.number().optional().default(1),
  isRecurring: z.string().optional(),
  recurringDay: z.coerce.number().min(1).max(31).optional(),
});

// ==========================================
// CATEGORY SCHEMAS
// ==========================================

export const categorySchema = z.object({
  name: z.string().min(1, "Nome da categoria é obrigatório"),
  icon: z.string().optional(),
  color: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
});

// ==========================================
// USER SETTINGS SCHEMAS
// ==========================================

export const spendingLimitSchema = z.object({
  limit: z.coerce.number().min(0, "Limite inválido"),
});

export const partnerSchema = z.object({
  email: z.string().email("Email inválido"),
});

// ==========================================
// PLANEJAMENTO (BUDGET) SCHEMAS
// ==========================================

export const budgetItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.coerce.number(),
});

export const budgetDataSchema = z.object({
  incomes: z.array(budgetItemSchema),
  fixedExpenses: z.array(budgetItemSchema),
  variableExpenses: z.array(budgetItemSchema),
});

// --- TIPOS EXPORTADOS (Correção aqui) ---
export type BudgetItem = z.infer<typeof budgetItemSchema>; // Adicionado
export type BudgetData = z.infer<typeof budgetDataSchema>;