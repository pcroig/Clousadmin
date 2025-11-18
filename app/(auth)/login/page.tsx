// ========================================
// Login Page
// ========================================

import { GalleryVerticalEnd } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { LoginForm } from './login-form';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { UsuarioRol } from '@/lib/constants/enums';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; onboarding?: string }>;
}) {
  // Si el usuario ya está autenticado, redirigir
  const session = await getSession();
  const params = await searchParams;
  
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
          <div className="w-full max-w-xs">
            {params.onboarding === 'success' && (
              <div className="mb-4 rounded-md bg-green-50 p-3">
                <p className="text-sm text-green-600">
                  ¡Cuenta creada! Ya puedes iniciar sesión.
                </p>
              </div>
            )}
            <Suspense fallback={<div>Cargando...</div>}>
              <LoginForm callbackUrl={params.callbackUrl} />
            </Suspense>
          </div>
        </div>
      </div>
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

