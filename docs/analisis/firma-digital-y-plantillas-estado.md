# 📊 Análisis Completo: Estado de Firma Digital y Plantillas de Documentos

**Fecha de análisis**: 27 de Enero 2025  
**Proyecto**: Clousadmin  
**Versión**: 1.0.0

---

## 📋 Resumen Ejecutivo

### Estado General

| Funcionalidad | Estado Backend | Estado Frontend | Estado Integración | Completitud |
|--------------|----------------|-----------------|-------------------|-------------|
| **Plantillas de Documentos** | ✅ 90% | ✅ 70% | ✅ 80% | **~80%** |
| **Firma Digital** | ⚠️ 40% | ❌ 0% | ⚠️ 30% | **~25%** |

---

## 🎯 PLANTILLAS DE DOCUMENTOS

### ✅ Lo que ESTÁ IMPLEMENTADO

#### 1. **Modelos de Base de Datos** (100% Completo)

**Archivo**: `prisma/schema.prisma`

- ✅ **`PlantillaDocumento`**: Modelo completo con todos los campos necesarios
  - Metadata (nombre, descripción, categoría)
  - Tipo (oficial/personalizada)
  - Formato (docx/pdf_rellenable)
  - Almacenamiento S3 (s3Key, s3Bucket)
  - Variables usadas (JSON)
  - Configuración (requiereContrato, requiereFirma, carpetaDestinoDefault)
  - Configuración IA (usarIAParaExtraer, configuracionIA)

- ✅ **`DocumentoGenerado`**: Tracking completo de documentos generados
  - Vinculación con plantilla, empleado, documento
  - Metadata de generación (quién, cuándo, variables usadas)
  - Tracking de entrega (notificado, visto, vistoEn)
  - **Integración con firma digital** (requiereFirma, firmado, firmadoEn)

- ✅ **`JobGeneracionDocumentos`**: Sistema de colas para generación masiva
  - Tracking de progreso (0-100%)
  - Estados (en_cola, procesando, completado, fallido)
  - Resultados por empleado
  - Manejo de errores

- ✅ **`VariableMapping`**: Cache de mappings de variables resueltos por IA
  - Optimización para evitar llamadas repetidas
  - Tracking de confianza y uso

#### 2. **Backend - Generación de Documentos** (90% Completo)

**Archivos principales**:
- `lib/plantillas/generar-documento.ts` ✅
- `lib/plantillas/ia-resolver.ts` ✅
- `lib/plantillas/queue.ts` ✅
- `lib/plantillas/pdf-rellenable.ts` ✅
- `lib/plantillas/sanitizar.ts` ✅

**Funcionalidades implementadas**:

✅ **Extracción de variables de plantillas DOCX**
- Lee `word/document.xml` y headers/footers
- Detecta variables con formato `{{variable_nombre}}`
- Función: `extraerVariablesDePlantilla()`

✅ **Resolución de variables con IA**
- Sistema inteligente que mapea variables a datos de BD
- Soporte para datos encriptados
- Formateo automático (fechas, monedas, números)
- Cache de mappings para optimización
- Función: `resolverVariables()`

✅ **Generación de documentos DOCX**
- Usa `docxtemplater` para sustituir variables
- Genera nombres de documentos dinámicos con variables
- Sube documentos a S3 automáticamente
- Crea carpetas si no existen
- Registra en BD (Documento + DocumentoGenerado)
- Función: `generarDocumentoDesdePlantilla()`

✅ **Generación masiva con cola de trabajos**
- Sistema asíncrono con tracking de progreso
- Soporte para hasta 500 empleados por job
- Manejo de errores individuales por empleado
- Función: `agregarJobGeneracion()`

✅ **Soporte para PDFs rellenables** (Fase 2)
- Extracción de campos de formularios PDF
- Generación desde PDFs con variables
- Función: `generarDocumentoDesdePDFRellenable()`

✅ **Integración con sistema de firma digital**
- Si `requiereFirma = true`, crea automáticamente `SolicitudFirma`
- Crea registro `Firma` para el empleado
- Envía notificación al empleado
- Líneas 314-349 en `generar-documento.ts`

