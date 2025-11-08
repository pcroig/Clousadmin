// ========================================
// Clasificador de Solicitudes de Cambio con IA
// ========================================
// Determina si una solicitud requiere revisión manual o puede auto-aprobarse
// Usa Classification Pattern para decisiones inteligentes

import { classify, Candidate, ClassificationResult } from './patterns/classification';
import { isAnyProviderAvailable } from './core/client';

/**
 * Resultado de la clasificación de una solicitud
 */
export interface SolicitudClasificacion {
  requiereRevisionManual: boolean;
  confianza: number; // 0-100
  razonamiento: string;
}

/**
 * Datos de entrada para clasificar una solicitud
 */
export interface SolicitudInput {
  id: string;
  tipo: string;
  camposCambiados: any;
  motivo?: string;
  empleado: { nombre: string; apellidos: string };
}

/**
 * Clasifica una solicitud de cambio para determinar si requiere revisión manual
 * 
 * Usa Classification Pattern con dos decisiones posibles: 'auto' o 'manual'
 * 
 * @param solicitud Datos de la solicitud a clasificar
 * @returns Clasificación con decisión, confianza y razonamiento
 */
export async function clasificarSolicitud(solicitud: SolicitudInput): Promise<SolicitudClasificacion> {
  const { tipo, camposCambiados, motivo, empleado } = solicitud;

  // Si no hay IA disponible, defaultear a revisión manual (seguro)
  if (!isAnyProviderAvailable()) {
    console.warn('[Clasificador Solicitudes] No hay proveedores de IA disponibles, requiere revisión manual por defecto');
    return {
      requiereRevisionManual: true,
      confianza: 50,
      razonamiento: 'No hay IA disponible. Se requiere revisión manual por precaución.',
    };
  }

  try {
    // Preparar input para clasificación
    const campos = Object.keys(camposCambiados);
    const valoresCambiados = JSON.stringify(camposCambiados, null, 2);

    const input = `
Tipo de solicitud: ${tipo}
Empleado: ${empleado.nombre} ${empleado.apellidos}
Campos modificados: ${campos.join(', ')}
Valores:
${valoresCambiados}
Motivo: ${motivo || 'No especificado'}
    `.trim();

    // Definir candidatos (decisiones posibles)
    const candidates: Candidate[] = [
      {
        id: 'auto',
        label: 'Puede auto-aprobarse (cambios simples y seguros)',
      },
      {
        id: 'manual',
        label: 'Requiere revisión manual (cambios sensibles o complejos)',
      },
    ];

    // Contexto e instrucciones específicas para el clasificador
    const context = `
Las solicitudes de cambio de datos de empleados pueden ser simples (dirección, teléfono) 
o sensibles (IBAN, datos fiscales). Evalúa el riesgo y complejidad para determinar si pueden 
auto-aprobarse de forma segura o requieren revisión humana.
    `.trim();

    const additionalInstructions = `
CRITERIOS PARA AUTO-APROBACIÓN (selecciona "auto"):
1. ✅ Cambios de dirección (calle, número, piso, código postal, ciudad, provincia)
2. ✅ Cambios de teléfono personal o de emergencia
3. ✅ Cambios de email personal (NO corporativo)
4. ✅ Actualización de contacto de emergencia (nombre, relación, teléfono)
5. ✅ UN SOLO CAMPO modificado a la vez (bajo riesgo)
6. ✅ Motivo proporcionado y coherente (si es requerido)

CRITERIOS PARA REVISIÓN MANUAL (selecciona "manual"):
1. ⚠️ Cambios de IBAN o cuenta bancaria (riesgo financiero)
2. ⚠️ Cambios de NIE/DNI, NIF, o número de seguridad social (datos fiscales)
3. ⚠️ Cambios de nombre legal o apellidos (requiere documentación)
4. ⚠️ Múltiples campos modificados simultáneamente (≥3 campos diferentes)
5. ⚠️ Motivo vacío o sospechoso en cambios sensibles (ej: "actualizar", "cambio")
6. ⚠️ Cambios que combinan datos sensibles (ej: IBAN + teléfono + dirección)
7. ⚠️ Cualquier cambio relacionado con datos fiscales o legales

EJEMPLOS DE DECISIONES:
- "Cambio de direccionCalle por mudanza" → AUTO ✅ (campo seguro, motivo claro)
- "Actualización de telefono" → AUTO ✅ (campo seguro)
- "Cambio de iban" → MANUAL ⚠️ (dato financiero sensible)
- "Cambio de iban, direccionCalle y telefono" → MANUAL ⚠️ (múltiples campos)
- "Actualización de nif por renovación" → MANUAL ⚠️ (dato fiscal)

REGLA DE ORO: 
En caso de duda, SIEMPRE selecciona "manual" para proteger datos sensibles.
Si la confianza es <80%, selecciona "manual".
    `.trim();

    // Usar Classification Pattern
    const result = await classify<void>(
      input,
      candidates,
      'solicitud de cambio de datos',
      {
        confidenceThreshold: 75, // 75% confianza mínima para auto-aprobar
        additionalInstructions,
        context,
        temperature: 0.3, // Baja temperatura para decisiones consistentes
      }
    );

    // Si no hay match claro, defaultear a revisión manual (fail-safe)
    if (!result.success || !result.match) {
      console.warn('[Clasificador Solicitudes] Sin match claro, requiere revisión manual');
      return {
        requiereRevisionManual: true,
        confianza: 50,
        razonamiento:
          result.error ||
          'No se pudo determinar con confianza. Se requiere revisión manual por precaución.',
      };
    }

    // Log informativo de la decisión
    const decision = result.match.id === 'auto' ? 'AUTO-APROBABLE' : 'REQUIERE REVISIÓN';
    console.info(
      `[Clasificador Solicitudes] ${solicitud.id} → ${decision} (${result.match.confidence}% confianza) usando ${result.provider}`
    );
    if (result.reasoning) {
      console.info(`[Clasificador Solicitudes] Razonamiento: ${result.reasoning}`);
    }

    return {
      requiereRevisionManual: result.match.id === 'manual',
      confianza: result.match.confidence,
      razonamiento: result.reasoning || 'Clasificación exitosa',
    };
  } catch (error: any) {
    console.error('[Clasificador Solicitudes] Error en IA:', error.message);

    // En caso de error, defaultear a revisión manual (fail-safe)
    return {
      requiereRevisionManual: true,
      confianza: 0,
      razonamiento: `Error en clasificación: ${error.message}. Se requiere revisión manual por seguridad.`,
    };
  }
}

