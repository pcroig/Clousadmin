// ========================================
// API: Analytics - Métricas de Brechas y Equidad
// ========================================
// GET: Obtener métricas de brechas salariales y diversidad/equidad

import { Prisma } from '@prisma/client';
import { NextRequest } from 'next/server';

import {
  handleApiError,
  requireAuthAsHR,
  successResponse,
} from '@/lib/api-handler';
import { obtenerRangoFechaAntiguedad } from '@/lib/calculos/antiguedad';
import { prisma } from '@/lib/prisma';

const empleadoCompleto = Prisma.validator<Prisma.empleadosSelect>()({
  id: true,
  nombre: true,
  apellidos: true,
  salarioBaseMensual: true,
  salarioBaseAnual: true,
  fechaAlta: true,
  fechaNacimiento: true,
  genero: true,
  puesto: true,
  puestoId: true,
  puestoRelacion: {
    select: {
      nombre: true,
    },
  },
  managerId: true,
  tipoContrato: true,
  equipos: {
    select: {
      equipo: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  },
});

type EmpleadoCompleto = Prisma.empleadosGetPayload<{
  select: typeof empleadoCompleto;
}>;

// Función helper para calcular edad
function calcularEdad(fechaNacimiento: Date): number {
  const hoy = new Date();
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const mes = hoy.getMonth() - fechaNacimiento.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
    edad--;
  }
  return edad;
}

// Función helper para determinar rango de edad
function obtenerRangoEdad(edad: number): string {
  if (edad < 30) return '< 30 años';
  if (edad < 40) return '30-40 años';
  if (edad < 50) return '40-50 años';
  return '50+ años';
}

