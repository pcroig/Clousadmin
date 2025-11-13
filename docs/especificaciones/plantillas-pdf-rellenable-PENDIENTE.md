# 📄 Plantillas PDF Rellenables - Estado Pendiente

**Estado**: ⏸️ Desactivado (Fase Futura)  
**Fecha**: 13 de Enero 2025  
**Razón**: Priorización de flujo DOCX con variables  

---

## 🎯 Resumen

El módulo de **plantillas PDF rellenables** está parcialmente implementado pero **desactivado en producción** para enfocarnos en el flujo de plantillas DOCX con variables, que es más simple y cubre la mayoría de casos de uso.

El código existe y está documentado aquí para retomarlo cuando sea necesario.

---

## ✅ Lo que SÍ está implementado

### 1. Extracción de campos nativos
- **Archivo**: `lib/plantillas/pdf-rellenable.ts`
- **Función**: `extraerCamposPDF(s3Key: string): Promise<string[]>`
- **Qué hace**: Extrae campos de formulario nativos de un PDF usando `pdf-lib`
- **Estado**: ✅ Funcional

### 2. Relleno de PDF con pdf-lib
- **Archivo**: `lib/plantillas/pdf-rellenable.ts`
- **Función**: `rellenarPDFFormulario(pdfBuffer: Buffer, valores: Record<string, string>): Promise<Buffer>`
- **Qué hace**: Rellena campos de formulario PDF con valores
- **Estado**: ✅ Funcional
- **Soporta**: Text fields, checkboxes, dropdowns

### 3. Mapeo IA de campos
- **Archivo**: `lib/plantillas/pdf-rellenable.ts`
- **Función**: `mapearCamposPDFConIA(camposPDF: string[], variablesDisponibles: string[]): Promise<Record<string, string>>`
- **Qué hace**: Mapea campos del PDF a variables del sistema usando GPT-4o-mini
- **Estado**: ✅ Funcional
- **Ejemplo**: `"employee_name"` → `"empleado_nombre"`

### 4. Escaneo con IA Vision (opcional)
- **Archivo**: `lib/plantillas/pdf-rellenable.ts`
- **Función**: `escanearPDFConVision(s3Key: string): Promise<Array<{...}>>`
- **Qué hace**: Detecta campos visuales en PDFs sin form fields nativos usando GPT-4 Vision
- **Estado**: ⚠️ Parcial (sin coordenadas)
- **Limitación**: Solo detecta nombres de campos, no sus posiciones exactas

### 5. API de escaneo
- **Archivo**: `app/api/plantillas/[id]/escanear-campos/route.ts`
- **Endpoint**: `POST /api/plantillas/[id]/escanear-campos`
- **Qué hace**: Combina extracción nativa + Vision y guarda en `configuracionIA`
- **Estado**: ✅ Funcional

### 6. Generación completa desde PDF
- **Archivo**: `lib/plantillas/pdf-rellenable.ts`
- **Función**: `generarDocumentoDesdePDFRellenable(...)`
- **Qué hace**: Flujo completo: extrae campos → mapea → resuelve → rellena → sube
- **Estado**: ✅ Funcional (para PDFs con campos nativos)

### 7. UI de mapeo de campos
- **Archivo**: `components/hr/plantilla-mapear-campos-modal.tsx`
- **Qué hace**: Modal para que HR mapee campos PDF a variables del sistema
- **Estado**: ✅ Funcional

---

## ❌ Lo que falta para hacerlo productivo

### 1. Persistencia de mapeos
- **Problema**: El mapeo IA se recalcula cada vez
- **Solución**: Guardar mapeos en `PlantillaDocumento.configuracionIA` y cachearlos
- **Tiempo estimado**: 1-2 días

### 2. UI de gestión de campos
- **Problema**: No hay UI para ver/editar campos detectados
- **Solución**: Vista de tabla con campos nativos vs IA, permite reetiquetar
- **Tiempo estimado**: 1-2 días

### 3. Validación robusta
- **Problema**: Manejo de errores básico
- **Solución**: Validaciones de PDFs sin campos, tipos incompatibles, etc.
- **Tiempo estimado**: 1 día

