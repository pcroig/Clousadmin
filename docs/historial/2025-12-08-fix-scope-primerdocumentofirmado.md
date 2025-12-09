# Fix: ReferenceError primerDocumentoFirmado is not defined

**Fecha**: 2025-12-08
**Tipo**: Bug Fix (Critical)
**Estado**: ✅ Completado

## Problema

Al firmar un documento, la aplicación fallaba con el siguiente error:

```
[POST /api/firma/solicitudes/:solicitudId/firmar] Error: ReferenceError: primerDocumentoFirmado is not defined
    at firmarDocumento (lib/firma-digital/db-helpers.ts:740:52)
```

El endpoint devolvía **500 Internal Server Error**, impidiendo que el empleado completara la firma del documento.

## Causa Raíz

### Análisis del Error

En [lib/firma-digital/db-helpers.ts:740](lib/firma-digital/db-helpers.ts#L740), el código intentaba acceder a la variable `primerDocumentoFirmado`:

```typescript
return {
  firma: firmaActualizada,
  certificado,
  solicitudCompletada: estadoComplecion.completo,
  // Devolver información del documento firmado cuando todas las firmas están completas
  documentoFirmado: estadoComplecion.completo && primerDocumentoFirmado ? {
    id: primerDocumentoFirmado.id,     // ❌ ReferenceError
    nombre: primerDocumentoFirmado.nombre,
  } : undefined,
};
```

### Problema de Scope

La variable `primerDocumentoFirmado` se declaraba **dentro de un bloque if anidado**:

```typescript
// Línea 392
const estadoComplecion = validarComplecionFirmas(todasLasFirmas);

// Línea 395
if (estadoComplecion.completo) {
  // ...

  // Línea 412
  if (esPDF) {
    // ...

    // Línea 542 - DECLARACIÓN DENTRO DEL BLOQUE if (esPDF)
    let primerDocumentoFirmado: { id: string; nombre: string } | null = null;

    // Lógica para asignar valor...
  }
}

// Línea 735 - FUERA de los bloques if
return {
  // Intenta acceder a primerDocumentoFirmado aquí
  documentoFirmado: estadoComplecion.completo && primerDocumentoFirmado ? { // ❌ OUT OF SCOPE
    id: primerDocumentoFirmado.id,
    nombre: primerDocumentoFirmado.nombre,
  } : undefined,
};
```

**Diagrama de scope**:
```
función firmarDocumento() {
  ├─ estadoComplecion = ...
  │
  ├─ if (estadoComplecion.completo) {
  │   ├─ actualizar solicitud
  │   │
  │   ├─ if (esPDF) {
  │   │   ├─ let primerDocumentoFirmado = null;  ← DECLARACIÓN AQUÍ
  │   │   ├─ ... asignar valor ...
  │   │   └─ }
  │   │
  │   └─ }
  │
  └─ return {
      documentoFirmado: ... primerDocumentoFirmado ...  ← ERROR: NO EXISTE EN ESTE SCOPE
    }
}
```

La variable estaba **fuera de scope** - no era accesible desde el return.

## Solución

Declarar `primerDocumentoFirmado` **ANTES del bloque if**, para que esté disponible en todo el ámbito de la función:

### Cambios Realizados

**Archivo**: [lib/firma-digital/db-helpers.ts:392-398](lib/firma-digital/db-helpers.ts#L392-L398)

```typescript
const estadoComplecion = validarComplecionFirmas(todasLasFirmas);

// ✅ NUEVO: Declarar variable ANTES del if para que esté en el scope correcto
let primerDocumentoFirmado: { id: string; nombre: string } | null = null;

// 8. Actualizar estado de solicitud si todas firmaron
if (estadoComplecion.completo) {
  // ... lógica que asigna valor a primerDocumentoFirmado ...
}

// Ahora primerDocumentoFirmado está disponible aquí
return {
  documentoFirmado: estadoComplecion.completo && primerDocumentoFirmado ? {
    id: primerDocumentoFirmado.id,     // ✅ Funciona
    nombre: primerDocumentoFirmado.nombre,
  } : undefined,
};
```

**También eliminé la declaración duplicada** que estaba dentro del bloque `if (esPDF)`:

```typescript
// ANTES (línea 544-545) - ELIMINADO
// Variable para guardar el primer documento creado (para notificaciones)
let primerDocumentoFirmado: { id: string; nombre: string } | null = null;
```

### Diagrama de scope CORREGIDO:
```
función firmarDocumento() {
  ├─ estadoComplecion = ...
  ├─ let primerDocumentoFirmado = null;  ← ✅ DECLARACIÓN AQUÍ (scope de función)
  │
  ├─ if (estadoComplecion.completo) {
  │   ├─ actualizar solicitud
  │   │
  │   ├─ if (esPDF) {
  │   │   ├─ ... generar PDF ...
  │   │   ├─ primerDocumentoFirmado = { ... }  ← ASIGNACIÓN (misma variable)
  │   │   └─ }
  │   │
  │   └─ }
  │
  └─ return {
      documentoFirmado: ... primerDocumentoFirmado ...  ← ✅ ACCESIBLE
    }
}
```

## Impacto del Bug

### Antes del Fix (❌)
- **Todas las firmas fallaban** con 500 error
- Empleados **no podían completar** el proceso de firma
- Solicitudes quedaban en estado inconsistente
- No se generaba el PDF firmado

### Después del Fix (✅)
- Firma se completa correctamente
- PDF firmado se genera y almacena
- API devuelve `documentoFirmado` con ID y nombre
- Cliente redirige a vista de documento firmado

## Testing

### Caso 1: Firma única (1 firmante)
```bash
# Request
POST /api/firma/solicitudes/{solicitudId}/firmar
{
  "tipo": "manuscrita",
  "firmaImagen": "data:image/png;base64,...",
  "firmaImagenWidth": 500,
  "firmaImagenHeight": 180
}

# Response exitosa (200)
{
  "success": true,
  "firmado": true,
  "solicitudCompletada": true,
  "solicitudId": "...",
  "documentoFirmado": {
    "id": "cm...",
    "nombre": "Contrato - Juan Pérez (firma).pdf"
  },
  "mensaje": "Documento firmado correctamente. Todas las firmas han sido completadas."
}
```

### Caso 2: Firma múltiple (última firma)
```bash
# Request (última de 3 firmas)
POST /api/firma/solicitudes/{solicitudId}/firmar
{
  "tipo": "click",
  "usarFirmaGuardada": true
}

# Response exitosa (200)
{
  "success": true,
  "firmado": true,
  "solicitudCompletada": true,
  "solicitudId": "...",
  "documentoFirmado": {
    "id": "cm...",
    "nombre": "Política - Empleado 3 (firma).pdf"
  },
  "mensaje": "Documento firmado correctamente. Todas las firmas han sido completadas."
}
```

### Caso 3: Firma intermedia (aún faltan firmas)
```bash
# Request (firma 1 de 3)
POST /api/firma/solicitudes/{solicitudId}/firmar

# Response exitosa (200)
{
  "success": true,
  "firmado": true,
  "solicitudCompletada": false,  // ← Aún faltan firmas
  "solicitudId": "...",
  "documentoFirmado": undefined,  // ← No hay documento firmado aún
  "mensaje": "Documento firmado correctamente."
}
```

## Contexto del Feature

Este bug se introdujo en el commit que agregó la funcionalidad de **visualización de documento firmado** después de firmar (2025-12-08).

### Cambios Relacionados
- ✅ [2025-12-08-visualizar-documento-firmado.md](docs/historial/2025-12-08-visualizar-documento-firmado.md) - Feature original
- ✅ Este fix - Corrección del bug de scope

### Cronología
1. **Implementación inicial**: Agregar `documentoFirmado` al return de `firmarDocumento()`
2. **Error introducido**: La variable estaba declarada en scope incorrecto
3. **Detección**: Error 500 al intentar firmar documentos
4. **Fix**: Mover declaración de variable al scope correcto

## Lecciones Aprendidas

### 1. Scope de Variables en Bloques Anidados

❌ **Mal**:
```typescript
if (condition1) {
  if (condition2) {
    let myVar = value; // Solo accesible dentro de este bloque
  }
}
return myVar; // ❌ ReferenceError
```

✅ **Bien**:
```typescript
let myVar = null; // Declarar en el scope más alto necesario

if (condition1) {
  if (condition2) {
    myVar = value; // Asignar valor
  }
}
return myVar; // ✅ Accesible
```

### 2. Testing de Nuevas Features

Este bug pasó desapercibido porque:
- La lógica parecía correcta
- TypeScript no detectó el error (variable en scope diferente)
- No se probó el flujo completo antes del commit

**Solución**: Probar siempre el flujo end-to-end después de cambios en la API.

### 3. Code Review Checklist

Al agregar variables en bloques condicionales:
- [ ] ¿La variable se usa fuera del bloque donde se declara?
- [ ] ¿Está declarada en el scope más alto necesario?
- [ ] ¿El valor inicial es adecuado (null, undefined, valor por defecto)?

## Archivos Modificados

- ✅ [lib/firma-digital/db-helpers.ts:392-398](lib/firma-digital/db-helpers.ts#L392-L398) - Declarar variable antes del if
- ✅ [lib/firma-digital/db-helpers.ts:544-545](lib/firma-digital/db-helpers.ts#L544-L545) - Eliminar declaración duplicada

## Referencias

- Error original: `ReferenceError: primerDocumentoFirmado is not defined`
- Feature relacionado: [Visualización de documento firmado](docs/historial/2025-12-08-visualizar-documento-firmado.md)
- JavaScript Scope: https://developer.mozilla.org/en-US/docs/Glossary/Scope
- TypeScript Variable Declarations: https://www.typescriptlang.org/docs/handbook/variable-declarations.html
