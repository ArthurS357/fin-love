// components/ui/FloatingButton.tsx
import React from 'react';
import { Plus } from 'lucide-react';
import { useScrollDirection } from '@/hooks/useScrollDirection';

interface FloatingButtonProps {
  onClick: () => void;
}

export default function FloatingButton({ onClick }: FloatingButtonProps) {
  const scrollDirection = useScrollDirection();
  
  // O botão aparece se estivermos no topo OU se rolarmos para cima.
  // Se rolar para baixo ('down'), ele se esconde.
  const isVisible = scrollDirection !== 'down';

  return (
    <div 
      className={`fixed top-24 left-1/2 -translate-x-1/2 z-30 transition-all duration-500 ease-in-out ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-32 opacity-0'
      }`}
    >
      <button 
        onClick={onClick}
        className="bg-purple-600 hover:bg-purple-500 text-white w-14 h-14 rounded-full shadow-2xl shadow-purple-600/50 flex items-center justify-center border-4 border-[#1f1630] active:scale-95 transition-transform"
        aria-label="Adicionar Nova Transação"
      >
        <Plus size={28} strokeWidth={3} />
      </button>
    </div>
  );
}