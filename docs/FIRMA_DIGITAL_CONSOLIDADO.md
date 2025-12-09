# 📘 Documentación Consolidada: Sistema de Firma Digital

**Proyecto**: Clousadmin
**Última actualización**: 2025-12-09
**Versión**: 1.1.0
**Estado**: ✅ Operativo

---

## 📋 Índice General

<a name="indice"></a>

### 1. [Resumen Ejecutivo](#resumen-ejecutivo)
   - [Estado Actual del Sistema](#estado-actual)
   - [Capacidades Implementadas](#capacidades)
   - [Roadmap y Pendientes](#roadmap)

### 2. [Especificaciones](#especificaciones)
   - [Especificación Funcional Completa](#especificacion-funcional)
   - [Arquitectura y Modelos de Datos](#arquitectura)
   - [Proveedores de Firma](#proveedores)
   - [Seguridad y Cumplimiento](#seguridad)

### 3. [Historial de Implementación](#historial)
   - [2025-11-16: Revisión Completa](#revision-completa)
   - [2025-12-02: Migración a Patrón Sheet/Panel](#sheet-pattern)
   - [2025-12-05: Corrección de Errores Críticos](#errores-criticos)
   - [2025-12-08: Visualización de Documento Firmado](#visualizacion)
   - [2025-12-08: Fix Scope primerDocumentoFirmado](#fix-scope)
   - [2025-12-08: Fix Rutas Post-Firma](#fix-rutas)
   - [2025-12-09: Firma de Empresa](#firma-empresa)
   - [2025-12-09: Toggle Incluir Firma Empresa](#toggle-firma-empresa)

### 4. [Estado de Implementación Detallado](#estado-detallado)
   - [Backend vs Frontend](#backend-frontend)
   - [Análisis de Completitud](#completitud)

### 5. [Referencias](#referencias)
   - [Documentos Activos](#docs-activos)
   - [Documentos Históricos](#docs-historicos)

---

<a name="resumen-ejecutivo"></a>
## 1. Resumen Ejecutivo

[🔝 Volver al índice](#indice)

<a name="estado-actual"></a>
### Estado Actual del Sistema

**Fecha de último update**: 9 de diciembre de 2025

El sistema de firma digital está **OPERATIVO** y se encuentra en producción. Ha pasado por múltiples iteraciones de mejora y corrección de errores críticos. Recientemente se añadió la funcionalidad de **firma de empresa** configurable.

#### Métricas de Implementación

| Componente | Estado | Completitud |
|------------|--------|-------------|
| **Modelos BD** | ✅ Completo | 100% |
| **Backend Core** | ✅ Completo | 90% |
| **APIs REST** | ✅ Completo | 85% |
| **Frontend UI** | ✅ Completo | 80% |
| **Integraciones** | ⚠️ Parcial | 60% |
| **Testing** | ⚠️ Parcial | 40% |

<a name="capacidades"></a>
### Capacidades Implementadas

#### ✅ Tipos de Firma
- **Firmas simples** (click + IP + timestamp)
- **Firmas manuscritas** (canvas con imagen guardada)
- **Firma de empresa** (configurable por HR admin)
  - Se aplica al PDF ANTES de enviarlo a empleados
  - Múltiples posiciones configurables (color púrpura en UI)
  - Toggle on/off por solicitud
  - Guardado en S3 (solicitud específica + predeterminada)
- **Múltiples posiciones de firma** por documento
- **Múltiples firmantes** por documento
- **Firma secuencial** (orden obligatorio)
- **Firma paralela** (cualquier orden)

#### ✅ Gestión de Documentos
- **PDFs rellenables** (aplanamiento automático de formularios)
- **Conversión automática Word → PDF**
- **Toggle "Mantener original"** (mantener o reemplazar documento)
- **Toggle "Incluir firma empresa"** (control por solicitud)
- **Posicionamiento preciso** (sistema de porcentajes responsive)
- **Visualización inmediata** del documento firmado

#### ✅ Flujo de Usuario
- **Solicitud de firma** individual y masiva
- **Notificaciones** por email y en plataforma
- **Tracking completo** (pendiente → firmado)
- **Recordatorios automáticos** (configurable)
- **Vista previa** de documentos antes de firmar
- **Descarga** de documentos firmados

#### ✅ Seguridad y Auditoría
- **Certificado de firma** con timestamp, IP, y datos del firmante
- **Trazabilidad completa** (quién, cuándo, dónde)
- **Permisos por rol** (HR, Manager, Empleado)
- **Cumplimiento eIDAS** (firma simple)
- **GDPR/LOPD** compliant

<a name="roadmap"></a>
### Roadmap y Pendientes

#### 🚀 Próximas Mejoras (Q1 2025)

1. **Plantillas de Documentos** (Prioridad Alta)
   - Integración completa con sistema de plantillas
   - Generación automática + solicitud de firma
   - Variables y personalización

2. **Firma Avanzada** (Prioridad Media)
   - Integración con Lleidanetworks
   - Firma cualificada eIDAS
   - Firma biométrica

3. **Testing** (Prioridad Alta)
   - Tests E2E para flujos completos
   - Tests de integración API
   - Tests de carga

4. **Mejoras UX** (Prioridad Baja)
   - Previsualización de posiciones de firma
   - Firma desde móvil optimizada
   - Bulk operations mejoradas

---

<a name="especificaciones"></a>
## 2. Especificaciones

[🔝 Volver al índice](#indice)

<a name="especificacion-funcional"></a>
### Especificación Funcional Completa

> **Nota**: La especificación completa de 1600+ líneas se mantiene en [`docs/especificaciones/firma-digital.md`](especificaciones/firma-digital.md)

#### Resumen de Requisitos Funcionales

##### MVP (Implementado)

**RF-1: Solicitud de Firma**
- ✅ Solicitar firma individual
- ✅ Solicitar firma masiva
- ⚠️ Firma automática desde plantilla (parcial)

**RF-2: Proceso de Firma**
- ✅ Firma simple (click)
- ✅ Firma manuscrita (canvas)
- ✅ Vista previa de documento
- ✅ Posicionamiento de firma
- ✅ Guardar firma en perfil

**RF-3: Gestión y Tracking**
- ✅ Dashboard de firmas pendientes
- ✅ Historial de firmas completadas
- ✅ Estados: pendiente, firmado, rechazado
- ✅ Notificaciones por email
- ✅ Recordatorios automáticos

**RF-4: Permisos y Roles**
- ✅ HR Admin: Crear solicitudes, ver todas
- ✅ Manager: Ver firmas de su equipo
- ✅ Empleado: Ver y firmar sus documentos

##### Fase 2 (Pendiente)

**RF-5: Integraciones**
- ⏳ Plantillas de documentos
- ⏳ Onboarding automático
- ⏳ Generación masiva

**RF-6: Firma Avanzada**
- ⏳ Proveedor externo (Lleidanetworks)
- ⏳ Firma cualificada eIDAS
- ⏳ Firma biométrica

<a name="arquitectura"></a>
### Arquitectura y Modelos de Datos

#### Modelo de Base de Datos

```prisma
model solicitudes_firma {
  id                String   @id @default(cuid())
  empresaId         String
  titulo            String
  mensaje           String?
  documentoId       String
  ordenFirma        Boolean  @default(false)
  estado            String   @default("pendiente")  // pendiente, completada, rechazada
  pdfFirmadoS3Key   String?
  mantenerOriginal  Boolean  @default(true)
  posicionFirma     Json?    // Posiciones de firma (múltiples)
  creadoPor         String
  creadoEn          DateTime @default(now())
  actualizadoEn     DateTime @updatedAt

  // Relaciones
  empresa           empresas @relation(fields: [empresaId], references: [id])
  documento         documentos @relation(fields: [documentoId], references: [id])
  creador           usuarios @relation(fields: [creadoPor], references: [id])
  firmas            firmas[]
}

model firmas {
  id                String   @id @default(cuid())
  solicitudId       String
  empleadoId        String
  orden             Int      @default(1)
  firmado           Boolean  @default(false)
  firmadoEn         DateTime?
  tipo              String?  // "click" | "manuscrita"
  certificado       Json?    // Certificado de firma
  rechazado         Boolean  @default(false)
  rechazadoEn       DateTime?
  motivoRechazo     String?

  // Relaciones
  solicitud         solicitudes_firma @relation(fields: [solicitudId], references: [id])
  empleado          empleados @relation(fields: [empleadoId], references: [id])
}
```

#### Arquitectura de Componentes

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐     ┌──────────────────┐        │
│  │  SolicitarFirma  │     │  FirmarDocumento │        │
│  │  Dialog          │     │  Client          │        │
│  └──────────────────┘     └──────────────────┘        │
│                                                         │
│  ┌──────────────────┐     ┌──────────────────┐        │
│  │  FirmasDetails   │     │  VerSolicitud    │        │
│  │  Panel           │     │  Client          │        │
│  └──────────────────┘     └──────────────────┘        │
│                                                         │
└─────────────────────────────────────────────────────────┘
                          ↓ API Calls
┌─────────────────────────────────────────────────────────┐
│                   Backend (Next.js API)                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────┐         │
│  │   /api/firma/solicitudes                 │         │
│  │   - POST   Create solicitud              │         │
│  │   - GET    List solicitudes              │         │
│  │   - GET    Get solicitud by ID           │         │
│  └──────────────────────────────────────────┘         │
│                                                         │
│  ┌──────────────────────────────────────────┐         │
│  │   /api/firma/solicitudes/[id]/firmar     │         │
│  │   - POST   Firmar documento              │         │
│  └──────────────────────────────────────────┘         │
│                                                         │
│  ┌──────────────────────────────────────────┐         │
│  │   /api/firma/pendientes                  │         │
│  │   - GET    Firmas pendientes empleado    │         │
│  └──────────────────────────────────────────┘         │
│                                                         │
│  ┌──────────────────────────────────────────┐         │
│  │   /api/firma/solicitudes/[id]/preview    │         │
│  │   - GET    PDF con firma empresa         │         │
│  └──────────────────────────────────────────┘         │
│                                                         │
│  ┌──────────────────────────────────────────┐         │
│  │   /api/firma/solicitudes/[id]/pdf-metadata│        │
│  │   - GET    Metadatos PDF con firma       │         │
│  └──────────────────────────────────────────┘         │
│                                                         │
└─────────────────────────────────────────────────────────┘
                          ↓ Helpers
┌─────────────────────────────────────────────────────────┐
│              Helpers (lib/firma-digital)                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  • db-helpers.ts         - CRUD solicitudes y firmas   │
│  • pdf-marca.ts          - Añadir marcas visuales      │
│  • pdf-utils.ts          - Conversión Word→PDF         │
│  • certificado.ts        - Generar certificados        │
│  • tipos.ts              - TypeScript types            │
│  • get-post-firma-redirect.ts - Redirección por rol    │
│                                                         │
└─────────────────────────────────────────────────────────┘
                          ↓ Storage
┌─────────────────────────────────────────────────────────┐
│                  Storage (S3 + Database)                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  • PDF firmado → S3 (pdfFirmadoS3Key)                 │
│  • Certificado firma → JSON en DB                      │
│  • Firma manuscrita → S3 (imagen PNG)                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

<a name="proveedores"></a>
### Proveedores de Firma

#### Comparativa de Proveedores

| Proveedor | Precio | Firmas/mes | eIDAS | Integración | Estado |
|-----------|--------|------------|-------|-------------|--------|
| **Interno (MVP)** | €0 | Ilimitadas | ❌ Simple | Nativo | ✅ Implementado |
| **Lleidanetworks** | €0.20-0.50/firma | Pay-as-you-go | ✅ Cualificada | API REST | ⏳ Planeado |
| **DocuSign** | $40-60/usuario | Ilimitadas | ✅ Avanzada | API REST | ❌ Descartado |

#### Decisión: Interno + Lleidanetworks

**MVP (Actual)**: Firma simple interna
- Suficiente para 95% de casos de uso
- Sin coste adicional
- Control total del flujo
- Auditoría completa

**Fase 2**: Lleidanetworks para firma cualificada
- Solo cuando sea legalmente necesario
- Coste por uso (no por usuario)
- Validez legal reforzada
- Integración transparente para el usuario

<a name="seguridad"></a>
### Seguridad y Cumplimiento

#### Cumplimiento Legal

**eIDAS (Reglamento UE 910/2014)**:
- ✅ Firma electrónica simple (implementada)
- ⏳ Firma electrónica avanzada (planeada con Lleidanetworks)
- ⏳ Firma electrónica cualificada (planeada con Lleidanetworks)

**GDPR/LOPD**:
- ✅ Consentimiento explícito para firmar
- ✅ Derecho de acceso a documentos firmados
- ✅ Derecho de rectificación (rechazar firma)
- ✅ Trazabilidad completa
- ✅ Datos sensibles encriptados

#### Certificado de Firma

Cada firma genera un certificado JSON con:

```json
{
  "empleado": {
    "id": "cm...",
    "nombre": "Juan Pérez",
    "email": "juan@empresa.com",
    "dni": "12345678A"
  },
  "timestamp": "2024-12-05T10:30:45.123Z",
  "ip": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "tipo": "manuscrita",
  "firmaImagenS3Key": "firmas/cm.../firma.png",
  "documento": {
    "id": "cm...",
    "nombre": "Contrato.pdf",
    "hash": "sha256:abc123..."
  }
}
```

#### Permisos por Rol

| Acción | Platform Admin | HR Admin | Manager | Empleado |
|--------|---------------|----------|---------|----------|
| Crear solicitud | ❌ | ✅ | ⏳ | ❌ |
| Ver todas las solicitudes | ✅ | ✅ | ⏳ Ver equipo | ❌ |
| Ver mis solicitudes | ✅ | ✅ | ✅ | ✅ |
| Firmar documento | ✅ | ✅ | ✅ | ✅ |
| Descargar PDF firmado | ✅ | ✅ | ✅ | ✅ Solo propios |
| Rechazar firma | ❌ | ❌ | ❌ | ✅ |

---

<a name="historial"></a>
## 3. Historial de Implementación

[🔝 Volver al índice](#indice)

<a name="revision-completa"></a>
### 2025-11-16: Revisión Completa del Sistema

**Documento**: [`docs/historial/REVISION_FIRMA_DIGITAL_COMPLETA.md`](historial/REVISION_FIRMA_DIGITAL_COMPLETA.md)

#### Cambios Implementados

1. **Limpieza de Widgets y Notificaciones**
   - Eliminado `FirmasPendientesWidget` del dashboard empleado
   - Integrado en `NotificacionesWidget` existente
   - Iconos `FileSignature` en bandeja de entrada

2. **Corrección de API de Firma**
   - Fix params en route.ts (async params en Next.js 15)
   - Corrección de tipos TypeScript

3. **Integración con Notificaciones**
   - Notificaciones de firma enviadas por email
   - Tipos: `firma_pendiente`, `firma_completada`
   - Recordatorios automáticos después de 3 días

4. **Testing y Validación**
   - Verificación de imports y dependencias
   - Sin código huérfano
   - Build sin errores

<a name="sheet-pattern"></a>
### 2025-12-02: Migración a Patrón Sheet/Panel

**Documento**: [`docs/historial/2025-12-02-firmas-sheet-pattern.md`](historial/2025-12-02-firmas-sheet-pattern.md)

#### Motivación

Optimización de UX mobile, siguiendo el patrón establecido para canal de denuncias.

#### Cambios

1. **Nuevo Componente: `FirmasDetails`**
   - Panel lateral reutilizable
   - Props: `isHRView` para diferenciar contexto
   - Stats inline: "X pendientes | Y completadas (7d)"
   - Navegación a firmar/ver documentos

2. **Integración en Vistas**
   - Vista Empleado: Icono en header mobile + botón desktop
   - Vista HR: Icono en header mobile + botón outline desktop
   - Ambos abren `DetailsPanel` con `FirmasDetails`

3. **Eliminación de Código Legacy**
   - Removido `FirmasCardCompact` del contenido principal
   - Patrón card expandible reemplazado por sheet/panel

#### Beneficios

- **Espacio Optimizado**: No ocupa espacio permanente
- **Contexto Preservado**: El usuario no pierde ubicación
- **Acceso Rápido**: Siempre disponible desde header
- **Mobile-Friendly**: Se adapta perfectamente a móviles

<a name="errores-criticos"></a>
### 2025-12-05: Corrección de Errores Críticos

**Documento**: [`docs/FIRMA-DIGITAL-ESTADO-ACTUAL.md`](FIRMA-DIGITAL-ESTADO-ACTUAL.md)

#### FIX 1: Firmas sin imagen manuscrita no se aplicaban al PDF

**Problema**: Firmas simples (click) no aparecían en el PDF final.

**Causa**: Filtro que excluía firmas sin imagen:
```typescript
// ANTES (MALO):
const marcasConImagen = marcas.filter(m => m.firmaImagen?.buffer);
if (marcasConImagen.length === 0) {
  return pdfBuffer;  // ❌ Retorna PDF sin firmar
}
```

**Solución**: Modificado `anadirMarcasFirmasPDF()` para soportar dos tipos:
- **CON imagen**: Dibuja la firma manuscrita del empleado
- **SIN imagen**: Dibuja rectángulo azul con texto "Firmado digitalmente"

**Archivos modificados**:
- `lib/firma-digital/pdf-marca.ts:172-176`
- `lib/firma-digital/pdf-marca.ts:239-314`

#### FIX 2: Error DOMMatrix en Server Components

**Problema**: `DOMMatrix is not defined` en server components.

**Solución**: Verificar `typeof window !== 'undefined'` antes de usar APIs del navegador.

#### FIX 3: PDFs rellenables con formularios activos

**Problema**: Campos de formulario seguían editables después de firmar.

**Solución**: Aplanar formularios antes de añadir firmas usando `pdf-lib`.

<a name="visualizacion"></a>
### 2025-12-08: Visualización de Documento Firmado

**Documento**: [`docs/historial/2025-12-08-visualizar-documento-firmado.md`](historial/2025-12-08-visualizar-documento-firmado.md)

#### Problema

Cuando un empleado firmaba, solo se actualizaba el estado visual pero no podía ver el PDF con la firma aplicada.

#### Solución

1. **Modificar API para devolver información del documento**
   ```typescript
   return {
     firma: firmaActualizada,
     certificado,
     solicitudCompletada: estadoComplecion.completo,
     documentoFirmado: estadoComplecion.completo && primerDocumentoFirmado ? {
       id: primerDocumentoFirmado.id,
       nombre: primerDocumentoFirmado.nombre,
     } : undefined,
   };
   ```

2. **Actualizar Dialog para pasar info al callback**
   ```typescript
   onSigned?.({
     solicitudCompletada: data.solicitudCompletada,
     solicitudId: data.solicitudId,
     documentoFirmado: data.documentoFirmado,
   });
   ```

3. **Redirigir a vista de solicitud completada**
   ```typescript
   if (data?.solicitudCompletada && data?.solicitudId) {
     router.push(`/firma/solicitud/${data.solicitudId}`);
   }
   ```

#### Flujo Completo

**Última firma (todas completas)**:
1. Empleado firma documento
2. API devuelve `solicitudCompletada=true` + `documentoFirmado`
3. Cliente redirige a `/firma/solicitud/[id]`
4. Página muestra PDF con TODAS las firmas aplicadas

**Firma intermedia (faltan firmas)**:
1. Empleado firma documento
2. API devuelve `solicitudCompletada=false`
3. Cliente NO redirige, muestra toast de éxito
4. Empleado puede cerrar página

<a name="fix-scope"></a>
### 2025-12-08: Fix Scope primerDocumentoFirmado

**Documento**: [`docs/historial/2025-12-08-fix-scope-primerdocumentofirmado.md`](historial/2025-12-08-fix-scope-primerdocumentofirmado.md)

#### Problema

Error `ReferenceError: primerDocumentoFirmado is not defined` al firmar documentos.

#### Causa Raíz

Variable declarada **dentro de un bloque if anidado**, fuera de scope en el return:

```typescript
if (estadoComplecion.completo) {
  if (esPDF) {
    let primerDocumentoFirmado = null;  // ← Declaración aquí
    // ...
  }
}

return {
  documentoFirmado: primerDocumentoFirmado ? { ... } : undefined  // ← ERROR: no existe
};
```

#### Solución

Declarar la variable **ANTES del bloque if** para que esté en el scope correcto:

```typescript
const estadoComplecion = validarComplecionFirmas(todasLasFirmas);

// ✅ NUEVO: Declarar ANTES del if
let primerDocumentoFirmado: { id: string; nombre: string } | null = null;

if (estadoComplecion.completo) {
  if (esPDF) {
    primerDocumentoFirmado = { ... };  // ← Asignación
  }
}

return {
  documentoFirmado: primerDocumentoFirmado ? { ... } : undefined  // ✅ Accesible
};
```

#### Impacto

- **Antes**: Todas las firmas fallaban con 500 error
- **Después**: Firma se completa correctamente, PDF se genera

<a name="fix-rutas"></a>
### 2025-12-08: Fix Rutas Post-Firma

**Documento**: [`docs/historial/2025-12-08-fix-post-firma-redirect.md`](historial/2025-12-08-fix-post-firma-redirect.md)

#### Problema

Tres errores críticos en las rutas de redirección:

1. **Platform admin sin destino válido**: `platform_admin` era redirigido a `/hr/mi-espacio`, pero esa página solo acepta `hr_admin`, causando bucle de redirección.

2. **Botón "Volver" usa router.back()**: Si el usuario llega sin historial, el botón no funciona.

3. **Lógica duplicada**: Función `obtenerRutaPostFirma` duplicada en 2 archivos.

#### Solución

**1. Helper centralizado**: [`lib/firma-digital/get-post-firma-redirect.ts`](lib/firma-digital/get-post-firma-redirect.ts)

```typescript
export function getPostFirmaRedirect(): string {
  const rol = obtenerRolDesdeCookie();

  if (rol === UsuarioRol.platform_admin) {
    return '/platform/invitaciones';  // ← Panel de admin
  }

  if (rol === UsuarioRol.hr_admin) {
    return '/hr/mi-espacio';
  }

  if (rol === UsuarioRol.manager) {
    return '/manager/mi-espacio';
  }

  return '/empleado/mi-espacio';  // Fallback
}
```

**2. Actualizar componentes**:
- `app/firma/solicitud/[solicitudId]/ver-solicitud-client.tsx`
- `app/firma/firmar/[firmaId]/firmar-documento-client.tsx`
- `app/firma/solicitar/[documentoId]/solicitar-firma-client.tsx`

**3. Reemplazar `router.back()` por `router.push(getPostFirmaRedirect())`**

#### Rutas por Rol

| Rol | Destino |
|-----|---------|
| `platform_admin` | `/platform/invitaciones` |
| `hr_admin` | `/hr/mi-espacio` |
| `manager` | `/manager/mi-espacio` |
| `empleado` | `/empleado/mi-espacio` |

#### Beneficios

- ✅ Eliminado bucle de redirección
- ✅ Botón "Volver" siempre funciona
- ✅ Código más mantenible (DRY)
- ✅ Más robusto con manejo de errores

---

<a name="estado-detallado"></a>
## 4. Estado de Implementación Detallado

[🔝 Volver al índice](#indice)

<a name="backend-frontend"></a>
### Backend vs Frontend

#### Backend (90% Completo)

##### ✅ Modelos de Base de Datos (100%)

```prisma
✅ solicitudes_firma
✅ firmas
✅ Relaciones con empresas, usuarios, empleados, documentos
✅ Índices optimizados
```

##### ✅ Helpers y Utilidades (95%)

```typescript
✅ lib/firma-digital/db-helpers.ts         - CRUD completo
✅ lib/firma-digital/pdf-marca.ts          - Marcas visuales
✅ lib/firma-digital/pdf-utils.ts          - Conversión Word→PDF
✅ lib/firma-digital/certificado.ts        - Generar certificados
✅ lib/firma-digital/tipos.ts              - TypeScript types
✅ lib/firma-digital/get-post-firma-redirect.ts - Redirección
⏳ lib/firma-digital/validaciones.ts      - Validaciones Zod (pendiente)
```

##### ✅ APIs REST (85%)

```typescript
✅ POST   /api/firma/solicitudes              - Crear solicitud
✅ GET    /api/firma/solicitudes              - Listar solicitudes
✅ GET    /api/firma/solicitudes/[id]         - Get solicitud
✅ POST   /api/firma/solicitudes/[id]/firmar  - Firmar documento
✅ GET    /api/firma/solicitudes/[id]/documento-firmado - Servir PDF
✅ GET    /api/firma/pendientes               - Firmas pendientes empleado
⏳ POST   /api/firma/solicitudes/[id]/rechazar - Rechazar firma (pendiente)
⏳ DELETE /api/firma/solicitudes/[id]         - Cancelar solicitud (pendiente)
```

#### Frontend (80% Completo)

##### ✅ Componentes Core (90%)

```typescript
✅ components/firma/firmas-details.tsx           - Panel lateral
✅ components/firma/firmar-documento-dialog.tsx  - Dialog de firma
✅ components/firma/signature-canvas.tsx         - Canvas de firma
✅ components/firma/firmas-icon-button.tsx       - Badge contador
⏳ components/firma/solicitar-firma-dialog.tsx   - Dialog crear (mejorable)
```

##### ✅ Páginas (85%)

```typescript
✅ app/firma/firmar/[firmaId]/page.tsx                   - Firmar documento
✅ app/firma/solicitud/[solicitudId]/page.tsx            - Ver solicitud
✅ app/firma/solicitar/[documentoId]/page.tsx            - Solicitar firma
⏳ app/(dashboard)/hr/firmas/page.tsx                     - Dashboard firmas (pendiente)
```

##### ✅ Integraciones en Vistas (75%)

```typescript
✅ app/(dashboard)/empleado/mi-espacio/documentos        - Panel firmas
✅ app/(dashboard)/hr/documentos                         - Panel firmas
⏳ app/(dashboard)/manager/documentos                     - Panel firmas (pendiente)
⏳ Notificaciones push browser                           - (pendiente)
```

<a name="completitud"></a>
### Análisis de Completitud

#### Por Módulo

| Módulo | Backend | Frontend | Integración | Total |
|--------|---------|----------|-------------|-------|
| Solicitud de firma | 100% | 80% | 70% | **83%** |
| Proceso de firma | 95% | 90% | 85% | **90%** |
| Tracking y notificaciones | 85% | 75% | 80% | **80%** |
| Permisos y roles | 100% | 70% | 80% | **83%** |
| PDFs y documentos | 95% | 85% | 90% | **90%** |
| Gestión masiva | 60% | 40% | 50% | **50%** |

#### Deuda Técnica

##### Alta Prioridad

- [ ] Tests E2E para flujos completos
- [ ] Tests de integración API
- [ ] Validaciones Zod en APIs
- [ ] Error handling consistente

##### Media Prioridad

- [ ] Optimización de queries (N+1 problema)
- [ ] Cache de datos (Redis)
- [ ] Logs estructurados (Winston)
- [ ] Métricas y monitoring

##### Baja Prioridad

- [ ] Refactor de componentes grandes
- [ ] Documentación inline (JSDoc)
- [ ] Storybook de componentes
- [ ] Internacionalización (i18n)

---

<a name="referencias"></a>
## 5. Referencias

[🔝 Volver al índice](#indice)

<a name="docs-activos"></a>
### Documentos Activos

Estos son los documentos que deben **consultarse** para trabajar con el sistema de firma:

#### Documentación Principal

1. **Este documento** - Consolidado completo con toda la información
   - [`docs/FIRMA_DIGITAL_CONSOLIDADO.md`](FIRMA_DIGITAL_CONSOLIDADO.md)

#### Especificaciones Técnicas

2. **Especificación funcional completa** (1600+ líneas) - Referencia técnica detallada
   - [`docs/especificaciones/firma-digital.md`](especificaciones/firma-digital.md)
   - Usar para: Arquitectura, APIs detalladas, modelos de datos completos

#### Guías de Desarrollo

3. **Helper de redirección** - Código fuente del helper centralizado
   - [`lib/firma-digital/get-post-firma-redirect.ts`](../lib/firma-digital/get-post-firma-redirect.ts)
   - Usar para: Entender lógica de redirección por rol

<a name="docs-historicos"></a>
### Documentos Históricos

Estos documentos contienen **contexto histórico** útil para entender decisiones de diseño:

#### Análisis y Planificación (Pre-implementación)

- [`docs/analisis/firma-digital-y-plantillas-estado.md`](analisis/firma-digital-y-plantillas-estado.md)
  - Análisis inicial del estado (27 enero 2025)
  - Útil para: Entender decisiones de arquitectura iniciales

- [`docs/especificaciones/firma-digital-resumen.md`](especificaciones/firma-digital-resumen.md)
  - Resumen ejecutivo original
  - Útil para: Comparativa de proveedores, justificación del proyecto

- [`docs/especificaciones/firma-digital-README.md`](especificaciones/firma-digital-README.md)
  - Índice de especificaciones
  - Útil para: Navegación entre documentos de especificación

#### Historial de Cambios

- [`docs/historial/REVISION_FIRMA_DIGITAL_COMPLETA.md`](historial/REVISION_FIRMA_DIGITAL_COMPLETA.md)
  - Revisión completa del sistema (16 noviembre 2025)

- [`docs/historial/2025-12-02-firmas-sheet-pattern.md`](historial/2025-12-02-firmas-sheet-pattern.md)
  - Migración a patrón sheet/panel

- [`docs/FIRMA-DIGITAL-ESTADO-ACTUAL.md`](FIRMA-DIGITAL-ESTADO-ACTUAL.md)
  - Estado tras corrección de errores críticos (5 diciembre 2024)

- [`docs/historial/2025-12-08-visualizar-documento-firmado.md`](historial/2025-12-08-visualizar-documento-firmado.md)
  - Feature de visualización de documento firmado

- [`docs/historial/2025-12-08-fix-scope-primerdocumentofirmado.md`](historial/2025-12-08-fix-scope-primerdocumentofirmado.md)
  - Fix de scope de variable

- [`docs/historial/2025-12-08-fix-post-firma-redirect.md`](historial/2025-12-08-fix-post-firma-redirect.md)
  - Fix de rutas de redirección

---

## 📊 Resumen Final

### Documentos en el Repositorio

**Total de archivos de firma**: 10 archivos

#### Activos (consultar)
1. ✅ `FIRMA_DIGITAL_CONSOLIDADO.md` (este documento) - **Punto de entrada principal**
2. ✅ `especificaciones/firma-digital.md` - Especificación técnica detallada
3. ✅ `lib/firma-digital/get-post-firma-redirect.ts` - Código helper

#### Históricos (contexto)
4. 📚 `analisis/firma-digital-y-plantillas-estado.md` - Análisis inicial
5. 📚 `especificaciones/firma-digital-resumen.md` - Resumen ejecutivo
6. 📚 `especificaciones/firma-digital-README.md` - Índice especificaciones
7. 📚 `historial/REVISION_FIRMA_DIGITAL_COMPLETA.md` - Revisión nov 2025
8. 📚 `historial/2025-12-02-firmas-sheet-pattern.md` - Migración UI
9. 📚 `FIRMA-DIGITAL-ESTADO-ACTUAL.md` - Estado dic 2024
10. 📚 `historial/2025-12-08-visualizar-documento-firmado.md` - Feature visualización
11. 📚 `historial/2025-12-08-fix-scope-primerdocumentofirmado.md` - Fix scope
12. 📚 `historial/2025-12-08-fix-post-firma-redirect.md` - Fix rutas

### Estado del Sistema

| Aspecto | Estado | Nota |
|---------|--------|------|
| **Operatividad** | ✅ Operativo | En producción |
| **Completitud** | 83% | MVP funcional |
| **Estabilidad** | ✅ Estable | Sin errores críticos conocidos |
| **Documentación** | ✅ Completa | Este documento centraliza todo |
| **Testing** | ⚠️ Parcial | Cobertura ~40% |
| **Performance** | ✅ Buena | Sin problemas reportados |

### Próximos Pasos Recomendados

1. **Corto plazo** (1-2 semanas):
   - Aumentar cobertura de tests (objetivo: 70%)
   - Implementar validaciones Zod en APIs
   - Mejorar error handling

2. **Medio plazo** (1-2 meses):
   - Integración completa con plantillas
   - Dashboard de firmas para HR
   - Optimización de queries

3. **Largo plazo** (3-6 meses):
   - Integración Lleidanetworks
   - Firma avanzada/cualificada
   - Métricas y analytics

---

---

<a name="firma-empresa-implementacion"></a>
### 2025-12-09: Implementación Completa de Firma de Empresa

**Documentación detallada**: [docs/historial/2025-12-09-firma-empresa-implementacion.md](./historial/2025-12-09-firma-empresa-implementacion.md)

#### Resumen

Implementación completa de la funcionalidad que permite a las empresas añadir automáticamente su firma corporativa a los documentos ANTES de enviarlos a los empleados para firma.

#### Cambios Principales

**Base de Datos**:
- Nuevos campos: `posicionesFirmaEmpresa` (JSONB), `firmaEmpresaS3Key` (TEXT)
- Migración: `20251209040000_add_posiciones_firma_empresa`

**Backend Core**:
- Firma empresa se aplica al PDF al crear la solicitud (no al final)
- Se recalcula el hash del documento CON firma empresa aplicada
- PDF con firma empresa guardado en `pdfTemporalS3Key`

**Nuevos Endpoints API**:
- `GET /api/firma/solicitudes/[solicitudId]/preview` - Sirve PDF con firma empresa
- `GET /api/firma/solicitudes/[solicitudId]/pdf-metadata` - Metadatos del PDF con firma

**Frontend**:
- UI reorganizada con sección dedicada para firma empresa (color púrpura)
- Toggle para activar/desactivar firma empresa
- Canvas/selector de firma de empresa
- Botón "Firma Empresa" integrado en sección de posiciones
- Cliente actualizado para usar nuevos endpoints

#### Flujo Completo

1. **HR crea solicitud** con firma empresa activada
2. **Sistema aplica firma** al PDF inmediatamente
3. **Hash recalculado** del PDF con firma empresa
4. **Empleado ve PDF** con firma empresa YA VISIBLE
5. **Empleado firma** sin errores de validación ✅

#### Problemas Resueltos

✅ Error de validación de hash ("documento modificado")
✅ Firma empresa invisible para empleado
✅ Error de compilación (import incorrecto)

#### Archivos Modificados

- `lib/firma-digital/db-helpers.ts` - Core logic
- `app/api/firma/solicitudes/route.ts` - Procesamiento
- `app/api/firma/solicitudes/[solicitudId]/preview/route.ts` - NUEVO
- `app/api/firma/solicitudes/[solicitudId]/pdf-metadata/route.ts` - NUEVO
- `app/firma/solicitar/[documentoId]/solicitar-firma-client.tsx` - UI
- `app/firma/firmar/[firmaId]/firmar-documento-client.tsx` - Vista empleado
- `components/shared/pdf-canvas-viewer.tsx` - Color púrpura
- `prisma/schema.prisma` - Campos nuevos

#### Nota Importante

⚠️ **Solicitudes antiguas** (creadas antes del 2025-12-09) tienen el hash del documento original y NO funcionarán con firma de empresa. Es necesario crear nuevas solicitudes.

---

**Última actualización**: 2025-12-09
**Mantenido por**: Equipo de Desarrollo Clousadmin
**Versión del documento**: 1.1.0

[🔝 Volver al inicio](#)