// Función helper para calcular años de antigüedad
function calcularAntiguedad(fechaAlta: Date): number {
  const hoy = new Date();
  const años = (hoy.getTime() - fechaAlta.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.floor(años);
}

// GET /api/analytics/brechas - Obtener métricas de brechas y equidad
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación y rol HR Admin
    const authResult = await requireAuthAsHR(request);
    if (authResult instanceof Response) return authResult;
    const { session } = authResult;

    const { searchParams } = new URL(request.url);
    const genero = searchParams.get('genero');
    const equipoId = searchParams.get('equipo');
    const antiguedad = searchParams.get('antiguedad');

    // Construir filtros base
    const where: Prisma.empleadosWhereInput = {
      empresaId: session.user.empresaId,
      estadoEmpleado: 'activo',
    };

    if (genero && genero !== 'todos') {
      where.genero = genero;
    }

    if (equipoId && equipoId !== 'todos') {
      where.equipos = {
        some: {
          equipoId: equipoId,
        },
      };
    }

    if (antiguedad && antiguedad !== 'todos') {
      const rangoFecha = obtenerRangoFechaAntiguedad(antiguedad);
      if (rangoFecha) {
        where.fechaAlta = rangoFecha;
      }
    }

    // Obtener empleados con toda la información necesaria
    const empleados = await prisma.empleados.findMany({
      where,
      select: empleadoCompleto,
    });

    // =====================================================
    // 1. BRECHAS SALARIALES POR GÉNERO
    // =====================================================
    
    const salariosPorGenero: Record<string, { total: number; count: number; salarios: number[] }> = {};
    
    empleados.forEach((empleado: EmpleadoCompleto) => {
      const generoKey = (empleado.genero ?? 'no_especificado').toLowerCase();
      const salario = Number(empleado.salarioBaseMensual || 0);
      
      if (!salariosPorGenero[generoKey]) {
        salariosPorGenero[generoKey] = { total: 0, count: 0, salarios: [] };
      }
      
      salariosPorGenero[generoKey].total += salario;
      salariosPorGenero[generoKey].count += 1;
      salariosPorGenero[generoKey].salarios.push(salario);
    });

    const salarioPromedioPorGenero = Object.entries(salariosPorGenero)
      .map(([genero, data]) => ({
        genero,
        promedio: data.count > 0 ? Math.round(data.total / data.count) : 0,
        empleados: data.count,
        mediana: data.count > 0 ? calcularMediana(data.salarios) : 0,
      }))
      .sort((a, b) => b.promedio - a.promedio);

    const promedioHombres = salarioPromedioPorGenero.find((item) => item.genero === 'hombre')?.promedio ?? 0;
    const promedioMujeres = salarioPromedioPorGenero.find((item) => item.genero === 'mujer')?.promedio ?? 0;
    
    const diferenciaGenero = promedioHombres - promedioMujeres;
    const porcentajeGenero = promedioMujeres > 0 
      ? Number(((diferenciaGenero / promedioMujeres) * 100).toFixed(1)) 
      : 0;

    const brechaSalarialGenero = {
      diferencia: Math.round(diferenciaGenero),
      porcentaje: porcentajeGenero,
      promedioHombres,
      promedioMujeres,
      empleadosHombres: salariosPorGenero['hombre']?.count ?? 0,
      empleadosMujeres: salariosPorGenero['mujer']?.count ?? 0,
    };

    // =====================================================
    // 2. BRECHAS SALARIALES POR EDAD
    // =====================================================
    
    const salariosPorEdad: Record<string, { total: number; count: number; salarios: number[] }> = {};
    
    empleados.forEach((empleado: EmpleadoCompleto) => {
      if (!empleado.fechaNacimiento) return;
      
      const edad = calcularEdad(new Date(empleado.fechaNacimiento));
      const rangoEdad = obtenerRangoEdad(edad);
      const salario = Number(empleado.salarioBaseMensual || 0);
      
      if (!salariosPorEdad[rangoEdad]) {
        salariosPorEdad[rangoEdad] = { total: 0, count: 0, salarios: [] };
      }
      
      salariosPorEdad[rangoEdad].total += salario;
      salariosPorEdad[rangoEdad].count += 1;
      salariosPorEdad[rangoEdad].salarios.push(salario);
    });

    const salarioPromedioPorEdad = Object.entries(salariosPorEdad)
      .map(([rango, data]) => ({
        rango,
        promedio: data.count > 0 ? Math.round(data.total / data.count) : 0,
        empleados: data.count,
        mediana: data.count > 0 ? calcularMediana(data.salarios) : 0,
      }))
      .sort((a, b) => {
        const orden = ['< 30 años', '30-40 años', '40-50 años', '50+ años'];
        return orden.indexOf(a.rango) - orden.indexOf(b.rango);
      });

    // =====================================================
    // 3. BRECHAS SALARIALES POR PUESTO
    // =====================================================
    
    const salariosPorPuesto: Record<string, { 
      total: number; 
      count: number; 
      salarios: number[];
      countHombres: number;
      countMujeres: number;
    }> = {};
    
    empleados.forEach((empleado: EmpleadoCompleto) => {
      const puestoNombre = empleado.puestoRelacion?.nombre ?? 'Sin puesto';
      const salario = Number(empleado.salarioBaseMensual || 0);
      const generoKey = (empleado.genero ?? '').toLowerCase();
      
      if (!salariosPorPuesto[puestoNombre]) {
        salariosPorPuesto[puestoNombre] = { 
          total: 0, 
          count: 0, 
          salarios: [],
          countHombres: 0,
          countMujeres: 0,
        };
      }
      
      salariosPorPuesto[puestoNombre].total += salario;
      salariosPorPuesto[puestoNombre].count += 1;
      salariosPorPuesto[puestoNombre].salarios.push(salario);
      
      if (generoKey === 'hombre') {
        salariosPorPuesto[puestoNombre].countHombres += 1;
      } else if (generoKey === 'mujer') {
        salariosPorPuesto[puestoNombre].countMujeres += 1;
      }
    });

    const salarioPromedioPorPuesto = Object.entries(salariosPorPuesto)
      .map(([puesto, data]) => {
        const salarios = data.salarios.sort((a, b) => a - b);
        const desviacion = calcularDesviacionEstandar(salarios);
        
        return {
          puesto,
          promedio: data.count > 0 ? Math.round(data.total / data.count) : 0,
          empleados: data.count,
          min: salarios[0] || 0,
          max: salarios[salarios.length - 1] || 0,
          desviacion: Math.round(desviacion),
          mediana: data.count > 0 ? calcularMediana(salarios) : 0,
          porcentajeHombres: data.count > 0 
            ? Number(((data.countHombres / data.count) * 100).toFixed(1))
            : 0,
          porcentajeMujeres: data.count > 0 
            ? Number(((data.countMujeres / data.count) * 100).toFixed(1))
            : 0,
        };
      })
      .sort((a, b) => b.promedio - a.promedio);

    // =====================================================
    // 4. DIVERSIDAD POR GÉNERO EN PUESTOS
    // =====================================================
    
    const distribucionGeneroPorPuesto = Object.entries(salariosPorPuesto)
      .map(([puesto, data]) => ({
        puesto,
        hombres: data.countHombres,
        mujeres: data.countMujeres,
        total: data.count,
        porcentajeHombres: data.count > 0 
          ? Number(((data.countHombres / data.count) * 100).toFixed(1))
          : 0,
        porcentajeMujeres: data.count > 0 
          ? Number(((data.countMujeres / data.count) * 100).toFixed(1))
          : 0,
      }))
      .filter(item => item.total >= 3) // Solo puestos con al menos 3 empleados
      .sort((a, b) => b.total - a.total);

    // =====================================================
    // 5. REPRESENTACIÓN EN LIDERAZGO
    // =====================================================
    
    const managers = empleados.filter(emp => 
      empleados.some(e => e.managerId === emp.id)
    );
    
    const managersGenero: Record<string, number> = {};
    managers.forEach(manager => {
      const generoKey = (manager.genero ?? 'no_especificado').toLowerCase();
      managersGenero[generoKey] = (managersGenero[generoKey] || 0) + 1;
    });

    const totalManagers = managers.length;
    const representacionLiderazgo = Object.entries(managersGenero).map(([genero, count]) => ({
      genero,
      empleados: count,
      porcentaje: totalManagers > 0 
        ? Number(((count / totalManagers) * 100).toFixed(1))
        : 0,
    }));

    const porcentajeManagersHombres = representacionLiderazgo.find(r => r.genero === 'hombre')?.porcentaje ?? 0;
    const porcentajeManagersMujeres = representacionLiderazgo.find(r => r.genero === 'mujer')?.porcentaje ?? 0;
    
    const porcentajeGeneralHombres = salarioPromedioPorGenero.find(s => s.genero === 'hombre')?.empleados ?? 0;
    const porcentajeGeneralMujeres = salarioPromedioPorGenero.find(s => s.genero === 'mujer')?.empleados ?? 0;
    const totalEmpleados = empleados.length;
    
    const porcentajeGeneralHombresPct = totalEmpleados > 0 
      ? Number(((porcentajeGeneralHombres / totalEmpleados) * 100).toFixed(1))
      : 0;
    const porcentajeGeneralMujeresPct = totalEmpleados > 0 
      ? Number(((porcentajeGeneralMujeres / totalEmpleados) * 100).toFixed(1))
      : 0;

    const brechaLiderazgo = {
      totalManagers,
      porcentajeManagersHombres,
      porcentajeManagersMujeres,
      porcentajeGeneralHombres: porcentajeGeneralHombresPct,
      porcentajeGeneralMujeres: porcentajeGeneralMujeresPct,
      diferencia: porcentajeManagersHombres - porcentajeManagersMujeres,
    };

    // =====================================================
    // 6. DISTRIBUCIÓN DE GÉNERO POR EQUIPO
    // =====================================================
    
    const generoPorEquipo: Record<string, { hombres: number; mujeres: number; otros: number; total: number }> = {};
    
    empleados.forEach((empleado: EmpleadoCompleto) => {
      const generoKey = (empleado.genero ?? '').toLowerCase();
      
      if (empleado.equipos.length === 0) {
        if (!generoPorEquipo['Sin equipo']) {
          generoPorEquipo['Sin equipo'] = { hombres: 0, mujeres: 0, otros: 0, total: 0 };
        }
        
        if (generoKey === 'hombre') generoPorEquipo['Sin equipo'].hombres += 1;
        else if (generoKey === 'mujer') generoPorEquipo['Sin equipo'].mujeres += 1;
        else generoPorEquipo['Sin equipo'].otros += 1;
        generoPorEquipo['Sin equipo'].total += 1;
      } else {
        empleado.equipos.forEach((eq) => {
          const nombreEquipo = eq.equipo?.nombre ?? 'Sin equipo';
          
          if (!generoPorEquipo[nombreEquipo]) {
            generoPorEquipo[nombreEquipo] = { hombres: 0, mujeres: 0, otros: 0, total: 0 };
          }
          
          if (generoKey === 'hombre') generoPorEquipo[nombreEquipo].hombres += 1;
          else if (generoKey === 'mujer') generoPorEquipo[nombreEquipo].mujeres += 1;
          else generoPorEquipo[nombreEquipo].otros += 1;
          generoPorEquipo[nombreEquipo].total += 1;
        });
      }
    });

    const distribucionGeneroPorEquipo = Object.entries(generoPorEquipo)
      .map(([equipo, data]) => ({
        equipo,
        hombres: data.hombres,
        mujeres: data.mujeres,
        otros: data.otros,
        total: data.total,
        porcentajeHombres: data.total > 0 
          ? Number(((data.hombres / data.total) * 100).toFixed(1))
          : 0,
        porcentajeMujeres: data.total > 0 
          ? Number(((data.mujeres / data.total) * 100).toFixed(1))
          : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // =====================================================
    // 7. SALARIO VS ANTIGÜEDAD POR GÉNERO
    // =====================================================
    
    const salarioAntiguedadHombres: Array<{ antiguedad: number; salario: number }> = [];
    const salarioAntiguedadMujeres: Array<{ antiguedad: number; salario: number }> = [];
    
    empleados.forEach((empleado: EmpleadoCompleto) => {
      const generoKey = (empleado.genero ?? '').toLowerCase();
      const antiguedadAnios = calcularAntiguedad(new Date(empleado.fechaAlta));
      const salario = Number(empleado.salarioBaseMensual || 0);
      
      if (generoKey === 'hombre') {
        salarioAntiguedadHombres.push({ antiguedad: antiguedadAnios, salario });
      } else if (generoKey === 'mujer') {
        salarioAntiguedadMujeres.push({ antiguedad: antiguedadAnios, salario });
      }
    });

    // Agrupar por rangos de antigüedad
    const rangosSalarioAntiguedad = [
      { rango: '0-2 años', min: 0, max: 2 },
      { rango: '3-5 años', min: 3, max: 5 },
      { rango: '6-10 años', min: 6, max: 10 },
      { rango: '10+ años', min: 11, max: 100 },
    ];

    const salarioPorAntiguedadGenero = rangosSalarioAntiguedad.map(({ rango, min, max }) => {
      const hombresEnRango = salarioAntiguedadHombres
        .filter(d => d.antiguedad >= min && d.antiguedad <= max);
      const mujeresEnRango = salarioAntiguedadMujeres
        .filter(d => d.antiguedad >= min && d.antiguedad <= max);
      
      const promedioHombres = hombresEnRango.length > 0
        ? hombresEnRango.reduce((sum, d) => sum + d.salario, 0) / hombresEnRango.length
        : 0;
      const promedioMujeres = mujeresEnRango.length > 0
        ? mujeresEnRango.reduce((sum, d) => sum + d.salario, 0) / mujeresEnRango.length
        : 0;
      
      return {
        rango,
        promedioHombres: Math.round(promedioHombres),
        promedioMujeres: Math.round(promedioMujeres),
        empleadosHombres: hombresEnRango.length,
        empleadosMujeres: mujeresEnRango.length,
        brecha: Math.round(promedioHombres - promedioMujeres),
      };
    }).filter(item => item.empleadosHombres > 0 || item.empleadosMujeres > 0);

    // =====================================================
    // 8. DISTRIBUCIÓN DE TIPOS DE CONTRATO POR GÉNERO
    // =====================================================
    
    const contratosPorGenero: Record<string, Record<string, number>> = {};
    
    empleados.forEach((empleado: EmpleadoCompleto) => {
      const generoKey = (empleado.genero ?? 'no_especificado').toLowerCase();
      const tipoContrato = empleado.tipoContrato || 'indefinido';
      
      if (!contratosPorGenero[generoKey]) {
        contratosPorGenero[generoKey] = {};
      }
      
      contratosPorGenero[generoKey][tipoContrato] = 
        (contratosPorGenero[generoKey][tipoContrato] || 0) + 1;
    });

    const distribucionContratosPorGenero = Object.entries(contratosPorGenero).map(([genero, contratos]) => ({
      genero,
      contratos: Object.entries(contratos).map(([tipo, count]) => ({
        tipo,
        empleados: count,
      })),
      total: Object.values(contratos).reduce((sum, count) => sum + count, 0),
    }));

    // =====================================================
    // 9. ÍNDICE DE DIVERSIDAD (SCORE GENERAL)
    // =====================================================
    
    // Calcular un score de diversidad basado en diferentes factores
    const diversidadGenero = 1 - Math.abs(
      (brechaSalarialGenero.empleadosHombres - brechaSalarialGenero.empleadosMujeres) / 
      (brechaSalarialGenero.empleadosHombres + brechaSalarialGenero.empleadosMujeres || 1)
    );
    
    const diversidadLiderazgo = 1 - Math.abs(
      (porcentajeManagersHombres - porcentajeManagersMujeres) / 100
    );
    
    const brechasSalarialesPuesto = salarioPromedioPorPuesto
      .filter(p => p.empleados >= 5)
      .map(p => p.desviacion / (p.promedio || 1));
    
    const promedioVariacionSalarial = brechasSalarialesPuesto.length > 0
      ? brechasSalarialesPuesto.reduce((sum, v) => sum + v, 0) / brechasSalarialesPuesto.length
      : 0;
    
    const equidadSalarial = Math.max(0, 1 - promedioVariacionSalarial);
    
    const indiceDiversidad = {
      score: Number((((diversidadGenero + diversidadLiderazgo + equidadSalarial) / 3) * 100).toFixed(1)),
      diversidadGenero: Number((diversidadGenero * 100).toFixed(1)),
      diversidadLiderazgo: Number((diversidadLiderazgo * 100).toFixed(1)),
      equidadSalarial: Number((equidadSalarial * 100).toFixed(1)),
    };

    return successResponse({
      // Brechas salariales
      brechaSalarialGenero,
      salarioPromedioPorGenero,
      salarioPromedioPorEdad,
      salarioPromedioPorPuesto,
      
      // Diversidad e inclusión
      distribucionGeneroPorPuesto,
      distribucionGeneroPorEquipo,
      representacionLiderazgo,
      brechaLiderazgo,
      
      // Progresión y equidad
      salarioPorAntiguedadGenero,
      distribucionContratosPorGenero,
      
      // Indicador general
      indiceDiversidad,
      
      // Metadata
      totalEmpleados: empleados.length,
      empleadosSinFechaNacimiento: empleados.filter(e => !e.fechaNacimiento).length,
    });
  } catch (error) {
    return handleApiError(error, 'API GET /api/analytics/brechas');
  }
}

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

function calcularMediana(valores: number[]): number {
  if (valores.length === 0) return 0;
  
  const sorted = [...valores].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  }
  
  return Math.round(sorted[middle]);
}

function calcularDesviacionEstandar(valores: number[]): number {
  if (valores.length === 0) return 0;
  
  const promedio = valores.reduce((sum, val) => sum + val, 0) / valores.length;
  const varianza = valores.reduce((sum, val) => sum + Math.pow(val - promedio, 2), 0) / valores.length;
  
  return Math.sqrt(varianza);
}