/**
 * Clasifica una solicitud de ausencia para determinar si requiere revisión manual
 * (Para futuro uso - actualmente las ausencias se auto-aprueban por tipo)
 * 
 * @param ausencia Datos de la ausencia a clasificar
 * @returns Clasificación con decisión, confianza y razonamiento
 */
export async function clasificarSolicitudAusencia(ausencia: {
  tipo: string;
  fechaInicio: Date;
  fechaFin: Date;
  motivo?: string;
  empleado: {
    nombre: string;
    apellidos: string;
    diasVacacionesDisponibles?: number;
  };
}): Promise<SolicitudClasificacion> {
  const { tipo, fechaInicio, fechaFin, motivo, empleado } = ausencia;

  // Si no hay IA disponible, defaultear a revisión manual
  if (!isAnyProviderAvailable()) {
    console.warn('[Clasificador Ausencias] No hay proveedores de IA disponibles');
    return {
      requiereRevisionManual: true,
      confianza: 50,
      razonamiento: 'No hay IA disponible. Se requiere revisión manual por precaución.',
    };
  }

  try {
    // Calcular días solicitados
    const diffTime = Math.abs(fechaFin.getTime() - fechaInicio.getTime());
    const diasSolicitados = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const input = `
Tipo de ausencia: ${tipo}
Empleado: ${empleado.nombre} ${empleado.apellidos}
Fecha inicio: ${fechaInicio.toLocaleDateString('es-ES')}
Fecha fin: ${fechaFin.toLocaleDateString('es-ES')}
Días solicitados: ${diasSolicitados}
Días disponibles: ${empleado.diasVacacionesDisponibles || 'N/A'}
Motivo: ${motivo || 'No especificado'}
    `.trim();

    const candidates: Candidate[] = [
      {
        id: 'auto',
        label: 'Puede auto-aprobarse (ausencia válida y dentro de políticas)',
      },
      {
        id: 'manual',
        label: 'Requiere revisión manual (conflictos o excepciones)',
      },
    ];

    const additionalInstructions = `
CRITERIOS PARA AUTO-APROBACIÓN:
1. ✅ Ausencias cortas (≤5 días consecutivos)
2. ✅ Empleado tiene días disponibles suficientes
3. ✅ Motivo coherente y proporcionado (si es requerido)
4. ✅ Tipo de ausencia: enfermedad, enfermedad_familiar, maternidad_paternidad (auto-aprobables)

CRITERIOS PARA REVISIÓN MANUAL:
1. ⚠️ Vacaciones largas (>5 días consecutivos)
2. ⚠️ Empleado sin días disponibles suficientes
3. ⚠️ Ausencias en fechas críticas (fin de año, períodos pico)
4. ⚠️ Motivo vacío o poco claro
5. ⚠️ Tipo "otro" (requiere contexto adicional)

REGLA: Si la ausencia es por vacaciones y >5 días, siempre requiere revisión manual.
    `.trim();

    const result = await classify<void>(
      input,
      candidates,
      'solicitud de ausencia',
      {
        confidenceThreshold: 75,
        additionalInstructions,
        temperature: 0.3,
      }
    );

    if (!result.success || !result.match) {
      return {
        requiereRevisionManual: true,
        confianza: 50,
        razonamiento:
          result.error ||
          'No se pudo determinar con confianza. Se requiere revisión manual por precaución.',
      };
    }

    console.info(
      `[Clasificador Ausencias] ${tipo} (${diasSolicitados} días) → ${result.match.id === 'auto' ? 'AUTO' : 'MANUAL'} (${result.match.confidence}%)`
    );

    return {
      requiereRevisionManual: result.match.id === 'manual',
      confianza: result.match.confidence,
      razonamiento: result.reasoning || 'Clasificación exitosa',
    };
  } catch (error: any) {
    console.error('[Clasificador Ausencias] Error en IA:', error.message);

    return {
      requiereRevisionManual: true,
      confianza: 0,
      razonamiento: `Error en clasificación: ${error.message}. Se requiere revisión manual por seguridad.`,
    };
  }
}
