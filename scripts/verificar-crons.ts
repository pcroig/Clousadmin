// ========================================
// Script: Verificar Estado de CRONs
// ========================================
// Consolida el estado de los cron jobs usando datos de la BD

import { prisma } from '../lib/prisma';

async function verificarCrons() {
  try {
    console.log('\n🔍 Verificando estado de CRONs...\n');

    console.log('📋 CRON: Clasificar Fichajes (Cerrar Jornadas)');
    console.log('   Endpoint: POST /api/cron/clasificar-fichajes');
    console.log('   Horario: Diario 23:30\n');

    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    ayer.setHours(0, 0, 0, 0);

    const fichajesPendientes = await prisma.fichaje.findMany({
      where: {
        estado: 'pendiente',
        fecha: {
          gte: ayer,
        },
      },
      select: {
        id: true,
        fecha: true,
        empleadoId: true,
        createdAt: true,
      },
      take: 10,
    });

    const fichajesFinalizados = await prisma.fichaje.findMany({
      where: {
        estado: 'finalizado',
        fecha: {
          gte: ayer,
        },
        cuadradoMasivamente: true,
      },
      select: {
        id: true,
        fecha: true,
        cuadradoEn: true,
        cuadradoPor: true,
      },
      take: 10,
    });

    console.log(`   ✅ Fichajes pendientes (últimas 24h): ${fichajesPendientes.length}`);
    if (fichajesPendientes.length > 0) {
      console.log('   📝 Ejemplos:');
      fichajesPendientes.slice(0, 3).forEach((f) => {
        console.log(`      - ${f.fecha.toISOString().split('T')[0]} (creado: ${f.createdAt.toISOString()})`);
      });
    }

    console.log(`   ✅ Fichajes cuadrados masivamente (últimas 24h): ${fichajesFinalizados.length}`);
    if (fichajesFinalizados.length > 0) {
      console.log('   📝 Ejemplos:');
      fichajesFinalizados.slice(0, 3).forEach((f) => {
        console.log(`      - ${f.fecha.toISOString().split('T')[0]} (cuadrado: ${f.cuadradoEn?.toISOString()})`);
      });
    }

    console.log('\n📋 CRON: Revisar Solicitudes con IA');
    console.log('   Endpoint: POST /api/cron/revisar-solicitudes');
    console.log('   Horario: Diario 02:00 UTC\n');

    const hace48h = new Date();
    hace48h.setHours(hace48h.getHours() - 48);

    const solicitudesPendientes = await prisma.solicitudCambio.findMany({
      where: {
        estado: 'pendiente',
        revisadaPorIA: false,
        createdAt: {
          lte: hace48h,
        },
      },
      select: {
        id: true,
        tipo: true,
        createdAt: true,
        empleado: {
          select: {
            nombre: true,
            apellidos: true,
          },
        },
      },
      take: 10,
    });

    const solicitudesRevisadasIA = await prisma.solicitudCambio.findMany({
      where: {
        revisadaPorIA: true,
        createdAt: {
          gte: hace48h,
        },
      },
      select: {
        id: true,
        tipo: true,
        estado: true,
        revisadaPorIA: true,
        revisionIA: true,
        createdAt: true,
        empleado: {
          select: {
            nombre: true,
            apellidos: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    console.log(`   ⚠️  Solicitudes pendientes >48h sin revisar: ${solicitudesPendientes.length}`);
    if (solicitudesPendientes.length > 0) {
      console.log('   📝 Ejemplos:');
      solicitudesPendientes.slice(0, 3).forEach((s) => {
        console.log(`      - ${s.tipo} de ${s.empleado.nombre} ${s.empleado.apellidos} (${s.createdAt.toISOString()})`);
      });
    }

    console.log(`   ✅ Solicitudes revisadas por IA (últimas 48h): ${solicitudesRevisadasIA.length}`);
    if (solicitudesRevisadasIA.length > 0) {
      console.log('   📝 Ejemplos:');
      solicitudesRevisadasIA.slice(0, 3).forEach((s) => {
        const revision = s.revisionIA as { confianza?: number; requiereRevisionManual?: boolean } | null;
        const estado = revision?.requiereRevisionManual ? 'requiere_revision' : s.estado;
        console.log(`      - ${s.tipo} de ${s.empleado.nombre} ${s.empleado.apellidos} → ${estado} (confianza: ${revision?.confianza ?? 'N/A'}%)`);
      });
    }

    console.log('\n🔐 Variables de Entorno:');
    const cronSecret = process.env.CRON_SECRET;
    const alertWebhook = process.env.CRON_ALERT_WEBHOOK;
    const periodoRevision = process.env.SOLICITUDES_PERIODO_REVISION_HORAS;

    console.log(`   ${cronSecret ? '✅' : '❌'} CRON_SECRET: ${cronSecret ? 'Configurado' : 'NO configurado'}`);
    console.log(`   ${alertWebhook ? '✅' : '⚠️ '} CRON_ALERT_WEBHOOK: ${alertWebhook ? 'Configurado' : 'NO configurado (opcional)'}`);
    console.log(`   ${periodoRevision ? '✅' : '⚠️ '} SOLICITUDES_PERIODO_REVISION_HORAS: ${periodoRevision || '48 (default)'} horas`);

    console.log('\n📊 Resumen:');
    console.log(`   - Fichajes pendientes: ${fichajesPendientes.length}`);
    console.log(`   - Fichajes cuadrados: ${fichajesFinalizados.length}`);
    console.log(`   - Solicitudes pendientes >48h: ${solicitudesPendientes.length}`);
    console.log(`   - Solicitudes revisadas IA: ${solicitudesRevisadasIA.length}`);

    if (solicitudesPendientes.length > 0) {
      console.log('\n⚠️  RECOMENDACIÓN:');
      console.log('   Hay solicitudes pendientes que deberían haber sido revisadas por IA.');
      console.log('   Verifica que el CRON se esté ejecutando correctamente.');
    }

    if (!cronSecret) {
      console.log('\n❌ ERROR CRÍTICO:');
      console.log('   CRON_SECRET no está configurado. Los CRONs no funcionarán.');
      console.log('   Configura esta variable en tu hosting.');
    }

    console.log('\n');
  } catch (error) {
    console.error('❌ Error al verificar CRONs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarCrons();

