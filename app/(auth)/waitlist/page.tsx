// ========================================
// Waitlist Page
// ========================================

import { GalleryVerticalEnd } from 'lucide-react';
import Link from 'next/link';
import { WaitlistForm } from './waitlist-form';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

import { UsuarioRol } from '@/lib/constants/enums';

export default async function WaitlistPage() {
  // Si el usuario ya está autenticado, redirigir
  const session = await getSession();
  
  if (session) {
    if (session.user.rol === UsuarioRol.hr_admin) {
      redirect('/hr/dashboard');
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
          <div className="w-full max-w-md">
            <WaitlistForm />
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


