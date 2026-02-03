import {
    Transaction as PrismaTransaction,
    Investment as PrismaInvestment,
    CreditCard as PrismaCreditCard,
    User as PrismaUser
} from '@prisma/client';

// 1. CORREÇÃO: Definimos manualmente, pois no schema.prisma o tipo é String
export type TransactionType = 'INCOME' | 'EXPENSE' | 'INVESTMENT';

// ==========================================
// TRANSAÇÕES
// ==========================================
// 2. CORREÇÃO: Adicionei 'currentInstallment' ao Omit para evitar conflito de tipos
// (Prisma diz que é number|null, Front quer number|null|undefined)
export interface Transaction extends Omit<PrismaTransaction, 'amount' | 'date' | 'currentInstallment'> {
    amount: number;
    date: string | Date;

    // Agora podemos definir como opcional sem o TypeScript reclamar
    currentInstallment?: number | null;

    // Opcional: Forçar tipagem mais estrita no front se desejar
    type: string;
}

// ==========================================
// INVESTIMENTOS
// ==========================================
export interface Investment extends Omit<PrismaInvestment, 'investedAmount' | 'currentAmount' | 'createdAt' | 'updatedAt'> {
    investedAmount: number;
    currentAmount: number;
    createdAt: string | Date;
    updatedAt: string | Date;
}

// ==========================================
// CARTÃO DE CRÉDITO
// ==========================================
export interface CreditCardData extends Omit<PrismaCreditCard, 'limit'> {
    limit: number;
}

// ==========================================
// USUÁRIO
// ==========================================
export interface UserProfile extends Omit<PrismaUser, 'password' | 'spendingLimit'> {
    spendingLimit: number;
}

// ==========================================
// DASHBOARD & PROPS
// ==========================================

export interface FinancialStats {
    income: number;
    expense: number;
    balance: number;
}

export interface DashboardProps {
    initialTransactions: Transaction[];
    userName: string;
    userEmail: string;
    spendingLimit: number;
    totalSavings: number;
    savingsGoalName: string;
    accumulatedBalance: number;

    selectedDate: {
        month: number;
        year: number;
    };

    partner?: {
        id: string;
        name: string | null;
        email: string;
    } | null;

    creditCards: CreditCardData[];
    totalCreditOpen: number;
}