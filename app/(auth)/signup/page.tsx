import { redirect } from 'next/navigation';
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
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Columna izquierda: Formulario */}
      <div className="flex flex-1 items-start justify-center bg-white py-8">
        <div className="w-full max-w-xl px-6">
          <SignupForm token={token} emailInvitacion={invitacion.email || ''} />
        </div>
      </div>

      {/* Columna derecha: Fondo/Imagen */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary/80 p-12 flex-col justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-4">Clous</h1>
          <p className="text-xl text-white/90">
            La plataforma de gestión de RRHH más completa y fácil de usar
          </p>
        </div>
        <div className="text-white/70 text-sm">
          © 2025 Clousadmin. Todos los derechos reservados.
        </div>
      </div>
    </div>
  );
}
