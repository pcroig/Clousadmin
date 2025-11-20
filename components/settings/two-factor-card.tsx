'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';
import { useState, useTransition } from 'react';

import {
  confirmTwoFactorSetup,
  disableTwoFactorAction,
  regenerateBackupCodesAction,
  startTwoFactorSetup,
} from '@/app/(dashboard)/configuracion/seguridad/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';

interface TwoFactorCardProps {
  email: string;
  totpEnabled: boolean;
  backupCodesCount: number;
  hasSecret: boolean;
  enabledAt: string | null;
}

export function TwoFactorCard({
  email,
  totpEnabled,
  backupCodesCount,
  hasSecret,
  enabledAt,
}: TwoFactorCardProps) {
  const [setupData, setSetupData] = useState<{ secret: string; qr: string } | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disablePassword, setDisablePassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleStartSetup = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await startTwoFactorSetup();
        setSetupData(result);
        setBackupCodes(null);
      } catch (err) {
        console.error('[TwoFactorCard] start setup error:', err);
        setError('No pudimos generar el código QR. Inténtalo de nuevo.');
      }
    });
  };

  const handleConfirm = () => {
    if (otpCode.length < 6) {
      setError('Introduce el código completo.');
      return;
    }

    startTransition(async () => {
      setError(null);
      setMessage(null);
      try {
        const result = await confirmTwoFactorSetup(otpCode);
        if (!result.success) {
          setError(result.error || 'Código inválido.');
          return;
        }
        setBackupCodes(result.backupCodes || []);
        setSetupData(null);
        setOtpCode('');
        setMessage('Autenticación en dos pasos activada correctamente.');
      } catch (err) {
        console.error('[TwoFactorCard] confirm error:', err);
        setError('No pudimos verificar el código.');
      }
    });
  };

  const handleRegenerateCodes = () => {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      try {
        const result = await regenerateBackupCodesAction();
        if (!result.success) {
          setError(result.error || 'No pudimos generar los códigos.');
          return;
        }
        setBackupCodes(result.backupCodes || []);
        setMessage('Nuevos códigos de respaldo generados.');
      } catch (err) {
        console.error('[TwoFactorCard] regenerate error:', err);
        setError('No pudimos generar los códigos.');
      }
    });
  };

  const handleDisable = () => {
    if (!disablePassword) {
      setError('Introduce tu contraseña para desactivar 2FA.');
      return;
    }

    startTransition(async () => {
      setError(null);
      setMessage(null);
      try {
        const result = await disableTwoFactorAction(disablePassword);
        if (!result.success) {
          setError(result.error || 'No pudimos desactivar 2FA.');
          return;
        }
        setBackupCodes(null);
        setSetupData(null);
        setDisablePassword('');
        setMessage('Autenticación en dos pasos desactivada.');
      } catch (err) {
        console.error('[TwoFactorCard] disable error:', err);
        setError('No pudimos desactivar 2FA.');
      }
    });
  };

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Autenticación en dos pasos (2FA)</h2>
        <p className="text-sm text-muted-foreground">
          Protege tu cuenta con códigos temporales o códigos de respaldo.
        </p>
      </div>

      <div className="mt-4 space-y-4 rounded-xl bg-muted/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Estado</p>
            <p className="text-lg font-semibold">
              {totpEnabled ? 'Activado' : 'Desactivado'}
            </p>
            {totpEnabled && enabledAt && (
              <p className="text-xs text-muted-foreground">
                Activado el {format(new Date(enabledAt), 'PPPP', { locale: es })}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Email protegido</p>
            <p className="font-medium">{email}</p>
          </div>
        </div>

        {message && (
          <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {!totpEnabled && (
          <div className="space-y-4 rounded-lg border border-dashed border-muted-foreground/30 p-4">
            <p className="text-sm text-muted-foreground">
              Activa 2FA para requerir un código adicional cada vez que inicies sesión.
            </p>
            {!setupData ? (
              <Button onClick={handleStartSetup} disabled={pending}>
                {hasSecret ? 'Volver a generar código QR' : 'Generar código QR'}
              </Button>
            ) : (
                <div className="space-y-4">
                <p className="text-sm font-medium">Escanea el QR con tu app de autenticación</p>
                <div className="rounded-lg border bg-background p-4 text-center">
                  <Image
                    src={setupData.qr}
                    alt="Código QR de autenticación"
                    width={192}
                    height={192}
                    className="mx-auto h-48 w-48"
                    unoptimized
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Si no puedes escanear, añade este código manualmente: <br />
                    <span className="font-mono text-sm">{setupData.secret}</span>
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Introduce el código generado</Label>
                  <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} disabled={pending}>
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
                <Button onClick={handleConfirm} disabled={pending || otpCode.length < 6}>
                  Confirmar y activar
                </Button>
              </div>
            )}
          </div>
        )}

        {totpEnabled && (
          <div className="space-y-4 rounded-lg border border-dashed border-primary/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Códigos de respaldo</p>
                <p className="text-xs text-muted-foreground">
                  Disponibles: {backupCodesCount} códigos
                </p>
              </div>
              <Button variant="outline" onClick={handleRegenerateCodes} disabled={pending}>
                Generar nuevos códigos
              </Button>
            </div>
            {backupCodes && (
              <div className="space-y-2 rounded-lg bg-background p-4">
                <p className="text-sm font-medium">Guarda estos códigos en un lugar seguro</p>
                <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                  {backupCodes.map((code) => (
                    <span key={code} className="rounded-md bg-muted px-2 py-1 text-center">
                      {code}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Cada código se puede usar solo una vez.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="disablePassword">Desactivar 2FA (requiere contraseña)</Label>
              <Input
                id="disablePassword"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Introduce tu contraseña"
                autoComplete="current-password"
                disabled={pending}
              />
              <Button variant="destructive" onClick={handleDisable} disabled={pending}>
                Desactivar 2FA
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

