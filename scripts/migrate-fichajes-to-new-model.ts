// ========================================
// Script de Migración: Fichajes Antiguo → Nuevo Modelo
// ========================================
// Migra datos de fichajes (eventos individuales) al nuevo modelo
// donde cada Fichaje representa un día completo con sus eventos

import { PrismaClient } from '@prisma/client';
import { format, parseISO } from 'date-fns';

const prisma = new PrismaClient();

interface FichajeAntiguo {
  id: string;
  empresaId: string;
  empleadoId: string;
  tipo: string;
  fecha: Date;
  hora: Date;
  metodo: string;
  estado: string;
  ubicacion: string | null;
  autoCompletado: boolean;
  scoreAlerta: number | null;
  motivoAlerta: string | null;
  editado: boolean;
  motivoEdicion: string | null;
  solicitadoPor: string | null;
  aprobadoPor: string | null;
  fechaAprobacion: Date | null;
  notas: string | null;
}

async function migrateFichajes() {
  console.log('🚀 Iniciando migración de fichajes...\n');

  try {
    // 1. Obtener todos los fichajes antiguos (antes eran eventos individuales)
    console.log('📊 Consultando fichajes antiguos de la BD temporal...');
    
    // Como ya modificamos el schema, los datos antiguos están en la tabla actual
    // pero con estructura antigua. Necesitamos agruparlos.
    
    const fichajesAntiguos = await prisma.$queryRaw<FichajeAntiguo[]>`
      SELECT * FROM fichajes
      ORDER BY empleado_id, fecha, hora
    `;

    console.log(`   Encontrados ${fichajesAntiguos.length} registros antiguos\n`);

    if (fichajesAntiguos.length === 0) {
      console.log('✅ No hay fichajes antiguos para migrar');
      return;
    }

    // 2. Agrupar fichajes por empleado + fecha
    console.log('🔄 Agrupando fichajes por empleado y fecha...');
    
    const gruposPorEmpleadoYFecha: Record<string, FichajeAntiguo[]> = {};
    
    for (const fichaje of fichajesAntiguos) {
      const key = `${fichaje.empleadoId}_${format(new Date(fichaje.fecha), 'yyyy-MM-dd')}`;
      if (!gruposPorEmpleadoYFecha[key]) {
        gruposPorEmpleadoYFecha[key] = [];
      }
      gruposPorEmpleadoYFecha[key].push(fichaje);
    }

    const totalDias = Object.keys(gruposPorEmpleadoYFecha).length;
    console.log(`   Agrupados en ${totalDias} jornadas diferentes\n`);

    // 3. Por cada grupo, crear un Fichaje nuevo con sus eventos
    console.log('💾 Creando nuevos fichajes con eventos...\n');

    let contadorFichajes = 0;
    let contadorEventos = 0;

    for (const [key, eventosDelDia] of Object.entries(gruposPorEmpleadoYFecha)) {
      const [empleadoId, fechaStr] = key.split('_');
      const fecha = parseISO(fechaStr);

      // Ordenar eventos por hora
      const eventosOrdenados = eventosDelDia.sort((a, b) => 
        new Date(a.hora).getTime() - new Date(b.hora).getTime()
      );

      // Determinar estado del fichaje según los eventos
      const tieneSalida = eventosOrdenados.some(e => e.tipo === 'salida');
      const tieneAutocompletado = eventosOrdenados.some(e => e.autoCompletado);
      const tieneAlerta = eventosOrdenados.some(e => e.scoreAlerta && e.scoreAlerta >= 70);
      
      let estadoFichaje = 'en_curso';
      if (tieneSalida) {
        if (tieneAutocompletado && tieneAlerta) {
          estadoFichaje = 'pendiente_revision';
        } else {
          estadoFichaje = 'finalizado';
        }
      }

      // Calcular horas trabajadas
      const horasTrabajadas = calcularHorasTrabajadas(eventosOrdenados);
      const horasEnPausa = calcularTiempoEnPausa(eventosOrdenados);

      // Tomar datos de aprobación del último evento (si existe)
      const ultimoEvento = eventosOrdenados[eventosOrdenados.length - 1];
      const empresaId = ultimoEvento.empresaId;
      const autoCompletado = tieneAutocompletado;
      const _scoreAlerta = eventosOrdenados.find(e => e.scoreAlerta)?.scoreAlerta || null;
      const _motivoAlerta = eventosOrdenados.find(e => e.motivoAlerta)?.motivoAlerta || null;
      const _aprobadoPor = ultimoEvento.aprobadoPor;
      const _fechaAprobacion = ultimoEvento.fechaAprobacion;
      const _notas = eventosOrdenados.find(e => e.notas)?.notas || null;

      try {
        // Crear Fichaje nuevo
        const nuevoFichaje = await prisma.fichajes.create({
          data: {
            empresaId,
            empleadoId,
            jornadaId: null,
            fecha,
            estado: estadoFichaje,
            horasTrabajadas,
            horasEnPausa,
            autoCompletado,
            // scoreAlerta, // Campo no existe en nuevo modelo
            // motivoAlerta, // Campo no existe en nuevo modelo
            // aprobadoPor, // Campo no existe en nuevo modelo
            // fechaAprobacion, // Se mapea a campo con mismo nombre pero estructura diferente
            // notas, // Campo no existe en nuevo modelo
          },
        });

        contadorFichajes++;

        // Crear eventos asociados
        for (const evento of eventosOrdenados) {
          await prisma.fichaje_eventos.create({
            data: {
              fichajeId: nuevoFichaje.id,
              tipo: evento.tipo,
              hora: evento.hora,
              // metodo: evento.metodo, // Campo no existe en nuevo modelo
              ubicacion: evento.ubicacion,
              editado: evento.editado,
              motivoEdicion: evento.motivoEdicion,
              editadoPor: evento.solicitadoPor,
            },
          });

          contadorEventos++;
        }

        console.log(`   ✓ Fichaje ${contadorFichajes}/${totalDias}: ${empleadoId} - ${fechaStr} (${eventosOrdenados.length} eventos)`);

      } catch (error) {
        console.error(`   ✗ Error creando fichaje ${key}:`, error);
        throw error;
      }
    }

    console.log(`\n✅ Migración completada:`);
    console.log(`   - ${contadorFichajes} fichajes creados`);
    console.log(`   - ${contadorEventos} eventos creados`);

  } catch (error) {
    console.error('\n❌ Error en la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Función auxiliar: calcular horas trabajadas
function calcularHorasTrabajadas(eventos: FichajeAntiguo[]): number {
  let horasTotales = 0;
  let inicioTrabajo: Date | null = null;

  for (const evento of eventos) {
    const hora = new Date(evento.hora);

    switch (evento.tipo) {
      case 'entrada':
        inicioTrabajo = hora;
        break;

      case 'pausa_inicio':
        if (inicioTrabajo) {
          const tiempoTrabajado = (hora.getTime() - inicioTrabajo.getTime()) / (1000 * 60 * 60);
          horasTotales += tiempoTrabajado;
          inicioTrabajo = null;
        }
        break;

      case 'pausa_fin':
        inicioTrabajo = hora;
        break;

      case 'salida':
        if (inicioTrabajo) {
          const tiempoTrabajado = (hora.getTime() - inicioTrabajo.getTime()) / (1000 * 60 * 60);
          horasTotales += tiempoTrabajado;
          inicioTrabajo = null;
        }
        break;
    }
  }

  return Math.round(horasTotales * 100) / 100;
}

// Función auxiliar: calcular tiempo en pausa
function calcularTiempoEnPausa(eventos: FichajeAntiguo[]): number {
  let tiempoPausaTotal = 0;
  let inicioPausa: Date | null = null;

  for (const evento of eventos) {
    const hora = new Date(evento.hora);

    if (evento.tipo === 'pausa_inicio') {
      inicioPausa = hora;
    } else if (evento.tipo === 'pausa_fin' && inicioPausa) {
      const tiempoPausa = (hora.getTime() - inicioPausa.getTime()) / (1000 * 60 * 60);
      tiempoPausaTotal += tiempoPausa;
      inicioPausa = null;
    }
  }

  return Math.round(tiempoPausaTotal * 100) / 100;
}

// Ejecutar migración
migrateFichajes()
  .then(() => {
    console.log('\n🎉 Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  });