#### 3. **APIs REST** (85% Completo)

**Archivos**:
- `app/api/plantillas/route.ts` ✅
- `app/api/plantillas/[id]/route.ts` ✅
- `app/api/plantillas/[id]/generar/route.ts` ✅
- `app/api/plantillas/jobs/[id]/route.ts` ✅
- `app/api/plantillas/variables/route.ts` ✅

**Endpoints implementados**:

✅ **GET `/api/plantillas`**
- Lista plantillas (oficiales + personalizadas de empresa)
- Filtros: categoria, tipo, activa
- Incluye conteo de documentos generados

✅ **POST `/api/plantillas`**
- Subir plantilla personalizada (DOCX o PDF)
- Extracción automática de variables
- Validaciones de tipo de archivo
- Solo HR Admin

✅ **GET `/api/plantillas/[id]`**
- Obtener detalles de una plantilla
- Incluye variables usadas

✅ **DELETE `/api/plantillas/[id]`**
- Eliminar plantilla personalizada
- Solo HR Admin

✅ **POST `/api/plantillas/[id]/generar`**
- Generar documentos para múltiples empleados
- Crea job en cola asíncrona
- Configuración: nombreDocumento, carpetaDestino, notificarEmpleado, requiereFirma
- Validaciones de permisos y empleados

✅ **GET `/api/plantillas/jobs/[id]`**
- Obtener estado de job de generación
- Progreso, resultados, errores

✅ **GET `/api/plantillas/variables`**
- Lista todas las variables disponibles del sistema
- Documentación de variables

#### 4. **Frontend - UI de Gestión** (70% Completo)

**Archivo**: `components/hr/plantillas-tab.tsx`

✅ **Gestión de plantillas**
- Lista de plantillas (oficiales + personalizadas)
- Subir nueva plantilla (formulario completo)
- Eliminar plantillas personalizadas
- Visualización de metadata (variables, formato, categoría)
- Badges de estado (oficial, inactiva, formato)
- Indicador de "Requiere firma digital"

✅ **UI funcional**
- Formulario de subida con validaciones
- Estados de carga y error
- Mensajes de éxito/error
- Empty states

#### 5. **Integraciones** (80% Completo)

✅ **Integración con sistema de documentos**
- Documentos generados se guardan en carpetas del empleado
- Vinculación con modelo `Documento` existente
- Permisos y estructura de carpetas respetados

✅ **Integración con onboarding**
- Plantillas disponibles en configuración de onboarding
- Campo `plantillasDocumentos` en `OnboardingConfig`
- Función: `actualizarPlantillasDocumentos()` en `lib/onboarding-config.ts`

✅ **Integración con sistema de notificaciones**
- Notificaciones automáticas al empleado cuando se genera documento
- Notificaciones de firma pendiente si requiereFirma = true

#### 6. **Colas y Redis – Estado Actual (DOCX → PDF + Jobs)** (Actualizado)

**Archivo**: `lib/plantillas/queue.ts`

- Backend usa **BullMQ** + Redis para la cola `documentos-generacion`.
- Configuración de conexión centralizada (`connection`) con:
  - `enableOfflineQueue: false` → si Redis no está disponible no se acumulan comandos.
  - `retryStrategy` limitada (máx. 5 intentos).
- Se monitoriza la disponibilidad de Redis vía `cache.isAvailable()`:
  - `checkRedisAvailability()` cachea el resultado en memoria (`availabilityChecked`, `redisAvailable`).
  - Si Redis no está disponible, se deja trazado: `[Queue] Redis no disponible - colas deshabilitadas`.

**Ejecución de jobs (estado actual):**

- Función principal de orquestación: `agregarJobGeneracion(config: JobConfig)`.
  - Siempre crea primero el registro `JobGeneracionDocumentos` en BD (`estado = 'en_cola'`).
  - Llama a `checkRedisAvailability()`:
    - Si Redis **está disponible**:
      - Intenta encolar el job en BullMQ:
        - `documentosQueue.add('generar-documentos', { jobId, ...config }, { jobId })`.
      - Si el `add` falla con error de conexión (`ECONNREFUSED` / `connect`), cae al modo inmediato (ver abajo).
    - Si Redis **no está disponible**, **no intenta encolar** y pasa directamente a modo inmediato.

