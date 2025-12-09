import Image from 'next/image';
import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { obtenerInvitacionSignupPorToken, verificarInvitacionSignup } from '@/lib/invitaciones-signup';
import { prisma } from '@/lib/prisma';

import { SignupForm } from './signup-form';


interface SignupPageProps {
  searchParams: Promise<{ token?: string }>;
}

type SignupPrefillData = {
  nombreEmpresa?: string | null;
  webEmpresa?: string | null;
  nombre?: string | null;
  apellidos?: string | null;
  avatarUrl?: string | null;
} | null;

function splitNombreCompleto(nombre?: string | null): { nombre?: string; apellidos?: string } {
  if (!nombre) {
    return {};
  }

  const partes = nombre.trim().split(/\s+/);
  if (partes.length === 0) {
    return {};
  }

  if (partes.length === 1) {
    return { nombre: partes[0] };
  }

  return {
    nombre: partes[0],
    apellidos: partes.slice(1).join(' '),
  };
}

async function obtenerWaitlistPrefill(email: string): Promise<SignupPrefillData> {
  const entry = await prisma.waitlist.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!entry) {
    return null;
  }

  const { nombre, apellidos } = splitNombreCompleto(entry.nombre);

  return {
    nombreEmpresa: entry.empresa,
    nombre: nombre ?? undefined,
    apellidos: apellidos ?? undefined,
  };
}

async function obtenerDatosEmpresaUsuario(email: string): Promise<SignupPrefillData> {
  // Buscar el usuario por email
  const usuario = await prisma.usuarios.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      nombre: true,
      apellidos: true,
      avatar: true,
      empleado: {
        select: {
          fotoUrl: true,
        },
      },
      empresaId: true,
    },
  });

  if (!usuario || !usuario.empresaId) {
    return null;
  }

  // Buscar la empresa
  const empresa = await prisma.empresas.findUnique({
    where: { id: usuario.empresaId },
    select: {
      nombre: true,
      web: true,
    },
  });

  if (!empresa) {
    return null;
  }

  return {
    nombreEmpresa: empresa.nombre,
    webEmpresa: empresa.web,
    nombre: usuario.nombre,
    apellidos: usuario.apellidos,
    avatarUrl: usuario.empleado?.fotoUrl ?? usuario.avatar,
  };
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

  let prefillData: SignupPrefillData = null;
  let cuentaYaCreada = false;

  if (!invitacion.usada) {
    // Validar invitación cuando aún no se ha usado (primer paso)
    const verificacion = await verificarInvitacionSignup(token);
    if (!verificacion.success || !verificacion.invitacion) {
      console.log('[SignupPage] Invitación inválida:', verificacion.error);
      redirect('/waitlist');
    }

    // Cargar datos de la waitlist para pre-rellenar
    prefillData = await obtenerWaitlistPrefill(invitacion.email);
  } else {
    // Si ya está usada, verificar que el usuario autenticado coincide
    if (!session) {
      console.log('[SignupPage] Invitación usada pero sin sesión, redirigiendo a login');
      redirect(`/login?callbackUrl=/signup?token=${token}`);
    }

    const emailInvitacion = invitacion.email.toLowerCase();
    const emailSesion = session.user.email.toLowerCase();

    if (emailSesion !== emailInvitacion) {
      console.log('[SignupPage] Email de sesión no coincide con invitación');
      redirect('/waitlist');
    }

    // Verificar que sea HR Admin (el rol asignado al crear la cuenta)
    if (session.user.rol !== 'hr_admin') {
      console.log('[SignupPage] Usuario no es HR Admin');
      redirect('/waitlist');
    }

    // Cargar datos guardados de la empresa y usuario
    prefillData = await obtenerDatosEmpresaUsuario(invitacion.email);
    cuentaYaCreada = true; // La invitación usada indica que el paso 0 está completo
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Columna izquierda: Formulario */}
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xl">
            <SignupForm
              token={token}
              emailInvitacion={invitacion.email || ''}
              prefill={prefillData ?? undefined}
              cuentaYaCreada={cuentaYaCreada}
            />
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
