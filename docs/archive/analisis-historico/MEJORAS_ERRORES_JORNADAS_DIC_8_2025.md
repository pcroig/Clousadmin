# Mejoras en Manejo de Errores - Jornadas (8 Dic 2025)

> ⚠️ Documento deprecado. Ver `docs/historial/2025-12-08-jornadas-unificadas.md` para la versión consolidada.

## Problema Reportado

El usuario reportó que al crear una jornada asignada a un equipo, recibía un error genérico:
```
Error: "Jornada 2: Datos inválidos"
```

Sin ninguna información sobre QUÉ campo específicamente estaba fallando en la validación.

## Causa Raíz

El backend (usando Zod para validación) retorna errores con la siguiente estructura:
```json
{
  "error": "Datos inválidos",
  "details": [
    {
      "path": ["campo", "subcampo"],
      "message": "Mensaje de error específico"
    }
  ]
}
```

Pero el frontend solo estaba leyendo los campos `error` y `message`, ignorando completamente el array `details` que contiene la información REAL sobre qué falló.

**Código problemático** (antes):
```typescript
const errorData = await response.json().catch(() => ({ error: 'Error desconocido' })) as { error?: string; message?: string };
const errorMsg = errorData.error || errorData.message || `Error ${response.status}`;
throw new Error(`Jornada ${i + 1}: ${errorMsg}`);
```

Esto resultaba en mensajes genéricos como "Jornada 2: Datos inválidos" sin indicar QUÉ dato era inválido.

## Solución Implementada

### 1. Mejorado el Manejo de Errores en Frontend

**Archivos modificados:**
- `app/(dashboard)/hr/horario/fichajes/jornadas-modal.tsx`
- `components/onboarding/jornada-step.tsx`

**Cambios realizados:**

1. **Extender tipo de error** para incluir `details`:
```typescript
const errorData = await response.json().catch(() => ({ error: 'Error desconocido' })) as {
  error?: string;
  message?: string;
  details?: Array<{ path: string[]; message: string }>
};
```

2. **Procesar detalles de validación Zod**:
```typescript
// Si hay detalles de validación (Zod), mostrar errores específicos
if (errorData.details && Array.isArray(errorData.details) && errorData.details.length > 0) {
  const validationErrors = errorData.details
    .map(issue => `${issue.path.join('.')}: ${issue.message}`)
    .join(', ');
  throw new Error(`Jornada ${i + 1}: ${validationErrors}`);
}

const errorMsg = errorData.error || errorData.message || `Error ${response.status}`;
throw new Error(`Jornada ${i + 1}: ${errorMsg}`);
```

### 2. Añadido Logging de Debug

Agregado `console.log` en puntos críticos para facilitar el debugging:

```typescript
console.log(`[DEBUG] Creando jornada ${i + 1}:`, jornadaBody);
console.log(`[DEBUG] Actualizando jornada ${i + 1}:`, jornadaBody);
```

Esto permite al usuario (o soporte) ver exactamente qué datos se están enviando al backend.

## Ubicaciones de los Cambios

### 1. jornadas-modal.tsx

**Líneas 498-505**: CORRECCIÓN CRÍTICA - Cambio de `config.descanso` (number) a `config.descansoMinimo` (string "HH:MM")
**Líneas 516-536**: Error handling mejorado para PATCH (actualizar jornada)
**Líneas 541-552**: Error handling mejorado para POST (crear jornada)
**Líneas 582-594**: Error handling mejorado para asignación

### 2. jornada-step.tsx (Onboarding)

**Líneas 473-488**: Error handling mejorado para asignación de jornadas en onboarding

## Beneficios

### Antes (Ejemplo)
```
❌ Error: "Jornada 2: Datos inválidos"
```
El usuario no sabe QUÉ está mal.

### Después (Ejemplo)
```
✅ Error: "Jornada 2: tipo: Expected 'fija' or 'flexible', horasSemanales: Expected number, received string"
```
El usuario sabe EXACTAMENTE qué campos tienen problemas.

## Casos de Uso Mejorados

1. **Validación de tipo de jornada**: Si falta el campo `tipo` o es inválido
2. **Validación de horas semanales**: Si es un string en lugar de number
3. **Validación de configuración**: Si la estructura del config es inválida
4. **Validación de asignación**: Si faltan equipoIds cuando nivel='equipo'

## Bug Crítico Corregido Durante la Investigación

Durante la investigación del error "Datos inválidos", descubrimos un **segundo bug crítico**:

### Problema
El código estaba enviando:
```typescript
config.descanso = 60;  // ❌ Number - No existe en el schema
```

Pero el schema de validación Zod espera:
```typescript
descansoMinimo: z.string().optional()  // ✅ String formato "HH:MM"
```

### Causa
El schema usa `.catchall(jornadaConfigDiaSchema)`, lo que significa que cualquier propiedad del config que NO sea `tipo` o `descansoMinimo` debe ser un objeto de tipo `DiaConfig` (para lunes, martes, etc.), no un número primitivo.

### Solución Implementada
**Archivo**: [jornadas-modal.tsx:498-505](app/(dashboard)/hr/horario/fichajes/jornadas-modal.tsx#L498-L505)

**Antes (incorrecto)**:
```typescript
if (jornada.tieneDescanso) {
  const descansoNum = parseInt(jornada.descansoMinutos, 10);
  config.descanso = isNaN(descansoNum) ? 60 : descansoNum;  // ❌
}
```

**Después (correcto)**:
```typescript
if (jornada.tieneDescanso && jornada.descansoMinutos) {
  const descansoNum = parseInt(jornada.descansoMinutos, 10);
  if (!isNaN(descansoNum) && descansoNum > 0) {
    const horas = Math.floor(descansoNum / 60);
    const minutos = descansoNum % 60;
    config.descansoMinimo = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;  // ✅
  }
}
```

Ahora coincide con el patrón usado en todos los demás componentes (editar-jornada-modal, jornada-step, signup actions, etc.).

## Próximos Pasos (Opcional)

Si se siguen encontrando errores genéricos en otras partes de la aplicación, se puede:

1. **Crear un helper centralizado** para parsear errores de API:
```typescript
// lib/utils/api-errors.ts
export function parseApiError(errorData: { error?: string; message?: string; details?: ZodIssue[] }): string {
  if (errorData.details && Array.isArray(errorData.details) && errorData.details.length > 0) {
    return errorData.details
      .map(issue => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
  }
  return errorData.error || errorData.message || 'Error desconocido';
}
```

2. **Usar este helper** en todos los fetch de la aplicación

## Verificación

Para verificar que funciona:

1. Abrir el modal de jornadas
2. Intentar crear una jornada con datos inválidos (ej: dejar horasSemanales vacío)
3. El mensaje de error ahora debe mostrar: "horasSemanales: Expected number, received nan" (o similar)
4. Verificar en la consola del navegador los logs `[DEBUG]` con el payload exacto

## Notas Técnicas

- ✅ TypeScript: Todos los cambios compilan correctamente
- ✅ Compatibilidad: Los cambios son backwards-compatible (si `details` no existe, se usa el mensaje genérico)
- ✅ No hay breaking changes en la API
- ✅ Los logs de debug solo se ejecutan cuando hay operaciones de creación/actualización

---

**Autor:** Claude Code
**Fecha:** 8 Diciembre 2025
**Relacionado con:** Multi-team selection refactoring, SOLUCION_JORNADAS_COMPLETA.md