- **Modo inmediato sin Redis**: `procesarJobSinCola(jobId, config)`
  - Pensado como fallback temporal mientras no se tenga Redis operativo a nivel plataforma.
  - Cambia el job a `estado = 'procesando'` y recorre `config.empleadoIds` secuencialmente:
    - Obtiene el formato de la plantilla:
      - Si es `pdf_rellenable` lanza error explícito:
        - `"La generación desde PDFs rellenables está desactivada. Solo se soportan plantillas DOCX con variables."`
      - En caso contrario, llama a `generarDocumentoDesdePlantilla(...)`.
    - Va acumulando `ResultadoGeneracion` (success/error) y actualizando en cada iteración:
      - `progreso`, `procesados`, `exitosos`, `fallidos`, `resultados`.
  - Al finalizar:
    - Marca el job como `estado = 'completado'`, `progreso = 100`, `tiempoTotal`, etc.
    - Crea una `Notificacion` al solicitante con resumen de éxitos/fallos.
  - Si ocurre un error de nivel job (por ejemplo, plantilla no encontrada):
    - Marca el job como `estado = 'fallido'`, guarda el mensaje en `error` y fecha `completadoEn`.
    - Crea una notificación de tipo `error` con el detalle.

**Workers BullMQ (cuando Redis esté operativo):**

- `documentosQueue` y `documentosQueueEvents` se inicializan siempre, pero:
  - Manejan errores de conexión silenciosamente (solo log de conexión rechazado una vez).
- `documentosWorker`:
  - Procesa jobs `generar-documentos` con concurrencia 2 y limitador de tasa.
  - Lógica interna prácticamente equivalente a `procesarJobSinCola`:
    - Mismos pasos de actualización de progreso, estados, notificaciones.
  - Listeners:
    - `completed` → log sencillo.
    - `failed` → actualiza job a `estado = 'fallido'`, rellena `error`, notifica al solicitante.

**Impacto para futuras mejoras de Redis (cuando lo soluciones a nivel plataforma):**

- Todo el comportamiento específico de colas de plantillas está centralizado en `lib/plantillas/queue.ts`:
  - Si en el futuro:
    - Cambias el proveedor de Redis.
    - Quieres desactivar el modo inmediato y hacer que falle si Redis no está.
    - O quieres unificar la lógica con otras colas globales.
  - Solo tendrás que tocar este archivo y, opcionalmente, cómo se resuelve `cache.isAvailable()` en `lib/redis.ts`.
- Mientras tanto:
  - Si Redis no está disponible, **la generación de documentos sigue funcionando** (modo síncrono).
  - El usuario ve exactamente el mismo tracking en BD y notificaciones, solo que el trabajo se hace en el proceso HTTP en lugar de un worker separado.

### ⚠️ Lo que FALTA por Implementar

#### 1. **UI de Generación de Documentos** (PRIORIDAD ALTA)

❌ **Página/Modal para generar documentos desde plantilla**
- Selección de plantilla
- Selección de empleados (todos, por equipo, manual)
- Configuración de generación (nombre, carpeta, notificar, requiereFirma)
- Vista de progreso del job
- Lista de documentos generados

**Archivo esperado**: `app/(dashboard)/hr/plantillas/[id]/generar/page.tsx` o modal

#### 2. **Previsualización de Plantillas** (PRIORIDAD MEDIA)

❌ **Previsualización con datos de ejemplo**
- Ver cómo se verá el documento antes de generar
- Usar datos de un empleado de ejemplo
- API: `GET /api/plantillas/[id]/previsualizar`

#### 3. **Gestión Avanzada de Plantillas** (PRIORIDAD BAJA)

❌ **Editar plantilla existente**
- Cambiar metadata (nombre, descripción, categoría)
- Activar/desactivar plantilla
- Ver historial de documentos generados

❌ **Variables disponibles en UI**
- Selector de variables al crear plantilla
- Documentación inline de variables
- Validación de variables usadas vs disponibles

#### 4. **Integraciones Pendientes** (PRIORIDAD MEDIA)

