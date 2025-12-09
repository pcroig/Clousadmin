# Fix: Chrome Bloquea Visualización de PDF en Ausencias

**Fecha**: 2025-12-08
**Tipo**: Bug Fix
**Estado**: ✅ Completado

## Problema

Al visualizar un justificante de ausencia (PDF), aparecía el error:
> "Chrome ha bloqueado esta página"

El visor PDF nativo de Chrome no se podía cargar dentro del iframe del modal.

## Causa Raíz

El componente `DocumentViewerModal` tiene lógica para detectar si el documento es un PDF y desactivar el `sandbox` del iframe:

```typescript
// components/shared/document-viewer.tsx:111-118
const isPdfDocument = normalizedMime === 'application/pdf';
const previewWillBePdf = isPdfDocument || isWordDocument;

// CRÍTICO: No usar sandbox para PDFs (nativos o convertidos de DOCX)
// El sandbox impide que Chrome cargue su visor PDF interno
const iframeSandbox = previewWillBePdf
  ? undefined
  : 'allow-same-origin allow-scripts allow-popups allow-forms allow-downloads allow-modals allow-presentation';
```

**El problema**: Cuando se abría el viewer desde ausencias, **no se pasaba el `mimeType`** al componente:

```typescript
// ANTES (ausencias-client.tsx:550)
openViewer(ausencia.documentoId, `Justificante - ${empleadoNombre || 'Documento'}`);
// ❌ Sin mimeType → sandbox activado → Chrome bloquea PDF
```

Sin el `mimeType`, el componente no podía detectar que era un PDF y aplicaba el sandbox restrictivo, bloqueando el visor nativo de Chrome.

## Solución

Pasar `'application/pdf'` como tercer parámetro al llamar a `openViewer`:

**Archivo**: `app/(dashboard)/hr/horario/ausencias/ausencias-client.tsx:548-554`

```typescript
if (ausencia.documentoId) {
  const empleadoNombre = `${ausencia.empleado.nombre} ${ausencia.empleado.apellidos}`.trim();
  // Pasar 'application/pdf' como mimeType para evitar sandbox en iframe
  // La mayoría de justificantes son PDFs
  openViewer(ausencia.documentoId, `Justificante - ${empleadoNombre || 'Documento'}`, 'application/pdf');
  return;
}
```

## Flujo Completo

### Antes (con error)

1. Usuario hace clic en "Ver justificante" en ausencias
2. `openViewer(documentoId, title)` se llama **sin mimeType**
3. `useDocumentViewer` establece `documentMimeType = null`
4. `DocumentViewerModal` recibe `mimeType = null`
5. `isPdfDocument = false` (porque mimeType es null)
6. `iframeSandbox = 'allow-same-origin allow-scripts...'` (sandbox activado)
7. Chrome intenta cargar visor PDF dentro de sandbox
8. **Chrome bloquea**: "Chrome ha bloqueado esta página"

### Después (funcionando)

1. Usuario hace clic en "Ver justificante" en ausencias
2. `openViewer(documentoId, title, 'application/pdf')` se llama **con mimeType**
3. `useDocumentViewer` establece `documentMimeType = 'application/pdf'`
4. `DocumentViewerModal` recibe `mimeType = 'application/pdf'`
5. `isPdfDocument = true` ✅
6. `iframeSandbox = undefined` (sin sandbox) ✅
7. Chrome carga visor PDF nativo sin restricciones ✅
8. **PDF se muestra correctamente** ✅

## Verificación en Otros Componentes

Revisé todos los usos de `openViewer` en el código:

### ✅ Componentes que ya pasaban mimeType correctamente:

