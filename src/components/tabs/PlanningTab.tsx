'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    Save, Plus, Trash2, LayoutGrid, List,
    DollarSign, TrendingDown, Wallet, Loader2,
    User, Heart, Sparkles, X, CalendarClock, History,
    Copy, CheckSquare, Square, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    getMonthlyBudgetAction,
    saveMonthlyBudgetAction,
    generatePlanningAdviceAction,
    getAiHistoryAction,
    importLastMonthBudgetAction, // <--- Nova action
    type BudgetData,
    type BudgetItem
} from '@/app/actions';

interface PlanningTabProps {
    month: number;
    year: number;
    partnerId?: string;
    partnerName?: string;
}

// Extensão local da interface para incluir o checkbox visual sem mexer no schema global se não quiser
interface ExtendedBudgetItem extends BudgetItem {
    isPaid?: boolean;
}

interface ExtendedBudgetData {
    incomes: ExtendedBudgetItem[];
    fixedExpenses: ExtendedBudgetItem[];
    variableExpenses: ExtendedBudgetItem[];
}

const emptyBudget: ExtendedBudgetData = {
    incomes: [],
    fixedExpenses: [],
    variableExpenses: []
};

// --- RENDERIZADOR MARKDOWN (MANTIDO) ---
const MarkdownRenderer = ({ content }: { content: string }) => {
    if (!content) return null;
    const lines = content.split('\n');
    return (
        <div className="space-y-3 font-sans">
            {lines.map((line, index) => {
                const cleanLine = line.trim();
                if (cleanLine.startsWith('###')) return <h4 key={index} className="text-lg font-bold text-purple-300 mt-6 mb-2 border-b border-white/5 pb-1 flex items-center gap-2">{cleanLine.replace(/###/g, '').trim()}</h4>;
                if (cleanLine.startsWith('##')) return <h5 key={index} className="text-base font-bold text-indigo-300 mt-4 mb-2">{cleanLine.replace(/##/g, '').trim()}</h5>;
                if (cleanLine.startsWith('- ') || cleanLine.startsWith('* ')) {
                    const text = cleanLine.substring(2);
                    const hasBold = text.includes('**');
                    return <div key={index} className="flex gap-3 text-sm text-gray-300 ml-1"><span className="text-purple-500 mt-1.5 text-[8px]">●</span><p className="flex-1 leading-relaxed">{hasBold ? text.split('**').map((part, i) => i % 2 === 1 ? <strong key={i} className="text-white font-semibold">{part}</strong> : part) : text}</p></div>;
                }
                if (cleanLine.length > 0) {
                    const parts = cleanLine.split('**');
                    return <p key={index} className="text-sm text-gray-300 leading-relaxed">{parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="text-white font-semibold bg-white/5 px-1 rounded">{part}</strong> : part)}</p>;
                }
                return <div key={index} className="h-2"></div>;
            })}
        </div>
    );
};

export default function PlanningTab({ month, year, partnerId, partnerName }: PlanningTabProps) {
    const [mode, setMode] = useState<'list' | 'excel'>('list');
    const [viewingPartner, setViewingPartner] = useState(false);
    const [data, setData] = useState<ExtendedBudgetData>(emptyBudget);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [importing, setImporting] = useState(false);

    // IA States
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [aiHistory, setAiHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Carregar Dados
    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        const targetId = viewingPartner ? partnerId : undefined;
        getMonthlyBudgetAction(month, year, targetId).then((fetchedData) => {
            if (isMounted) {
                // Ao carregar, vamos ordenar os itens por dia para ficar bonito
                const sortFn = (a: any, b: any) => (Number(a.day || 99) - Number(b.day || 99));
                const sortedData = fetchedData ? {
                    incomes: fetchedData.incomes.sort(sortFn),
                    fixedExpenses: fetchedData.fixedExpenses.sort(sortFn),
                    variableExpenses: fetchedData.variableExpenses.sort(sortFn),
                } : emptyBudget;

                setData(sortedData as ExtendedBudgetData);
                setLoading(false);
            }
        });
        return () => { isMounted = false; };
    }, [month, year, viewingPartner, partnerId]);

    // Totais e Percentuais
    const stats = useMemo(() => {
        const sum = (items: ExtendedBudgetItem[]) => items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
        const totalIncome = sum(data.incomes);
        const totalExpenses = sum(data.fixedExpenses) + sum(data.variableExpenses);
        const finalBalance = totalIncome - totalExpenses;

        // Percentual Comprometido
        const percentCommitted = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

        return { totalIncome, totalExpenses, finalBalance, percentCommitted };
    }, [data]);

    // Actions
    const handleSave = async () => {
        if (viewingPartner) return toast.error('Modo visualização apenas.');
        setSaving(true);
        // Ordena antes de salvar para garantir consistência
        const sortFn = (a: any, b: any) => (Number(a.day || 99) - Number(b.day || 99));
        const dataToSave = {
            incomes: [...data.incomes].sort(sortFn),
            fixedExpenses: [...data.fixedExpenses].sort(sortFn),
            variableExpenses: [...data.variableExpenses].sort(sortFn),
        };

        const res = await saveMonthlyBudgetAction(month, year, dataToSave);
        setSaving(false);
        if (res?.success) toast.success(res.message);
        else toast.error(res?.error || 'Erro ao salvar');
    };

    const handleImportPrevious = async () => {
        if (!confirm('Isso irá substituir o planejamento atual pelos dados do mês passado. Deseja continuar?')) return;
        setImporting(true);
        const res = await importLastMonthBudgetAction(month, year);
        setImporting(false);
        if (res.success) {
            toast.success('Importado com sucesso! Atualizando...');
            window.location.reload(); // Recarrega para puxar os dados novos
        } else {
            toast.error(res.error || 'Erro ao importar.');
        }
    };

    const handleAnalyzeAI = async () => {
        const count = data.fixedExpenses.length + data.variableExpenses.length;
        if (count < 2 && data.incomes.length < 1) return toast.info('Adicione dados primeiro.');
        setAiLoading(true);
        await saveMonthlyBudgetAction(month, year, data);
        const res = await generatePlanningAdviceAction(month, year);
        setAiLoading(false);
        if (res.success) setAiResult(res.message || '');
        else toast.error(res.error);
    };

    const handleFetchHistory = async () => {
        setLoadingHistory(true);
        setShowHistory(true);
        const h = await getAiHistoryAction(`PLANNING_${month}_${year}`);
        setAiHistory(h.filter((x: any) => x.role === 'model').reverse());
        setLoadingHistory(false);
    };

    // CRUD Local
    const updateItem = (section: keyof ExtendedBudgetData, id: string, field: string, value: any) => {
        if (viewingPartner) return;
        setData(prev => ({
            ...prev,
            [section]: prev[section].map(item => item.id === id ? { ...item, [field]: value } : item)
        }));
    };

    const addItem = (section: keyof ExtendedBudgetData) => {
        if (viewingPartner) return;
        const newItem: ExtendedBudgetItem = { id: crypto.randomUUID(), name: '', amount: 0, day: '', isPaid: false };
        setData(prev => ({ ...prev, [section]: [...prev[section], newItem] }));
    };

    const removeItem = (section: keyof ExtendedBudgetData, id: string) => {
        if (viewingPartner) return;
        setData(prev => ({ ...prev, [section]: prev[section].filter(item => item.id !== id) }));
    };

    if (loading) return <div className="p-12 text-center text-purple-300 animate-pulse">Carregando planejamento...</div>;

    return (
        <div className="space-y-6 relative pb-20">
            {/* --- HEADER --- */}
            <div className="flex flex-col gap-4 bg-[#1f1630] p-4 rounded-2xl border border-white/5 shadow-lg">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        {/* Seletor Visual */}
                        <div className="flex items-center bg-[#130b20] p-1 rounded-lg border border-white/10">
                            <button onClick={() => setMode('list')} className={`p-2 rounded-md transition ${mode === 'list' ? 'bg-white/10 text-white' : 'text-gray-400'}`}><List size={18} /></button>
                            <button onClick={() => setMode('excel')} className={`p-2 rounded-md transition ${mode === 'excel' ? 'bg-white/10 text-white' : 'text-gray-400'}`}><LayoutGrid size={18} /></button>
                        </div>

                        {/* Seletor Parceiro */}
                        {partnerId && (
                            <div className="flex items-center bg-[#130b20] p-1 rounded-lg border border-white/10">
                                <button onClick={() => setViewingPartner(false)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${!viewingPartner ? 'bg-purple-600 text-white' : 'text-gray-400'}`}><User size={14} /> Eu</button>
                                <button onClick={() => setViewingPartner(true)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewingPartner ? 'bg-pink-500 text-white' : 'text-gray-400'}`}><Heart size={14} /> {partnerName?.split(' ')[0]}</button>
                            </div>
                        )}

                        {/* Botão Importar */}
                        {!viewingPartner && (
                            <button onClick={handleImportPrevious} disabled={importing} className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-[#130b20] border border-white/10 text-xs font-bold text-gray-400 hover:text-white hover:border-purple-500 transition ml-2" title="Copiar do mês anterior">
                                {importing ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
                                Importar
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {!viewingPartner && (
                            <>
                                <button onClick={handleFetchHistory} className="p-2.5 rounded-xl bg-[#130b20] border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition"><History size={18} /></button>
                                <button onClick={handleAnalyzeAI} disabled={aiLoading} className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white px-4 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg border border-white/10">
                                    {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-yellow-300" />} <span className="hidden md:inline text-xs">Analisar</span>
                                </button>
                                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 shadow-emerald-500/20 shadow-lg active:scale-95">
                                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Salvar
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* --- BARRA DE COMPROMETIMENTO DA RENDA --- */}
                <div className="mt-2 pt-4 border-t border-white/5">
                    <div className="flex justify-between text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">
                        <span>Comprometimento da Renda</span>
                        <span className={stats.percentCommitted > 90 ? 'text-red-400' : stats.percentCommitted > 70 ? 'text-yellow-400' : 'text-green-400'}>
                            {stats.percentCommitted.toFixed(0)}%
                        </span>
                    </div>
                    <div className="h-2 w-full bg-[#130b20] rounded-full overflow-hidden border border-white/5 relative">
                        {/* Marcadores de 50%, 75% e 100% */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10 z-10" title="50%"></div>
                        <div className="absolute left-[75%] top-0 bottom-0 w-px bg-white/10 z-10" title="75%"></div>

                        <div
                            className={`h-full transition-all duration-700 ease-out ${stats.percentCommitted > 100 ? 'bg-red-500 animate-pulse' :
                                    stats.percentCommitted > 85 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                                        'bg-gradient-to-r from-blue-500 to-purple-500'
                                }`}
                            style={{ width: `${Math.min(stats.percentCommitted, 100)}%` }}
                        />
                    </div>
                    <div className="flex justify-between mt-2 text-xs">
                        <div className="text-gray-400">Entradas: <span className="text-green-400 font-bold">R$ {stats.totalIncome.toLocaleString('pt-BR')}</span></div>
                        <div className="text-gray-400">Saídas: <span className="text-red-400 font-bold">R$ {stats.totalExpenses.toLocaleString('pt-BR')}</span></div>
                        <div className="text-gray-400">Saldo: <span className={`font-bold ${stats.finalBalance >= 0 ? 'text-blue-400' : 'text-red-400'}`}>R$ {stats.finalBalance.toLocaleString('pt-BR')}</span></div>
                    </div>
                </div>
            </div>

            {/* --- MODAIS DE IA E HISTÓRICO (CÓDIGO ANTERIOR MANTIDO) --- */}
            {aiResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#1f1630] border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="bg-[#130b20] p-4 flex justify-between items-center border-b border-white/5 shrink-0">
                            <h3 className="font-bold text-white flex items-center gap-2"><Sparkles className="text-yellow-400" size={18} /> Análise</h3>
                            <button onClick={() => setAiResult(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10"><MarkdownRenderer content={aiResult} /></div>
                    </div>
                </div>
            )}
            {showHistory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#1f1630] border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="bg-[#130b20] p-4 flex justify-between items-center border-b border-white/5 shrink-0">
                            <h3 className="font-bold text-white flex items-center gap-2"><History className="text-purple-400" size={18} /> Histórico</h3>
                            <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-4 overflow-y-auto bg-[#130b20]/50 flex-1 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
                            {loadingHistory ? <div className="text-center py-10 text-gray-500"><Loader2 className="animate-spin mx-auto mb-2" />Carregando...</div> : aiHistory.length === 0 ? <div className="text-center py-10 text-gray-500">Nada encontrado.</div> :
                                aiHistory.map((msg: any) => (
                                    <div key={msg.id} className="bg-[#1f1630] border border-white/5 rounded-xl overflow-hidden shadow-lg">
                                        <div className="bg-[#2d2440] px-4 py-2 text-xs font-bold text-gray-400 border-b border-white/5 flex justify-between">
                                            <span>IA Assistente</span><span>{format(new Date(msg.createdAt), "d/MM HH:mm")}</span>
                                        </div>
                                        <div className="p-5"><MarkdownRenderer content={msg.message} /></div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                </div>
            )}

            {/* --- LISTAS --- */}
            <div className={`transition-opacity duration-300 ${viewingPartner ? 'opacity-90 pointer-events-none' : ''}`}>
                {mode === 'list' ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <CardList title="Entradas" icon={<DollarSign className="text-green-400" />} items={data.incomes} section="incomes" total={0} colorClass="border-green-500/20 bg-green-500/5" onAdd={addItem} onUpdate={updateItem} onRemove={removeItem} readOnly={viewingPartner} showCheck={true} />
                        <CardList title="Fixos" icon={<Wallet className="text-red-400" />} items={data.fixedExpenses} section="fixedExpenses" total={0} colorClass="border-red-500/20 bg-red-500/5" onAdd={addItem} onUpdate={updateItem} onRemove={removeItem} readOnly={viewingPartner} showCheck={true} />
                        <CardList title="Diversos" icon={<TrendingDown className="text-orange-400" />} items={data.variableExpenses} section="variableExpenses" total={0} colorClass="border-orange-500/20 bg-orange-500/5" onAdd={addItem} onUpdate={updateItem} onRemove={removeItem} readOnly={viewingPartner} showCheck={true} />
                    </div>
                ) : (
                    <div className="bg-[#1f1630] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="grid grid-cols-12 bg-[#2d2440] border-b border-white/10 text-xs font-bold text-gray-400 py-2 px-4 uppercase">
                            <div className="col-span-1 text-center">OK</div>
                            <div className="col-span-1 text-center">Dia</div>
                            <div className="col-span-6">Descrição</div>
                            <div className="col-span-3 text-right">Valor</div>
                            <div className="col-span-1 text-center">Ação</div>
                        </div>
                        <div className="max-h-[600px] overflow-y-auto">
                            <ExcelSection items={data.incomes} section="incomes" label="Entrada" color="text-green-400" onAdd={addItem} onUpdate={updateItem} onRemove={removeItem} readOnly={viewingPartner} />
                            <ExcelSection items={data.fixedExpenses} section="fixedExpenses" label="Fixo" color="text-red-400" onAdd={addItem} onUpdate={updateItem} onRemove={removeItem} readOnly={viewingPartner} />
                            <ExcelSection items={data.variableExpenses} section="variableExpenses" label="Diverso" color="text-orange-400" onAdd={addItem} onUpdate={updateItem} onRemove={removeItem} readOnly={viewingPartner} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// --- SUBCOMPONENTES ATUALIZADOS COM CHECKBOX ---

function CardList({ title, icon, items, section, colorClass, onAdd, onUpdate, onRemove, readOnly, showCheck }: any) {
    // Calcula o total localmente para o header do card
    const total = items.reduce((acc: number, item: any) => acc + (Number(item.amount) || 0), 0);

    return (
        <div className={`rounded-2xl border p-4 flex flex-col h-full ${colorClass}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 font-bold text-white">{icon} <span>{title}</span></div>
                <span className="text-sm font-mono text-gray-300">R$ {total.toFixed(2)}</span>
            </div>
            <div className="flex-1 space-y-2 mb-4">
                {items.map((item: any) => (
                    <div key={item.id} className={`flex gap-2 group items-center ${item.isPaid ? 'opacity-50' : ''}`}>
                        {/* CHECKBOX */}
                        {showCheck && !readOnly && (
                            <button
                                onClick={() => onUpdate(section, item.id, 'isPaid', !item.isPaid)}
                                className={`shrink-0 transition-colors ${item.isPaid ? 'text-green-400' : 'text-gray-600 hover:text-gray-400'}`}
                            >
                                {item.isPaid ? <CheckSquare size={18} /> : <Square size={18} />}
                            </button>
                        )}

                        {/* DIA */}
                        <div className="relative w-10 shrink-0">
                            <input
                                disabled={readOnly}
                                value={item.day || ''}
                                onChange={(e) => onUpdate(section, item.id, 'day', e.target.value)}
                                placeholder="Dia"
                                className="w-full bg-[#130b20]/50 border border-white/5 rounded-lg px-1 py-2 text-[10px] text-white focus:outline-none focus:border-purple-500 text-center font-mono"
                                maxLength={2}
                            />
                        </div>

                        {/* INPUTS */}
                        <input disabled={readOnly} value={item.name} onChange={(e) => onUpdate(section, item.id, 'name', e.target.value)} placeholder="Descrição" className={`bg-[#130b20]/50 border border-white/5 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-purple-500 ${item.isPaid ? 'line-through text-gray-500' : ''}`} />
                        <input disabled={readOnly} type="number" value={item.amount || ''} onChange={(e) => onUpdate(section, item.id, 'amount', parseFloat(e.target.value))} placeholder="R$" className="bg-[#130b20]/50 border border-white/5 rounded-lg px-2 py-2 text-sm text-white w-20 text-right focus:outline-none focus:border-purple-500" />

                        {!readOnly && <button onClick={() => onRemove(section, item.id)} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition px-1"><Trash2 size={14} /></button>}
                    </div>
                ))}
            </div>
            {!readOnly && <button onClick={() => onAdd(section)} className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-dashed border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition text-sm"><Plus size={14} /> Adicionar</button>}
        </div>
    );
}

function ExcelSection({ items, section, label, color, onAdd, onUpdate, onRemove, readOnly }: any) {
    return (
        <div className="contents">
            {items.map((item: any) => (
                <div key={item.id} className={`grid grid-cols-12 border-b border-white/5 hover:bg-white/[0.02] items-center text-sm group ${item.isPaid ? 'opacity-40 bg-black/20' : ''}`}>
                    {/* CHECKBOX */}
                    <div className="col-span-1 text-center py-2 flex justify-center">
                        {!readOnly && (
                            <button
                                onClick={() => onUpdate(section, item.id, 'isPaid', !item.isPaid)}
                                className={`transition-colors ${item.isPaid ? 'text-green-400' : 'text-gray-600 hover:text-gray-400'}`}
                            >
                                {item.isPaid ? <CheckSquare size={16} /> : <Square size={16} />}
                            </button>
                        )}
                    </div>

                    {/* DIA */}
                    <div className="col-span-1 py-1 px-2 border-r border-l border-white/5">
                        <input
                            disabled={readOnly}
                            value={item.day || ''}
                            onChange={(e) => onUpdate(section, item.id, 'day', e.target.value)}
                            className="w-full bg-transparent text-gray-400 text-center focus:text-white focus:outline-none text-xs font-mono"
                            placeholder="Dia"
                        />
                    </div>

                    {/* DADOS */}
                    <div className="col-span-6 py-1 px-2 border-l border-white/5">
                        <input disabled={readOnly} value={item.name} onChange={(e) => onUpdate(section, item.id, 'name', e.target.value)} className={`w-full bg-transparent focus:outline-none disabled:opacity-50 ${color} ${item.isPaid ? 'line-through' : ''}`} />
                    </div>
                    <div className="col-span-3 py-1 px-2 border-l border-white/5">
                        <input disabled={readOnly} type="number" value={item.amount || ''} onChange={(e) => onUpdate(section, item.id, 'amount', parseFloat(e.target.value))} className="w-full bg-transparent text-white text-right focus:outline-none font-mono disabled:opacity-50" />
                    </div>
                    <div className="col-span-1 text-center border-l border-white/5">
                        {!readOnly && <button onClick={() => onRemove(section, item.id)} className="text-gray-600 hover:text-red-400"><Trash2 size={14} /></button>}
                    </div>
                </div>
            ))}
            {!readOnly && <div onClick={() => onAdd(section)} className="grid grid-cols-12 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors group"><div className="col-span-2 py-2 text-center text-gray-600 text-xs">+</div><div className="col-span-10 py-2 px-4 text-gray-600 text-xs italic">Adicionar linha...</div></div>}
        </div>
    );
}