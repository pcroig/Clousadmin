/**
 * Setup Completo Final - Sistema de Fichajes
 *
 * Este script hace TODO en un solo paso:
 * 1. Limpia datos anteriores
 * 2. Crea empleados TEST
 * 3. Crea fichajes con ausencias medio día
 * 4. Calcula y guarda eventos propuestos
 * 5. Verifica que todo esté listo
 */

import { PrismaClient } from '@prisma/client';
import { calcularEventosPropuestos } from '../lib/calculos/fichajes-propuestos';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 SETUP COMPLETO - SISTEMA DE FICHAJES\n');
  console.log('='.repeat(80));

  // 1. LIMPIEZA COMPLETA
  console.log('\n🧹 PASO 1: Limpieza de datos anteriores...\n');

  // Eliminar fichajes TEST anteriores
  const empleadosTest = await prisma.empleados.findMany({
    where: { nombre: 'TEST' },
    select: { id: true }
  });

  if (empleadosTest.length > 0) {
    const idsTest = empleadosTest.map(e => e.id);

    await prisma.fichaje_eventos_propuestos.deleteMany({
      where: { fichaje: { empleadoId: { in: idsTest } } }
    });

    await prisma.fichaje_eventos.deleteMany({
      where: { fichaje: { empleadoId: { in: idsTest } } }
    });

    await prisma.fichajes.deleteMany({
      where: { empleadoId: { in: idsTest } }
    });

    await prisma.ausencias.deleteMany({
      where: { empleadoId: { in: idsTest } }
    });

    console.log('   ✅ Datos TEST anteriores eliminados');
  }

  // 2. OBTENER O CREAR INFRAESTRUCTURA
  console.log('\n🏗️  PASO 2: Verificando infraestructura...\n');

  const empresa = await prisma.empresas.findFirst();
  if (!empresa) {
    console.error('   ❌ No hay empresas en la BD');
    return;
  }
  console.log(`   ✅ Empresa: ${empresa.nombre}`);

  let jornada = await prisma.jornadas.findFirst({
    where: { empresaId: empresa.id, activa: true }
  });

  if (!jornada) {
    jornada = await prisma.jornadas.create({
      data: {
        empresaId: empresa.id,
        horasSemanales: 40,
        activa: true,
        esPredefinida: false,
        config: {
          tipo: 'fija',
          lunes: { activo: true, entrada: '09:00', salida: '18:00', pausa_inicio: '14:00', pausa_fin: '15:00' },
          martes: { activo: true, entrada: '09:00', salida: '18:00', pausa_inicio: '14:00', pausa_fin: '15:00' },
          miercoles: { activo: true, entrada: '09:00', salida: '18:00', pausa_inicio: '14:00', pausa_fin: '15:00' },
          jueves: { activo: true, entrada: '09:00', salida: '18:00', pausa_inicio: '14:00', pausa_fin: '15:00' },
          viernes: { activo: true, entrada: '09:00', salida: '14:00' },
          sabado: { activo: false },
          domingo: { activo: false },
          descanso: { duracion: 60 }
        }
      }
    });
    console.log('   ✅ Jornada creada');
  } else {
    console.log('   ✅ Jornada encontrada');
  }

  // 3. CREAR EMPLEADOS TEST
  console.log('\n👥 PASO 3: Creando empleados TEST...\n');

  const empleadosData = [
    { nombre: 'TEST', apellidos: 'Ausencia Mañana', email: 'test.ausencia.manana@test.com', nif: 'TEST001A' },
    { nombre: 'TEST', apellidos: 'Ausencia Tarde', email: 'test.ausencia.tarde@test.com', nif: 'TEST002B' },
    { nombre: 'TEST', apellidos: 'Completo Normal', email: 'test.completo@test.com', nif: 'TEST003C' },
    { nombre: 'TEST', apellidos: 'Incompleto', email: 'test.incompleto@test.com', nif: 'TEST004D' },
  ];

  const empleados = [];

  for (const empData of empleadosData) {
    let empleado = await prisma.empleados.findUnique({
      where: { email: empData.email }
    });

    if (!empleado) {
      const usuario = await prisma.usuarios.create({
        data: {
          email: empData.email,
          nombre: empData.nombre,
          apellidos: empData.apellidos,
          rol: 'empleado',
          empresaId: empresa.id,
        }
      });

      empleado = await prisma.empleados.create({
        data: {
          empresaId: empresa.id,
          usuarioId: usuario.id,
          nombre: empData.nombre,
          apellidos: empData.apellidos,
          email: empData.email,
          nif: empData.nif,
          fechaAlta: new Date(),
          estadoEmpleado: 'activo',
          jornadaId: jornada.id,
          salarioBaseMensual: 2000,
        }
      });
    } else {
      await prisma.empleados.update({
        where: { id: empleado.id },
        data: { jornadaId: jornada.id, estadoEmpleado: 'activo' }
      });
    }

    empleados.push(empleado);
    console.log(`   ✅ ${empData.apellidos}`);
  }

  // 4. CREAR FICHAJES DE AYER
  console.log('\n📅 PASO 4: Creando fichajes de AYER...\n');

  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  ayer.setHours(0, 0, 0, 0);
  const ayerStr = ayer.toISOString().split('T')[0];

  console.log(`   Fecha: ${ayer.toLocaleDateString('es-ES')}\n`);

  // CASO 1: Ausencia Mañana + Solo Salida
  const ausenciaMañana = await prisma.ausencias.create({
    data: {
      empresaId: empresa.id,
      empleadoId: empleados[0].id,
      tipo: 'otro',
      fechaInicio: ayer,
      fechaFin: ayer,
      medioDia: true,
      periodo: 'manana',
      estado: 'confirmada',
      diasNaturales: 1,
      diasLaborables: 1,
      diasSolicitados: 0.5,
      motivo: 'TEST: Cita médica mañana',
    }
  });

  const fichaje1 = await prisma.fichajes.create({
    data: {
      empresaId: empresa.id,
      empleadoId: empleados[0].id,
      jornadaId: jornada.id,
      fecha: ayer,
      estado: 'pendiente',
      tipoFichaje: 'ordinario',
    }
  });

  await prisma.fichaje_eventos.create({
    data: {
      fichajeId: fichaje1.id,
      tipo: 'salida',
      hora: new Date(`${ayerStr}T18:00:00Z`),
      editado: false,
    }
  });

  console.log('   ✅ CASO 1: Ausencia Mañana (solo salida 18:00)');

  // CASO 2: Ausencia Tarde + Solo Entrada
  const ausenciaTarde = await prisma.ausencias.create({
    data: {
      empresaId: empresa.id,
      empleadoId: empleados[1].id,
      tipo: 'otro',
      fechaInicio: ayer,
      fechaFin: ayer,
      medioDia: true,
      periodo: 'tarde',
      estado: 'confirmada',
      diasNaturales: 1,
      diasLaborables: 1,
      diasSolicitados: 0.5,
      motivo: 'TEST: Tarde libre',
    }
  });

  const fichaje2 = await prisma.fichajes.create({
    data: {
      empresaId: empresa.id,
      empleadoId: empleados[1].id,
      jornadaId: jornada.id,
      fecha: ayer,
      estado: 'pendiente',
      tipoFichaje: 'ordinario',
    }
  });

  await prisma.fichaje_eventos.create({
    data: {
      fichajeId: fichaje2.id,
      tipo: 'entrada',
      hora: new Date(`${ayerStr}T09:00:00Z`),
      editado: false,
    }
  });

  console.log('   ✅ CASO 2: Ausencia Tarde (solo entrada 09:00)');

  // CASO 3: Completo
  const fichaje3 = await prisma.fichajes.create({
    data: {
      empresaId: empresa.id,
      empleadoId: empleados[2].id,
      jornadaId: jornada.id,
      fecha: ayer,
      estado: 'pendiente',
      tipoFichaje: 'ordinario',
    }
  });

  await prisma.fichaje_eventos.createMany({
    data: [
      { fichajeId: fichaje3.id, tipo: 'entrada', hora: new Date(`${ayerStr}T09:00:00Z`), editado: false },
      { fichajeId: fichaje3.id, tipo: 'pausa_inicio', hora: new Date(`${ayerStr}T14:00:00Z`), editado: false },
      { fichajeId: fichaje3.id, tipo: 'pausa_fin', hora: new Date(`${ayerStr}T15:00:00Z`), editado: false },
      { fichajeId: fichaje3.id, tipo: 'salida', hora: new Date(`${ayerStr}T18:00:00Z`), editado: false },
    ]
  });

  console.log('   ✅ CASO 3: Completo Normal (entrada + pausas + salida)');

  // CASO 4: Incompleto
  const fichaje4 = await prisma.fichajes.create({
    data: {
      empresaId: empresa.id,
      empleadoId: empleados[3].id,
      jornadaId: jornada.id,
      fecha: ayer,
      estado: 'pendiente',
      tipoFichaje: 'ordinario',
    }
  });

  await prisma.fichaje_eventos.create({
    data: {
      fichajeId: fichaje4.id,
      tipo: 'entrada',
      hora: new Date(`${ayerStr}T09:00:00Z`),
      editado: false,
    }
  });

  console.log('   ✅ CASO 4: Incompleto (solo entrada 09:00)');

  // 5. CALCULAR Y GUARDAR EVENTOS PROPUESTOS
  console.log('\n🤖 PASO 5: Calculando eventos propuestos...\n');

  const todosLosFichajes = [fichaje1, fichaje2, fichaje3, fichaje4];

  for (let i = 0; i < todosLosFichajes.length; i++) {
    const fichaje = todosLosFichajes[i];
    const empleado = empleados[i];

    try {
      const eventosPropuestos = await calcularEventosPropuestos(fichaje.id);

      if (eventosPropuestos.length > 0) {
        await prisma.fichaje_eventos_propuestos.createMany({
          data: eventosPropuestos.map(ep => ({
            fichajeId: fichaje.id,
            tipo: ep.tipo,
            hora: ep.hora,
            metodo: ep.fuente || 'calculado',
          }))
        });
      }

      console.log(`   ✅ ${empleado.apellidos}: ${eventosPropuestos.length} eventos propuestos`);
    } catch (error) {
      console.log(`   ⚠️  ${empleado.apellidos}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // 6. VERIFICACIÓN FINAL
  console.log('\n' + '='.repeat(80));
  console.log('📊 VERIFICACIÓN FINAL');
  console.log('='.repeat(80) + '\n');

  const verificacion = await prisma.fichajes.findMany({
    where: {
      empleado: { nombre: 'TEST' },
      fecha: ayer
    },
    include: {
      empleado: true,
      eventos: true,
      eventos_propuestos: true
    },
    orderBy: {
      empleado: { apellidos: 'asc' }
    }
  });

  console.log('Fichajes creados:\n');
  verificacion.forEach(f => {
    console.log(`📋 ${f.empleado.apellidos}`);
    console.log(`   Estado: ${f.estado}`);
    console.log(`   Eventos registrados: ${f.eventos.length}`);
    console.log(`   Eventos propuestos: ${f.eventos_propuestos.length}`);
    console.log();
  });

  // 7. INSTRUCCIONES FINALES
  console.log('='.repeat(80));
  console.log('✅ SETUP COMPLETADO - TODO LISTO');
  console.log('='.repeat(80));

  console.log('\n🎯 AHORA EN LA PLATAFORMA:\n');
  console.log(`1. Ve a: Fichajes > Cuadrar Fichajes`);
  console.log(`2. Fecha: ${ayer.toLocaleDateString('es-ES')} (8 diciembre 2025)`);
  console.log(`3. Deberías ver 4 fichajes TEST\n`);

  console.log('⭐ VALIDACIÓN CRÍTICA:\n');
  console.log('   Si ves que:');
  console.log('   - "TEST Ausencia Mañana" aparece como COMPLETO ✅');
  console.log('   - "TEST Ausencia Tarde" aparece como COMPLETO ✅');
  console.log('   \n   → La corrección funciona perfectamente! 🎉\n');

  console.log('='.repeat(80) + '\n');
}

main()
  .catch((error) => {
    console.error('💥 Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
