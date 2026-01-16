'use client';
import { Trophy } from 'lucide-react';

export default function FinLoveScore({ transactions, limit }: { transactions: any[], limit: number }) {
  // Cálculo Simples do Score (0 a 1000)
  const income = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + Number(t.amount), 0);
  const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + Number(t.amount), 0);
  const investments = transactions.filter(t => t.type === 'INVESTMENT').reduce((acc, t) => acc + Number(t.amount), 0);
  
  let score = 500; // Base
  if (income > expense) score += 200; // Gasta menos que ganha
  if (investments > 0) score += 150; // Investe
  if (expense < limit) score += 100; // Dentro do limite
  if (investments > (income * 0.2)) score += 50; // Investe 20%+

  const getScoreColor = (s: number) => {
    if (s >= 800) return 'text-emerald-400';
    if (s >= 600) return 'text-blue-400';
    if (s >= 400) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-[#1f1630] rounded-3xl border border-white/5 p-6 flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10"><Trophy size={60} /></div>
      <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-2">FinLove Score</h3>
      <div className={`text-5xl font-black ${getScoreColor(score)}`}>{score}</div>
      <p className="text-xs text-gray-500 mt-2 text-center max-w-[150px]">
        {score >= 800 ? "Casal Magnata! 🚀" : score >= 600 ? "No Caminho Certo! ✨" : "Atenção nas Contas! ⚠️"}
      </p>
    </div>
  );
}