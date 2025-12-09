# Visualización de Documento Firmado Después de Firmar

**Fecha**: 2025-12-08
**Tipo**: Feature Enhancement
**Estado**: ✅ Completado

## Problema

Cuando un empleado firmaba un documento, solo se actualizaba el estado visual ("Firmado correctamente" badge), pero el empleado no podía ver el documento firmado con la firma aplicada. El PDF que se mostraba seguía siendo el original sin firmas.

## Causa Raíz

El flujo de firma tiene dos modos según `mantenerOriginal`:

1. **`mantenerOriginal=true` (default)**:
   - El documento ORIGINAL permanece intacto
   - Se crean documentos NUEVOS en las carpetas personales de cada empleado
   - El `pdfFirmadoS3Key` se guarda en `solicitudes_firma` cuando todas las firmas están completas

2. **`mantenerOriginal=false`**:
   - El documento original se REEMPLAZA con la versión firmada
   - Solo cuando TODAS las firmas están completas

En ambos casos, el PDF firmado con todas las firmas solo existe cuando `solicitudCompletada=true`. El problema era que:
- El empleado se quedaba viendo el documento original
- No había redirección automática al PDF firmado
- El PDF firmado existe en la solicitud, pero no se mostraba

## Solución Implementada

### 1. Modificar API para devolver información del documento firmado

**Archivo**: `lib/firma-digital/db-helpers.ts:735-744`

```typescript
return {
  firma: firmaActualizada,
  certificado,
  solicitudCompletada: estadoComplecion.completo,
  // NUEVO: Devolver información del documento firmado cuando todas las firmas están completas
  documentoFirmado: estadoComplecion.completo && primerDocumentoFirmado ? {
    id: primerDocumentoFirmado.id,
    nombre: primerDocumentoFirmado.nombre,
  } : undefined,
};
```

**Archivo**: `app/api/firma/solicitudes/[solicitudId]/firmar/route.ts:128-138`

```typescript
return NextResponse.json({
  success: true,
  firmado: true,
  solicitudCompletada: resultado.solicitudCompletada,
  certificado: resultado.certificado,
  documentoFirmado: resultado.documentoFirmado, // NUEVO
  solicitudId, // NUEVO
  mensaje: resultado.solicitudCompletada
    ? 'Documento firmado correctamente. Todas las firmas han sido completadas.'
    : 'Documento firmado correctamente.',
});
```

### 2. Actualizar Dialog para pasar información al callback

**Archivo**: `components/firma/firmar-documento-dialog.tsx:25-35`

```typescript
interface FirmarSolicitudResponse {
  success: boolean;
  mensaje?: string;
  error?: string;
  solicitudCompletada?: boolean; // NUEVO
  solicitudId?: string; // NUEVO
  documentoFirmado?: {  // NUEVO
    id: string;
    nombre: string;
  };
}
```

**Archivo**: `components/firma/firmar-documento-dialog.tsx:55`

```typescript
interface FirmarDocumentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  firma: FirmaPendiente | null;
  // NUEVO: callback recibe datos de la respuesta
  onSigned?: (data?: {
    solicitudCompletada?: boolean;
    solicitudId?: string;
    documentoFirmado?: { id: string; nombre: string }
  }) => void;
}
```

**Archivo**: `components/firma/firmar-documento-dialog.tsx:157-162`

```typescript
toast.success(data.mensaje || 'Documento firmado correctamente');
onSigned?.({
  solicitudCompletada: data.solicitudCompletada,
  solicitudId: data.solicitudId,
  documentoFirmado: data.documentoFirmado,
});
onOpenChange(false);
```

### 3. Actualizar Cliente para redirigir a vista de solicitud completada

**Archivo**: `app/firma/firmar/[firmaId]/firmar-documento-client.tsx:265-284`

```typescript
const handleFirmado = (data?: {
  solicitudCompletada?: boolean;
  solicitudId?: string;
  documentoFirmado?: { id: string; nombre: string }
}) => {
  setDialogOpen(false);
  setDocumentoFirmado(true);

  // Mostrar mensaje de éxito
  toast.success('¡Documento firmado correctamente!', {
    description: 'El documento se ha actualizado con tu firma',
    duration: 3000,
  });

  // Si la solicitud está completada, redirigir a la página de solicitud
  // donde podrán ver el PDF con todas las firmas aplicadas
  if (data?.solicitudCompletada && data?.solicitudId) {
    router.push(`/firma/solicitud/${data.solicitudId}`);
  }
};
```

### 4. Página de solicitud ya configurada

La página `/firma/solicitud/[solicitudId]` ya estaba configurada para mostrar el PDF firmado correctamente usando el endpoint `/api/firma/solicitudes/[solicitudId]/documento-firmado`.

**Archivo**: `app/firma/solicitud/[solicitudId]/ver-solicitud-client.tsx:73-82`

```typescript
const documentoFirmadoUrl = useMemo(
  () => solicitud?.pdfFirmadoS3Key ? `/api/firma/solicitudes/${solicitudId}/documento-firmado` : null,
  [solicitud, solicitudId]
);

// URL del documento original (para mostrar mientras está en proceso)
const documentoOriginalUrl = useMemo(
  () => solicitud ? `/api/documentos/${solicitud.documentos.id}/preview` : null,
  [solicitud]
);
```

