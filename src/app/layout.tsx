import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FinLove - Finanças para Casais",
  description: "Gerencie suas finanças em conjunto, alcance metas e realize sonhos a dois.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-[#130b20] text-gray-100 antialiased selection:bg-pink-500/30 selection:text-pink-200`}>
        {/* Renderiza as páginas */}
        {children}
        
        {/* Componente de notificações (Toasts) */}
        <Toaster 
          position="top-center" 
          richColors 
          theme="dark" 
          toastOptions={{
            style: { background: '#1f1630', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }
          }}
        />
      </body>
    </html>
  );
}