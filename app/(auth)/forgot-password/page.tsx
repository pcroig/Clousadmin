import { GalleryVerticalEnd } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';

import { ForgotPasswordForm } from './forgot-password-form';

// Forzar renderizado dinámico para evitar prerendering
export const dynamic = 'force-dynamic';

export default async function ForgotPasswordPage() {
  const session = await getSession();

  if (session) {
    if (session.user.rol === UsuarioRol.hr_admin || session.user.rol === UsuarioRol.platform_admin) {
      redirect('/hr/dashboard');
    } else if (session.user.rol === UsuarioRol.manager) {
      redirect('/manager/dashboard');
    } else {
      redirect('/empleado/dashboard');
    }
  }

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
          <div className="w-full max-w-xs">
            <ForgotPasswordForm />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <Image
          src="/login-hero.webp"
          alt="Restablecer contraseña"
          fill
          priority
          className="object-cover dark:brightness-[0.2] dark:grayscale"
          sizes="50vw"
        />
      </div>
    </div>
  );
}

