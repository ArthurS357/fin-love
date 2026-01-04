import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { JWT_SECRET } from '@/lib/auth'; // <--- Importando a chave centralizada

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  const { pathname } = req.nextUrl;
  
  // 1. Definição de Rotas
  const isPublicRoute = 
    pathname === '/login' || 
    pathname === '/register' || 
    pathname === '/';

  // OBS: Removemos a checagem 'isStaticAsset' pois o config.matcher
  // abaixo já impede que o middleware rode nesses arquivos.

  // 2. Inicializa a resposta (para poder injetar headers depois)
  let response = NextResponse.next();

  // 3. Controle de Acesso (Auth)
  
  // CENÁRIO A: Usuário NÃO logado em rota protegida
  if (!token && !isPublicRoute) {
    const loginUrl = new URL('/login', req.url);
    // Redireciona para login
    return NextResponse.redirect(loginUrl);
  }

  // CENÁRIO B: Usuário LOGADO tentando acessar Login/Register
  if (token && isPublicRoute) {
    try {
      await jwtVerify(token, JWT_SECRET);
      // Se token válido, manda pro dashboard
      return NextResponse.redirect(new URL('/dashboard', req.url));
    } catch (err) {
      // Token inválido/expirado? Limpa o cookie e deixa acessar o login
      response = NextResponse.next();
      response.cookies.delete('token');
    }
  }

  // 4. Headers de Segurança (CRÍTICO PARA FINTECH)
  // Adiciona headers na resposta que vai para o navegador
  
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
  response.headers.set('X-Frame-Options', 'DENY'); // Previne Clickjacking (site rodar em iframe)
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');

  return response;
}

export const config = {
  // Matcher refinado para garantir que estáticos nunca passem pelo middleware
  matcher: [
    /*
     * Corresponde a todos os caminhos de solicitação, exceto:
     * 1. /api/ (rotas de API geralmente têm auth própria ou não usam esse middleware)
     * 2. /_next/static (arquivos estáticos)
     * 3. /_next/image (arquivos de otimização de imagem)
     * 4. favicon.ico, sitemap.xml, robots.txt (metadados)
     * 5. arquivos com extensão (png, jpg, etc)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)',
  ],
};