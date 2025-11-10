// ========================================
// Signup Page
// ========================================

import { GalleryVerticalEnd } from 'lucide-react';
import Link from 'next/link';
import { SignupForm } from './signup-form';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { verificarInvitacionSignup } from '@/lib/invitaciones-signup';

import { UsuarioRol } from '@/lib/constants/enums';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }> | { token?: string };
}) {
  // Compatibilidad: Next.js 14 puede pasar objeto directo, Next.js 15 Promise
  const params = searchParams instanceof Promise ? await searchParams : searchParams;
  const token = params.token;

  // Debug logging (solo en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    console.log('[SignupPage] Token recibido:', token ? `${token.substring(0, 20)}...` : 'null');
    console.log('[SignupPage] Params completos:', params);
  }

  // Si el usuario ya está autenticado, redirigir
  const session = await getSession();
  
  if (session) {
    if (session.user.rol === UsuarioRol.hr_admin || session.user.rol === UsuarioRol.platform_admin) {
      redirect('/hr/dashboard');
    } else {
      redirect('/empleado/dashboard');
    }
  }

  // Si no hay token, mostrar mensaje de error
  if (!token) {
    return (
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="flex flex-col gap-4 p-6 md:p-10">
          <div className="flex justify-center gap-2 md:justify-start">
            <Link href="/" className="flex items-center gap-2 font-medium">
              <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-4" />
              </div>
              Clousadmin
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-md space-y-6">
              <div className="space-y-2 text-center">
                <h1 className="text-2xl font-bold">Invitación requerida</h1>
                <p className="text-gray-500">
                  Necesitas una invitación válida para crear una cuenta
                </p>
              </div>
              <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4">
                <p className="text-sm text-yellow-800 mb-3">
                  No tienes una invitación válida para crear una cuenta.
                </p>
                <p className="text-sm text-yellow-700">
                  Si recibiste una invitación por email, asegúrate de usar el enlace completo del email.
                </p>
              </div>
              <div className="text-center">
                <a
                  href="/waitlist"
                  className="text-sm text-primary hover:underline"
                >
                  Únete a la lista de espera →
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-muted relative hidden lg:block">
          <img
            src="/login-hero.jpg"
            alt="HR Management"
            className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
          />
        </div>
      </div>
    );
  }

  // Verificar token del lado del servidor
  const verificacion = await verificarInvitacionSignup(token);

  // Debug logging (solo en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    console.log('[SignupPage] Resultado verificación:', {
      success: verificacion.success,
      error: verificacion.error,
      email: verificacion.invitacion?.email,
    });
  }

  if (!verificacion.success) {
    return (
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="flex flex-col gap-4 p-6 md:p-10">
          <div className="flex justify-center gap-2 md:justify-start">
            <Link href="/" className="flex items-center gap-2 font-medium">
              <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-4" />
              </div>
              Clousadmin
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-md space-y-6">
              <div className="space-y-2 text-center">
                <h1 className="text-2xl font-bold">Invitación inválida</h1>
                <p className="text-gray-500">
                  {verificacion.error || 'Esta invitación no es válida'}
                </p>
              </div>
              <div className="rounded-md bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-800">
                  La invitación puede haber expirado o ya haber sido usada.
                </p>
              </div>
              <div className="text-center space-y-2">
                <a
                  href="/waitlist"
                  className="text-sm text-primary hover:underline block"
                >
                  Únete a la lista de espera →
                </a>
                <a
                  href="/login"
                  className="text-sm text-gray-500 hover:underline block"
                >
                  Ya tengo cuenta
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-muted relative hidden lg:block">
          <img
            src="/login-hero.jpg"
            alt="HR Management"
            className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
          />
        </div>
      </div>
    );
  }

  // Token válido, mostrar formulario con el email pre-rellenado
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10 bg-white">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-4" />
            </div>
            <span className="text-lg font-semibold">Clousadmin</span>
          </Link>
        </div>
        <div className="flex flex-1 items-start justify-start pt-8">
          <div className="w-full max-w-xl">
            <SignupForm token={token} emailInvitacion={verificacion.invitacion?.email || ''} />
          </div>
        </div>
      </div>
      <div className="bg-gradient-to-br from-primary/20 to-primary/5 relative hidden lg:block">
        <div className="absolute inset-0 bg-muted/50" />
        <img
          src="/login-hero.jpg"
          alt="HR Management"
          className="absolute inset-0 h-full w-full object-cover opacity-60 dark:brightness-[0.2] dark:grayscale"
        />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center space-y-4 text-white">
            <h2 className="text-3xl font-bold">Comienza tu gestión de RRHH</h2>
            <p className="text-lg opacity-90">
              Configura tu empresa en minutos y comienza a gestionar tu equipo
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