### 4. Integración con flujos masivos
- **Problema**: Generación masiva no está bien probada con PDFs
- **Solución**: Tests + manejo de errores específicos
- **Tiempo estimado**: 1 día

### 5. Coordenadas para campos visuales (opcional)
- **Problema**: Vision solo detecta nombres, no posiciones
- **Solución**: Convertir PDF a imagen + pedir coordenadas a Vision + crear campos con pdf-lib
- **Tiempo estimado**: 3-4 días
- **Nota**: Solo necesario para PDFs sin campos nativos

---

## 🔧 Cambios realizados para desactivar

### 1. UI - Solo acepta DOCX
```tsx
// components/hr/plantillas-tab.tsx
<Input type="file" accept=".docx" /> // antes: ".docx,.pdf"
```

### 2. API - Rechaza PDFs
```typescript
// app/api/plantillas/route.ts
if (extension !== 'docx') {
  return NextResponse.json({ 
    error: 'Solo se permiten archivos DOCX con variables. El soporte para PDFs rellenables llegará en una fase posterior.'
  }, { status: 400 });
}
```

### 3. Queue - Bloquea generación PDF
```typescript
// lib/plantillas/queue.ts
if (plantilla.formato === 'pdf_rellenable') {
  throw new Error('La generación desde PDFs rellenables está desactivada. Solo se soportan plantillas DOCX con variables.');
}
```

---

## 📋 Plan de reactivación (cuando sea necesario)

### Fase 1: Reactivación básica (3-4 días)
1. Remover validaciones que bloquean PDFs
2. Implementar persistencia de mapeos
3. Testing con PDFs con campos nativos
4. Documentación de usuario

### Fase 2: UI mejorada (2-3 días)
1. Vista de gestión de campos detectados
2. Editor de mapeos campo ↔ variable
3. Previsualización de campos en PDF

### Fase 3: Soporte completo (opcional, 3-4 días)
1. Coordenadas con Vision para PDFs sin campos nativos
2. Creación dinámica de campos con pdf-lib
3. Testing con diferentes tipos de PDF

---

## 📚 Archivos relacionados

### Código principal
- `lib/plantillas/pdf-rellenable.ts` - Lógica completa PDF
- `lib/plantillas/index.ts` - Exports (mantener)
- `components/hr/plantilla-mapear-campos-modal.tsx` - UI mapeo
- `app/api/plantillas/[id]/escanear-campos/route.ts` - API escaneo

### Schema
```prisma
PlantillaDocumento {
  formato String // 'docx' | 'pdf_rellenable'
  configuracionIA Json? // Aquí se guardan campos detectados
  usarIAParaExtraer Boolean // Flag para Vision
}
```

### Dependencias
- `pdf-lib` - Manipulación PDF
- `openai` (GPT-4 Vision) - Detección campos

---

## 💰 Costos estimados (cuando se reactive)

| Operación | Costo por documento |
|-----------|-------------------|
| Extracción campos nativos | $0 |
| Mapeo IA (una vez por plantilla) | $0.0001 |
| Vision (si no hay campos nativos) | $0.01-0.02 |
| Generación PDF rellenado | $0.0002 |

**Total**: $0.0002 - $0.02 dependiendo de si usa Vision

---

## ⚠️ Notas importantes

1. **No borrar código**: Todo el código PDF está en `lib/plantillas/pdf-rellenable.ts` y debe mantenerse
2. **Schema intacto**: El campo `formato: 'pdf_rellenable'` sigue existiendo en Prisma
3. **Exports mantener**: Las exports en `lib/plantillas/index.ts` deben quedarse
4. **Migraciones**: No hay cambios de schema necesarios para reactivar

---

## 🎯 Casos de uso futuros

Cuando se reactive, este módulo permitirá:

1. **Modelo 145 (AEAT)**: PDF oficial con campos nativos
2. **Formularios oficiales**: Documentos del gobierno con campos
3. **Documentos interactivos**: Empleado puede completar campos adicionales
4. **PDFs escaneados**: Detección con Vision de campos visuales

---

**Última actualización**: 13 de Enero 2025  
**Responsable**: Sistema  
**Próxima revisión**: Al priorizar Fase 2 de plantillas

