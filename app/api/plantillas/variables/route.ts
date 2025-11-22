/**
 * API: /api/plantillas/variables
 * GET: Obtener lista de variables disponibles del sistema
 */

import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';

/**
 * GET /api/plantillas/variables
 * Retorna todas las variables disponibles del sistema para mapeo
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Variables disponibles del sistema agrupadas por categorías
    const variables = [
      // Empleado - Datos personales
      'empleado_id',
      'empleado_nombre',
      'empleado_apellidos',
      'empleado_nombre_completo',
      'empleado_email',
      'empleado_nif',
      'empleado_nss',
      'empleado_telefono',
      'empleado_fecha_nacimiento',
      'empleado_estado_civil',
      'empleado_numero_hijos',

      // Empleado - Dirección
      'empleado_direccion_completa',
      'empleado_direccion_calle',
      'empleado_direccion_numero',
      'empleado_direccion_piso',
      'empleado_codigo_postal',
      'empleado_ciudad',
      'empleado_provincia',
      'empleado_pais',

      // Empleado - Datos bancarios
      'empleado_iban',
      'empleado_titular_cuenta',

      // Contrato
      'contrato_id',
      'contrato_tipo',
      'contrato_fecha_inicio',
      'contrato_fecha_fin',
      'contrato_salario_bruto',
      'contrato_salario_base',
      'contrato_salario_neto',
      'contrato_jornada',
      'contrato_horas_semanales',
      'contrato_dias_vacaciones',
      'contrato_categoria_profesional',
      'contrato_grupo_cotizacion',

      // Empresa
      'empresa_nombre',
      'empresa_cif',
      'empresa_direccion',
      'empresa_ciudad',
      'empresa_provincia',
      'empresa_codigo_postal',
      'empresa_telefono',
      'empresa_email',
      'empresa_cuenta_cotizacion',

      // Puesto
      'puesto_nombre',
      'puesto_departamento',
      'puesto_descripcion',

      // Fechas y otros
      'fecha_actual',
      'fecha_generacion',
      'año_actual',
      'mes_actual',
      'dia_actual',
    ];

    return NextResponse.json({
      success: true,
      variables,
      total: variables.length,
    });
  } catch (error) {
    console.error('[API] Error al obtener variables:', error);
    return NextResponse.json(
      {
        error: 'Error al obtener variables',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
