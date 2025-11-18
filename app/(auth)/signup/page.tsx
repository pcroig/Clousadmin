import { redirect } from 'next/navigation';
import Image from 'next/image';
import { obtenerInvitacionSignupPorToken, verificarInvitacionSignup } from '@/lib/invitaciones-signup';
import { SignupForm } from './signup-form';
import { getSession } from '@/lib/auth';

interface SignupPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
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
          alt="HR Management - Plataforma moderna de gestión de recursos humanos"
          fill
          priority
          className="object-cover dark:brightness-[0.2] dark:grayscale"
          sizes="50vw"
          placeholder="blur"
          blurDataURL="data:image/webp;base64,UklGRswAAABXRUJQVlA4IMAAAADQBQCdASoUAB4APzmEuFOvKCUisAgB4CcJaACdMxsz6sAw3hp6Ev+tcb4kC1isuJnlUtNq/03gAP7gqk6rPC+I5tr7pMod2TP9HBNGwhhOTpVccvn5R/iBD0x59C9o9m3pGiNMV0vQ36ROW6loL8Kb1XnrkDWDtxOn+Yk1WYtxUuMMBeM6QsX9lojSsSBfcv/ztZIguvIx8sfpLBeuXHIerSA3AW+8EjzriG06hv3dUzJq/6FFf19JbIlAdUo5oAA="
        />
      </div>
    </div>
  );
}
