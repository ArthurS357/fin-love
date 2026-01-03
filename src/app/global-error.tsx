'use client'; // Error boundaries precisam ser Client Components

import { useEffect } from 'react';
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Aqui você poderia enviar o erro para um serviço como Sentry
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-[#130b20] text-white flex items-center justify-center min-h-screen p-4 font-sans`}>
        <div className="text-center space-y-6 max-w-md bg-[#1f1630] p-8 rounded-2xl border border-white/10 shadow-2xl">
          <div className="inline-flex items-center justify-center p-4 rounded-full bg-red-500/10 mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-red-500"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold mb-2">Ops! Algo deu errado.</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Encontramos um erro crítico. Não se preocupe, seus dados estão seguros.
            </p>
          </div>

          <button
            onClick={() => reset()}
            className="w-full py-3 px-6 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-pink-500/20"
          >
            Tentar Novamente
          </button>
        </div>
      </body>
    </html>
  );
}