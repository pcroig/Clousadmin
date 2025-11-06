// ========================================
// Onboarding Page - Employee Multi-Step Data Collection
// ========================================

import { GalleryVerticalEnd } from 'lucide-react';
import Link from 'next/link';
import { verificarTokenOnboarding, type ProgresoOnboarding, type DatosTemporales } from '@/lib/onboarding';
import { OnboardingForm } from './onboarding-form';
import { redirect } from 'next/navigation';

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { valido, onboarding, error } = await verificarTokenOnboarding(token);

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
        <div className="flex flex-1 items-start justify-start pt-8">
          <div className="w-full max-w-xl">
            {!valido ? (
              <div className="space-y-4">
                <h1 className="text-2xl font-bold text-red-600">
                  Token de onboarding inválido
                </h1>
                <p className="text-gray-500">{error}</p>
                <Link
                  href="/login"
                  className="inline-block text-sm text-primary hover:underline"
                >
                  Volver a login
                </Link>
              </div>
            ) : (
              <OnboardingForm
                token={token}
                empleado={onboarding!.empleado}
                progreso={onboarding!.progreso as unknown as ProgresoOnboarding}
                datosTemporales={onboarding!.datosTemporales as unknown as DatosTemporales | null}
              />
            )}
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












