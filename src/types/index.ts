export interface Transaction {
    id: string;
    description: string;
    amount: number; // No front trabalhamos com number
    type: 'INCOME' | 'EXPENSE' | 'INVESTMENT';
    category: string;
    date: string | Date; // Pode vir como string ISO do servidor
    paymentMethod?: string | null;
    installments?: number | null;
    currentInstallment?: number | null;
    isPaid: boolean;
    userId: string;
}

export interface DashboardProps {
    initialTransactions: Transaction[];
    userName: string;
    userEmail: string;
    spendingLimit: number;
    totalSavings: number;
    savingsGoalName: string;
    accumulatedBalance: number;
    partner?: {
        name: string | null;
        email: string
    } | null;
}