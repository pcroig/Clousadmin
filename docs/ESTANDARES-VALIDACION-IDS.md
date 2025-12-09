# Estándares de Validación de IDs con Prisma y Zod

## Resumen del Problema Sistémico

**Fecha:** Diciembre 8, 2025
**Causa Raíz:** Desajuste entre el tipo de ID generado por Prisma (`cuid`) y la validación en schemas Zod (`.uuid()`)

### ¿Qué pasó?

Se detectó un error 400 recurrente al crear empleados nuevos:

```json
{
  "code": "invalid_format",
  "format": "uuid",
  "path": ["empleadoId"],
  "message": "ID de empleado inválido"
}
```

**Ejemplo de ID rechazado:** `cmixws9vx000n1yckq4zq4l6i`

### ¿Por qué falló?

El schema Zod validaba:
```typescript
empleadoId: z.string().uuid()  // ❌ Espera formato UUID
```

Pero Prisma generaba:
```prisma
model empleados {
  id String @id @default(cuid())  // ✅ Genera formato CUID
}
```

### Formatos de ID

| Tipo | Formato | Ejemplo | Longitud |
|------|---------|---------|----------|
| **UUID** | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | `550e8400-e29b-41d4-a716-446655440000` | 36 caracteres (con guiones) |
| **CUID** | `c + timestamp + counter + fingerprint` | `cmixws9vx000n1yckq4zq4l6i` | 25 caracteres |

---

## Decisión de Arquitectura

**TODOS los modelos de Prisma en este proyecto usan `@default(cuid())`**

Verificación realizada:
```bash
grep -E "@id @default\((uuid|cuid)\(\)\)" prisma/schema.prisma | wc -l
# Resultado: 50+ modelos, TODOS usan cuid()
```

**Por lo tanto:**
- ✅ Usar `z.string().cuid()` para validar IDs de Prisma
- ❌ NUNCA usar `z.string().uuid()` para IDs de Prisma

---

## Solución Implementada

### 1. Helper Centralizado de Validación

**Ubicación:** [`/lib/validaciones/schemas.ts`](/lib/validaciones/schemas.ts)

```typescript
/**
 * Schema para validar IDs de Prisma.
 * USAR ESTE SCHEMA para todos los IDs que referencien modelos de Prisma.
 */
export const idSchema = z.string().cuid();

// Variantes
export const optionalIdSchema = idSchema.optional();
export const nullableIdSchema = idSchema.nullable();
export const nullishIdSchema = idSchema.nullish();
export const idArraySchema = z.array(idSchema);
export const optionalIdArraySchema = z.array(idSchema).optional();
```

### 2. Uso Correcto

#### ❌ INCORRECTO
```typescript
const schema = z.object({
  empleadoId: z.string().uuid(),
  equipoId: z.string().uuid().optional(),
  documentoIds: z.array(z.string().uuid()),
});
```

#### ✅ CORRECTO
```typescript
import { idSchema, optionalIdSchema, idArraySchema } from '@/lib/validaciones/schemas';

const schema = z.object({
  empleadoId: idSchema,
  equipoId: optionalIdSchema,
  documentoIds: idArraySchema,
});
```

---

## Archivos Corregidos

Se auditaron y corrigieron **13 archivos** con validaciones `.uuid()` incorrectas:

### API Routes
1. [`/app/api/empleados/invitar/route.ts`](/app/api/empleados/invitar/route.ts) - `empleadoId`
2. [`/app/api/fichajes/route.ts`](/app/api/fichajes/route.ts) - `empleadoId`
3. [`/app/api/fichajes/eventos/route.ts`](/app/api/fichajes/eventos/route.ts) - `fichajeId`
4. [`/app/api/fichajes/correcciones/route.ts`](/app/api/fichajes/correcciones/route.ts) - `fichajeId`
5. [`/app/api/fichajes/eventos-corregidos/route.ts`](/app/api/fichajes/eventos-corregidos/route.ts) - `fichajeId`
6. [`/app/api/ausencias/actualizar-masivo/route.ts`](/app/api/ausencias/actualizar-masivo/route.ts) - `ausenciasIds`
7. [`/app/api/puestos/route.ts`](/app/api/puestos/route.ts) - `empleadoIds`
8. [`/app/api/nominas/[id]/complementos/route.ts`](/app/api/nominas/[id]/complementos/route.ts) - `empleadoComplementoId`

