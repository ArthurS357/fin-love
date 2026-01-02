import React, { useState } from 'react';
import { Search, Filter, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface HistoryTabProps {
  transactions: any[];
  onEdit: (t: any) => void;
  onDelete: (id: string) => void;
}

export default function HistoryTab({ transactions, onEdit, onDelete }: HistoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtragem local baseada na busca
  const filteredData = transactions.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-[#1f1630] rounded-xl border border-purple-900/30 overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-300">
      
      {/* Barra de Ferramentas */}
      <div className="p-4 border-b border-purple-900/30 flex flex-col md:flex-row justify-between items-center gap-4 bg-[#251b36]">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Filter size={18} className="text-purple-400" /> Extrato
        </h2>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar lançamento..."
            className="w-full bg-[#130b20] border border-purple-900/50 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-purple-500 placeholder-gray-600 transition"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-[#2a2235] text-gray-400 text-xs uppercase tracking-wider">
              <th className="p-4 font-semibold">Dia</th>
              <th className="p-4 font-semibold">Descrição</th>
              <th className="p-4 font-semibold">Categoria</th>
              <th className="p-4 font-semibold text-right">Valor</th>
              <th className="p-4 font-semibold text-center w-24">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-purple-900/20 text-sm">
            {filteredData.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">Nenhum registro encontrado.</td></tr>
            ) : filteredData.map((t) => (
              <tr key={t.id} className="hover:bg-purple-900/10 transition group">
                <td className="p-4 text-gray-400 font-mono">{format(t.date, 'dd')}</td>
                <td className="p-4 font-medium text-white">{t.description}</td>
                <td className="p-4">
                  {t.type === 'INCOME' ? ( // Usando type aqui pois category pode ser editado
                    <span className="text-gray-500 italic text-xs">Receita</span>
                  ) : (
                    <span className="bg-purple-900/40 border border-purple-500/20 px-2 py-1 rounded text-xs text-purple-200">{t.category}</span>
                  )}
                </td>
                <td className={`p-4 text-right font-bold ${t.type === 'INCOME' ? 'text-green-400' : 'text-red-400'}`}>
                  {t.type === 'INCOME' ? '+' : '-'} {t.amount.toFixed(2)}
                </td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(t)} className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded transition">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => onDelete(t.id)} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}