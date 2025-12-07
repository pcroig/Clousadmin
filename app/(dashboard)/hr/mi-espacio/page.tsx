import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { UsuarioRol } from '@/lib/constants/enums';
import { serializeEmpleadoSeguro } from '@/lib/empleados/serialize';
import { prisma } from '@/lib/prisma';

import { MiEspacioHRClient } from './mi-espacio-hr-client';


export default async function MiEspacioHRPage() {
  const session = await getSession();

  if (!session || session.user.rol !== UsuarioRol.hr_admin) {
    redirect('/login');
  }

  const empleado = await prisma.empleados.findUnique({
    where: {
      usuarioId: session.user.id,
    },
    include: {
      puestoRelacion: {
        select: {
          id: true,
          nombre: true,
        },
      },
      carpetas: {
        include: {
          documento_carpetas: {
            include: {
              documento: true,
            },
          },
        },
      },
      contratos: true,
      saldosAusencias: {
        where: {
          anio: new Date().getFullYear(),
        },
      },
      jornada: {
        select: {
          id: true,
          horasSemanales: true,
        },
      },
      equipos: {
        include: {
          equipo: {
            select: {
              id: true,
              nombre: true,
            },
          },
        },
      },
    },
  });

  if (!empleado) {
    redirect('/hr/dashboard');
  }

  const usuario = await prisma.usuarios.findUnique({
    where: {
      id: session.user.id,
    },
  });

  if (!usuario) {
    redirect('/login');
  }

  // Obtener equipos del empleado para carpetas compartidas
  const equipoIds = empleado.equipos.map((eq) => eq.equipoId);

  // Construir cláusulas OR para carpetas compartidas
  const clausulasOR: Array<
    | { asignadoA: string }
    | { asignadoA: { contains: string } }
  > = [
    { asignadoA: 'todos' },
    { asignadoA: { contains: `empleado:${empleado.id}` } },
  ];

  // Añadir cláusula para cada equipo al que pertenece el empleado
  equipoIds.forEach((equipoId) => {
    clausulasOR.push({ asignadoA: `equipo:${equipoId}` });
  });

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

  // Combinar carpetas personales y compartidas
  const todasLasCarpetas = [...empleado.carpetas, ...carpetasCompartidas];

  // Transformar documento_carpetas a documentos para que mapCarpetas funcione
  const carpetasTransformadas = todasLasCarpetas.map((carpeta) => ({
    ...carpeta,
    documentos: carpeta.documento_carpetas?.map((dc) => dc.documento) || [],
  }));

  // Serializar campos Decimal para Client Component
  const empleadoSerializado = serializeEmpleadoSeguro({
    ...empleado,
    carpetas: carpetasTransformadas,
  });

  return <MiEspacioHRClient empleado={empleadoSerializado} usuario={usuario} />;
}