❌ **Generación automática desde contratos**
- Al crear/actualizar contrato, opción de generar documento
- Checkbox "Generar contrato desde plantilla"

❌ **Generación automática desde ausencias**
- Al aprobar ausencia de vacaciones, generar justificante automáticamente
- Configuración por tipo de ausencia

❌ **Generación desde nóminas**
- Modelo 190 automático al generar nóminas

#### 5. **Mejoras de UX** (PRIORIDAD BAJA)

❌ **Vista de documentos generados**
- Lista de todos los documentos generados desde plantillas
- Filtros por plantilla, empleado, fecha
- Descarga masiva

❌ **Analytics de uso**
- Estadísticas de plantillas más usadas
- Documentos generados por mes
- Tasa de éxito de generación

---

## ✍️ FIRMA DIGITAL

### ✅ Lo que ESTÁ IMPLEMENTADO

#### 1. **Modelos de Base de Datos** (100% Completo)

**Archivo**: `prisma/schema.prisma`

- ✅ **`SolicitudFirma`**: Modelo completo para tracking de solicitudes
  - Vinculación con documento y empresa
  - Solicitante (quién y cuándo)
  - Configuración (mensaje, fechaLimite, requiereOrden)
  - Estado (pendiente, completada, expirada, cancelada)
  - Tipo (individual, masiva, automatica)
  - Proveedor (interno, lleida, docusign) - preparado para Fase 2
  - Metadata del proveedor externo (JSON)

- ✅ **`Firma`**: Modelo completo para tracking individual de firmas
  - Vinculación con SolicitudFirma y Empleado
  - Estado individual (pendiente, visto, firmado, rechazado, expirado)
  - Tracking de eventos (enviadoEn, vistoEn, firmadoEn, rechazadoEn)
  - Datos de auditoría (IP, User-Agent, ubicación)
  - Certificado de firma (hash SHA-256)
  - Método de firma (click, biometrica, otp, certificado)
  - Recordatorios enviados

- ✅ **Campos en modelos existentes**:
  - `Documento.requiereFirma`, `Documento.firmado`, `Documento.fechaFirma`
  - `DocumentoGenerado.requiereFirma`, `DocumentoGenerado.firmado`, `DocumentoGenerado.firmadoEn`
  - `Carpeta.requiereFirma`
  - `Empleado.firmas` (relación)
  - `Documento.solicitudesFirma` (relación)

#### 2. **Backend - Creación Automática de Solicitudes** (40% Completo)

**Archivo**: `lib/plantillas/generar-documento.ts` (líneas 314-349)

✅ **Creación automática desde plantillas**
- Cuando se genera documento con `requiereFirma = true`
- Crea `SolicitudFirma` automáticamente
- Crea registro `Firma` para el empleado
- Envía notificación al empleado
- Tipo: "automatica"

**Código existente**:
```typescript
if (configuracion.requiereFirma || plantilla.requiereFirma) {
  const solicitudFirma = await prisma.solicitudFirma.create({
    data: {
      empresaId: empleado.empresaId,
      documentoId: documento.id,
      solicitadoPor: solicitadoPor,
      tipo: 'automatica',
      mensaje: configuracion.mensajeFirma || `Por favor firma el documento: ${nombreDocumentoFinal}`,
      fechaLimite: configuracion.fechaLimiteFirma,
    },
  });

  await prisma.firma.create({
    data: {
      solicitudFirmaId: solicitudFirma.id,
      empleadoId: empleadoId,
      estado: 'pendiente',
    },
  });

  // Notificación al empleado
  await prisma.notificacion.create({...});
}
```

#### 3. **Especificaciones Completas** (100% Completo)

✅ **Documentación técnica completa**:
- `docs/especificaciones/firma-digital-resumen.md` ✅
- `docs/especificaciones/firma-digital.md` ✅
- Comparativa de proveedores (Lleidanetworks, DocuSign, interno)
- Casos de uso detallados
- Modelos de datos especificados
- Flujos de trabajo definidos
- APIs especificadas

### ❌ Lo que FALTA por Implementar (75% del sistema)

#### 1. **APIs REST** (0% Implementado - PRIORIDAD ALTA)

