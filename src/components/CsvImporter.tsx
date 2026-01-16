'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { UploadCloud, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { createBulkTransactionsAction } from '@/app/actions';
import { toast } from 'sonner';

export default function CsvImporter() {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const parsedData = results.data.map((row: any) => {
          // Converte "150,00" para 150.00
          const amountStr = row['Valor']?.replace('.', '').replace(',', '.') || '0';
          
          // Converte data "11/01/2026" para Date Object
          const [d, m, y] = (row['Data'] || '').split('/');
          const dateObj = new Date(Number(y), Number(m) - 1, Number(d));

          return {
            date: dateObj.toISOString(),
            description: row['Descrição'] || 'Sem descrição',
            category: row['Categoria'] || 'Geral',
            type: row['Tipo'] || 'EXPENSE',
            amount: parseFloat(amountStr),
            status: row['Status'], // 'Pago' ou 'Pendente'
            owner: row['Quem'], // 'Você' ou 'Yasmin'
            paymentMethod: row['Status'] === 'Pendente' ? 'CREDIT' : 'DEBIT' // Inferência simples
          };
        });

        const res = await createBulkTransactionsAction(parsedData);
        
        if (res.success) {
          toast.success(`${res.count} transações importadas com sucesso!`);
        } else {
          toast.error("Erro ao importar CSV.");
        }
        setIsUploading(false);
      },
      error: () => {
        toast.error("Erro ao ler o arquivo.");
        setIsUploading(false);
      }
    });
  };

  return (
    <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:bg-white/5 transition-colors cursor-pointer relative group">
      <input 
        type="file" 
        accept=".csv" 
        onChange={handleFileUpload} 
        disabled={isUploading}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />
      <div className="flex flex-col items-center gap-3">
        {isUploading ? (
          <Loader2 className="animate-spin text-purple-400" size={32} />
        ) : (
          <UploadCloud className="text-gray-400 group-hover:text-purple-400 transition-colors" size={32} />
        )}
        <div>
          <p className="text-sm font-bold text-white">Arraste seu CSV ou clique aqui</p>
          <p className="text-xs text-gray-500 mt-1">Formato: Data, Quem, Descrição, Categoria...</p>
        </div>
      </div>
    </div>
  );
}