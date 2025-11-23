import Image from 'next/image';
import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { obtenerInvitacionSignupPorToken, verificarInvitacionSignup } from '@/lib/invitaciones-signup';

import { SignupForm } from './signup-form';


interface SignupPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function SignupPage(props: SignupPageProps) {
  const searchParams = await props.searchParams;
  const params = searchParams;
  const token = params.token;

  console.log('[SignupPage] Token recibido:', token?.slice(0, 20) + '...');
  console.log('[SignupPage] Params completos:', params);

  const session = await getSession();

  // Token es requerido
  if (!token) {
    redirect('/waitlist');
  }

  // Obtener invitación (permite usada para continuar onboarding)
  const invitacion = await obtenerInvitacionSignupPorToken(token);

  if (!invitacion) {
    redirect('/waitlist');
  }

  if (!invitacion.usada) {
    // Validar invitación cuando aún no se ha usado (primer paso)
    const verificacion = await verificarInvitacionSignup(token);
    if (!verificacion.success || !verificacion.invitacion) {
      redirect('/waitlist');
    }
  } else {
    // Si ya está usada, solo permitir continuar si el usuario autenticado coincide
    const emailInvitacion = invitacion.email.toLowerCase();
    const puedeContinuar =
      session &&
      session.user.rol === 'hr_admin' &&
      session.user.email.toLowerCase() === emailInvitacion;

    if (!puedeContinuar) {
      redirect('/waitlist');
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Columna izquierda: Formulario */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xl">
            <SignupForm token={token} emailInvitacion={invitacion.email || ''} />
          </div>
        </div>
      </div>

      {/* Columna derecha: Imagen */}
      <div className="bg-muted relative hidden lg:block">
        <Image
          src="/login-hero.webp"
          alt="HR Management"
          fill
          priority
          className="object-cover dark:brightness-[0.2] dark:grayscale"
          sizes="50vw"
        />
      </div>
    </div>
  );
}