### Validation Schemas
9. [`/lib/validaciones/schemas.ts`](/lib/validaciones/schemas.ts) - `idSchema`, `jornadaCreateSchema`
10. [`/lib/validaciones/equipos-schemas.ts`](/lib/validaciones/equipos-schemas.ts) - `sedeId`, `empleadoId`, `managerId`

### Server Actions
11. [`/app/(dashboard)/platform/invitaciones/actions.ts`](/app/(dashboard)/platform/invitaciones/actions.ts) - `empresaId`

---

## Cómo Prevenir Este Error en el Futuro

### 1. Regla de Oro
**Si el ID referencia un modelo de Prisma → usar `idSchema` de `/lib/validaciones/schemas.ts`**

### 2. Checklist para Nuevos Schemas

Cuando crees un nuevo schema Zod que incluya IDs:

- [ ] ¿El campo termina en `Id` (ej: `empleadoId`, `equipoId`)? → Usar `idSchema`
- [ ] ¿Es opcional? → Usar `optionalIdSchema`
- [ ] ¿Es nullable? → Usar `nullableIdSchema`
- [ ] ¿Es un array? → Usar `idArraySchema`
- [ ] ¿Importé los helpers? → `import { idSchema } from '@/lib/validaciones/schemas'`

### 3. Patrón de Importación

**Siempre incluir este import al inicio:**
```typescript
import { idSchema, optionalIdSchema, idArraySchema } from '@/lib/validaciones/schemas';
```

### 4. Búsqueda Preventiva

Antes de hacer PR, ejecutar:
```bash
# Buscar usos de .uuid() en schemas (puede indicar error)
grep -r "z\.string()\.uuid" app/api lib/ --include="*.ts"
```

Si encuentras `.uuid()`, verifica si debería ser `.cuid()` (via `idSchema`).

---

## Testing

### Caso de Prueba
```typescript
import { idSchema } from '@/lib/validaciones/schemas';

// ✅ Debe PASAR
idSchema.parse('cmixws9vx000n1yckq4zq4l6i'); // CUID válido

// ❌ Debe FALLAR
idSchema.parse('550e8400-e29b-41d4-a716-446655440000'); // UUID rechazado
```

### Validación en Runtime
```typescript
const result = idSchema.safeParse(value);
if (!result.success) {
  console.error('ID inválido:', result.error);
  // Error: Formato esperado CUID, recibido UUID
}
```

---

## Casos Especiales

### ¿Cuándo SÍ usar `.uuid()`?

**SOLO cuando:**
- El ID proviene de un sistema externo que genera UUIDs (ej: API de terceros)
- El campo NO referencia un modelo de Prisma

**Ejemplo:**
```typescript
const integracionExternaSchema = z.object({
  externalUserId: z.string().uuid(), // ✅ OK - ID externo no de Prisma
  empleadoId: idSchema,              // ✅ OK - ID de Prisma
});
```

### IDs Compuestos

Si tienes un modelo con ID compuesto, validar cada parte:
```typescript
const composedSchema = z.object({
  empresaId: idSchema,
  empleadoId: idSchema,
});
```

---

## Historial de Cambios

| Fecha | Acción | Archivos Afectados |
|-------|--------|-------------------|
| 2025-12-08 | Creación de `idSchema` centralizado | `lib/validaciones/schemas.ts` |
| 2025-12-08 | Corrección masiva `.uuid()` → `.cuid()` | 13 archivos |
| 2025-12-08 | Documentación de estándares | Este archivo |

---

## Referencias

- [Prisma CUID Documentation](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference#cuid)
- [Zod String Validation](https://zod.dev/?id=strings)
- [CUID Specification](https://github.com/paralleldrive/cuid)

---

## Contacto

Si encuentras un caso edge donde este estándar no aplica, discútelo con el equipo antes de usar `.uuid()`.

**Mantenedores:**
- Claude Code (Implementación inicial: Dic 8, 2025)
