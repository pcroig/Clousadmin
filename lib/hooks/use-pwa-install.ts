'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const DISMISS_KEY = 'clousadmin:pwa-install-dismissed';

function isStandalone(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function usePWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(isStandalone());
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(DISMISS_KEY) === '1';
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const dismiss = useCallback((remember = true) => {
    setDismissed(true);
    if (remember && typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, '1');
    }
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (choiceResult.outcome === 'accepted') {
        setInstalled(true);
        dismiss();
        return true;
      }
      return false;
    } catch (error) {
      console.error('[usePWAInstallPrompt] Error al mostrar el prompt:', error);
      return false;
    }
  }, [deferredPrompt, dismiss]);

  const state = useMemo(() => {
    const canInstall = Boolean(deferredPrompt) && !installed && !dismissed;
    return {
      canInstall,
      installed,
      dismissed,
    };
  }, [deferredPrompt, dismissed, installed]);

  return {
    ...state,
    promptInstall,
    dismiss,
  };
}


