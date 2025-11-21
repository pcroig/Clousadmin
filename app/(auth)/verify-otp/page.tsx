import { cookies } from 'next/headers';
import Image from 'next/image';
import { redirect } from 'next/navigation';

import { OTPForm } from '@/components/auth/otp-form';
import { getSession, validateTwoFactorChallenge } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';

const TWO_FACTOR_COOKIE = 'clousadmin-2fa';

export default async function VerifyOtpPage() {
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

  const cookieStore = await cookies();
  const pendingToken = cookieStore.get(TWO_FACTOR_COOKIE)?.value || null;
  const challengeValid = pendingToken
    ? Boolean(await validateTwoFactorChallenge(pendingToken))
    : false;

  return (
    <div className="flex min-h-svh w-full">
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-xs">
          <OTPForm challengeActive={challengeValid} />
        </div>
      </div>
      <div className="relative hidden w-1/2 lg:block">
        <Image
          src="/login-hero2.webp"
          alt="Autenticación"
          fill
          className="object-cover dark:brightness-[0.4] dark:grayscale"
          priority
        />
      </div>
    </div>
  );
}

