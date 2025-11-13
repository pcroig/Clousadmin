// ========================================
// API: Importar Nóminas Definitivas
// ========================================
// Sube PDFs de nóminas definitivas desde la gestoría
// Vincula los PDFs a las nóminas correspondientes

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadToS3 } from '@/lib/s3';
import { clasificarNomina } from '@/lib/ia/clasificador-nominas';
import {
  actualizarEstadoNomina,
  sincronizarEstadoEvento,
} from '@/lib/calculos/sync-estados-nominas';

// ========================================
// POST /api/nominas/eventos/[id]/importar
// ========================================
// Importa nóminas definitivas (PDFs) para un evento
// Soporta 2 modos:
// 1. Auto-match: usa IA para clasificar empleado por nombre del archivo (con fallback a matching básico)
// 2. Explicit: cada archivo con employeeId especificado
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    // Solo HR puede importar nóminas
    if (!['hr_admin', 'platform_admin'].includes(session.user.rol)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Verificar que el evento existe y pertenece a la empresa
    const evento = await prisma.eventoNomina.findFirst({
      where: {
        id,
        empresaId: session.user.empresaId,
      },
      include: {
        nominas: {
          include: {
            empleado: {
              select: {
                id: true,
                nombre: true,
                apellidos: true,
              },
            },
          },
        },
      },
    });

    if (!evento) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    // Verificar que el evento está en estado correcto para importar
    if (!['exportada', 'definitiva'].includes(evento.estado)) {
      return NextResponse.json(
        {
          error: `No se pueden importar nóminas en estado '${evento.estado}'. El evento debe estar exportado.`,
        },
        { status: 400 }
      );
    }

    // Parse FormData
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const mode = formData.get('mode') as string || 'auto'; // 'auto' | 'explicit'

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron archivos' },
        { status: 400 }
      );
    }

    // Validar que todos los archivos son PDFs
    for (const file of files) {
      if (file.type !== 'application/pdf') {
        return NextResponse.json(
          { error: `El archivo '${file.name}' no es un PDF válido` },
          { status: 400 }
        );
      }
    }

    const resultados = [];
    const errores = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        // Determinar empleado
        let empleadoId: string | null = null;
        let nomina: typeof evento.nominas[0] | undefined;

        if (mode === 'explicit') {
          // Modo explícito: obtener empleadoId de FormData
          empleadoId = formData.get(`employeeId_${i}`) as string;

          if (!empleadoId) {
            throw new Error(`No se especificó empleado para '${file.name}'`);
          }

          nomina = evento.nominas.find((n) => n.empleadoId === empleadoId);
        } else {
          // Modo auto: usar clasificador de IA para matching inteligente
          const empleadosCandidatos = evento.nominas.map((n) => ({
            id: n.empleadoId,
            nombre: n.empleado.nombre,
            apellidos: n.empleado.apellidos,
          }));

          const matchResult = await clasificarNomina(file.name, empleadosCandidatos);

          if (matchResult.empleado && matchResult.autoAssigned) {
            // Match automático con suficiente confianza
            empleadoId = matchResult.empleado.id;
            nomina = evento.nominas.find((n) => n.empleadoId === empleadoId);

            console.log(
              `[Importar Nóminas] Match automático: ${file.name} → ${matchResult.empleado.nombre} (${matchResult.confidence}% confianza)`
            );
          } else {
            // No hay match claro, mostrar candidatos
            const candidatosInfo = matchResult.candidates
              .slice(0, 3)
              .map((c) => `${c.nombre} (${c.confidence}%)`)
              .join(', ');

            throw new Error(
              `No se pudo determinar empleado para '${file.name}'. Candidatos: ${candidatosInfo}`
            );
          }
        }

        if (!nomina) {
          throw new Error(`No se pudo encontrar nómina para '${file.name}'`);
        }

        // Verificar que la nómina no tenga ya un documento
        if (nomina.documentoId) {
          throw new Error(
            `La nómina de ${nomina.empleado.nombre} ${nomina.empleado.apellidos} ya tiene un documento asociado`
          );
        }

        // Obtener o crear carpeta "Nóminas" del empleado
        let carpetaNominas = await prisma.carpeta.findFirst({
          where: {
            empleadoId: nomina.empleadoId,
            nombre: 'Nóminas',
            esSistema: true,
          },
        });

        if (!carpetaNominas) {
          // Auto-crear carpeta de nóminas
          carpetaNominas = await prisma.carpeta.create({
            data: {
              empresaId: session.user.empresaId,
              empleadoId: nomina.empleadoId,
              nombre: 'Nóminas',
              esSistema: true,
            },
          });
        }

        // Leer archivo como Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Generar key de S3
        const s3Key = `empresas/${session.user.empresaId}/empleados/${nomina.empleadoId}/nominas/${evento.mes}_${evento.anio}_${nomina.id}.pdf`;

        // Subir a S3
        const s3Url = await uploadToS3(buffer, s3Key, 'application/pdf');

        // Crear documento
        const documento = await prisma.documento.create({
          data: {
            empresaId: session.user.empresaId,
            empleadoId: nomina.empleadoId,
            carpetaId: carpetaNominas.id,
            nombre: `Nómina ${evento.mes}/${evento.anio}`,
            tipoDocumento: 'nomina',
            mimeType: 'application/pdf',
            tamano: file.size,
            s3Key,
            s3Bucket: process.env.STORAGE_BUCKET || 'local',
          },
        });

        // Vincular documento a nómina
        await prisma.nomina.update({
          where: { id: nomina.id },
          data: {
            documentoId: documento.id,
            subidoPor: session.user.id,
          },
        });

        // Actualizar estado usando función de sincronización
        await actualizarEstadoNomina(nomina.id, 'definitiva');

        resultados.push({
          empleado: `${nomina.empleado.nombre} ${nomina.empleado.apellidos}`,
          archivo: file.name,
          documentoId: documento.id,
          status: 'success',
        });
      } catch (error) {
        errores.push({
          archivo: file.name,
          error: error instanceof Error ? error.message : 'Error desconocido',
        });
      }
    }

    // Sincronizar estado del evento (automático basado en estados de nóminas individuales)
    await sincronizarEstadoEvento(id);

    // Verificar si todas las nóminas tienen documentos
    const nominasSinDocumento = await prisma.nomina.count({
      where: {
        eventoNominaId: id,
        documentoId: null,
      },
    });

    return NextResponse.json({
      importadas: resultados.length,
      errores: errores.length,
      resultados,
      errores,
      eventoCompleto: nominasSinDocumento === 0,
    });
  } catch (error) {
    console.error('[POST /api/nominas/eventos/[id]/importar] Error:', error);
    return NextResponse.json(
      { error: 'Error al importar nóminas' },
      { status: 500 }
    );
  }
}
