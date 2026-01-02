import { z } from 'zod';

// Schema para Registro
export const registerSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  email: z.string().email('Insira um e-mail válido.'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres.'),
});

// Schema para Login
export const loginSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(1, 'A senha é obrigatória.'),
});

// Schema para Transações (Adicionar/Editar)
export const transactionSchema = z.object({
  amount: z.coerce.number().positive('O valor deve ser positivo.'),
  description: z.string().min(2, 'Descrição muito curta.'),
  category: z.string().min(1, 'Selecione uma categoria.'),
  // CORREÇÃO: 'as const' para fixar o tipo e 'message' direta em vez de errorMap
  type: z.enum(['INCOME', 'EXPENSE', 'INVESTMENT'] as const, {
    message: 'Tipo de transação inválido.',
  }),
});

// Schema para Categorias
export const categorySchema = z.object({
  name: z.string().min(2, 'Nome da categoria muito curto.'),
  color: z.string().regex(/^#/, 'Cor inválida.'),
  icon: z.string().optional(),
});

// Schema para Parceiro (Link)
export const partnerSchema = z.object({
  email: z.string().email('E-mail do parceiro inválido.'),
});

// Schema para Limite de Gastos
export const spendingLimitSchema = z.object({
  limit: z.coerce.number().nonnegative('O limite não pode ser negativo.'),
});

// Schema para Senha
export const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual necessária.'),
  newPassword: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres.'),
});