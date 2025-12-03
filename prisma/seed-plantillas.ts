// ========================================
// Database Seed - Plantillas Oficiales
// ========================================
// Ejecutar con: npx tsx prisma/seed-plantillas.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de plantillas oficiales...\n');

  // ========================================
  // PLANTILLAS OFICIALES DE DOCUMENTOS
  // ========================================

  const plantillasOficiales = [
    {
      nombre: 'Contrato Indefinido',
      descripcion: 'Plantilla oficial de contrato de trabajo indefinido',
      categoria: 'contratos',
      tipo: 'oficial' as const,
      formato: 'docx' as const,
      s3Key: 'plantillas/oficiales/contrato-indefinido.docx',
      s3Bucket: process.env.S3_BUCKET || 'clousadmin-documentos',
      variablesUsadas: [
        'empleado_nombre',
        'empleado_apellidos',
        'empleado_nif',
        'empleado_direccion_completa',
        'empleado_fecha_nacimiento',
        'empresa_nombre',
        'empresa_cif',
        'empresa_direccion',
        'contrato_tipo',
        'contrato_fecha_inicio',
        'contrato_categoria_profesional',
        'contrato_grupo_cotizacion',
        'contrato_salario_bruto_anual',
        'contrato_jornada_horas_semanales',
        'fecha_hoy',
        'ciudad_actual',
      ],
      esOficial: true,
      activa: true,
      requiereContrato: true,
      requiereFirma: true,
      carpetaDestinoDefault: 'Contratos',
    },
    {
      nombre: 'Contrato Temporal',
      descripcion: 'Plantilla oficial de contrato de trabajo temporal',
      categoria: 'contratos',
      tipo: 'oficial' as const,
      formato: 'docx' as const,
      s3Key: 'plantillas/oficiales/contrato-temporal.docx',
      s3Bucket: process.env.S3_BUCKET || 'clousadmin-documentos',
      variablesUsadas: [
        'empleado_nombre',
        'empleado_apellidos',
        'empleado_nif',
        'empleado_direccion_completa',
        'empresa_nombre',
        'empresa_cif',
        'empresa_direccion',
        'contrato_tipo',
        'contrato_fecha_inicio',
        'contrato_fecha_fin',
        'contrato_duracion_meses',
        'contrato_categoria_profesional',
        'contrato_salario_bruto_anual',
        'contrato_motivo_temporal',
        'fecha_hoy',
      ],
      esOficial: true,
      activa: true,
      requiereContrato: true,
      requiereFirma: true,
      carpetaDestinoDefault: 'Contratos',
    },
    {
      nombre: 'Modelo 145 - IRPF',
      descripcion: 'Comunicación de datos al pagador (retenciones IRPF)',
      categoria: 'fiscal',
      tipo: 'oficial' as const,
      formato: 'pdf_rellenable' as const,
      s3Key: 'plantillas/oficiales/modelo-145.pdf',
      s3Bucket: process.env.S3_BUCKET || 'clousadmin-documentos',
      variablesUsadas: [
        'empleado_nombre',
        'empleado_apellidos',
        'empleado_nif',
        'empleado_fecha_nacimiento',
        'empleado_direccion_completa',
        'empleado_codigo_postal',
        'empleado_ciudad',
        'empleado_provincia',
        'empleado_estado_civil',
        'empleado_numero_hijos',
        'empleado_discapacidad',
        'empleado_grado_discapacidad',
        'empresa_nombre',
        'empresa_cif',
        'empresa_direccion',
        'fecha_hoy',
        'año_actual',
      ],
      esOficial: true,
      activa: true,
      requiereContrato: false,
      requiereFirma: true,
      carpetaDestinoDefault: 'Fiscales',
      usarIAParaExtraer: true,
    },
    {
      nombre: 'Nómina Mensual',
      descripcion: 'Plantilla de nómina mensual estándar',
      categoria: 'nominas',
      tipo: 'oficial' as const,
      formato: 'docx' as const,
      s3Key: 'plantillas/oficiales/nomina-mensual.docx',
      s3Bucket: process.env.S3_BUCKET || 'clousadmin-documentos',
      variablesUsadas: [
        'empleado_nombre',
        'empleado_apellidos',
        'empleado_nif',
        'empleado_nss',
        'empleado_categoria_profesional',
        'empleado_grupo_cotizacion',
        'empresa_nombre',
        'empresa_cif',
        'empresa_codigo_cuenta_cotizacion',
        'nomina_mes',
        'nomina_año',
        'nomina_dias_trabajados',
        'nomina_salario_base',
        'nomina_complementos_totales',
        'nomina_total_devengos',
        'nomina_retencion_irpf',
        'nomina_ss_empleado',
        'nomina_total_deducciones',
        'nomina_liquido_percibir',
        'nomina_iban',
      ],
      esOficial: true,
      activa: true,
      requiereContrato: true,
      requiereFirma: false,
      carpetaDestinoDefault: 'Nóminas',
    },
    {
      nombre: 'Certificado de Empresa',
      descripcion: 'Certificado de empresa para diversos trámites',
      categoria: 'certificados',
      tipo: 'oficial' as const,
      formato: 'docx' as const,
      s3Key: 'plantillas/oficiales/certificado-empresa.docx',
      s3Bucket: process.env.S3_BUCKET || 'clousadmin-documentos',
      variablesUsadas: [
        'empleado_nombre',
        'empleado_apellidos',
        'empleado_nif',
        'empresa_nombre',
        'empresa_cif',
        'empresa_direccion',
        'empresa_telefono',
        'contrato_fecha_inicio',
        'contrato_categoria_profesional',
        'contrato_salario_bruto_anual',
        'contrato_tipo',
        'fecha_hoy',
        'ciudad_actual',
        'responsable_rrhh_nombre',
        'responsable_rrhh_cargo',
      ],
      esOficial: true,
      activa: true,
      requiereContrato: true,
      requiereFirma: true,
      carpetaDestinoDefault: 'Certificados',
    },
    {
      nombre: 'Documento de Alta de Trabajador',
      descripcion: 'Documento para alta en Seguridad Social',
      categoria: 'seguridad_social',
      tipo: 'oficial' as const,
      formato: 'pdf_rellenable' as const,
      s3Key: 'plantillas/oficiales/alta-trabajador.pdf',
      s3Bucket: process.env.S3_BUCKET || 'clousadmin-documentos',
      variablesUsadas: [
        'empleado_nombre',
        'empleado_apellidos',
        'empleado_nif',
        'empleado_nss',
        'empleado_fecha_nacimiento',
        'empleado_direccion_completa',
        'empresa_nombre',
        'empresa_cif',
        'empresa_codigo_cuenta_cotizacion',
        'contrato_fecha_inicio',
        'contrato_tipo',
        'contrato_grupo_cotizacion',
        'contrato_categoria_profesional',
        'contrato_salario_base_mes',
      ],
      esOficial: true,
      activa: true,
      requiereContrato: true,
      requiereFirma: false,
      carpetaDestinoDefault: 'Seguridad Social',
      usarIAParaExtraer: true,
    },
    {
      nombre: 'Finiquito',
      descripcion: 'Documento de finiquito por fin de relación laboral',
      categoria: 'bajas',
      tipo: 'oficial' as const,
      formato: 'docx' as const,
      s3Key: 'plantillas/oficiales/finiquito.docx',
      s3Bucket: process.env.S3_BUCKET || 'clousadmin-documentos',
      variablesUsadas: [
        'empleado_nombre',
        'empleado_apellidos',
        'empleado_nif',
        'empresa_nombre',
        'empresa_cif',
        'contrato_fecha_inicio',
        'baja_fecha_fin',
        'baja_tipo',
        'finiquito_salario_pendiente',
        'finiquito_vacaciones_pendientes',
        'finiquito_pagas_extra',
        'finiquito_indemnizacion',
        'finiquito_total',
        'finiquito_iban',
        'fecha_hoy',
        'ciudad_actual',
      ],
      esOficial: true,
      activa: true,
      requiereContrato: true,
      requiereFirma: true,
      carpetaDestinoDefault: 'Bajas',
    },
    {
      nombre: 'Carta de Bienvenida',
      descripcion: 'Carta de bienvenida para nuevo empleado (onboarding)',
      categoria: 'onboarding',
      tipo: 'oficial' as const,
      formato: 'docx' as const,
      s3Key: 'plantillas/oficiales/carta-bienvenida.docx',
      s3Bucket: process.env.S3_BUCKET || 'clousadmin-documentos',
      variablesUsadas: [
        'empleado_nombre',
        'empleado_apellidos',
        'empleado_email',
        'empresa_nombre',
        'contrato_fecha_inicio',
        'contrato_categoria_profesional',
        'manager_nombre',
        'manager_email',
        'equipo_nombre',
        'fecha_hoy',
      ],
      esOficial: true,
      activa: true,
      requiereContrato: false,
      requiereFirma: false,
      carpetaDestinoDefault: 'Onboarding',
    },
  ];

  console.log(`📄 Creando ${plantillasOficiales.length} plantillas oficiales...\n`);

  for (const plantilla of plantillasOficiales) {
    const created = await prisma.plantillas_documentos.upsert({
      where: {
        // Unique constraint by s3Key
        s3Key: plantilla.s3Key,
      },
      update: {
        nombre: plantilla.nombre,
        descripcion: plantilla.descripcion,
        activa: plantilla.activa,
      },
      create: {
        ...plantilla,
        empresaId: null, // NULL = plantilla oficial (disponible para todas las empresas)
      },
    });

    console.log(`✅ ${created.nombre}`);
    console.log(`   → ${created.variablesUsadas.length} variables`);
    console.log(`   → ${created.formato.toUpperCase()}`);
    console.log(`   → ${created.requiereFirma ? '🔏 Requiere firma' : '📝 Sin firma'}`);
    console.log();
  }

  console.log('\n✨ Seed de plantillas completado!\n');
  console.log('📊 Estadísticas:');
  console.log(`   → ${plantillasOficiales.length} plantillas oficiales creadas`);
  console.log(`   → ${plantillasOficiales.filter((p) => p.formato === 'docx').length} plantillas DOCX`);
  console.log(
    `   → ${plantillasOficiales.filter((p) => p.formato === 'pdf_rellenable').length} plantillas PDF`
  );
  console.log(`   → ${plantillasOficiales.filter((p) => p.requiereFirma).length} requieren firma digital`);
  console.log();
  console.log('ℹ️  Nota: Los archivos de plantillas (DOCX/PDF) deben subirse manualmente');
  console.log('   o generarse con ejemplos reales. Las rutas S3 están configuradas.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
