# Fix: Prisma Import en Componentes Cliente

**Fecha**: 2 de diciembre de 2025  
**Tipo**: Bug Fix - Arquitectura  
**Estado**: ✅ Resuelto

## Problema

### Error Original
```
[Prisma] DATABASE_URL no encontrada
DATABASE_URL is not defined
```

### Causa Raíz
Los componentes del cliente estaban importando tipos desde `lib/onboarding-config.ts`, que a su vez importaba Prisma:

**Cadena de imports problemática**:
```
components/organizacion/add-persona-onboarding-form.tsx (CLIENT)
  ↓ import from
lib/onboarding-config.ts
  ↓ import
lib/prisma.ts (SERVIDOR - requiere DATABASE_URL)
```

Cuando Next.js intenta renderizar componentes del cliente, evalúa todos los imports, incluyendo Prisma, lo cual falla porque:
1. Prisma solo funciona en el servidor
2. `DATABASE_URL` no está disponible en el cliente
3. No se debe exponer la URL de la base de datos al navegador

## Solución

### Separación de Tipos y Lógica

Creé un nuevo archivo solo con tipos e interfaces que NO importa Prisma:

**Nuevo archivo**: `lib/onboarding-config-types.ts`

Contiene:
- Interfaces: `CamposRequeridos`, `DocumentoRequerido`, `PlantillaDocumento`
- Funciones helper puras (sin Prisma):
  - `filtrarDocumentosPorEquipo()`
  - `obtenerDocumentosAsincronicos()`

**Archivo original**: `lib/onboarding-config.ts`

Ahora:
- Importa tipos desde `onboarding-config-types.ts`
- Re-exporta tipos para compatibilidad
- Re-exporta funciones helper
- Mantiene todas las funciones que usan Prisma (solo para servidor)

### Estructura Final

```
lib/
  onboarding-config-types.ts    ← SEGURO para cliente (sin Prisma)
  onboarding-config.ts           ← SOLO servidor (con Prisma)

components/ (cliente)
  organizacion/
    add-persona-onboarding-form.tsx  → import from onboarding-config-types
  hr/
    gestionar-onboarding-modal.tsx   → import from onboarding-config-types
    plantillas-tab.tsx               → import from onboarding-config-types

app/api/ (servidor)
  hr/onboarding-config/route.ts      → import from onboarding-config
```

## Cambios Realizados

### 1. Crear archivo de tipos
**Archivo**: `lib/onboarding-config-types.ts`

```typescript
// Solo tipos e interfaces - SIN imports de Prisma
export interface CamposRequeridos { ... }
export interface DocumentoRequerido { ... }
export interface PlantillaDocumento { ... }

// Funciones helper puras (sin DB)
export function filtrarDocumentosPorEquipo(...) { ... }
export function obtenerDocumentosAsincronicos(...) { ... }
```

### 2. Actualizar archivo original
**Archivo**: `lib/onboarding-config.ts`

```typescript
import { prisma } from '@/lib/prisma';  // OK, es servidor

// Importar tipos localmente
import type {
  CamposRequeridos,
  DocumentoRequerido,
  PlantillaDocumento,
} from './onboarding-config-types';

// Re-exportar para compatibilidad
export type {
  CamposRequeridos,
  DocumentoRequerido,
  PlantillaDocumento,
} from './onboarding-config-types';

export {
  filtrarDocumentosPorEquipo,
  obtenerDocumentosAsincronicos,
} from './onboarding-config-types';

// ... funciones con Prisma (solo servidor)
```

### 3. Actualizar componentes cliente
**Archivos modificados**:
- `components/organizacion/add-persona-onboarding-form.tsx`
- `components/hr/gestionar-onboarding-modal.tsx`
- `components/hr/plantillas-tab.tsx`

**Cambio**:
```typescript
// ANTES (❌ importaba Prisma indirectamente)
import { type DocumentoRequerido } from '@/lib/onboarding-config';

// DESPUÉS (✅ solo tipos, sin Prisma)
import { type DocumentoRequerido } from '@/lib/onboarding-config-types';
```

## Verificación

### TypeScript
```bash
npx tsc --noEmit
# ✅ Sin errores
```

### Build
```bash
npm run build
# ✅ Build exitoso
```

### Componentes del Servidor
Los componentes y APIs del servidor pueden seguir usando:
```typescript
import { ... } from '@/lib/onboarding-config';
```

Todo funciona igual porque se re-exportan los tipos.

## Principio Arquitectónico

**Regla**: Separar tipos/interfaces de lógica que requiere servidor

**Patrón**:
```
[nombre]-types.ts    → Solo tipos, interfaces, funciones puras
[nombre].ts          → Lógica con DB, APIs externas, etc.
```

**Beneficios**:
- ✅ Componentes cliente pueden usar tipos
- ✅ No se expone lógica del servidor al cliente
- ✅ No se intentan cargar dependencias del servidor en el navegador
- ✅ Mejor tree-shaking y bundle size

## Lecciones Aprendidas

1. **Next.js evalúa todos los imports**: Incluso si no usas la función, si importas de un archivo que importa Prisma, el código se evalúa.

2. **Separar concerns es clave**: Los tipos deben vivir separados de la lógica de infraestructura.

3. **Type-only imports no evitan evaluación**: Hacer `import type` no evita que el módulo se evalúe si tiene side effects (como import de Prisma).

4. **Re-exports mantienen compatibilidad**: Puedes refactorizar sin romper código existente.

## Archivos Afectados

### Nuevos
- ✅ `lib/onboarding-config-types.ts`

### Modificados
- ✅ `lib/onboarding-config.ts`
- ✅ `components/organizacion/add-persona-onboarding-form.tsx`
- ✅ `components/hr/gestionar-onboarding-modal.tsx`
- ✅ `components/hr/plantillas-tab.tsx`

### Sin cambios (gracias a re-exports)
- ✅ `app/api/hr/onboarding-config/route.ts`
- ✅ Otros archivos del servidor

## Estado Final

✅ **Problema resuelto**  
✅ **Build funciona**  
✅ **TypeScript sin errores**  
✅ **Arquitectura mejorada**  
✅ **Sin breaking changes**








