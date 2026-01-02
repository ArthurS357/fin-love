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
        ],
    };
}