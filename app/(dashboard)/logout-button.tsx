'use client';

// ========================================
// Logout Button Component
// ========================================

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { logoutAction } from '../(auth)/login/actions';

export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoading(true);

      // Llamar a la acción del servidor para destruir la sesión
      await logoutAction();

      // Esperar un poco para asegurar que la cookie se ha eliminado
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Hacer hard redirect (usar window.location para forzar recarga)
      window.location.href = '/login';
    } catch (error) {
      console.error('[LogoutButton] Error al cerrar sesión:', error);
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleLogout}
      variant="ghost"
      disabled={isLoading}
      className="text-sm"
    >
      {isLoading ? 'Cerrando sesión...' : 'Cerrar sesión'}
    </Button>
  );
}