❌ **POST `/api/firmas/solicitar`**
- Solicitar firma manualmente en documento existente
- Seleccionar uno o múltiples empleados
- Configurar mensaje, fecha límite
- Crear SolicitudFirma + Firma(s)

❌ **POST `/api/firmas/[id]/firmar`**
- Procesar firma del empleado
- Actualizar estado de Firma (pendiente → firmado)
- Generar certificado/hash de firma
- Capturar IP, User-Agent, ubicación
- Actualizar Documento.firmado = true
- Actualizar SolicitudFirma.estado si todos firmaron

❌ **GET `/api/firmas`**
- Listar solicitudes de firma (HR)
- Filtros: pendientes, firmadas, expiradas
- Incluir progreso (X/Y empleados han firmado)

❌ **GET `/api/firmas/[id]`**
- Detalles de solicitud de firma
- Lista de firmas individuales con estados

❌ **GET `/api/firmas/mis-firmas`**
- Firmas pendientes del empleado actual
- Documentos que necesita firmar

❌ **POST `/api/firmas/[id]/rechazar`** (Fase 2)
- Empleado rechaza firmar
- Motivo de rechazo

❌ **POST `/api/firmas/[id]/cancelar`**
- HR cancela solicitud de firma
- Actualizar estado a "cancelada"

❌ **POST `/api/firmas/[id]/recordatorio`**
- Enviar recordatorio manual
- Actualizar contador de recordatorios

#### 2. **Backend - Lógica de Firma** (0% Implementado - PRIORIDAD ALTA)

❌ **Generación de firma digital simple**
- Hash SHA-256 del documento + timestamp + empleadoId
- Almacenar certificado en `Firma.certificado`
- Función: `generarFirmaDigital()`

❌ **Marcado visual en PDF**
- Agregar marca de "Firmado digitalmente por {nombre} el {fecha}"
- Código QR con link de verificación (opcional)
- Usar `pdf-lib` para manipular PDFs

❌ **Sistema de recordatorios automáticos**
- Job cron que revisa firmas pendientes
- Enviar recordatorio a los 3 días
- Enviar recordatorio a los 7 días
- Notificar a HR si expira sin firmar

❌ **Actualización de estados**
- Cambiar estado cuando empleado ve documento (vistoEn)
- Cambiar estado cuando firma (firmadoEn)
- Cambiar estado cuando expira (expirado)

#### 3. **Frontend - UI Completa** (0% Implementado - PRIORIDAD ALTA)

❌ **Vista HR: Solicitar Firma**
- Botón "Solicitar Firma" en menú de documento
- Modal para seleccionar empleados
- Configurar mensaje y fecha límite
- Vista de solicitudes de firma activas

❌ **Vista HR: Dashboard de Firmas**
- Lista de solicitudes de firma
- Filtros: pendientes, firmadas, expiradas
- Progreso masivo: "85/100 empleados han firmado"
- Exportar lista de firmantes/no firmantes
- Cancelar solicitudes

❌ **Vista Empleado: Firmar Documento**
- Lista de documentos pendientes de firma
- Visor de documento (PDF viewer)
- Botón "Firmar"
- Confirmación de firma
- Descarga de documento firmado

❌ **Vista Empleado: Mis Firmas**
- Historial de documentos firmados
- Estado de firmas pendientes
- Notificaciones de firmas pendientes

#### 4. **Integraciones Pendientes** (PRIORIDAD MEDIA)

❌ **Integración con sistema de documentos**
- Botón "Solicitar Firma" en vista de documento
- Indicador visual de documentos que requieren firma
- Badge de "Pendiente de firma" / "Firmado"

❌ **Integración con notificaciones**
- Notificaciones mejoradas con link directo a firmar
- Recordatorios automáticos con link

#### 5. **Fase 2: Firma Cualificada** (0% Implementado - PRIORIDAD BAJA)

❌ **Integración con Lleidanetworks**
- Cliente API de Lleidanetworks
- Envío de documentos para firma cualificada
- Webhook para recibir confirmaciones
- Migración de firmas simples a cualificadas

---

## 📊 Comparativa: Plantillas vs Firma Digital

