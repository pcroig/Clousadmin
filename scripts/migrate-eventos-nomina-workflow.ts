// ========================================
// Script de Migración: Eventos de Nómina al Nuevo Workflow
// ========================================
// Este script migra eventos existentes al nuevo flujo de estados
// IMPORTANTE: Ejecutar DESPUÉS de aplicar las migraciones de schema

import { prisma } from '@/lib/prisma';

interface MigracionStats {
  totalEventos: number;
  migradosPendiente: number;
  migradosCompletada: number;
  migradosPublicada: number;
  errores: number;
}

async function main() {
  console.log('🚀 Iniciando migración de eventos de nómina al nuevo workflow...\n');

  const stats: MigracionStats = {
    totalEventos: 0,
    migradosPendiente: 0,
    migradosCompletada: 0,
    migradosPublicada: 0,
    errores: 0,
  };

  try {
    // Obtener todos los eventos existentes
    const eventos = await prisma.eventos_nomina.findMany({
      include: {
        _count: {
          select: { nominas: true },
        },
      },
    });

    stats.totalEventos = eventos.length;
    console.log(`📊 Total de eventos encontrados: ${stats.totalEventos}\n`);

    if (eventos.length === 0) {
      console.log('✅ No hay eventos para migrar\n');
      return;
    }

    // Migrar cada evento
    for (const evento of eventos) {
      try {
        let nuevoEstado: string;
        let fechaGeneracionPrenominas: Date | null = null;

        // Lógica de migración según estado actual
        if (evento.fechaPublicacion || evento.estado === 'cerrado' || evento.estado === 'publicado') {
          // Si ya está publicado o cerrado → "publicada"
          nuevoEstado = 'publicada';
          fechaGeneracionPrenominas = evento.fechaCreacion;
          stats.migradosPublicada++;
        } else if (evento.fechaCreacion) {
          // Si tiene fecha de creación pero no está cerrado
          const nominasCount = evento._count.nominas;

          if (nominasCount > 0) {
            // Si tiene nóminas generadas → "completada"
            nuevoEstado = 'completada';
            fechaGeneracionPrenominas = evento.fechaCreacion;
            stats.migradosCompletada++;
          } else {
            // Si no tiene nóminas a pesar de tener fecha → "pendiente"
            nuevoEstado = 'pendiente';
            stats.migradosPendiente++;
          }
        } else {
          // Sin fecha de creación → "pendiente"
          nuevoEstado = 'pendiente';
          stats.migradosPendiente++;
        }

        // Contar nóminas del evento
        const prenominasGeneradas = await prisma.nominas.count({
          where: { eventoNominaId: evento.id },
        });

        // Actualizar evento
        await prisma.eventos_nomina.update({
          where: { id: evento.id },
          data: {
            estado: nuevoEstado,
            fechaCreacion: evento.createdAt,
            fechaGeneracionPrenominas,
            compensarHoras: false, // Default seguro para eventos existentes
            prenominasGeneradas,
          },
        });

        console.log(`✓ Evento ${evento.mes}/${evento.anio} → ${nuevoEstado} (${prenominasGeneradas} nóminas)`);
      } catch (error) {
        stats.errores++;
        console.error(`✗ Error migrando evento ${evento.id}:`, error);
      }
    }

    // Mostrar resumen
    console.log('\n📋 Resumen de la migración:');
    console.log(`  Total eventos:      ${stats.totalEventos}`);
    console.log(`  → Pendiente:        ${stats.migradosPendiente}`);
    console.log(`  → Completada:       ${stats.migradosCompletada}`);
    console.log(`  → Publicada:        ${stats.migradosPublicada}`);
    console.log(`  Errores:            ${stats.errores}`);

    if (stats.errores === 0) {
      console.log('\n✅ Migración completada exitosamente');
    } else {
      console.log('\n⚠️  Migración completada con errores');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Error fatal durante la migración:', error);
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error('Error no manejado:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
