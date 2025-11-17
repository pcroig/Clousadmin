'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const SENSITIVE_FIELDS = ['nif', 'nss', 'iban'] as const;
export type SensitiveFieldKey = (typeof SENSITIVE_FIELDS)[number];

const UNLOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutos

interface DialogState {
  field: SensitiveFieldKey | null;
  isOpen: boolean;
}

export function useSensitiveUnlock() {
  const [unlockedUntil, setUnlockedUntil] = useState<number | null>(null);
  const [dialogState, setDialogState] = useState<DialogState>({ field: null, isOpen: false });
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isUnlocked = useCallback(
    (_field?: SensitiveFieldKey) => typeof unlockedUntil === 'number' && unlockedUntil > Date.now(),
    [unlockedUntil]
  );

  const requestUnlock = useCallback((field: SensitiveFieldKey) => {
    setDialogState({ field, isOpen: true });
    setPassword('');
    setError('');
  }, []);

  const closeDialog = useCallback(() => {
    setDialogState({ field: null, isOpen: false });
    setPassword('');
    setError('');
  }, []);

  const confirmUnlock = useCallback(async () => {
    if (!dialogState.field) return;

    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? 'No se pudo verificar la contraseña');
        return;
      }

      setUnlockedUntil(Date.now() + UNLOCK_DURATION_MS);
      closeDialog();
    } catch (err) {
      console.error('[useSensitiveUnlock] Error verificando contraseña', err);
      setError('Error al verificar la contraseña. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [closeDialog, dialogState.field, password]);

  useEffect(() => {
    const interval = setInterval(() => {
      setUnlockedUntil((prev) => {
        if (typeof prev !== 'number') {
          return prev;
        }
        return prev <= Date.now() ? null : prev;
      });
    }, 30_000);

    return () => clearInterval(interval);
  }, []);

  return {
    isUnlocked,
    requestUnlock,
    dialogState,
    password,
    setPassword,
    error,
    setError,
    confirmUnlock,
    closeDialog,
    loading,
  };
}

