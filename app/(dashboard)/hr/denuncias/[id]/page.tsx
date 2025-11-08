// ========================================
// HR Denuncia Detalle Page
// ========================================

import { getSession } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { DenunciaDetail } from './denuncia-detail';
import { UsuarioRol } from '@/lib/constants/enums';

// Server Component
export default async function DenunciaDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  // Obtener la denuncia
  const denuncia = await prisma.denuncia.findUnique({
    where: { id: params.id },
    include: {
      denunciante: {
        select: {
          id: true,
          nombre: true,
          apellidos: true,
          email: true,
          fotoUrl: true,
          telefono: true,
        },
      },
    },
  });

  if (!denuncia || denuncia.empresaId !== session.user.empresaId) {
    notFound();
  }

  // Obtener HR admins para asignación
  const hrAdmins = await prisma.usuario.findMany({
    where: {
      empresaId: session.user.empresaId,
      rol: UsuarioRol.hr_admin,
      activo: true,
    },
    select: {
      id: true,
      nombre: true,
      apellidos: true,
    },
  });

  return (
    <DenunciaDetail
      denuncia={{
        id: denuncia.id,
        descripcion: denuncia.descripcion,
        fechaIncidente: denuncia.fechaIncidente,
        ubicacion: denuncia.ubicacion,
        estado: denuncia.estado,
        prioridad: denuncia.prioridad,
        esAnonima: denuncia.esAnonima,
        denunciante: denuncia.denunciante
          ? {
              id: denuncia.denunciante.id,
              nombre: `${denuncia.denunciante.nombre} ${denuncia.denunciante.apellidos}`,
              email: denuncia.denunciante.email,
              telefono: denuncia.denunciante.telefono,
              avatar: denuncia.denunciante.fotoUrl,
            }
          : null,
        asignadaA: denuncia.asignadaA,
        asignadaEn: denuncia.asignadaEn,
        resolucion: denuncia.resolucion,
        resueltaEn: denuncia.resueltaEn,
        notasInternas: denuncia.notasInternas,
        documentos: denuncia.documentos as any,
        createdAt: denuncia.createdAt.toISOString(),
        updatedAt: denuncia.updatedAt.toISOString(),
      }}
      hrAdmins={hrAdmins.map((admin) => ({
        id: admin.id,
        nombre: `${admin.nombre} ${admin.apellidos}`,
      }))}
    />
  );
}
