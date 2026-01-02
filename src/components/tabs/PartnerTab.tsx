import React from 'react';
import { Heart } from 'lucide-react';

export default function PartnerTab() {
  return (
    <div className="text-center py-20 animate-in fade-in slide-in-from-right-8">
      <div className="inline-flex items-center justify-center p-6 bg-pink-500/10 rounded-full mb-6 ring-1 ring-pink-500/30">
        <Heart size={64} className="text-pink-500" />
      </div>
      <h2 className="text-3xl font-bold text-white mb-2">Reserva do Casal</h2>
      <p className="text-gray-400 max-w-md mx-auto mb-8">
        Conecte-se com seu parceiro(a) para visualizar o progresso dos sonhos em conjunto.
      </p>
      
      <button className="bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 px-8 rounded-full transition shadow-lg shadow-pink-900/20">
        Gerar Link de Convite
      </button>
    </div>
  );
}