| Aspecto | Plantillas | Firma Digital |
|---------|-----------|--------------|
| **Modelos BD** | ✅ 100% | ✅ 100% |
| **Backend Core** | ✅ 90% | ⚠️ 40% |
| **APIs REST** | ✅ 85% | ❌ 0% |
| **Frontend UI** | ⚠️ 70% | ❌ 0% |
| **Integraciones** | ✅ 80% | ⚠️ 30% |
| **Documentación** | ✅ 100% | ✅ 100% |
| **Completitud Total** | **~80%** | **~25%** |

---

## 🎯 Recomendaciones de Implementación

### Prioridad ALTA (Sprint Inmediato)

#### Para Plantillas:
1. ✅ **UI de generación de documentos**
   - Modal o página para seleccionar plantilla y empleados
   - Vista de progreso del job
   - Tiempo estimado: 2-3 días

#### Para Firma Digital:
1. ✅ **APIs básicas de firma**
   - POST `/api/firmas/solicitar`
   - POST `/api/firmas/[id]/firmar`
   - GET `/api/firmas/mis-firmas`
   - Tiempo estimado: 2-3 días

2. ✅ **Backend: Generación de firma digital simple**
   - Hash SHA-256 + marca visual en PDF
   - Tiempo estimado: 1-2 días

3. ✅ **Frontend: Vista empleado para firmar**
   - Lista de documentos pendientes
   - Visor + botón firmar
   - Tiempo estimado: 2-3 días

4. ✅ **Frontend: Vista HR para solicitar firma**
   - Botón en documento + modal
   - Dashboard de solicitudes
   - Tiempo estimado: 2-3 días

**Total Sprint**: ~10-14 días para funcionalidad básica completa

### Prioridad MEDIA (Sprint 2)

1. ✅ **Sistema de recordatorios automáticos**
2. ✅ **Previsualización de plantillas**
3. ✅ **Integración automática con contratos/ausencias**
4. ✅ **Mejoras de UX y analytics**

### Prioridad BAJA (Fase 2)

1. ✅ **Firma cualificada con Lleidanetworks**
2. ✅ **Rechazo de firmas**
3. ✅ **Firma secuencial (requiereOrden)**

---

## 📝 Notas Técnicas

### Dependencias Instaladas

✅ **Plantillas**:
- `docxtemplater`: ✅ Instalado
- `pizzip`: ✅ Instalado
- `pdf-lib`: ✅ Instalado (para PDFs rellenables)

✅ **Firma Digital**:
- `crypto`: ✅ Nativo de Node.js
- `pdf-lib`: ✅ Ya instalado (para marcar PDFs)

### Migraciones de BD

✅ **Plantillas**: Migración completa (`20251113012700_add_plantillas_documentos_firma_digital`)
✅ **Firma Digital**: Modelos creados en misma migración

### Archivos Clave

**Plantillas**:
- `lib/plantillas/generar-documento.ts` - Generación core
- `lib/plantillas/ia-resolver.ts` - Resolución de variables
- `lib/plantillas/queue.ts` - Sistema de colas
- `app/api/plantillas/**` - APIs REST
- `components/hr/plantillas-tab.tsx` - UI gestión

**Firma Digital**:
- `lib/plantillas/generar-documento.ts` (líneas 314-349) - Creación automática
- `prisma/schema.prisma` (líneas 1894-1991) - Modelos BD
- `docs/especificaciones/firma-digital*.md` - Especificaciones

---

## ✅ Conclusión

### Plantillas de Documentos: **~80% Completo**
- Backend robusto y funcional
- Falta principalmente UI de generación
- Integraciones básicas funcionando
- Listo para producción con mejoras menores

### Firma Digital: **~25% Completo**
- Modelos de BD completos
- Creación automática desde plantillas funcionando
- Falta TODO el flujo de firma (APIs + UI)
- Necesita ~2 semanas de desarrollo para MVP funcional

**Recomendación**: Priorizar completar Firma Digital para tener un sistema completo de documentos con firma integrada.

---

**Versión**: 1.0.0  
**Fecha**: 27 de Enero 2025  
**Autor**: Análisis automático con Claude AI


