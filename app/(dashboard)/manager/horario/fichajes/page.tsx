// ========================================
// Manager Fichajes Page
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { FichajesClient } from '@/app/(dashboard)/hr/horario/fichajes/fichajes-client';

import { UsuarioRol } from '@/lib/constants/enums';

export default async function ManagerFichajesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.manager) {
    redirect('/login');
  }

  // Verificar que el manager tenga empleadoId
  if (!session.user.empleadoId) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Fichajes del Equipo</h1>
          <p className="text-red-600 mt-2">
            No tienes un perfil de empleado asociado. Contacta con tu administrador.
          </p>
        </div>
      </div>
    );
  }

  const params = await searchParams;
  return <FichajesClient initialState={params.estado} />;
}
