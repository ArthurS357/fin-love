import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FinLove - Finanças de Casal',
    short_name: 'FinLove',
    description: 'Gerencie suas finanças com amor',
    start_url: '/login', // Ao abrir o app instalado, vai pro login
    display: 'standalone', // Remove a barra de endereço do navegador (parece app nativo)
    background_color: '#130b20',
    theme_color: '#130b20',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      // Ícone mascarável (para Androids novos que cortam o ícone em círculo)
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
  }
}