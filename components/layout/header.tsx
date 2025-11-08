// ========================================
// Header Component - Barra superior con acciones globales
// ========================================

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';
import { CrearDenunciaModal } from '@/components/empleado/crear-denuncia-modal';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  rol: 'hr_admin' | 'manager' | 'empleado';
}

export function Header({ rol }: HeaderProps) {
  const [denunciaModalOpen, setDenunciaModalOpen] = useState(false);
  const router = useRouter();

  const handleDenunciaClick = () => {
    if (rol === 'hr_admin') {
      // HR va a la página de denuncias
      router.push('/hr/denuncias');
    } else {
      // Empleados y managers abren el modal para crear denuncia
      setDenunciaModalOpen(true);
    }
  };

  return (
    <>
      <header className="h-14 border-b bg-white flex items-center justify-end px-6">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDenunciaClick}
          className="gap-2"
        >
          <Shield className="h-4 w-4" />
          Canal de denuncias
        </Button>
      </header>

      {/* Modal para crear denuncia (solo empleados/managers) */}
      {rol !== 'hr_admin' && (
        <CrearDenunciaModal
          isOpen={denunciaModalOpen}
          onClose={() => setDenunciaModalOpen(false)}
          onSuccess={() => {
            // Opcional: redirigir o mostrar algo
          }}
        />
      )}
    </>
  );
}
