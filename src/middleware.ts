import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secretStr = process.env.JWT_SECRET;
const JWT_SECRET = new TextEncoder().encode(secretStr || 'default_secret');

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  const { pathname } = req.nextUrl;

  // 1. Rotas Públicas (Não precisam de login)
  const isPublicRoute = 
    pathname === '/login' || 
    pathname === '/register' || 
    pathname === '/'; // Landing page se houver

  // 2. Rotas Estáticas (Imagens, PWA, Next internals) - IMPORTANTE IGNORAR
  const isStaticAsset = 
    pathname.startsWith('/_next') || 
    pathname.startsWith('/static') || 
    pathname.includes('.') || // Pega .png, .ico, .json
    pathname.startsWith('/api'); // Opcional: Se quiser tratar API diferente

  if (isStaticAsset) {
    return NextResponse.next();
  }

  // CENÁRIO A: Usuário NÃO logado tentando acessar rota protegida
  if (!token && !isPublicRoute) {
    const loginUrl = new URL('/login', req.url);
    // Opcional: Salvar a url que ele tentou ir para redirecionar depois
    return NextResponse.redirect(loginUrl);
  }

  // CENÁRIO B: Usuário JÁ logado tentando acessar Login/Register
  if (token && isPublicRoute) {
    try {
      // Verifica se o token é válido antes de redirecionar
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.redirect(new URL('/dashboard', req.url));
    } catch (err) {
      // Se o token for inválido (expirado), deixa ele ir pro login e limpa o cookie
      const response = NextResponse.next();
      response.cookies.delete('token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  // Matcher otimizado para excluir arquivos estáticos nativamente
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)',
  ],
};