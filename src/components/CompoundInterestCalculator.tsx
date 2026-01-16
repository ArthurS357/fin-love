'use client';
import { useState } from 'react';
import { TrendingUp } from 'lucide-react';

export default function CompoundInterestCalculator() {
    const [monthly, setMonthly] = useState(300);
    const [years, setYears] = useState(5);
    const rate = 0.10; // 10% ao ano (média razoável)

    const futureValue = (monthly * (((1 + rate / 12) ** (years * 12)) - 1)) / (rate / 12);

    return (
        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-3xl p-6 text-white shadow-xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><TrendingUp /> Simulador Futuro Rico</h3>

            <div className="space-y-4">
                <div>
                    <label className="text-xs text-indigo-200">Se eu guardar por mês:</label>
                    <input type="number" value={monthly} onChange={e => setMonthly(Number(e.target.value))} className="w-full bg-black/20 rounded-lg p-2 mt-1 text-xl font-bold" />
                </div>
                <div>
                    <label className="text-xs text-indigo-200">Durante (anos):</label>
                    <input type="range" min="1" max="30" value={years} onChange={e => setYears(Number(e.target.value))} className="w-full mt-2 accent-pink-500" />
                    <div className="text-right text-sm font-bold">{years} anos</div>
                </div>

                <div className="pt-4 border-t border-white/10">
                    <p className="text-xs text-indigo-200">Eu terei aproximadamente:</p>
                    <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500">
                        {futureValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                </div>
            </div>
        </div>
    );
}