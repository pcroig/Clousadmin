import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { asegurarCarpetasSistemaParaEmpleado } from '@/lib/documentos';
import { serializeEmpleadoSeguro } from '@/lib/empleados/serialize';
import { prisma } from '@/lib/prisma';

import { MiEspacioDocumentosClient } from './documentos-client';

// Forzar renderizado dinámico para evitar prerendering
export const dynamic = 'force-dynamic';


export default async function MiEspacioDocumentosPage() {
  const session = await getSession();

  if (!session || session.user.rol === UsuarioRol.hr_admin) {
    redirect('/login');
  }

  const empleado = await prisma.empleados.findUnique({
    where: {
      usuarioId: session.user.id,
    },
    include: {
      carpetas: {
        include: {
          documento_carpetas: {
            include: {
              documento: true,
            },
          },
        },
      },
    },
  });

  if (!empleado) {
    redirect('/empleado/dashboard');
  }

  // Asegurar que todas las carpetas del sistema existan para el empleado
  // Esta función es idempotente y no duplica carpetas
  await asegurarCarpetasSistemaParaEmpleado(empleado.id, session.user.empresaId);

  // Obtener carpetas personales del empleado (con empleadoId)
  const carpetasPersonales = await prisma.carpetas.findMany({
    where: {
      empresaId: session.user.empresaId,
      empleadoId: empleado.id,
    },
    include: {
      documento_carpetas: {
        include: {
          documento: true,
        },
      },
    },
    orderBy: [
      { esSistema: 'desc' },
      { nombre: 'asc' },
    ],
  });

  // Obtener equipos del empleado para verificar acceso a carpetas asignadas por equipo
  const equiposDelEmpleado = await prisma.empleado_equipos.findMany({
    where: {
      empleadoId: empleado.id,
    },
    select: {
      equipoId: true,
    },
  });

  const equipoIds = equiposDelEmpleado.map((eq) => eq.equipoId);

  // Construir cláusulas OR dinámicamente
  const clausulasOR: Array<
    | { asignadoA: string }
    | { asignadoA: { contains: string } }
  > = [
    { asignadoA: 'todos' },
    { asignadoA: { contains: `empleado:${empleado.id}` } },
  ];

  // Añadir cláusula para cada equipo al que pertenece el empleado
  if (equipoIds.length > 0) {
    equipoIds.forEach((equipoId) => {
      clausulasOR.push({ asignadoA: `equipo:${equipoId}` });
    });
  }

  // Obtener carpetas compartidas accesibles por el empleado
  // EXCLUIR carpetas master de HR (asignadoA = 'hr') que son solo para /hr/documentos
  // EXCLUIR carpetas del sistema (esSistema = true) ya que el empleado tiene sus propias carpetas del sistema
  const carpetasCompartidas = await prisma.carpetas.findMany({
    where: {
      empresaId: session.user.empresaId,
      empleadoId: null,
      compartida: true,
      esSistema: false, // Excluir carpetas del sistema compartidas (duplicadas)
      asignadoA: { not: 'hr' }, // Excluir carpetas master de HR
      OR: clausulasOR,
    },
    include: {
      documento_carpetas: {
        where: {
          documento: {
            OR: [
              { empleadoId: null }, // Documentos globales de la carpeta
              { empleadoId: empleado.id }, // Documentos asignados a este empleado
            ],
          },
        },
        include: {
          documento: true,
        },
      },
    },
    orderBy: [
      { esSistema: 'desc' },
      { nombre: 'asc' },
    ],
  });

  // Combinar ambos tipos de carpetas
  const todasLasCarpetas = [...carpetasPersonales, ...carpetasCompartidas];

  // Transformar documento_carpetas a documentos para que mapCarpetas funcione
  const carpetasTransformadas = todasLasCarpetas.map((carpeta) => ({
    ...carpeta,
    documentos: carpeta.documento_carpetas?.map((dc) => dc.documento) || [],
  }));

  // Re-obtener empleado base para serialización
  const empleadoActualizado = await prisma.empleados.findUnique({
    where: {
      usuarioId: session.user.id,
    },
  });

  if (!empleadoActualizado) {
    redirect('/empleado/dashboard');
  }

  // Serializar campos Decimal para Client Component
  const empleadoSerializado = serializeEmpleadoSeguro({
    ...empleadoActualizado,
    carpetas: carpetasTransformadas,
  });

  return <MiEspacioDocumentosClient empleado={empleadoSerializado} />;
}
