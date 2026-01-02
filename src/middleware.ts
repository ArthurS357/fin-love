import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key')

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value
  const { pathname } = request.nextUrl

  // Rotas públicas que não precisam de login
  const publicRoutes = ['/login', '/register', '/']

  // 1. Se for rota pública e tiver token, manda pro dashboard
  if (publicRoutes.includes(pathname) && token) {
    try {
      await jwtVerify(token, JWT_SECRET)
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } catch (e) {
      // Token inválido, deixa passar para login
    }
  }

  // 2. Se for rota protegida (dashboard) e NÃO tiver token
  if (!publicRoutes.includes(pathname) && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 3. Se tiver token em rota protegida, verifica validade
  if (!publicRoutes.includes(pathname) && token) {
    try {
      await jwtVerify(token, JWT_SECRET)
    } catch (e) {
      // Se o token for inválido/expirado, remove e manda pro login
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('token')
      return response
    }
  }

  return NextResponse.next()
}

// Configura em quais rotas o middleware roda
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}