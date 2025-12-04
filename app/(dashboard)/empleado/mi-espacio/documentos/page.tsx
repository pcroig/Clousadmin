import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { asegurarCarpetasSistemaParaEmpleado } from '@/lib/documentos';
import { serializeEmpleadoSeguro } from '@/lib/empleados/serialize';
import { prisma } from '@/lib/prisma';

import { MiEspacioDocumentosClient } from './documentos-client';


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

  // DEBUG: Log para analizar
  console.log('[DEBUG Carpetas Compartidas] Empleado ID:', empleado.id);
  console.log('[DEBUG Carpetas Compartidas] Equipos del empleado:', equipoIds);
  console.log('[DEBUG Carpetas Compartidas] Cláusulas OR:', JSON.stringify(clausulasOR, null, 2));

  // DEBUG: Ver TODAS las carpetas compartidas en la empresa
  const todasCarpetasCompartidasEmpresa = await prisma.carpetas.findMany({
    where: {
      empresaId: session.user.empresaId,
      empleadoId: null,
      compartida: true,
    },
    select: {
      id: true,
      nombre: true,
      compartida: true,
      asignadoA: true,
      esSistema: true,
    },
  });
  console.log('[DEBUG Carpetas Compartidas] TODAS en empresa:', todasCarpetasCompartidasEmpresa);

  // Obtener carpetas compartidas accesibles por el empleado
  const carpetasCompartidas = await prisma.carpetas.findMany({
    where: {
      empresaId: session.user.empresaId,
      empleadoId: null,
      compartida: true,
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

  console.log('[DEBUG Carpetas Compartidas] Encontradas:', carpetasCompartidas.length);
  console.log('[DEBUG Carpetas Compartidas] Carpetas:', carpetasCompartidas.map(c => ({
    id: c.id,
    nombre: c.nombre,
    compartida: c.compartida,
    asignadoA: c.asignadoA,
    esSistema: c.esSistema,
  })));

  // Combinar ambos tipos de carpetas
  const todasLasCarpetas = [...carpetasPersonales, ...carpetasCompartidas];

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
    carpetas: todasLasCarpetas,
  });

  return <MiEspacioDocumentosClient empleado={empleadoSerializado} />;
}
