import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { JWT_SECRET } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  const { pathname } = req.nextUrl;
  
  const isPublicRoute = 
    pathname === '/login' || 
    pathname === '/register' || 
    pathname === '/';

  let response = NextResponse.next();

  // 1. Se não houver token em rota protegida -> Login
  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 2. Se houver token (seja em rota pública ou privada), verificar validade
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      
      // Se estiver numa rota pública (Login/Register) e o token for válido -> Dashboard
      if (isPublicRoute) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      
      // Se for rota protegida e token válido -> Passa (NextResponse.next())
      
    } catch (err) {
      // Token inválido ou expirado
      
      if (!isPublicRoute) {
        // Se estava a tentar aceder ao Dashboard com token podre -> Login
        response = NextResponse.redirect(new URL('/login', req.url));
      }
      
      // Limpa o cookie inválido em qualquer caso
      response.cookies.delete('token');
      return response;
    }
  }

  // Headers de Segurança (Mantidos)
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

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)',
  ],
};