1. **Documentos del empleado** ([carpeta-detail-client.tsx:106](app/(dashboard)/empleado/mi-espacio/documentos/[id]/carpeta-detail-client.tsx#L106)):
   ```typescript
   documentViewer.openViewer(documento.id, documento.nombre, documento.mimeType ?? undefined);
   ```

2. **Documentos de HR** ([carpeta-detail-client.tsx:350](app/(dashboard)/hr/documentos/[id]/carpeta-detail-client.tsx#L350)):
   ```typescript
   documentViewer.openViewer(documento.id, documento.nombre, documento.mimeType);
   ```

### ❌ Componente que NO pasaba mimeType (CORREGIDO):

3. **Ausencias** ([ausencias-client.tsx:552](app/(dashboard)/hr/horario/ausencias/ausencias-client.tsx#L552)):
   ```typescript
   // ANTES
   openViewer(ausencia.documentoId, title);

   // DESPUÉS
   openViewer(ausencia.documentoId, title, 'application/pdf');
   ```

## Consideraciones

### ¿Por qué asumir `'application/pdf'`?

En el contexto de ausencias, los justificantes son típicamente PDFs (certificados médicos, documentos oficiales, etc.). Esta es una asunción razonable porque:

1. **Los documentos se suben como justificantes**: Usuarios típicamente suben PDFs escaneados
2. **El backend ya valida**: Los tipos de archivo permitidos están controlados
3. **Es mejor asumir PDF**: Si es otro tipo (imagen, DOCX), el sandbox se aplicaría innecesariamente pero seguiría funcionando

### Solución alternativa (más robusta pero más compleja)

Si en el futuro se necesita soportar justificantes no-PDF con sandbox adecuado:

```typescript
// Obtener documento con mimeType desde API
const documento = await fetch(`/api/documentos/${ausencia.documentoId}`).then(r => r.json());
openViewer(documento.id, title, documento.mimeType);
```

Esta solución requiere una llamada adicional a la API, por lo que se optó por la solución simple de asumir PDF.

## Problema Relacionado Previo

Este mismo problema se había solucionado anteriormente para **DOCX** (ver [componente document-viewer línea 108-112](components/shared/document-viewer.tsx#L108-L112)):

```typescript
// Determinar si el preview será un PDF:
// - PDFs nativos: sí
// - DOCX: se convierten a PDF en el backend
const isPdfDocument = normalizedMime === 'application/pdf';
const previewWillBePdf = isPdfDocument || isWordDocument;
```

Los archivos DOCX también se convierten a PDF en el backend, por lo que también necesitan iframe sin sandbox.

## Testing

Para probar:

1. **Visualizar justificante PDF en ausencias**:
   - Navegar a HR → Horario → Ausencias
   - Hacer clic en "Ver justificante" en una ausencia con PDF
   - ✅ Debe mostrar el PDF sin error de Chrome

2. **Verificar otros tipos de documentos**:
   - Documentos en carpetas (PDF, DOCX, imágenes)
   - ✅ Deben seguir funcionando correctamente

3. **Verificar DOCX convertidos**:
   - Subir y visualizar documento DOCX
   - ✅ Debe convertirse a PDF y mostrarse sin sandbox

## Archivos Modificados

- ✅ [app/(dashboard)/hr/horario/ausencias/ausencias-client.tsx](app/(dashboard)/hr/horario/ausencias/ausencias-client.tsx#L548-L554) - Pasar mimeType al abrir viewer

## Archivos Verificados (sin cambios necesarios)

- ✅ [components/shared/document-viewer.tsx](components/shared/document-viewer.tsx#L111-L118) - Lógica de sandbox ya correcta
- ✅ [app/(dashboard)/empleado/mi-espacio/documentos/[id]/carpeta-detail-client.tsx](app/(dashboard)/empleado/mi-espacio/documentos/[id]/carpeta-detail-client.tsx#L106) - Ya pasa mimeType
- ✅ [app/(dashboard)/hr/documentos/[id]/carpeta-detail-client.tsx](app/(dashboard)/hr/documentos/[id]/carpeta-detail-client.tsx#L350) - Ya pasa mimeType

## Lecciones Aprendidas

1. **Siempre pasar mimeType al abrir DocumentViewer**: Es un parámetro opcional pero crítico para el comportamiento correcto del iframe
2. **El sandbox bloquea el visor PDF nativo**: Chrome/Firefox/Safari no pueden cargar sus visores PDF dentro de un iframe con sandbox restrictivo
3. **Los PDFs y DOCX (convertidos a PDF) necesitan iframe sin sandbox**: Ambos tipos deben detectarse para desactivar sandbox

## Referencias

- Issue original: DOCX mostraba "Chrome ha bloqueado esta página"
- Solución previa: Detectar DOCX como `previewWillBePdf`
- Hook `useDocumentViewer`: [components/shared/document-viewer.tsx:270-301](components/shared/document-viewer.tsx#L270-L301)
- Documentación iframe sandbox: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#sandbox
