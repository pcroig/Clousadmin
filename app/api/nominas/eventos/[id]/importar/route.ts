// ========================================
// API: Importar Nóminas Definitivas
// ========================================
// Sube PDFs de nóminas definitivas desde la gestoría
// Vincula los PDFs a las nóminas correspondientes

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { EVENTO_ESTADOS, NOMINA_ESTADOS } from '@/lib/constants/nomina-estados';
import { clasificarNomina } from '@/lib/ia/clasificador-nominas';
import { prisma } from '@/lib/prisma';
import { uploadToS3 } from '@/lib/s3';

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

    // Verificar que el evento no esté cerrado
    if (evento.estado === EVENTO_ESTADOS.CERRADO) {
      return NextResponse.json(
        { error: 'No se pueden importar nóminas en un evento cerrado' },
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
        let _s3Url: string;
        try {
          _s3Url = await uploadToS3(buffer, s3Key, 'application/pdf');
        } catch (s3Error: unknown) {
          const errorMessage = s3Error instanceof Error ? s3Error.message : 'Error desconocido';
          console.error(`[Importar Nóminas] Error S3 para ${file.name}:`, errorMessage);
          errores.push({
            archivo: file.name,
            error: `Error al subir archivo: ${errorMessage}`,
          });
          continue; // Pasar al siguiente archivo
        }

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

        // Vincular documento a nómina y actualizar a estado 'completada'
        await prisma.nomina.update({
          where: { id: nomina.id },
          data: {
            documentoId: documento.id,
            subidoPor: session.user.id,
            estado: NOMINA_ESTADOS.COMPLETADA,
          },
        });

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

    // Verificar si todas las nóminas tienen documentos
    const nominasSinDocumento = await prisma.nomina.count({
      where: {
        eventoNominaId: id,
        documentoId: null,
      },
    });
    const eventoCompleto = nominasSinDocumento === 0;
    const ahora = new Date();

    // Actualizar fecha de importación si es la primera
    if (!evento.fechaImportacion) {
      await prisma.eventoNomina.update({
        where: { id },
        data: {
          fechaImportacion: ahora,
          nominasImportadas: resultados.length,
          ...(eventoCompleto && {
            estado: EVENTO_ESTADOS.CERRADO,
            fechaPublicacion: ahora,
          }),
        },
      });
    } else {
      // Incrementar contador de nóminas importadas
      await prisma.eventoNomina.update({
        where: { id },
        data: {
          nominasImportadas: {
            increment: resultados.length,
          },
          ...(eventoCompleto && {
            estado: EVENTO_ESTADOS.CERRADO,
            fechaPublicacion: evento.fechaPublicacion ?? ahora,
          }),
        },
      });
    }

    return NextResponse.json({
      importadas: resultados.length,
      errores: errores.length,
      resultados,
      errores,
      eventoCompleto,
    });
  } catch (error) {
    console.error('[POST /api/nominas/eventos/[id]/importar] Error:', error);
    return NextResponse.json(
      { error: 'Error al importar nóminas' },
      { status: 500 }
    );
  }
}
