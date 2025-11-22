// ========================================
// Middleware - Route Protection
// ========================================
// Protege rutas que requieren autenticación

import { NextResponse } from 'next/server';

import { verifyToken } from '@/lib/auth-edge';
import { EDGE_USUARIO_ROLES } from '@/lib/constants/roles';
import {
  EMPLEADO_ID_HEADER,
  TENANT_HEADER,
  USER_ID_HEADER,
  USER_ROLE_HEADER,
} from '@/lib/constants/tenant';

import type { NextRequest } from 'next/server';

const {
  PLATFORM_ADMIN,
  HR_ADMIN,
  MANAGER,
  EMPLEADO,
} = EDGE_USUARIO_ROLES;

// Rutas públicas (no requieren autenticación)
const publicPaths = ['/login', '/signup', '/waitlist', '/onboarding'];

// Rutas que solo pueden acceder HR Admin
const hrAdminPaths = ['/hr'];

// Rutas que solo pueden acceder Managers
const managerPaths = ['/manager'];

// Rutas que solo pueden acceder Empleados
const empleadoPaths = ['/empleado'];

// Rutas que solo pueden acceder Platform Admin
const platformAdminPaths = ['/platform'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir acceso a rutas públicas y assets
  if (
    publicPaths.some((path) => pathname.startsWith(path)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/onboarding') ||
    pathname.startsWith('/api/cron') || // Rutas de cron usan CRON_SECRET, no cookies
    pathname.startsWith('/api/health') || // Health check público
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
    if (session.user.rol !== HR_ADMIN) {
      // Redirigir al dashboard apropiado según el rol
      const dashboardUrl =
        session.user.rol === PLATFORM_ADMIN
          ? '/platform/invitaciones'
          : session.user.rol === MANAGER
            ? '/manager/dashboard'
            : '/empleado/dashboard';
      return NextResponse.redirect(new URL(dashboardUrl, request.url));
    }
  }

  // Verificar acceso a rutas de Manager
  if (managerPaths.some((path) => pathname.startsWith(path))) {
    if (session.user.rol !== MANAGER) {
      // Redirigir al dashboard apropiado según el rol
      const dashboardUrl =
        session.user.rol === PLATFORM_ADMIN
          ? '/platform/invitaciones'
          : session.user.rol === HR_ADMIN
            ? '/hr/dashboard'
            : '/empleado/dashboard';
      return NextResponse.redirect(new URL(dashboardUrl, request.url));
    }
  }

  // Verificar acceso a rutas de Empleado
  if (empleadoPaths.some((path) => pathname.startsWith(path))) {
    if (session.user.rol !== EMPLEADO) {
      // Redirigir al dashboard apropiado según el rol
      const dashboardUrl =
        session.user.rol === PLATFORM_ADMIN
          ? '/platform/invitaciones'
          : session.user.rol === HR_ADMIN
            ? '/hr/dashboard'
            : '/manager/dashboard';
      return NextResponse.redirect(new URL(dashboardUrl, request.url));
    }
  }

  // Verificar acceso a rutas de Platform Admin
  if (platformAdminPaths.some((path) => pathname.startsWith(path))) {
    if (session.user.rol !== PLATFORM_ADMIN) {
      // Redirigir al dashboard apropiado según el rol
      const dashboardUrl =
        session.user.rol === HR_ADMIN
          ? '/hr/dashboard'
          : session.user.rol === MANAGER
            ? '/manager/dashboard'
            : '/empleado/dashboard';
      return NextResponse.redirect(new URL(dashboardUrl, request.url));
    }
  }

  // Si el usuario es Platform Admin y está en la raíz, redirigir a su dashboard
  if (pathname === '/' && session.user.rol === PLATFORM_ADMIN) {
    return NextResponse.redirect(new URL('/platform/invitaciones', request.url));
  }

  // Si el usuario es HR Admin y está en la raíz, redirigir a su dashboard
  if (pathname === '/' && session.user.rol === HR_ADMIN) {
    return NextResponse.redirect(new URL('/hr/dashboard', request.url));
  }

  // Si el usuario es manager y está en la raíz, redirigir a su dashboard
  if (pathname === '/' && session.user.rol === MANAGER) {
    return NextResponse.redirect(new URL('/manager/dashboard', request.url));
  }

  // Si el usuario es empleado y está en la raíz, redirigir a su dashboard
  if (pathname === '/' && session.user.rol === EMPLEADO) {
    return NextResponse.redirect(new URL('/empleado/dashboard', request.url));
  }

  // Inyectar contexto multi-tenant en headers para Server Components / acciones
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(TENANT_HEADER, session.user.empresaId);
  requestHeaders.set(USER_ID_HEADER, session.user.id);
  requestHeaders.set(USER_ROLE_HEADER, session.user.rol);

  if (session.user.empleadoId) {
    requestHeaders.set(EMPLEADO_ID_HEADER, session.user.empleadoId);
  } else {
    requestHeaders.delete(EMPLEADO_ID_HEADER);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
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

