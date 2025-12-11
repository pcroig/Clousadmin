import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Forzar renderizado dinámico para evitar prerendering
export const dynamic = 'force-dynamic';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(date);
}

export default async function AuditoriaPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  if (session.user.rol !== 'hr_admin') {
    redirect('/empleado/mi-espacio');
  }

  const logs = await prisma.auditoria_accesos.findMany({
    where: { empresaId: session.user.empresaId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      usuario: {
        select: {
          nombre: true,
          apellidos: true,
          email: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Auditoría de Accesos</h1>
        <p className="text-sm text-muted-foreground">
          Últimos 50 accesos registrados en la empresa.
        </p>
      </header>

      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Fecha</th>
              <th className="px-4 py-2 text-left font-medium">Usuario</th>
              <th className="px-4 py-2 text-left font-medium">Acción</th>
              <th className="px-4 py-2 text-left font-medium">Recurso</th>
              <th className="px-4 py-2 text-left font-medium">Empleado</th>
              <th className="px-4 py-2 text-left font-medium">Campos</th>
              <th className="px-4 py-2 text-left font-medium">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((log) => (
              <tr key={log.id} className="bg-background">
                <td className="px-4 py-2 whitespace-nowrap">
                  {formatDate(log.createdAt)}
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-col">
                    <span>
                      {log.usuario?.nombre} {log.usuario?.apellidos}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {log.usuario?.email}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2 capitalize">{log.accion}</td>
                <td className="px-4 py-2">{log.recurso}</td>
                <td className="px-4 py-2">
                  {log.empleadoAccedidoId ?? '—'}
                </td>
                <td className="px-4 py-2">
                  {Array.isArray(log.camposAccedidos)
                    ? (log.camposAccedidos as string[]).join(', ')
                    : '—'}
                </td>
                <td className="px-4 py-2">{log.ipAddress ?? '—'}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td
                  className="px-4 py-6 text-center text-muted-foreground"
                  colSpan={7}
                >
                  No hay accesos registrados en esta empresa.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


