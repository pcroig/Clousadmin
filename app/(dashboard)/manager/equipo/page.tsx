// ========================================
// Manager - Equipo Page
// ========================================

import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Calendar, MapPin, Briefcase, Users } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default async function ManagerEquipoPage() {
  const session = await getSession();

  if (!session || session.user.rol !== 'manager') {
    redirect('/login');
  }

  // Verificar que el manager tenga empleadoId
  if (!session.user.empleadoId) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mi Equipo</h1>
          <p className="text-red-600 mt-2">
            No tienes un perfil de empleado asociado. Contacta con tu administrador.
          </p>
        </div>
      </div>
    );
  }

  // Obtener empleados a cargo del manager
  const empleadosACargo = await prisma.empleado.findMany({
    where: {
      managerId: session.user.empleadoId,
      empresaId: session.user.empresaId,
      estadoEmpleado: 'activo',
    },
    include: {
      puestoRelacion: {
        select: {
          nombre: true,
        },
      },
      equipos: {
        include: {
          equipo: {
            select: {
              nombre: true,
            },
          },
        },
        take: 1,
        orderBy: {
          fechaIncorporacion: 'desc',
        },
      },
      usuario: {
        select: {
          email: true,
        },
      },
    },
    orderBy: {
      apellidos: 'asc',
    },
  });

  // Obtener información del manager
  const managerInfo = await prisma.empleado.findUnique({
    where: {
      id: session.user.empleadoId,
    },
    select: {
      nombre: true,
      apellidos: true,
      equipos: {
        include: {
          equipo: {
            select: {
              nombre: true,
            },
          },
        },
        take: 1,
        orderBy: {
          fechaIncorporacion: 'desc',
        },
      },
    },
  });

  const getInitials = (nombre: string, apellidos: string) => {
    return `${nombre.charAt(0)}${apellidos.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mi Equipo</h1>
        <p className="text-gray-600 mt-2">
          Gestiona y visualiza información de los {empleadosACargo.length} empleados a tu cargo
          {managerInfo?.equipos[0]?.equipo && ` en ${managerInfo.equipos[0].equipo.nombre}`}
        </p>
      </div>

      {empleadosACargo.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <Users className="h-16 w-16 text-gray-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                No tienes empleados a cargo
              </h3>
              <p className="text-gray-600 mt-1">
                Actualmente no hay empleados asignados a tu gestión
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {empleadosACargo.map((empleado) => (
            <Card key={empleado.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  {empleado.fotoUrl && <AvatarImage src={empleado.fotoUrl} />}
                  <AvatarFallback className="bg-gray-200 text-gray-700">
                    {getInitials(empleado.nombre, empleado.apellidos)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {empleado.nombre} {empleado.apellidos}
                  </h3>
                  {empleado.puestoRelacion && (
                    <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <Briefcase className="h-3 w-3" />
                      {empleado.puestoRelacion.nombre}
                    </p>
                  )}
                  {empleado.estadoEmpleado && (
                    <Badge
                      variant={
                        empleado.estadoEmpleado === 'activo'
                          ? 'default'
                          : empleado.estadoEmpleado === 'baja'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className="mt-2"
                    >
                      {empleado.estadoEmpleado.charAt(0).toUpperCase() + empleado.estadoEmpleado.slice(1)}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {empleado.usuario?.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{empleado.usuario.email}</span>
                  </div>
                )}

                {empleado.telefono && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span>{empleado.telefono}</span>
                  </div>
                )}

                {empleado.fechaAlta && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span>
                      Ingreso:{' '}
                      {format(new Date(empleado.fechaAlta), 'dd MMM yyyy', { locale: es })}
                    </span>
                  </div>
                )}

                {empleado.equipos[0]?.equipo && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{empleado.equipos[0].equipo.nombre}</span>
                  </div>
                )}

                {empleado.ciudad && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{empleado.ciudad}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link href={`/manager/horario/fichajes?empleado=${empleado.id}`}>
                    Ver fichajes
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link href={`/manager/horario/ausencias?empleado=${empleado.id}`}>
                    Ver ausencias
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {empleadosACargo.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-100 p-3">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total empleados</p>
                <p className="text-2xl font-bold text-gray-900">{empleadosACargo.length}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-100 p-3">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Activos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {empleadosACargo.filter((e) => e.estadoEmpleado === 'activo').length}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-red-100 p-3">
                <Calendar className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">De baja</p>
                <p className="text-2xl font-bold text-gray-900">
                  {empleadosACargo.filter((e) => e.estadoEmpleado === 'baja').length}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
