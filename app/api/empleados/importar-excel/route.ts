// ========================================
// API: Empleados - Importar desde Excel (Analizar)
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { parseExcelToJSON, isValidExcelFile } from '@/lib/excel/parser';
import { mapearEmpleadosConIA, validarEmpleado } from '@/lib/ia/procesar-excel-empleados';

/**
 * POST /api/empleados/importar-excel
 * Analiza un archivo Excel y retorna preview de empleados detectados
 */
export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getSession();
    if (!session || session.user.rol !== 'hr_admin') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener el archivo del FormData
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }

    // Validar que sea un archivo Excel
    if (
      !file.name.endsWith('.xlsx') &&
      !file.name.endsWith('.xls') &&
      !file.name.endsWith('.csv')
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Formato de archivo no válido. Usa .xlsx, .xls o .csv',
        },
        { status: 400 }
      );
    }

    // Convertir File a Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validar que el archivo es un Excel válido
    if (!isValidExcelFile(buffer)) {
      return NextResponse.json(
        { success: false, error: 'Archivo Excel inválido' },
        { status: 400 }
      );
    }

    // Parsear el Excel a JSON
    const excelData = parseExcelToJSON(buffer);

    if (excelData.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'El archivo Excel está vacío o no tiene datos válidos',
        },
        { status: 400 }
      );
    }

    // Procesar con IA
    console.log(
      `[ImportarExcel] Procesando ${excelData.length} registros con IA...`
    );
    
    const resultado = await mapearEmpleadosConIA(excelData);

    // Validar cada empleado
    const empleadosConValidacion = resultado.empleados.map((emp) => {
      const validacion = validarEmpleado(emp);
      return {
        ...emp,
        valido: validacion.valido,
        errores: validacion.errores,
      };
    });

    // Contar empleados válidos e inválidos
    const totalValidos = empleadosConValidacion.filter((e) => e.valido).length;
    const totalInvalidos = empleadosConValidacion.length - totalValidos;

    console.log(
      `[ImportarExcel] Procesados: ${empleadosConValidacion.length} empleados (${totalValidos} válidos, ${totalInvalidos} inválidos)`
    );

    return NextResponse.json({
      success: true,
      data: {
        empleados: empleadosConValidacion,
        equiposDetectados: resultado.equiposDetectados,
        managersDetectados: resultado.managersDetectados,
        columnasDetectadas: resultado.columnasDetectadas,
        resumen: {
          total: empleadosConValidacion.length,
          validos: totalValidos,
          invalidos: totalInvalidos,
        },
      },
    });
  } catch (error) {
    console.error('[ImportarExcel] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Error al procesar el archivo Excel',
      },
      { status: 500 }
    );
  }
}









