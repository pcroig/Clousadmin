// ========================================
// Middleware - Route Protection
// ========================================
// Protege rutas que requieren autenticación

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth-edge';

import { UsuarioRol } from '@/lib/constants/enums';

// Rutas públicas (no requieren autenticación)
const publicPaths = ['/login', '/signup', '/waitlist', '/onboarding'];

// Rutas que solo pueden acceder HR Admin
const hrAdminPaths = ['/hr'];

// Rutas que solo pueden acceder Managers
const managerPaths = ['/manager'];

// Rutas que solo pueden acceder Empleados
const empleadoPaths = ['/empleado'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir acceso a rutas públicas y assets
  if (
    publicPaths.some((path) => pathname.startsWith(path)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/onboarding') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Obtener token de la cookie
  const token = request.cookies.get('clousadmin-session')?.value;

  // Si no hay token, redirigir a login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verificar token
  const session = await verifyToken(token);

  // Si el token no es válido, redirigir a login
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('clousadmin-session');
    return response;
  }

  // Verificar que el usuario esté activo (del token, pero se verificará en loginAction también)
  if (!session.user.activo) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'cuenta_inactiva');
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('clousadmin-session');
    return response;
  }

  // Verificar acceso a rutas de HR Admin
  if (hrAdminPaths.some((path) => pathname.startsWith(path))) {
    if (session.user.rol !== UsuarioRol.hr_admin) {
      // Redirigir al dashboard apropiado según el rol
      const dashboardUrl =
        session.user.rol === UsuarioRol.manager
          ? '/manager/dashboard'
          : '/empleado/dashboard';
      return NextResponse.redirect(new URL(dashboardUrl, request.url));
    }
  }

  // Verificar acceso a rutas de Manager
  if (managerPaths.some((path) => pathname.startsWith(path))) {
    if (session.user.rol !== UsuarioRol.manager) {
      // Redirigir al dashboard apropiado según el rol
      const dashboardUrl =
        session.user.rol === UsuarioRol.hr_admin
          ? '/hr/dashboard'
          : '/empleado/dashboard';
      return NextResponse.redirect(new URL(dashboardUrl, request.url));
    }
  }

  // Verificar acceso a rutas de Empleado
  if (empleadoPaths.some((path) => pathname.startsWith(path))) {
    if (session.user.rol !== UsuarioRol.empleado) {
      // Redirigir al dashboard apropiado según el rol
      const dashboardUrl =
        session.user.rol === UsuarioRol.hr_admin
          ? '/hr/dashboard'
          : '/manager/dashboard';
      return NextResponse.redirect(new URL(dashboardUrl, request.url));
    }
  }

  // Si el usuario es HR Admin y está en la raíz, redirigir a su dashboard
  if (pathname === '/' && session.user.rol === UsuarioRol.hr_admin) {
    return NextResponse.redirect(new URL('/hr/dashboard', request.url));
  }

  // Si el usuario es manager y está en la raíz, redirigir a su dashboard
  if (pathname === '/' && session.user.rol === UsuarioRol.manager) {
    return NextResponse.redirect(new URL('/manager/dashboard', request.url));
  }

  // Si el usuario es empleado y está en la raíz, redirigir a su dashboard
  if (pathname === '/' && session.user.rol === UsuarioRol.empleado) {
    return NextResponse.redirect(new URL('/empleado/dashboard', request.url));
  }

  return NextResponse.next();
}

// Configurar en qué rutas se ejecuta el middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

