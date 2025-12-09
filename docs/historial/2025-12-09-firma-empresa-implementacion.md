# Implementación de Firma de Empresa

**Fecha**: 2025-12-09
**Tipo**: Feature
**Módulos afectados**: Firma Digital
**Estado**: ✅ Completado

---

## Resumen

Implementación completa de la funcionalidad de firma de empresa, que permite a las empresas añadir automáticamente su firma corporativa a los documentos antes de enviarlos a los empleados para firma.

---

## Cambios Implementados

### 1. Base de Datos

#### Migración: `20251209040000_add_posiciones_firma_empresa`

```sql
ALTER TABLE "solicitudes_firma" ADD COLUMN "posicionesFirmaEmpresa" JSONB;
ALTER TABLE "solicitudes_firma" ADD COLUMN "firmaEmpresaS3Key" TEXT;
```

**Campos añadidos**:
- `posicionesFirmaEmpresa`: Array de posiciones donde se coloca la firma de empresa en el PDF
- `firmaEmpresaS3Key`: S3 key de la imagen de firma de empresa usada en esta solicitud específica

### 2. Backend - Core Logic

#### Archivo: `lib/firma-digital/db-helpers.ts`

**Cambios críticos**:

1. **Aplicación de firma empresa al crear solicitud** (líneas 177-243):
   - La firma de empresa se aplica al PDF ANTES de enviarlo a los empleados
   - El sistema descarga la firma empresa desde S3
   - Aplica las marcas de firma en las posiciones especificadas
   - Guarda el PDF modificado en S3 como `pdfTemporalS3Key`
   - **CRÍTICO**: Recalcula el hash del documento CON la firma empresa aplicada

2. **Eliminación de lógica antigua** (línea 519-521):
   - Se eliminó la lógica que añadía la firma empresa DESPUÉS de que todos los empleados firmaran
   - Ahora la firma empresa está en el documento base desde el inicio

### 3. Backend - API Endpoints

#### Nuevo: `app/api/firma/solicitudes/[solicitudId]/preview/route.ts`

Endpoint dedicado para servir el PDF de firma con la firma empresa ya aplicada.

**Por qué es necesario**:
- El endpoint estándar `/api/documentos/[id]/preview` sirve el documento original
- Este endpoint específico sirve el `pdfTemporalS3Key` que contiene la firma empresa

#### Nuevo: `app/api/firma/solicitudes/[solicitudId]/pdf-metadata/route.ts`

Endpoint para obtener metadatos del PDF con firma empresa.

**Por qué es necesario**:
- Necesario para calcular correctamente las posiciones de firma en el cliente
- Debe analizar el PDF CON firma empresa para obtener dimensiones correctas

---

## Flujo Completo del Sistema

### Creación de Solicitud con Firma Empresa

1. HR abre dialog de solicitar firma
2. HR activa toggle "Añadir firma de empresa"
3. Sistema muestra/carga firma de empresa guardada (canvas o imagen)
4. HR dibuja firma nueva (opcional, si no hay guardada o quiere cambiarla)
5. HR hace clic en botón "Firma Empresa" (se activa modo purple)
6. HR hace clic en el PDF para colocar posiciones de firma empresa
7. HR selecciona empleados firmantes y sus posiciones (modo blue)
8. HR envía solicitud

### Backend - Procesamiento

1. Guardar firma empresa en S3 (solicitud específica + opcional predeterminada)
2. Crear registro de solicitud en DB con hash del documento original
3. Descargar firma empresa desde S3
4. Aplicar firma empresa al PDF usando pdf-lib
5. Guardar PDF con firma empresa en S3 como `pdfTemporalS3Key`
6. **CRÍTICO**: Recalcular hash del PDF con firma empresa
7. Actualizar solicitud con nuevo hash y `pdfTemporalS3Key`
8. Crear registros de firma para cada empleado

### Empleado - Vista y Firma

