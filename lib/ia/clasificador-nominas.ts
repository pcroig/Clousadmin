// ========================================
// Clasificador de Nóminas con IA
// ========================================
// Matching inteligente de archivos PDF de nóminas con empleados usando OpenAI

import { getOpenAIClient, isOpenAIAvailable } from './client';

/**
 * Empleado candidato para matching
 */
export interface EmpleadoCandidato {
  id: string;
  nombre: string;
  apellidos: string;
}

/**
 * Resultado del matching de una nómina
 */
export interface MatchingResult {
  empleado: {
    id: string;
    nombre: string;
  } | null;
  confidence: number; // 0-100
  autoAssigned: boolean;
  candidates: Array<{
    id: string;
    nombre: string;
    confidence: number;
  }>;
  razon?: string;
}

/**
 * Matching inteligente de nómina usando IA
 * Analiza el nombre del archivo y lo compara con la lista de empleados
 */
export async function clasificarNomina(
  filename: string,
  empleados: EmpleadoCandidato[]
): Promise<MatchingResult> {
  // Si no hay IA disponible, fallback a matching básico
  if (!isOpenAIAvailable()) {
    console.warn('[Clasificador Nóminas] OpenAI no disponible, usando fallback');
    return matchingBasico(filename, empleados);
  }

  try {
    const openai = getOpenAIClient();

    // Preparar lista de empleados para el prompt
    const listaEmpleados = empleados
      .map((emp, idx) => `${idx + 1}. ${emp.nombre} ${emp.apellidos} (ID: ${emp.id})`)
      .join('\n');

    const prompt = `Eres un asistente experto en matching de documentos. Analiza el nombre del archivo PDF de nómina y encuentra el mejor match con la lista de empleados.

ARCHIVO PDF: "${filename}"

LISTA DE EMPLEADOS:
${listaEmpleados}

INSTRUCCIONES:
1. Extrae el nombre del empleado del nombre del archivo (puede estar en diferentes formatos: "Apellidos Nombre", "Nombre Apellidos", con o sin guiones, con números o fechas, etc.)
2. Compara con la lista de empleados y encuentra el mejor match
3. Considera variaciones de nombres (con/sin acentos, mayúsculas/minúsculas, orden invertido)
4. Si el match es muy claro (≥85% confianza), retorna ese empleado
5. Si no hay match claro, retorna null y lista los top 3 candidatos más probables

RESPUESTA (JSON estricto, sin markdown):
{
  "empleadoId": "ID del empleado o null",
  "confidence": 0-100,
  "razon": "Breve explicación del match",
  "candidates": [
    {"id": "ID1", "nombre": "Nombre Completo", "confidence": 0-100},
    {"id": "ID2", "nombre": "Nombre Completo", "confidence": 0-100},
    {"id": "ID3", "nombre": "Nombre Completo", "confidence": 0-100}
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Modelo rápido y económico
      messages: [
        {
          role: 'system',
          content:
            'Eres un asistente experto en matching de documentos. Siempre responde con JSON válido y estricto, sin markdown, sin explicaciones adicionales.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1, // Bajo para más consistencia
      max_tokens: 500,
      response_format: { type: 'json_object' },
    });

    const respuesta = JSON.parse(completion.choices[0].message.content || '{}');

    // Validar respuesta
    const empleadoId = respuesta.empleadoId;
    const confidence = Math.min(100, Math.max(0, respuesta.confidence || 0));

    // Si hay match con suficiente confianza (≥75%)
    const threshold = 75;
    let empleado: { id: string; nombre: string } | null = null;

    if (empleadoId && confidence >= threshold) {
      const emp = empleados.find((e) => e.id === empleadoId);
      if (emp) {
        empleado = {
          id: emp.id,
          nombre: `${emp.nombre} ${emp.apellidos}`,
        };
      }
    }

    // Preparar candidatos
    const candidates = (respuesta.candidates || []).slice(0, 5).map((c: any) => {
      const emp = empleados.find((e) => e.id === c.id);
      return {
        id: c.id,
        nombre: emp ? `${emp.nombre} ${emp.apellidos}` : c.nombre || 'Desconocido',
        confidence: Math.min(100, Math.max(0, c.confidence || 0)),
      };
    });

    // Log informativo del matching (útil para monitoreo)
    if (empleado) {
      console.info(`[Clasificador Nóminas] ${filename} → ${empleado.nombre} (${confidence}% confianza)`);
    }

    return {
      empleado,
      confidence,
      autoAssigned: empleado !== null,
      candidates,
      razon: respuesta.razon,
    };
  } catch (error) {
    console.error('[Clasificador Nóminas] Error en IA, usando fallback:', {
      filename,
      totalEmpleados: empleados.length,
      error,
    });
    return matchingBasico(filename, empleados);
  }
}

/**
 * Matching básico (fallback cuando no hay IA)
 * Usa comparación simple de strings
 */
function matchingBasico(
  filename: string,
  empleados: EmpleadoCandidato[]
): MatchingResult {
  // Limpiar nombre de archivo
  const cleanName = filename
    .replace(/\.pdf$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\d{4}/g, '') // Años
    .replace(/\d{8}[A-Z]/gi, '') // NIFs
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  // Calcular similitudes básicas
  const scores = empleados.map((emp) => {
    const nombreCompleto = `${emp.nombre} ${emp.apellidos}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const nombreInvertido = `${emp.apellidos} ${emp.nombre}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    // Similitud simple (contar palabras comunes)
    const palabrasArchivo = cleanName.split(/\s+/);
    const palabrasNombre = nombreCompleto.split(/\s+/);
    const palabrasInvertido = nombreInvertido.split(/\s+/);

    const matchesCompleto = palabrasArchivo.filter((p) =>
      palabrasNombre.some((n) => n.includes(p) || p.includes(n))
    ).length;

    const matchesInvertido = palabrasArchivo.filter((p) =>
      palabrasInvertido.some((n) => n.includes(p) || p.includes(n))
    ).length;

    const score = Math.max(
      (matchesCompleto / Math.max(palabrasArchivo.length, palabrasNombre.length)) * 100,
      (matchesInvertido / Math.max(palabrasArchivo.length, palabrasInvertido.length)) * 100
    );

    return {
      empleado: emp,
      score,
      confidence: Math.round(score),
    };
  });

  scores.sort((a, b) => b.score - a.score);

  const threshold = 75;
  const best = scores[0];
  const empleado =
    best && best.score >= threshold
      ? {
          id: best.empleado.id,
          nombre: `${best.empleado.nombre} ${best.empleado.apellidos}`,
        }
      : null;

  const candidates = scores.slice(0, 5).map((s) => ({
    id: s.empleado.id,
    nombre: `${s.empleado.nombre} ${s.empleado.apellidos}`,
    confidence: s.confidence,
  }));

  return {
    empleado,
    confidence: best ? best.confidence : 0,
    autoAssigned: empleado !== null,
    candidates,
    razon: 'Matching básico (IA no disponible)',
  };
}


