import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { JWT_SECRET } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  const { pathname } = req.nextUrl;

  // Lista de rotas que não exigem autenticação
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password'
  ];

  // Verifica se a rota atual é pública
  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith('/reset-password') // Suporte para /reset-password?token=...
  );

  // Inicializa a resposta padrão (continuar a navegação)
  let response = NextResponse.next();

  // -------------------------------------------------------------------------
  // 1. LÓGICA DE AUTENTICAÇÃO
  // -------------------------------------------------------------------------

  if (!token) {
    // SEM TOKEN
    if (!isPublicRoute) {
      // Se tentar acessar rota protegida sem token -> Redireciona para Login
      response = NextResponse.redirect(new URL('/login', req.url));
    }
    // Se for rota pública sem token, deixa passar (response = next)
  } else {
    // COM TOKEN
    try {
      // Verifica validade e assinatura do JWT
      await jwtVerify(token, JWT_SECRET);

      // Se o token for válido e o usuário estiver em rota pública (ex: login)
      // Redireciona para o Dashboard (já está logado)
      if (isPublicRoute) {
        response = NextResponse.redirect(new URL('/dashboard', req.url));
      }

    } catch (err) {
      // TOKEN INVÁLIDO OU EXPIRADO

      if (!isPublicRoute) {
        // Se estava em rota protegida -> Manda pro Login
        response = NextResponse.redirect(new URL('/login', req.url));
      }

      // Importante: Remove o cookie podre para evitar loops ou estados inconsistentes
      // Note que precisamos deletar no objeto 'response' que será retornado
      response.cookies.delete('token');
    }
  }

  // -------------------------------------------------------------------------
  // 2. HEADERS DE SEGURANÇA
  // -------------------------------------------------------------------------
  // Aplicamos os headers na resposta final (seja ela um redirect ou um next)

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' *.vercel-insights.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');

  return response;
}

// Configuração para evitar que o middleware rode em arquivos estáticos ou API routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - arquivos com extensão (png, jpg, svg, etc)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)',
  ],
};