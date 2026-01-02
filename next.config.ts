import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Otimização do compilador React (já estava ativado)
  reactCompiler: true,

  // Segurança: Remove o cabeçalho 'X-Powered-By: Next.js' para dificultar detecção por hackers
  poweredByHeader: false,

  // Cabeçalhos de Segurança HTTP
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY', // Previne que seu site seja aberto em iframes (Clickjacking)
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;