El iframe muestra:
- **Documento firmado**: Cuando `pdfFirmadoS3Key` existe (todas las firmas completadas)
- **Documento original**: Mientras está en proceso

## Flujo Completo

### Caso 1: Última firma (todas completas)

1. Empleado firma documento
2. API devuelve `solicitudCompletada=true`, `solicitudId`, y `documentoFirmado`
3. Dialog llama a `onSigned` con estos datos
4. Cliente detecta `solicitudCompletada=true`
5. **Redirige** a `/firma/solicitud/[solicitudId]`
6. Página carga el PDF firmado desde `/api/firma/solicitudes/[solicitudId]/documento-firmado`
7. Empleado ve el documento con TODAS las firmas aplicadas

### Caso 2: Firma intermedia (aún faltan firmas)

1. Empleado firma documento
2. API devuelve `solicitudCompletada=false`
3. Dialog llama a `onSigned` con datos
4. Cliente NO redirige (se queda en la misma página)
5. Muestra toast de éxito
6. Empleado puede cerrar la página o seguir navegando

## Endpoints Relacionados

### GET `/api/firma/solicitudes/[solicitudId]/documento-firmado`

**Propósito**: Servir el PDF firmado con todas las firmas aplicadas

**Query params**:
- `inline=1`: Mostrar inline en iframe (para preview)
- Sin params: Descargar como attachment

**Permisos**:
- HR admins
- Empleados firmantes de la solicitud

**Validaciones**:
- Verifica que `pdfFirmadoS3Key` existe (todas las firmas completadas)
- Verifica permisos del usuario
- Verifica empresa

**Response**:
- Content-Type: `application/pdf`
- Content-Disposition: `inline` o `attachment`
- Headers de cache: `private, max-age=3600`

### GET `/api/firma/solicitudes/[solicitudId]/pdf-firmado`

Endpoint similar pero con nombre legacy. Ambos funcionan, pero se recomienda usar `/documento-firmado` para consistencia.

## Configuración `mantenerOriginal`

El comportamiento es **independiente** de `mantenerOriginal`:

| Configuración | Documento Original | Documento Firmado | Empleado ve |
|--------------|-------------------|-------------------|-------------|
| `mantenerOriginal=true` (default) | Permanece intacto | Nuevo documento en carpeta personal | PDF firmado desde solicitud |
| `mantenerOriginal=false` | Se reemplaza con versión firmada | Original reemplazado | PDF firmado desde solicitud |

En **ambos casos**, el empleado ve el PDF firmado desde la solicitud cuando `solicitudCompletada=true`.

## Beneficios

1. ✅ Empleado ve inmediatamente el documento firmado
2. ✅ Experiencia fluida sin necesidad de buscar el documento manualmente
3. ✅ Funciona independientemente de `mantenerOriginal`
4. ✅ Compatibilidad con firma secuencial y paralela
5. ✅ Vista unificada del estado de todas las firmas
6. ✅ Descarga disponible del PDF firmado

## Testing

Para probar:

1. **Firma simple (1 firmante)**:
   - Solicitar firma de documento
   - Firmar documento
   - ✅ Debería redirigir a `/firma/solicitud/[id]`
   - ✅ Debería mostrar PDF con firma aplicada

2. **Firma múltiple (3 firmantes)**:
   - Solicitar firma de documento con 3 firmantes
   - Firmar con empleado 1
   - ❌ NO debería redirigir (aún faltan firmas)
   - Firmar con empleado 2
   - ❌ NO debería redirigir (aún falta 1 firma)
   - Firmar con empleado 3
   - ✅ Debería redirigir a `/firma/solicitud/[id]`
   - ✅ Debería mostrar PDF con las 3 firmas aplicadas

3. **Verificar mantenerOriginal=false**:
   - Cambiar configuración a `mantenerOriginal=false`
   - Solicitar firma
   - Firmar documento
   - ✅ Original debería estar reemplazado
   - ✅ Empleado ve PDF firmado desde solicitud

## Archivos Modificados

- `lib/firma-digital/db-helpers.ts` - Devolver `documentoFirmado` en resultado
- `app/api/firma/solicitudes/[solicitudId]/firmar/route.ts` - Pasar datos en response
- `components/firma/firmar-documento-dialog.tsx` - Recibir y pasar datos en callback
- `app/firma/firmar/[firmaId]/firmar-documento-client.tsx` - Redirigir cuando completada
- `app/api/cron/revisar-solicitudes/route.ts` - Fix TypeScript error (no relacionado)
- `app/api/fichajes/eventos-corregidos/route.ts` - Fix TypeScript errors (no relacionados)

## Archivos Verificados (sin cambios necesarios)

- `app/firma/solicitud/[solicitudId]/ver-solicitud-client.tsx` - Ya configurado correctamente
- `app/api/firma/solicitudes/[solicitudId]/documento-firmado/route.ts` - Ya existía y funciona

## Notas Técnicas

- El `pdfFirmadoS3Key` se genera en `lib/firma-digital/db-helpers.ts` cuando `estadoComplecion.completo === true`
- El PDF firmado incluye marcas visuales de todas las firmas
- La página de solicitud maneja automáticamente el caso de "en proceso" vs "completada"
- No se requieren cambios en el schema de base de datos
