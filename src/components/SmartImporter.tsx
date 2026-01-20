'use client';

import { useState } from 'react';
import { Upload, FileText, Clipboard, Check, AlertCircle, Loader2 } from 'lucide-react';
import { importTransactionsCsvAction } from '@/app/actions'; // Reutiliza a action de CSV (basta adaptar o formato)
import { toast } from 'sonner';

export default function SmartImporter() {
    const [activeTab, setActiveTab] = useState<'FILE' | 'TEXT'>('FILE');
    const [textInput, setTextInput] = useState('');
    const [loading, setLoading] = useState(false);

    // Função mágica para processar texto copiado de PDF
    const parseTextToCsv = (text: string) => {
        const lines = text.split('\n');
        let csv = "Data,Descrição,Valor\n";
        let count = 0;

        // Regex comum para extratos (Data DD/MM + Descrição + Valor)
        // Ex: 12/05 UBER DO BRASIL -25,90
        const regex = /(\d{2}\/\d{2}(?:\/\d{4})?)\s+(.*?)\s+(-?[\d\.,]+)/;

        lines.forEach(line => {
            const match = line.match(regex);
            if (match) {
                const date = match[1];
                const desc = match[2].trim();
                // Limpa valor (R$, pontos, troca vírgula por ponto)
                let valStr = match[3].replace(/[^\d,\.-]/g, '').replace(',', '.');

                // Ajuste para formato brasileiro 1.000,00 -> 1000.00
                if (valStr.includes('.') && valStr.includes(',')) {
                    valStr = valStr.replace('.', '').replace(',', '.');
                } else if (valStr.includes(',')) {
                    valStr = valStr.replace(',', '.');
                }

                csv += `${date},${desc},${valStr}\n`;
                count++;
            }
        });

        return { csv, count };
    };

    const handleImport = async () => {
        if (!textInput.trim()) return;
        setLoading(true);

        try {
            const { csv, count } = parseTextToCsv(textInput);

            if (count === 0) {
                toast.error("Não entendi o texto. Tente copiar apenas as linhas das transações.");
                setLoading(false);
                return;
            }

            // Envia como se fosse um arquivo CSV padrão
            const formData = new FormData();
            const blob = new Blob([csv], { type: 'text/csv' });
            formData.append('file', blob, 'paste_import.csv');

            const result = await importTransactionsCsvAction(formData); // Certifique-se que essa action existe e aceita 'file'

            if (result.success) {
                toast.success(`${result.count} transações importadas via Texto!`);
                setTextInput('');
            } else {
                toast.error(result.error || "Erro ao importar.");
            }
        } catch (e) {
            console.error(e);
            toast.error("Erro interno.");
        }
        setLoading(false);
    };

    return (
        <div className="bg-[#1f1630] border border-white/5 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <Upload size={18} className="text-pink-500" /> Importação Inteligente
                </h3>
                <div className="flex bg-black/20 rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab('FILE')}
                        className={`p-2 rounded-md transition ${activeTab === 'FILE' ? 'bg-white/10 text-white' : 'text-gray-500'}`}
                        title="Arquivo CSV/OFX"
                    >
                        <FileText size={16} />
                    </button>
                    <button
                        onClick={() => setActiveTab('TEXT')}
                        className={`p-2 rounded-md transition ${activeTab === 'TEXT' ? 'bg-white/10 text-white' : 'text-gray-500'}`}
                        title="Colar Texto (PDF)"
                    >
                        <Clipboard size={16} />
                    </button>
                </div>
            </div>

            {activeTab === 'TEXT' ? (
                <div className="space-y-3 animate-in fade-in">
                    <textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="Cole aqui o texto do seu PDF ou Extrato Bancário..."
                        className="w-full h-32 bg-[#130b20] border border-white/10 rounded-xl p-3 text-xs text-gray-300 focus:border-pink-500 outline-none resize-none custom-scrollbar"
                    />
                    <div className="flex justify-between items-center">
                        <p className="text-[10px] text-gray-500 flex items-center gap-1">
                            <AlertCircle size={10} /> Detecta Data, Nome e Valor automaticamente.
                        </p>
                        <button
                            onClick={handleImport}
                            disabled={loading || !textInput}
                            className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Processar
                        </button>
                    </div>
                </div>
            ) : (
                <div className="h-32 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:border-pink-500/50 hover:bg-pink-500/5 transition cursor-pointer animate-in fade-in">
                    <Upload size={24} className="mb-2 opacity-50" />
                    <span className="text-xs">Arraste seu CSV ou OFX aqui</span>
                    <span className="text-[9px] opacity-50 mt-1">(Em breve: Suporte a PDF nativo)</span>
                </div>
            )}
        </div>
    );
}