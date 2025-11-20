'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';

import { verifyOtpAction } from '@/app/(auth)/verify-otp/actions';
import { Button } from '@/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';

const initialState = {
  success: false,
  error: undefined,
  redirect: undefined,
};

interface OTPFormProps {
  challengeActive: boolean;
}

export function OTPForm({ challengeActive }: OTPFormProps) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [state, formAction, pending] = useActionState(verifyOtpAction, initialState);

  useEffect(() => {
    if (state.success && state.redirect) {
      router.push(state.redirect);
      router.refresh();
    }
  }, [state, router]);

  if (!challengeActive) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-bold">Verificación expirada</h1>
        <p className="text-sm text-muted-foreground">
          Vuelve a iniciar sesión para generar un nuevo código de verificación.
        </p>
        <Button className="w-full" onClick={() => router.push('/login')}>
          Volver a iniciar sesión
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Introduce tu código</h1>
        <p className="text-sm text-muted-foreground">
          Usa el código de tu app de autenticación o uno de tus códigos de respaldo.
        </p>
      </div>
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            name="code"
            disabled={pending}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator>-</InputOTPSeparator>
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>

        {state.error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {state.error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={pending || code.length < 6}>
          {pending ? 'Verificando...' : 'Verificar código'}
        </Button>
      </form>
      <p className="text-center text-xs text-muted-foreground">
        ¿Problemas con la app? Introduce uno de tus códigos de respaldo para autenticarse.
      </p>
    </div>
  );
}

