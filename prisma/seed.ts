// ========================================
// Database Seed - Datos de Prueba
// ========================================
// Ejecutar con: npx prisma db seed

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...\n');

  // Limpiar datos previos si existen (opcional)
  // Comentado para no perder datos en sucesivas ejecuciones
  // await prisma.empleadoEquipo.deleteMany({});
  // await prisma.equipo.deleteMany({});
  // await prisma.empleado.deleteMany({});

  // ========================================
  // 1. CREAR EMPRESA
  // ========================================
  console.log('📦 Creando empresa de prueba...');
  
  const empresa = await prisma.empresa.upsert({
    where: { cif: 'B12345678' },
    update: {},
    create: {
      nombre: 'Clousadmin Demo',
      cif: 'B12345678',
      email: 'info@clousadmin-demo.com',
      telefono: '+34 912 345 678',
      direccion: 'Calle Mayor 123, 28013 Madrid',
      config: {
        hora_cierre_fichaje_default: '18:00',
        auto_completado_fichajes_dias: 7,
        auto_completado_nominas_dias: 7,
        auto_completado_contratos_dias: 14,
        umbral_ia_nominas: 0.8,
        umbral_ia_contratos: 0.85,
        permitir_saldo_vacaciones_negativo: true,
        empleado_puede_ver_salario: false,
      },
    },
  });

  console.log(`✅ Empresa creada: ${empresa.nombre} (${empresa.id})\n`);

  // ========================================
  // 2. CREAR JORNADAS PREDEFINIDAS
  // ========================================
  console.log('⏰ Creando jornadas predefinidas...');

  const jornadaCompleta = await prisma.jornada.upsert({
    where: { id: 'jornada-completa-40h' },
    update: {},
    create: {
      id: 'jornada-completa-40h',
      empresaId: empresa.id,
      nombre: 'Jornada Completa 40h',
      horasSemanales: 40,
      esPredefinida: true,
      config: {
        lunes: { activo: true, entrada: '09:00', salida: '18:00' },
        martes: { activo: true, entrada: '09:00', salida: '18:00' },
        miercoles: { activo: true, entrada: '09:00', salida: '18:00' },
        jueves: { activo: true, entrada: '09:00', salida: '18:00' },
        viernes: { activo: true, entrada: '09:00', salida: '18:00' },
        sabado: { activo: false },
        domingo: { activo: false },
      },
    },
  });

  const jornadaIntensiva = await prisma.jornada.upsert({
    where: { id: 'jornada-intensiva-35h' },
    update: {},
    create: {
      id: 'jornada-intensiva-35h',
      empresaId: empresa.id,
      nombre: 'Jornada Intensiva 35h',
      horasSemanales: 35,
      esPredefinida: true,
      config: {
        lunes: { activo: true, entrada: '09:00', salida: '16:00' },
        martes: { activo: true, entrada: '09:00', salida: '16:00' },
        miercoles: { activo: true, entrada: '09:00', salida: '16:00' },
        jueves: { activo: true, entrada: '09:00', salida: '16:00' },
        viernes: { activo: true, entrada: '09:00', salida: '16:00' },
        sabado: { activo: false },
        domingo: { activo: false },
      },
    },
  });

  console.log(`✅ Jornadas creadas: ${jornadaCompleta.nombre}, ${jornadaIntensiva.nombre}\n`);

  // ========================================
  // 3. CREAR USUARIO Y EMPLEADO HR ADMIN
  // ========================================
  console.log('👤 Creando usuario HR Admin...');

  const passwordHash = await hash('Admin123!', 12);

  const usuarioAdmin = await prisma.usuario.upsert({
    where: { email: 'admin@clousadmin.com' },
    update: {
      activo: true,
      emailVerificado: true,
    },
    create: {
      email: 'admin@clousadmin.com',
      password: passwordHash,
      nombre: 'Admin',
      apellidos: 'Clousadmin',
      rol: 'hr_admin',
      activo: true,
      emailVerificado: true,
      empresaId: empresa.id,
    },
  });

  const empleadoAdmin = await prisma.empleado.upsert({
    where: { usuarioId: usuarioAdmin.id },
    update: {
      activo: true,
    },
    create: {
      usuarioId: usuarioAdmin.id,
      empresaId: empresa.id,
      nombre: 'Admin',
      apellidos: 'Clousadmin',
      email: 'admin@clousadmin.com',
      nif: '99999999Z',
      telefono: '+34 600 000 000',
      direccionCalle: 'Calle Principal',
      direccionNumero: '1',
      codigoPostal: '28001',
      ciudad: 'Madrid',
      direccionProvincia: 'Madrid',
      departamento: 'Administración',
      puesto: 'HR Administrator',
      fechaAlta: new Date('2024-01-01'),
      tipoContrato: 'indefinido',
      jornadaId: jornadaCompleta.id,
      salarioBrutoAnual: 45000,
      salarioBrutoMensual: 3750,
      onboardingCompletado: true,
      onboardingCompletadoEn: new Date(),
      documentosCompletos: true,
      documentosCompletadosEn: new Date(),
    },
  });

  // Actualizar usuario para vincular con empleado
  await prisma.usuario.update({
    where: { id: usuarioAdmin.id },
    data: { empleadoId: empleadoAdmin.id },
  });

  console.log(`✅ HR Admin creado: ${usuarioAdmin.email}\n`);

  // ========================================
  // 4. CREAR EMPLEADOS DE PRUEBA
  // ========================================
  console.log('👥 Creando empleados de prueba...');

  const empleadosData = [
    {
      nombre: 'Ana',
      apellidos: 'García López',
      email: 'ana.garcia@clousadmin.com',
      nif: '11111111A',
      departamento: 'Tech',
      puesto: 'Software Engineer',
      salarioBrutoAnual: 42000,
      rol: 'empleado',
    },
    {
      nombre: 'Carlos',
      apellidos: 'Martínez Ruiz',
      email: 'carlos.martinez@clousadmin.com',
      nif: '22222222B',
      departamento: 'Producto',
      puesto: 'Product Manager',
      salarioBrutoAnual: 48000,
      rol: 'manager', // Carlos es manager de equipos
    },
    {
      nombre: 'Laura',
      apellidos: 'Sánchez Pérez',
      email: 'laura.sanchez@clousadmin.com',
      nif: '33333333C',
      departamento: 'Diseño',
      puesto: 'UX Designer',
      salarioBrutoAnual: 38000,
      rol: 'empleado',
    },
    {
      nombre: 'Miguel',
      apellidos: 'López Fernández',
      email: 'miguel.lopez@clousadmin.com',
      nif: '44444444D',
      departamento: 'Tech',
      puesto: 'DevOps Engineer',
      salarioBrutoAnual: 45000,
      rol: 'empleado',
    },
    {
      nombre: 'Sara',
      apellidos: 'Fernández González',
      email: 'sara.fernandez@clousadmin.com',
      nif: '55555555E',
      departamento: 'Tech',
      puesto: 'QA Engineer',
      salarioBrutoAnual: 38000,
      rol: 'empleado',
    },
  ];

  const empleados: any[] = [];

  for (const empData of empleadosData) {
    const usuarioPassword = await hash('Empleado123!', 12);

    const usuario = await prisma.usuario.upsert({
      where: { email: empData.email },
      update: {
        // Asegurar que se actualiza si el usuario ya existe
        nombre: empData.nombre,
        apellidos: empData.apellidos,
        rol: empData.rol,
        activo: true,
      },
      create: {
        email: empData.email,
        password: usuarioPassword,
        nombre: empData.nombre,
        apellidos: empData.apellidos,
        rol: empData.rol, // Usar el rol especificado en los datos
        activo: true,
        emailVerificado: false,
        empresaId: empresa.id,
      },
    });

    const empleado = await prisma.empleado.upsert({
      where: { usuarioId: usuario.id },
      update: {
        // Actualizar datos si el empleado ya existe
        nombre: empData.nombre,
        apellidos: empData.apellidos,
        departamento: empData.departamento,
        puesto: empData.puesto,
        salarioBrutoAnual: empData.salarioBrutoAnual,
        salarioBrutoMensual: Math.round(empData.salarioBrutoAnual / 12),
        activo: true,
      },
      create: {
        usuarioId: usuario.id,
        empresaId: empresa.id,
        nombre: empData.nombre,
        apellidos: empData.apellidos,
        email: empData.email,
        nif: empData.nif,
        telefono: `+34 6${Math.floor(Math.random() * 90000000) + 10000000}`,
        direccionCalle: `Calle ${empData.nombre}`,
        direccionNumero: `${Math.floor(Math.random() * 100)}`,
        codigoPostal: `280${Math.floor(Math.random() * 50)}`,
        ciudad: 'Madrid',
        departamento: empData.departamento,
        puesto: empData.puesto,
        fechaAlta: new Date('2024-03-01'),
        tipoContrato: 'indefinido',
        managerId: empleadoAdmin.id,
        jornadaId: jornadaCompleta.id,
        salarioBrutoAnual: empData.salarioBrutoAnual,
        salarioBrutoMensual: Math.round(empData.salarioBrutoAnual / 12),
        onboardingCompletado: false,
        documentosCompletos: false,
      },
    });

    // Actualizar usuario para vincular con empleado
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { empleadoId: empleado.id },
    });

    empleados.push(empleado);
    console.log(`  ✅ ${empleado.nombre} ${empleado.apellidos} - ${empleado.puesto}`);
  }

  console.log(`\n✅ ${empleados.length} empleados creados\n`);

  // ========================================
  // 5. CREAR EQUIPOS
  // ========================================
  console.log('👨‍👩‍👧‍👦 Creando equipos...');

  const equipoDesarrollo = await prisma.equipo.create({
    data: {
      empresaId: empresa.id,
      nombre: 'Equipo de Desarrollo',
      descripcion: 'Equipo encargado del desarrollo de producto',
      tipo: 'proyecto',
      managerId: empleados[1].id, // Carlos (Product Manager)
    },
  });

  // Añadir miembros al equipo de desarrollo
  await prisma.empleadoEquipo.createMany({
    data: [
      { empleadoId: empleados[0].id, equipoId: equipoDesarrollo.id }, // Ana
      { empleadoId: empleados[3].id, equipoId: equipoDesarrollo.id }, // Miguel
      { empleadoId: empleados[4].id, equipoId: equipoDesarrollo.id }, // Sara
    ],
    skipDuplicates: true,
  });

  console.log(`  ✅ ${equipoDesarrollo.nombre} (3 miembros)`);

  const equipoProducto = await prisma.equipo.create({
    data: {
      empresaId: empresa.id,
      nombre: 'Equipo de Producto',
      descripcion: 'Equipo de diseño y producto',
      tipo: 'squad',
      managerId: empleados[1].id, // Carlos (Product Manager)
    },
  });

  // Añadir miembros al equipo de producto
  await prisma.empleadoEquipo.createMany({
    data: [
      { empleadoId: empleados[1].id, equipoId: equipoProducto.id }, // Carlos
      { empleadoId: empleados[2].id, equipoId: equipoProducto.id }, // Laura
    ],
    skipDuplicates: true,
  });

  console.log(`  ✅ ${equipoProducto.nombre} (2 miembros)\n`);

  // Array de equipos para referenciar
  const equipos = [equipoDesarrollo, equipoProducto];

  // ========================================
  // 6. CREAR AUSENCIAS DE PRUEBA
  // ========================================
  console.log('🏖️ Creando ausencias de prueba...');

  const ausenciasData = [
    // Ausencias pendientes (para ver en bandeja entrada)
    {
      empleadoId: empleados[0].id, // Ana
      empresaId: empresa.id,
      equipoId: equipos[0].id, // Tech Squad
        tipo: 'vacaciones',
      fechaInicio: new Date('2025-12-20'),
      fechaFin: new Date('2025-12-31'),
      diasNaturales: 12,
      diasLaborables: 8,
      diasSolicitados: 6, // Excluyendo festivos 25 y 26 dic
      motivo: 'Vacaciones de Navidad',
      descuentaSaldo: true,
        estado: 'pendiente',
      },
      {
      empleadoId: empleados[1].id, // Carlos
        empresaId: empresa.id,
      equipoId: equipos[0].id, // Tech Squad
        tipo: 'vacaciones',
        fechaInicio: new Date('2025-11-10'),
      fechaFin: new Date('2025-11-15'),
      diasNaturales: 6,
      diasLaborables: 5,
      diasSolicitados: 4, // Excluyendo festivo 1 nov
      motivo: 'Puente de noviembre',
      descuentaSaldo: true,
        estado: 'pendiente',
      },
      {
      empleadoId: empleados[3].id, // Miguel
        empresaId: empresa.id,
      equipoId: equipos[1].id, // Sales Team
      tipo: 'otro',
      fechaInicio: new Date('2025-10-28'),
      fechaFin: new Date('2025-10-28'),
        diasNaturales: 1,
        diasLaborables: 1,
      diasSolicitados: 1,
      motivo: 'Asuntos personales',
      descuentaSaldo: false,
        estado: 'pendiente',
      },

    // Ausencias aprobadas (futuras)
      {
      empleadoId: empleados[2].id, // Laura
        empresaId: empresa.id,
      equipoId: equipos[0].id,
        tipo: 'vacaciones',
      fechaInicio: new Date('2025-11-01'),
      fechaFin: new Date('2025-11-08'),
      diasNaturales: 8,
      diasLaborables: 6,
      diasSolicitados: 5, // Excluyendo festivo 1 nov
      motivo: 'Vacaciones de otoño',
      descuentaSaldo: true,
      estado: 'aprobada',
      aprobadaPor: usuarioAdmin.id,
      aprobadaEn: new Date(),
    },
    {
      empleadoId: empleados[4].id, // Sara
        empresaId: empresa.id,
      equipoId: equipos[1].id,
      tipo: 'vacaciones',
      fechaInicio: new Date('2025-12-23'),
      fechaFin: new Date('2025-12-30'),
      diasNaturales: 8,
      diasLaborables: 6,
      diasSolicitados: 5, // Excluyendo festivo 25 dic
      motivo: 'Vacaciones de Navidad',
      descuentaSaldo: true,
      estado: 'aprobada',
      aprobadaPor: usuarioAdmin.id,
      aprobadaEn: new Date(),
    },

    // Ausencias pasadas (historial)
    {
      empleadoId: empleados[0].id, // Ana
        empresaId: empresa.id,
      equipoId: equipos[0].id,
      tipo: 'enfermedad',
      fechaInicio: new Date('2025-10-15'),
      fechaFin: new Date('2025-10-17'),
      diasNaturales: 3,
      diasLaborables: 3,
      diasSolicitados: 3,
      motivo: 'Gripe',
      descuentaSaldo: false,
      estado: 'aprobada',
      aprobadaPor: usuarioAdmin.id,
      aprobadaEn: new Date('2025-10-15'),
    },
    {
      empleadoId: empleados[1].id, // Carlos
        empresaId: empresa.id,
      equipoId: equipos[0].id,
      tipo: 'vacaciones',
      fechaInicio: new Date('2025-08-01'),
      fechaFin: new Date('2025-08-15'),
      diasNaturales: 15,
      diasLaborables: 11,
      diasSolicitados: 10, // Excluyendo festivo 15 ago
      motivo: 'Vacaciones de verano',
      descuentaSaldo: true,
      estado: 'aprobada',
      aprobadaPor: usuarioAdmin.id,
      aprobadaEn: new Date('2025-07-20'),
    },
    {
      empleadoId: empleados[2].id, // Laura
        empresaId: empresa.id,
      equipoId: equipos[0].id,
      tipo: 'vacaciones',
      fechaInicio: new Date('2025-09-10'),
      fechaFin: new Date('2025-09-13'),
      diasNaturales: 4,
      diasLaborables: 4,
      diasSolicitados: 4,
      motivo: 'Puente',
      descuentaSaldo: true,
      estado: 'aprobada',
      aprobadaPor: usuarioAdmin.id,
      aprobadaEn: new Date('2025-09-01'),
    },
    {
      empleadoId: empleados[3].id, // Miguel
      empresaId: empresa.id,
      equipoId: equipos[1].id,
      tipo: 'otro',
      fechaInicio: new Date('2025-10-10'),
      fechaFin: new Date('2025-10-10'),
      diasNaturales: 1,
      diasLaborables: 1,
      diasSolicitados: 1,
      motivo: 'Mudanza',
      descuentaSaldo: false,
      estado: 'aprobada',
      aprobadaPor: usuarioAdmin.id,
      aprobadaEn: new Date('2025-10-05'),
    },

    // Una rechazada
    {
      empleadoId: empleados[4].id, // Sara
      empresaId: empresa.id,
      equipoId: equipos[1].id,
      tipo: 'vacaciones',
      fechaInicio: new Date('2025-12-01'),
      fechaFin: new Date('2025-12-10'),
      diasNaturales: 10,
      diasLaborables: 8,
      diasSolicitados: 7, // Excluyendo festivo 6 dic
      motivo: 'Vacaciones diciembre',
      descuentaSaldo: false, // No descuenta porque fue rechazada
      estado: 'rechazada',
      aprobadaPor: usuarioAdmin.id,
      aprobadaEn: new Date(),
      motivoRechazo: 'Ya hay 3 personas de vacaciones en esas fechas. Por favor elige otras fechas.',
    },
  ];

  for (const ausData of ausenciasData) {
    await prisma.ausencia.create({
      data: ausData,
    });
  }

  console.log(`✅ ${ausenciasData.length} ausencias creadas\n`);

  // ========================================
  // 7. CREAR FESTIVOS DE ESPAÑA 2025
  // ========================================
  console.log('🎉 Creando festivos de España 2025...');

  const festivos2025 = [
    { fecha: new Date('2025-01-01'), nombre: 'Año Nuevo' },
    { fecha: new Date('2025-01-06'), nombre: 'Reyes Magos' },
    { fecha: new Date('2025-04-18'), nombre: 'Viernes Santo' },
    { fecha: new Date('2025-05-01'), nombre: 'Día del Trabajador' },
    { fecha: new Date('2025-08-15'), nombre: 'Asunción de la Virgen' },
    { fecha: new Date('2025-10-12'), nombre: 'Fiesta Nacional de España' },
    { fecha: new Date('2025-11-01'), nombre: 'Todos los Santos' },
    { fecha: new Date('2025-12-06'), nombre: 'Día de la Constitución' },
    { fecha: new Date('2025-12-08'), nombre: 'Inmaculada Concepción' },
    { fecha: new Date('2025-12-25'), nombre: 'Navidad' },
  ];

  for (const festivo of festivos2025) {
    await prisma.festivo.upsert({
      where: {
        empresaId_fecha: {
        empresaId: empresa.id,
          fecha: festivo.fecha,
        },
      },
      update: {},
      create: {
        empresaId: empresa.id,
        fecha: festivo.fecha,
        nombre: festivo.nombre,
        tipo: 'nacional',
        origen: 'manual',
        activo: true,
      },
    });
  }

  console.log(`✅ ${festivos2025.length} festivos creados\n`);

  // ========================================
  // 7.5. CREAR SALDOS DE AUSENCIAS PARA EMPLEADOS
  // ========================================
  console.log('💳 Creando saldos de ausencias para empleados...');

  const año2025 = 2025;
  let saldosCreados = 0;

  for (const empleado of empleados) {
    await prisma.empleadoSaldoAusencias.upsert({
      where: {
        empleadoId_año: {
          empleadoId: empleado.id,
          año: año2025,
        },
      },
      update: {},
      create: {
        empleadoId: empleado.id,
        empresaId: empresa.id,
        año: año2025,
        diasTotales: 22, // Default español
        diasUsados: 0,
        diasPendientes: 0,
        origen: 'manual_hr',
      },
    });
    saldosCreados++;
  }

  console.log(`✅ ${saldosCreados} saldos de ausencias creados para año ${año2025}\n`);

  // ========================================
  // 7. CREAR FICHAJES DE PRUEBA PARA AUTO-COMPLETADO
  // ========================================
  console.log('⏰ Creando fichajes de prueba para funcionalidad auto-completado...');

  // Importar funciones de cálculo
  const { calcularHorasTrabajadas, calcularTiempoEnPausa } = await import('../lib/calculos/fichajes');

  // Empleados para crear fichajes (los primeros 4 empleados)
  const empleadosParaFichajes = [empleadoAdmin, ...empleados].slice(0, 4);
  
  // Limpiar fichajes existentes antes de crear nuevos (por si el seed se ejecuta múltiples veces)
  await prisma.fichajeEvento.deleteMany({
    where: {
      fichaje: {
        empresaId: empresa.id,
      },
    },
  });
  await prisma.fichaje.deleteMany({
    where: {
      empresaId: empresa.id,
    },
  });

  const hoy = new Date();
  const haceDias = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  haceDias.setDate(hoy.getDate() - 3); // Empezar hace 3 días para que los fichajes sean antiguos y se auto-completen
  haceDias.setHours(0, 0, 0, 0);

  for (const [index, empleado] of empleadosParaFichajes.entries()) {
    // Crear nueva fecha base para cada iteración sin mutar haceDias
    const diasAtras = 3 + index;
    const fechaFichaje = new Date(haceDias.getFullYear(), haceDias.getMonth(), haceDias.getDate());
    fechaFichaje.setDate(fechaFichaje.getDate() - diasAtras + 3); // Diferentes días (3, 2, 1, 0 días atrás)
    
    // Fecha sin hora para el campo fecha del fichaje
    const fechaFichajeSinHora = new Date(fechaFichaje.getFullYear(), fechaFichaje.getMonth(), fechaFichaje.getDate());

    switch (index) {
      case 0: // Empleado 1: SIN SALIDA (>8h transcurridas) - Se auto-completará
        {
          const eventos = [
            {
              tipo: 'entrada' as const,
              hora: new Date(fechaFichaje.getFullYear(), fechaFichaje.getMonth(), fechaFichaje.getDate(), 9, 0, 0),
            },
          ];
          
          const fichaje = await prisma.fichaje.create({
            data: {
              empresaId: empresa.id,
              empleadoId: empleado.id,
              fecha: fechaFichajeSinHora,
              estado: 'en_curso', // En curso porque no tiene salida
              autoCompletado: false,
              eventos: {
                createMany: {
                  data: eventos,
                },
              },
            },
            include: {
              eventos: true,
            },
          });

          // Actualizar cálculos
          const horasTrabajadas = calcularHorasTrabajadas(fichaje.eventos);
          const horasEnPausa = calcularTiempoEnPausa(fichaje.eventos);
          
          await prisma.fichaje.update({
            where: { id: fichaje.id },
            data: { horasTrabajadas, horasEnPausa },
          });
        }
        // Nota: No hay salida, se auto-completará porque pasaron >8h
        break;

      case 1: // Empleado 2: PAUSA SIN CERRAR - Requiere revisión manual
        {
          const eventos = [
            {
              tipo: 'entrada' as const,
              hora: new Date(fechaFichaje.getFullYear(), fechaFichaje.getMonth(), fechaFichaje.getDate(), 8, 30, 0),
            },
            {
              tipo: 'pausa_inicio' as const,
              hora: new Date(fechaFichaje.getFullYear(), fechaFichaje.getMonth(), fechaFichaje.getDate(), 13, 0, 0),
            },
          ];
          
          const fichaje = await prisma.fichaje.create({
            data: {
              empresaId: empresa.id,
              empleadoId: empleado.id,
              fecha: fechaFichajeSinHora,
              estado: 'en_curso', // En curso porque está en pausa sin cerrar
              eventos: {
                createMany: {
                  data: eventos,
                },
              },
            },
            include: {
              eventos: true,
            },
          });

          // Actualizar cálculos
          const horasTrabajadas = calcularHorasTrabajadas(fichaje.eventos);
          const horasEnPausa = calcularTiempoEnPausa(fichaje.eventos);
          
          await prisma.fichaje.update({
            where: { id: fichaje.id },
            data: { horasTrabajadas, horasEnPausa },
          });
        }
        // Nota: No hay pausa_fin ni salida, requiere revisión manual
        break;

      case 2: // Empleado 3: JORNADA COMPLETA - No se procesará
        {
          const eventos = [
            {
              tipo: 'entrada' as const,
              hora: new Date(fechaFichaje.getFullYear(), fechaFichaje.getMonth(), fechaFichaje.getDate(), 9, 15, 0),
            },
            {
              tipo: 'pausa_inicio' as const,
              hora: new Date(fechaFichaje.getFullYear(), fechaFichaje.getMonth(), fechaFichaje.getDate(), 13, 30, 0),
            },
            {
              tipo: 'pausa_fin' as const,
              hora: new Date(fechaFichaje.getFullYear(), fechaFichaje.getMonth(), fechaFichaje.getDate(), 14, 15, 0),
            },
            {
              tipo: 'salida' as const,
              hora: new Date(fechaFichaje.getFullYear(), fechaFichaje.getMonth(), fechaFichaje.getDate(), 18, 0, 0),
            },
          ];
          
          const fichaje = await prisma.fichaje.create({
            data: {
              empresaId: empresa.id,
              empleadoId: empleado.id,
              fecha: fechaFichajeSinHora,
              estado: 'finalizado', // Finalizado porque tiene entrada + salida
              eventos: {
                createMany: {
                  data: eventos,
                },
              },
            },
            include: {
              eventos: true,
            },
          });

          // Actualizar cálculos
          const horasTrabajadas = calcularHorasTrabajadas(fichaje.eventos);
          const horasEnPausa = calcularTiempoEnPausa(fichaje.eventos);
          
          await prisma.fichaje.update({
            where: { id: fichaje.id },
            data: { horasTrabajadas, horasEnPausa },
          });
        }
        // Nota: Jornada completa, no se procesará
        break;

      case 3: // Empleado 4: SIN ENTRADA - Requiere revisión manual
        // No hay fichaje de entrada, solo se creará uno de salida manual
        {
          const eventos = [
            {
              tipo: 'salida' as const,
              hora: new Date(fechaFichaje.getFullYear(), fechaFichaje.getMonth(), fechaFichaje.getDate(), 17, 0, 0),
            },
          ];
          
          const fichaje = await prisma.fichaje.create({
            data: {
              empresaId: empresa.id,
              empleadoId: empleado.id,
              fecha: fechaFichajeSinHora,
              estado: 'finalizado', // Marcado como finalizado aunque falte entrada (caso anómalo para testing)
              eventos: {
                createMany: {
                  data: eventos,
                },
              },
            },
            include: {
              eventos: true,
            },
          });

          // Actualizar cálculos
          const horasTrabajadas = calcularHorasTrabajadas(fichaje.eventos);
          const horasEnPausa = calcularTiempoEnPausa(fichaje.eventos);
          
          await prisma.fichaje.update({
            where: { id: fichaje.id },
            data: { horasTrabajadas, horasEnPausa },
          });
        }
        // Nota: Falta entrada, requerirá revisión manual
        break;
    }
  }

  console.log(`✅ Fichajes de prueba creados para ${empleadosParaFichajes.length} empleados\n`);
  console.log('📋 Casos de prueba creados:');
  console.log('  • Empleado 1: Sin salida (>8h) → Auto-completar');
  console.log('  • Empleado 2: Pausa sin cerrar → Revisión manual');
  console.log('  • Empleado 3: Jornada completa → No procesar');
  console.log('  • Empleado 4: Sin entrada → Revisión manual\n');

  // ========================================
  // Ejecutar clasificador para los fichajes de prueba
  // ========================================
  console.log('🤖 Ejecutando clasificador para procesar fichajes de prueba...');

  const { clasificarFichajesIncompletos, aplicarAutoCompletado, guardarRevisionManual } = 
    await import('../lib/ia/clasificador-fichajes');

  let totalAutoCompletados = 0;
  let totalEnRevision = 0;

  // Clasificar cada día de fichajes (usar haceDias que es hace 3 días)
  for (let i = 0; i < 4; i++) {
    const fechaClasificar = new Date(haceDias);
    fechaClasificar.setDate(haceDias.getDate() - i);
    
    const { autoCompletar, revisionManual } = await clasificarFichajesIncompletos(
      empresa.id,
      fechaClasificar
    );

    // Aplicar auto-completados
    if (autoCompletar.length > 0) {
      const resultado = await aplicarAutoCompletado(autoCompletar, empresa.id);
      totalAutoCompletados += resultado.completados;
      if (resultado.errores.length > 0) {
        console.warn('  ⚠️  Errores en auto-completado:', resultado.errores);
      }
    }

    // Guardar revisiones manuales
    if (revisionManual.length > 0) {
      const resultado = await guardarRevisionManual(empresa.id, revisionManual);
      totalEnRevision += resultado.guardados;
      if (resultado.errores.length > 0) {
        console.warn('  ⚠️  Errores en revisión manual:', resultado.errores);
      }
    }
  }

  console.log(`✅ Clasificador ejecutado: ${totalAutoCompletados} auto-completados, ${totalEnRevision} en revisión\n`);

  // ========================================
  // 8. CREAR CARPETAS DE DOCUMENTOS PREDEFINIDAS
  // ========================================
  console.log('📁 Creando carpetas de documentos...');

  const carpetasPredefinidas = ['Contratos', 'Nóminas', 'Médicos', 'Certificados', 'Otros'];

  // Crear carpetas individuales para cada empleado
  let carpetasCreadas = 0;
  for (const empleado of [empleadoAdmin, ...empleados]) {
    for (const nombreCarpeta of carpetasPredefinidas) {
      await prisma.carpeta.create({
        data: {
        empresaId: empresa.id,
          empleadoId: empleado.id,
          nombre: nombreCarpeta,
        esSistema: true,
        compartida: false,
      },
  });
      carpetasCreadas++;
    }
  }

  console.log(`✅ ${carpetasCreadas} carpetas individuales creadas`);

  // Crear carpetas centralizadas para HR Admin
  const carpetasCentralizadas = ['Nóminas', 'Contratos', 'Justificantes'];
  let carpetasCentralizadasCreadas = 0;

  for (const nombreCarpeta of carpetasCentralizadas) {
    await prisma.carpeta.create({
      data: {
        empresaId: empresa.id,
        empleadoId: null, // No pertenece a ningún empleado específico
        nombre: nombreCarpeta,
        esSistema: true,
        compartida: true,
        asignadoA: 'todos',
      },
    });
    carpetasCentralizadasCreadas++;
  }

  console.log(`✅ ${carpetasCentralizadasCreadas} carpetas centralizadas para HR creadas\n`);

  // ========================================
  // RESUMEN FINAL
  // ========================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ SEED COMPLETADO EXITOSAMENTE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📊 Datos creados:');
  console.log(`  • 1 empresa: ${empresa.nombre}`);
  console.log(`  • 2 jornadas predefinidas`);
  console.log(`  • 1 HR Admin + ${empleados.length} empleados`);
  console.log(`  • 2 equipos de trabajo`);
  console.log(`  • 10 ausencias (3 pendientes, 6 aprobadas, 1 rechazada)`);
  console.log(`  • ${festivos2025.length} festivos de España 2025`);
  console.log(`  • Fichajes de prueba para 4 empleados (auto-completado Ecución)`);
  console.log(`  • ${carpetasCreadas} carpetas de documentos\n`);

  console.log('🔑 Credenciales de acceso:');
  console.log('  ┌─────────────────────────────────────────┐');
  console.log('  │  HR Admin                                │');
  console.log('  │  Email:    admin@clousadmin.com         │');
  console.log('  │  Password: Admin123!                    │');
  console.log('  └─────────────────────────────────────────┘');
  console.log('  ┌─────────────────────────────────────────┐');
  console.log('  │  Manager                                 │');
  console.log('  │  Email:    carlos.martinez@clousadmin.com│');
  console.log('  │  Password: Empleado123!                 │');
  console.log('  └─────────────────────────────────────────┘');
  console.log('  ┌─────────────────────────────────────────┐');
  console.log('  │  Empleado                                │');
  console.log('  │  Email:    ana.garcia@clousadmin.com    │');
  console.log('  │  Password: Empleado123!                 │');
  console.log('  └─────────────────────────────────────────┘\n');

  console.log('🚀 Siguiente paso:');
  console.log('   npm run dev\n');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando seed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
