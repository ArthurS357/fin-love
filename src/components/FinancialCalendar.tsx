'use client';

import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CalendarProps {
  transactions: any[];
  month: number;
  year: number;
}

export default function FinancialCalendar({ transactions, month, year }: CalendarProps) {
  const currentDate = new Date(year, month, 1);
  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const getDayStatus = (date: Date) => {
    const dayTxs = transactions.filter(t => isSameDay(new Date(t.date), date));
    const income = dayTxs.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + Number(t.amount), 0);
    const expense = dayTxs.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + Number(t.amount), 0);
    return { income, expense, hasTx: dayTxs.length > 0 };
  };

  return (
    <div className="bg-[#1f1630] rounded-3xl border border-white/5 p-6 shadow-lg">
      <h3 className="text-sm font-bold text-white mb-4">Calendário Financeiro</h3>
      <div className="grid grid-cols-7 gap-2">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-gray-500 py-2">{d}</div>
        ))}
        {days.map((day) => {
          const { income, expense, hasTx } = getDayStatus(day);
          const isTodayDate = isToday(day);
          
          return (
            <div key={day.toISOString()} className={`aspect-square rounded-xl border flex flex-col items-center justify-center relative transition-all hover:scale-105 ${isTodayDate ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 bg-white/[0.02]'}`}>
              <span className={`text-xs font-bold mb-1 ${isTodayDate ? 'text-white' : 'text-gray-400'}`}>{format(day, 'd')}</span>
              
              {hasTx && (
                <div className="flex gap-1">
                  {income > 0 && <div className="w-1.5 h-1.5 rounded-full bg-green-400" title={`Entrada: R$ ${income}`} />}
                  {expense > 0 && <div className="w-1.5 h-1.5 rounded-full bg-red-400" title={`Saída: R$ ${expense}`} />}
                </div>
              )}
              
              {/* Saldo do dia (Opcional, se houver espaço) */}
              {(income > 0 || expense > 0) && (
                 <span className="text-[8px] text-gray-500 mt-1">
                   {income > expense ? '+' : '-'}
                 </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}