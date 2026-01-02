// app/page.tsx
import { getTransactions } from './actions';
import Dashboard from '@/components/Dashboard';

// Força a página a não fazer cache estático, para sempre ter dados frescos
export const dynamic = 'force-dynamic';

export default async function Page() {
  const transactions = await getTransactions();

  return (
    // Passamos os dados do servidor para o cliente
    <Dashboard initialTransactions={transactions} />
  );
}