1. Empleado recibe notificación (futuro)
2. Empleado abre link de firma `/firma/firmar/[firmaId]`
3. Cliente carga datos desde `/api/firma/pendientes?firmaId=...`
4. Cliente solicita PDF desde `/api/firma/solicitudes/[solicitudId]/preview`
   - Backend retorna `pdfTemporalS3Key` (PDF con firma empresa)
5. Cliente solicita metadata desde `/api/firma/solicitudes/[solicitudId]/pdf-metadata`
6. **Empleado ve PDF con firma de empresa YA VISIBLE**
7. Empleado hace clic en "Firmar"
8. Empleado dibuja su firma
9. Sistema valida hash del PDF con firma empresa ✅ (coincide)
10. Sistema guarda firma del empleado
11. Documento firmado generado con firma empresa + firmas empleados

---

## Problemas Resueltos

### ❌ Problema 1: Error de validación de hash

**Error**: `"El documento ha sido modificado desde que se solicitó la firma"`

**Causa**: El hash se calculaba del documento original, pero luego se validaba contra el PDF con firma empresa.

**Solución**:
- Recalcular hash DESPUÉS de aplicar firma empresa
- Actualizar solicitud con nuevo hash
- Ahora la validación compara PDF con firma vs hash con firma ✅

### ❌ Problema 2: Firma empresa invisible para empleado

**Causa**: El empleado veía el documento original desde `documentos.s3Key` en lugar del PDF con firma empresa desde `pdfTemporalS3Key`.

**Solución**:
- Creados endpoints específicos `/api/firma/solicitudes/[id]/preview` y `/pdf-metadata`
- Cliente actualizado para usar estos endpoints
- Ahora el empleado ve el PDF correcto con firma empresa ✅

### ❌ Problema 3: Error de compilación

**Error**: `Module not found: @/lib/documentos/conversion`

**Causa**: Import incorrecto - el archivo se llama `convertir-word.ts`, not `conversion.ts`

**Solución**: Corregidos imports en todos los archivos nuevos ✅

---

## Archivos Modificados

### Backend
- ✅ `lib/firma-digital/db-helpers.ts` - Lógica core de firma empresa
- ✅ `app/api/firma/solicitudes/route.ts` - Procesamiento de datos
- ✅ `app/api/firma/solicitudes/[solicitudId]/preview/route.ts` - NUEVO
- ✅ `app/api/firma/solicitudes/[solicitudId]/pdf-metadata/route.ts` - NUEVO

### Frontend
- ✅ `app/firma/solicitar/[documentoId]/solicitar-firma-client.tsx` - UI solicitud
- ✅ `app/firma/firmar/[firmaId]/firmar-documento-client.tsx` - UI empleado
- ✅ `components/shared/pdf-canvas-viewer.tsx` - Color púrpura

### Base de Datos
- ✅ `prisma/schema.prisma` - Campos nuevos
- ✅ `prisma/migrations/20251209040000_add_posiciones_firma_empresa/` - Migración

### Tipos
- ✅ `lib/firma-digital/tipos.ts` - Interfaces actualizadas

---

## Notas Importantes

### ⚠️ Solicitudes Antiguas

Las solicitudes de firma creadas ANTES de este cambio (antes del 2025-12-09) tienen el hash del documento original y NO funcionarán con firma de empresa.

**Solución**: Crear nuevas solicitudes de firma.

### 🔒 Seguridad

- La firma de empresa se guarda en S3 de forma segura
- El hash del documento garantiza integridad
- Solo HR admin puede crear solicitudes con firma empresa

### 📊 Performance

- PDF con firma empresa se genera UNA VEZ al crear solicitud
- No se regenera en cada firma de empleado
- Cache de PDF en S3 mejora performance

---

**Completado por**: Sofia Roig (con asistencia de Claude AI)
**Revisado**: 2025-12-09
**Estado**: ✅ Producción
