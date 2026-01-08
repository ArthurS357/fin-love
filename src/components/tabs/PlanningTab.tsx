'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    Save, Plus, Trash2, LayoutGrid, List,
    DollarSign, TrendingDown, Wallet, Loader2, User, Heart, Sparkles, X
} from 'lucide-react';
import { toast } from 'sonner';
import {
    getMonthlyBudgetAction,
    saveMonthlyBudgetAction,
    generatePlanningAdviceAction, // Importar a nova action
    type BudgetData,
    type BudgetItem
} from '@/app/actions';

interface PlanningTabProps {
    month: number;
    year: number;
    partnerId?: string;
    partnerName?: string;
}

const emptyBudget: BudgetData = {
    incomes: [],
    fixedExpenses: [],
    variableExpenses: []
};

export default function PlanningTab({ month, year, partnerId, partnerName }: PlanningTabProps) {
    const [mode, setMode] = useState<'list' | 'excel'>('list');
    const [viewingPartner, setViewingPartner] = useState(false);
    const [data, setData] = useState<BudgetData>(emptyBudget);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Estados para IA
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState<string | null>(null);

    // Carregar dados
    useEffect(() => {
        let isMounted = true;
        setLoading(true);
        const targetId = viewingPartner ? partnerId : undefined;

        getMonthlyBudgetAction(month, year, targetId).then((fetchedData) => {
            if (isMounted) {
                setData(fetchedData || emptyBudget);
                setLoading(false);
            }
        });
        return () => { isMounted = false; };
    }, [month, year, viewingPartner, partnerId]);

    const totals = useMemo(() => {
        const sum = (items: BudgetItem[]) => items.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
        const totalIncome = sum(data.incomes);
        const totalFixed = sum(data.fixedExpenses);
        const totalVariable = sum(data.variableExpenses);
        const totalExpenses = totalFixed + totalVariable;
        return { totalIncome, totalFixed, totalVariable, totalExpenses, finalBalance: totalIncome - totalExpenses };
    }, [data]);

    const handleSave = async () => {
        if (viewingPartner) {
            toast.error('Modo visualização apenas.');
            return;
        }
        setSaving(true);
        const res = await saveMonthlyBudgetAction(month, year, data);
        setSaving(false);
        if (res?.success) toast.success(res.message);
        else toast.error(res?.error || 'Erro ao salvar');
    };

    // NOVA FUNÇÃO: Chamar IA
    const handleAnalyzeAI = async () => {
        // Validação local rápida antes de ir pro server
        const count = data.fixedExpenses.length + data.variableExpenses.length;
        if (count < 5) {
            toast.info('Adicione pelo menos 5 despesas para ativar a IA.');
            return;
        }

        setAiLoading(true);
        // Salva antes de analisar para garantir que a IA leia o mais atual
        await saveMonthlyBudgetAction(month, year, data);

        const res = await generatePlanningAdviceAction(month, year);
        setAiLoading(false);

        if (res.success) {
            setAiResult(res.message || '');
        } else {
            if (res.details) toast.warning(res.details);
            else toast.error(res.error || 'Erro na análise.');
        }
    };

    // Funções CRUD (mantidas iguais)
    const updateItem = (section: keyof BudgetData, id: string, field: 'name' | 'amount', value: any) => {
        if (viewingPartner) return;
        setData(prev => ({
            ...prev,
            [section]: prev[section].map(item => item.id === id ? { ...item, [field]: value } : item)
        }));
    };
    const addItem = (section: keyof BudgetData) => {
        if (viewingPartner) return;
        const newItem: BudgetItem = { id: crypto.randomUUID(), name: '', amount: 0 };
        setData(prev => ({ ...prev, [section]: [...prev[section], newItem] }));
    };
    const removeItem = (section: keyof BudgetData, id: string) => {
        if (viewingPartner) return;
        setData(prev => ({ ...prev, [section]: prev[section].filter(item => item.id !== id) }));
    };

    if (loading) return <div className="p-12 text-center text-purple-300 animate-pulse">Carregando...</div>;

    return (
        <div className="space-y-6 relative">
            {/* HEADER DE CONTROLE */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#1f1630] p-4 rounded-2xl border border-white/5 shadow-lg">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center bg-[#130b20] p-1 rounded-lg border border-white/10 mr-2">
                        <button onClick={() => setMode('list')} className={`p-2 rounded-md transition ${mode === 'list' ? 'bg-white/10 text-white' : 'text-gray-400'}`}><List size={18} /></button>
                        <button onClick={() => setMode('excel')} className={`p-2 rounded-md transition ${mode === 'excel' ? 'bg-white/10 text-white' : 'text-gray-400'}`}><LayoutGrid size={18} /></button>
                    </div>

                    {partnerId && (
                        <div className="flex items-center bg-[#130b20] p-1 rounded-lg border border-white/10">
                            <button
                                onClick={() => setViewingPartner(false)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${!viewingPartner ? 'bg-purple-600 text-white' : 'text-gray-400'}`}
                            >
                                <User size={14} /> Eu
                            </button>
                            <button
                                onClick={() => setViewingPartner(true)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewingPartner ? 'bg-pink-500 text-white' : 'text-gray-400'}`}
                            >
                                <Heart size={14} /> {partnerName?.split(' ')[0]}
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">

                    {/* BOTÃO IA */}
                    {!viewingPartner && (
                        <button
                            onClick={handleAnalyzeAI}
                            disabled={aiLoading}
                            className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white px-4 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 active:scale-95 shadow-lg border border-white/10"
                            title="Requer pelo menos 5 despesas"
                        >
                            {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-yellow-300" />}
                            <span className="hidden md:inline text-xs">Analisar</span>
                        </button>
                    )}

                    <div className="text-right hidden md:block border-l border-white/10 pl-4">
                        <p className="text-xs text-gray-400">Saldo Previsto</p>
                        <p className={`font-bold ${totals.finalBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            R$ {totals.finalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>

                    {!viewingPartner && (
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95"
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                            {saving ? 'Salvar' : 'Salvar'}
                        </button>
                    )}
                </div>
            </div>

            {/* MODAL RESULTADO IA */}
            {aiResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#1f1630] border border-white/10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                        <div className="bg-[#130b20] p-4 flex justify-between items-center border-b border-white/5">
                            <h3 className="font-bold text-white flex items-center gap-2"><Sparkles className="text-yellow-400" size={18} /> Análise do Planejamento</h3>
                            <button onClick={() => setAiResult(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-6 max-h-[70vh] overflow-y-auto text-sm text-gray-300 leading-relaxed space-y-2">
                            {/* Renderiza o Markdown simples */}
                            <div className="prose prose-invert prose-sm">
                                {aiResult.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                            </div>
                        </div>
                        <div className="p-4 bg-[#130b20] text-center border-t border-white/5">
                            <button onClick={() => setAiResult(null)} className="text-sm text-gray-400 hover:text-white underline">Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* RENDERIZAÇÃO DA PLANILHA (MANTIDA IGUAL) */}
            <div className={`transition-opacity duration-300 ${viewingPartner ? 'opacity-90 pointer-events-none' : ''}`}>
                {mode === 'list' ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <CardList title="Entradas" icon={<DollarSign className="text-green-400" />} items={data.incomes} section="incomes" total={totals.totalIncome} colorClass="border-green-500/20 bg-green-500/5" onAdd={addItem} onUpdate={updateItem} onRemove={removeItem} readOnly={viewingPartner} />
                        <CardList title="Fixos" icon={<Wallet className="text-red-400" />} items={data.fixedExpenses} section="fixedExpenses" total={totals.totalFixed} colorClass="border-red-500/20 bg-red-500/5" onAdd={addItem} onUpdate={updateItem} onRemove={removeItem} readOnly={viewingPartner} />
                        <CardList title="Diversos" icon={<TrendingDown className="text-orange-400" />} items={data.variableExpenses} section="variableExpenses" total={totals.totalVariable} colorClass="border-orange-500/20 bg-orange-500/5" onAdd={addItem} onUpdate={updateItem} onRemove={removeItem} readOnly={viewingPartner} />
                    </div>
                ) : (
                    <div className="bg-[#1f1630] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="grid grid-cols-12 bg-[#2d2440] border-b border-white/10 text-xs font-bold text-gray-400 py-2 px-4 uppercase">
                            <div className="col-span-1 text-center">Tipo</div>
                            <div className="col-span-6">Descrição</div>
                            <div className="col-span-4 text-right">Valor</div>
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

// ... Manter os subcomponentes CardList e ExcelSection iguais ao anterior ...
function CardList({ title, icon, items, section, total, colorClass, onAdd, onUpdate, onRemove, readOnly }: any) {
    return (
        <div className={`rounded-2xl border p-4 flex flex-col h-full ${colorClass}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 font-bold text-white">{icon} <span>{title}</span></div>
                <span className="text-sm font-mono text-gray-300">R$ {total.toFixed(2)}</span>
            </div>
            <div className="flex-1 space-y-2 mb-4">
                {items.map((item: any) => (
                    <div key={item.id} className="flex gap-2 group">
                        <input disabled={readOnly} value={item.name} onChange={(e) => onUpdate(section, item.id, 'name', e.target.value)} placeholder="Descrição" className="bg-[#130b20]/50 border border-white/5 rounded-lg px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-purple-500 disabled:opacity-50" />
                        <input disabled={readOnly} type="number" value={item.amount || ''} onChange={(e) => onUpdate(section, item.id, 'amount', parseFloat(e.target.value))} placeholder="0,00" className="bg-[#130b20]/50 border border-white/5 rounded-lg px-3 py-2 text-sm text-white w-24 text-right focus:outline-none focus:border-purple-500 disabled:opacity-50" />
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
                <div key={item.id} className="grid grid-cols-12 border-b border-white/5 hover:bg-white/[0.02] items-center text-sm group">
                    <div className={`col-span-1 py-3 px-4 text-xs font-bold ${color} opacity-70`}>{label}</div>
                    <div className="col-span-6 py-1 px-2 border-l border-white/5"><input disabled={readOnly} value={item.name} onChange={(e) => onUpdate(section, item.id, 'name', e.target.value)} className="w-full bg-transparent text-white focus:outline-none disabled:opacity-50" /></div>
                    <div className="col-span-4 py-1 px-2 border-l border-white/5"><input disabled={readOnly} type="number" value={item.amount || ''} onChange={(e) => onUpdate(section, item.id, 'amount', parseFloat(e.target.value))} className="w-full bg-transparent text-white text-right focus:outline-none font-mono disabled:opacity-50" /></div>
                    <div className="col-span-1 text-center border-l border-white/5">{!readOnly && <button onClick={() => onRemove(section, item.id)} className="text-gray-600 hover:text-red-400"><Trash2 size={14} /></button>}</div>
                </div>
            ))}
            {!readOnly && <div onClick={() => onAdd(section)} className="grid grid-cols-12 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors group"><div className="col-span-1 py-2 text-center text-gray-600 text-xs">+</div><div className="col-span-11 py-2 px-4 text-gray-600 text-xs italic">Clique para adicionar...</div></div>}
        </div>
    );
}