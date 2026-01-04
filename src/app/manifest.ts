import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'FinLove',
        short_name: 'FinLove',
        description: 'Gerencie suas finanças com amor.',
        start_url: '/dashboard',
        display: 'standalone',
        background_color: '#130b20',
        theme_color: '#130b20',
        orientation: 'portrait', // Otimização: App financeiro geralmente é vertical
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
            {
                src: '/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
            }
        ],
        // OTIMIZAÇÃO: Atalhos (Quick Actions) ao segurar o ícone
        shortcuts: [
            {
                name: "Nova Transação",
                short_name: "Novo",
                description: "Adicionar despesa ou receita",
                url: "/dashboard?new=true", // Você pode tratar esse query param no Dashboard para abrir o modal
                icons: [{ src: "/icon-192.png", sizes: "192x192" }]
            },
            {
                name: "Minhas Metas",
                short_name: "Metas",
                url: "/dashboard?tab=goals",
                icons: [{ src: "/icon-192.png", sizes: "192x192" }]
            }
        ]
    };
}