// ========================================
// Company Settings Page - HR Admin
// ========================================

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { prisma } from '@/lib/prisma';

import { CompanyClient } from './company-client';


export default async function CompanySettingsPage() {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  if (!session.user.empresaId) {
    redirect('/hr/dashboard');
  }

  const [empresa, sedes] = await Promise.all([
    prisma.empresas.findUnique({
      where: { id: session.user.empresaId },
      select: {
        id: true,
        nombre: true,
        cif: true,
        email: true,
        telefono: true,
        createdAt: true,
        usuarios: {
          where: { rol: UsuarioRol.hr_admin },
          select: {
            id: true,
            nombre: true,
            apellidos: true,
            email: true,
            activo: true,
            ultimoAcceso: true,
          },
          orderBy: {
            nombre: 'asc',
          },
        },
      },
    }),
    prisma.sedes.findMany({
      where: {
        empresaId: session.user.empresaId,
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        ciudad: true,
        activo: true,
      },
      orderBy: {
        nombre: 'asc',
      },
    }),
  ]);

  if (!empresa) {
    redirect('/hr/dashboard');
  }

  return (
    <CompanyClient
      empresa={{
        nombre: empresa.nombre,
        cif: empresa.cif,
        email: empresa.email,
        telefono: empresa.telefono,
        createdAt: empresa.createdAt,
        hrAdmins: empresa.usuarios,
      }}
      sedes={sedes}
    />
  );
}


