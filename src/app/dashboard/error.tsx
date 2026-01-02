'use client'; // Error components devem ser Client Components

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Aqui você poderia logar o erro em um serviço como Sentry
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#130b20] flex flex-col items-center justify-center text-center p-4">
      <div className="bg-red-500/10 p-6 rounded-full mb-6 border border-red-500/20">
        <AlertTriangle size={48} className="text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Algo deu errado!</h2>
      <p className="text-gray-400 mb-8 max-w-md">
        Não conseguimos carregar seus dados financeiros no momento. Pode ser uma instabilidade temporária.
      </p>
      <button
        onClick={() => reset()} // Tenta renderizar a rota novamente
        className="flex items-center gap-2 bg-white text-purple-950 px-6 py-3 rounded-full font-bold hover:bg-gray-100 transition active:scale-95"
      >
        <RefreshCcw size={18} />
        Tentar Novamente
      </button>
    </div>
  );
}