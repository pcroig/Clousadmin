# ✍️ Sistema de Firma Digital - Especificación Funcional y Técnica

**Proyecto**: Clousadmin  
**Fecha**: 12 de Noviembre 2025  
**Versión**: 1.0.0 (MVP)  
**Estado**: 📋 Especificación en Definición

---

## 📋 Índice

1. [Contexto e Integraciones](#1-contexto-e-integraciones)
2. [Requisitos Funcionales](#2-requisitos-funcionales)
3. [Arquitectura y Modelos de Datos](#3-arquitectura-y-modelos-de-datos)
4. [Especificación Técnica](#4-especificación-técnica)
5. [Flujos de Uso](#5-flujos-de-uso)
6. [Integraciones con Módulos Existentes](#6-integraciones-con-módulos-existentes)
7. [Proveedores de Firma](#7-proveedores-de-firma)
8. [Seguridad y Cumplimiento](#8-seguridad-y-cumplimiento)

---

## 1. Contexto e Integraciones

### 1.1 Sistemas Existentes

**Sistema de Documentos** (✅ Implementado):
- Carpetas automáticas por empleado (Contratos, Nóminas, Justificantes, Personales, Médicos)
- Upload y descarga de documentos
- Sistema de permisos (HR, Empleados, Managers)
- Carpetas compartidas para políticas empresariales
- Integración con módulos (ausencias, onboarding)

**Sistema de Plantillas** (⏳ En especificación):
- Generación de documentos con variables
- Plantillas oficiales (Contrato, Modelo 145, Justificante Vacaciones)
- Generación masiva para múltiples empleados
- Campo `requiereFirma` en PlantillaDocumento
- Campo `firmado` en DocumentoGenerado

### 1.2 Objetivo de Firma Digital

**Integrar firma electrónica** con ambos sistemas para:

1. **Documentos Existentes** (Sistema de Documentos):
   - HR puede solicitar firma en cualquier documento subido
   - Ejemplo: Contrato subido manualmente → Solicitar firma al empleado

2. **Documentos Generados** (Sistema de Plantillas):
   - Plantilla con `requiereFirma = true` → Solicitud automática de firma
   - Ejemplo: Generar 50 contratos desde plantilla → 50 solicitudes de firma automáticas

3. **Documentos Compartidos** (Carpetas Compartidas):
   - Solicitar firma masiva en políticas empresariales
   - Ejemplo: Nueva política de teletrabajo → Solicitar firma a todos los empleados

---

## 2. Requisitos Funcionales

### 2.1 Requisitos Funcionales - MVP

#### 🎯 PRIORIDAD 1: Solicitud de Firma

**RF-1.1: Solicitar Firma Individual**
- **Actor**: HR Admin
- **Descripción**: HR puede solicitar firma en cualquier documento existente
- **Funcionalidad**:
  - Seleccionar documento desde vista de carpeta
  - Click en "Solicitar Firma"
  - Seleccionar empleado(s) firmante(s)
  - Mensaje opcional (ej: "Por favor firma tu contrato")
  - Fecha límite opcional
  - Crear solicitud de firma
- **Resultado**: Empleado recibe notificación con link de firma

**RF-1.2: Solicitar Firma Masiva**
- **Actor**: HR Admin
- **Descripción**: HR puede solicitar firma a múltiples empleados a la vez
- **Funcionalidad**:
  - Desde documento en carpeta compartida
  - Seleccionar "Solicitar Firma Masiva"
  - Seleccionar empleados:
    - Todos los empleados
    - Por equipo
    - Por departamento
    - Selección manual
  - Configuración global (mensaje, fecha límite)
  - Crear N solicitudes individuales
- **Resultado**: Cada empleado recibe su propia solicitud de firma

**RF-1.3: Firma Automática desde Plantilla**
- **Actor**: Sistema (automático)
- **Descripción**: Al generar documento desde plantilla con `requiereFirma = true`, crear solicitud automáticamente
- **Funcionalidad**:
  - Plantilla tiene flag `requiereFirma = true`
  - Al ejecutar `POST /api/plantillas/[id]/generar`:
    - Genera documento DOCX
    - Crea DocumentoGenerado
    - **Crea SolicitudFirma automáticamente**
    - Envía notificación al empleado
- **Resultado**: Empleado recibe documento + solicitud de firma en un solo paso

---

#### 🎯 PRIORIDAD 2: Proceso de Firma (Empleado)

**RF-2.1: Ver Solicitudes de Firma Pendientes**
- **Actor**: Empleado
- **Descripción**: Empleado puede ver todas sus solicitudes de firma pendientes
- **Funcionalidad**:
  - Sección "Documentos Pendientes de Firma" en `/empleado/mi-espacio/documentos`
  - Badge en menú: "3 documentos por firmar"
  - Lista de documentos con:
    - Nombre del documento
    - Quién solicitó la firma
    - Fecha límite (si aplica)
    - Botón "Firmar Ahora"
- **Resultado**: Empleado ve lista clara de lo que debe firmar

**RF-2.2: Firmar Documento**
- **Actor**: Empleado
- **Descripción**: Empleado puede firmar documento online
- **Funcionalidad**:
  - Click en "Firmar Ahora"
  - Modal con visor de documento (PDF/DOCX)
  - Scroll obligatorio hasta el final (UX)
  - Checkbox: "He leído y acepto este documento"
  - Botón "Firmar Documento"
  - Confirmación: "Documento firmado correctamente"
- **Resultado**: 
  - Firma registrada en BD
  - Documento marcado como firmado
  - HR recibe notificación
  - Empleado puede descargar documento firmado

**RF-2.3: Rechazar Firma (Opcional - Fase 2)**
- **Actor**: Empleado
- **Descripción**: Empleado puede rechazar firmar documento (con motivo)
- **Funcionalidad**:
  - Botón "No puedo firmar este documento"
  - Modal para ingresar motivo
  - Registrar rechazo
  - Notificar a HR
- **Resultado**: HR sabe que empleado rechazó y por qué

---

#### 🎯 PRIORIDAD 3: Tracking y Gestión (HR)

**RF-3.1: Dashboard de Solicitudes de Firma**
- **Actor**: HR Admin
- **Descripción**: Vista consolidada de todas las solicitudes de firma
- **Funcionalidad**:
  - Página `/hr/firmas` con tabla de solicitudes
  - Filtros:
    - Estado: Pendiente, Firmado, Expirado
    - Documento: Contratos, Políticas, etc.
    - Empleado: Búsqueda
    - Fecha: Rango
  - Columnas:
    - Documento
    - Empleado
    - Solicitado por
    - Estado
    - Fecha solicitud
    - Fecha firma
    - Acciones (Ver, Recordar, Cancelar)
- **Resultado**: HR tiene visibilidad total de firmas pendientes

**RF-3.2: Ver Progreso de Firma Masiva**
- **Actor**: HR Admin
- **Descripción**: Ver progreso de firma masiva (ej: política empresarial)
- **Funcionalidad**:
  - Card especial para solicitudes masivas
  - Barra de progreso: "85/100 empleados han firmado"
  - Lista de firmantes vs no firmantes
  - Botón "Enviar Recordatorio a Pendientes"
  - Exportar lista a CSV
- **Resultado**: HR sabe exactamente quién falta por firmar

**RF-3.3: Recordatorios Manuales**
- **Actor**: HR Admin
- **Descripción**: HR puede enviar recordatorio manual a empleados pendientes
- **Funcionalidad**:
  - Desde dashboard, seleccionar solicitudes pendientes
  - Click "Enviar Recordatorio"
  - Empleados reciben nueva notificación
  - Registro de recordatorio enviado
- **Resultado**: HR puede acelerar el proceso de firma

---

#### 🎯 PRIORIDAD 4: Automatizaciones

**RF-4.1: Recordatorios Automáticos**
- **Actor**: Sistema (cron job)
- **Descripción**: Sistema envía recordatorios automáticos según configuración
- **Funcionalidad**:
  - Recordatorio 1: +3 días sin firmar
  - Recordatorio 2: +7 días sin firmar
  - Recordatorio 3: +14 días (solo si hay fecha límite)
  - Notificación a HR si se expira sin firmar
- **Resultado**: Maximiza tasa de firma sin intervención manual

**RF-4.2: Expiración Automática**
- **Actor**: Sistema (cron job)
- **Descripción**: Marcar solicitudes como expiradas si pasa fecha límite
- **Funcionalidad**:
  - Cron job diario revisa solicitudes con `fechaLimite`
  - Si `fechaLimite < hoy` y `estado != firmado`:
    - Cambiar estado a "expirado"
    - Notificar a HR
    - No permitir firma después de expiración
- **Resultado**: Cumplimiento de deadlines

**RF-4.3: Notificaciones Integradas**
- **Actor**: Sistema
- **Descripción**: Notificaciones para todos los eventos de firma
- **Eventos**:
  - Empleado: Nueva solicitud de firma
  - Empleado: Recordatorio de firma pendiente
  - Empleado: Solicitud expirada
  - HR: Documento firmado
  - HR: Empleado rechazó firma
  - HR: Solicitud expirada sin firmar
- **Canales**:
  - In-app (sistema de notificaciones existente)
  - Email (opcional, configurable)
- **Resultado**: Todos informados en tiempo real

---

### 2.2 Requisitos No Funcionales

**RNF-1: Rendimiento**
- Firma de documento: <2 segundos
- Generación masiva con firma: <30 segundos para 50 documentos
- Dashboard carga: <1 segundo

**RNF-2: Seguridad**
- Firma con certificado SHA-256
- Registro de IP y User-Agent del firmante
- Auditoría completa de todas las acciones
- Solo el empleado asignado puede firmar

**RNF-3: Cumplimiento Legal**
- Registro de fecha y hora exacta de firma
- Certificado de firma generado y almacenado
- Trazabilidad completa (GDPR/LOPD)
- Firma simple válida según eIDAS (Nivel 1)

**RNF-4: Usabilidad**
- Proceso de firma: <2 minutos
- Interfaz responsive (mobile-friendly)
- Accesibilidad WCAG 2.1 AA

---

## 3. Arquitectura y Modelos de Datos

### 3.1 Modelos de Datos (Prisma Schema)

#### Modelo: `SolicitudFirma`

```prisma
/// SolicitudFirma - Tracking de solicitudes de firma de documentos
model SolicitudFirma {
  id          String @id @default(uuid())
  empresaId   String
  documentoId String
  
  // Solicitante
  solicitadoPor String  // Usuario ID (HR Admin)
  solicitadoEn  DateTime @default(now())
  
  // Configuración de la solicitud
  mensaje        String? @db.Text // Mensaje opcional al empleado
  fechaLimite    DateTime? // Fecha límite para firmar (opcional)
  requiereOrden  Boolean @default(false) // Firma secuencial (Fase 2)
  
  // Estado general de la solicitud
  // Estados: pendiente (al menos 1 sin firmar), completada (todos firmaron), 
  //          expirada (pasó fecha límite), cancelada (HR canceló)
  estado String @default("pendiente") @db.VarChar(50)
  
  // Tipo de solicitud (para tracking)
  tipo String @default("individual") @db.VarChar(50) // individual, masiva, automatica
  
  // Proveedor de firma (para fase 2)
  proveedor String @default("interno") @db.VarChar(50) // interno, lleida, docusign
  
  // Timestamps
  completadaEn DateTime? // Cuando todos firmaron
  expiradaEn   DateTime? // Cuando expiró
  canceladaEn  DateTime? // Cuando HR canceló
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  empresa   Empresa   @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  documento Documento @relation(fields: [documentoId], references: [id], onDelete: Cascade)
  firmas    Firma[]   // Array de firmas individuales
  
  @@index([empresaId])
  @@index([documentoId])
  @@index([estado])
  @@index([fechaLimite])
  @@index([tipo])
  @@map("solicitudes_firma")
}
```

#### Modelo: `Firma`

```prisma
/// Firma - Tracking individual de firma por empleado
model Firma {
  id                String @id @default(uuid())
  solicitudFirmaId  String
  empleadoId        String
  
  // Estado individual de esta firma
  // Estados: pendiente, visto, firmado, rechazado, expirado
  estado String @default("pendiente") @db.VarChar(50)
  
  // Tracking de eventos
  enviadoEn   DateTime  @default(now())
  firmadoEn   DateTime? // Cuando firmó
  rechazadoEn DateTime? // Si rechazó (Fase 2)
  
  // Datos de firma (para auditoría y validez legal)
  ipAddress String? @db.VarChar(50)   // IP desde donde firmó
  userAgent String? @db.Text          // Navegador usado
  ubicacion Json?                      // Geolocation opcional (lat, lon, city)
  
  // Certificado de firma digital
  certificado   String? @db.Text      // Hash SHA-256 del documento + timestamp
  metodoFirma   String? @db.VarChar(50) // click, biometrica, otp, certificado
  
  // Recordatorios enviados
  numRecordatorios Int @default(0)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  solicitud SolicitudFirma @relation(fields: [solicitudFirmaId], references: [id], onDelete: Cascade)
  empleado  Empleado       @relation(fields: [empleadoId], references: [id], onDelete: Cascade)
  
  @@unique([solicitudFirmaId, empleadoId]) // Un empleado solo firma una vez por solicitud
  @@index([solicitudFirmaId])
  @@index([empleadoId])
  @@index([estado])
  @@index([firmadoEn])
  @@map("firmas")
}
```

### 3.2 Modificaciones en Modelos Existentes

```prisma
// ========================================
// Modificar modelo Documento
// ========================================
model Documento {
  // ... campos existentes ...
  
  // Nuevas relaciones de firma
  solicitudesFirma SolicitudFirma[]
  
  // Nuevos campos para tracking de firma
  requiereFirma Boolean  @default(false) // Si este documento requiere firma
  firmado       Boolean  @default(false) // Si fue firmado
  fechaFirma    DateTime? // Fecha de última firma
  
  // ... resto de campos y relaciones existentes ...
}

// ========================================
// Modificar modelo Empleado
// ========================================
model Empleado {
  // ... campos existentes ...
  
  // Nueva relación con firmas
  firmas Firma[]
  
  // ... resto de campos y relaciones existentes ...
}

// ========================================
// Modificar modelo Empresa
// ========================================
model Empresa {
  // ... campos existentes ...
  
  // Nueva relación con solicitudes de firma
  solicitudesFirma SolicitudFirma[]
  
  // Configuración de firma (JSONB para flexibilidad)
  configFirma Json? @default("{\"proveedor\":\"interno\",\"recordatoriosDias\":[3,7,14],\"expirarSinFirma\":false}")
  // Ejemplo: 
  // {
  //   "proveedor": "interno" | "lleida" | "docusign",
  //   "apiKey": "xxx", // Si es proveedor externo
  //   "recordatoriosDias": [3, 7, 14],
  //   "expirarSinFirma": false,
  //   "requiereFechaLimite": false
  // }
  
  // ... resto de campos y relaciones existentes ...
}

// ========================================
// Modificar modelo DocumentoGenerado (de Plantillas)
// ========================================
model DocumentoGenerado {
  // ... campos existentes ...
  
  // Los campos requiereFirma, firmado, firmadoEn ya están definidos en especificación de plantillas
  // No hace falta modificar, ya están listos
  
  // ... resto de campos y relaciones existentes ...
}
```

---

## 4. Especificación Técnica

### 4.1 APIs a Implementar

#### `POST /api/firmas/solicitar`

**Descripción**: Crear solicitud de firma para documento existente

**Body**:
```typescript
{
  documentoId: string;
  empleadoIds: string[]; // Array de IDs de empleados
  mensaje?: string;
  fechaLimite?: string; // ISO date
  tipo: "individual" | "masiva";
}
```

**Proceso**:
1. Validar permisos (solo HR Admin)
2. Validar que documento existe
3. Validar que empleados existen y pertenecen a la empresa
4. Crear SolicitudFirma
5. Para cada empleadoId:
   - Crear registro Firma
   - Enviar notificación al empleado
6. Retornar solicitud creada

**Response**:
```typescript
{
  success: true,
  solicitud: {
    id: "uuid",
    documentoId: "uuid",
    estado: "pendiente",
    firmas: [
      { empleadoId: "uuid", estado: "pendiente", enviadoEn: "2025-11-12T10:00:00Z" }
    ]
  }
}
```

---

#### `POST /api/firmas/[firmaId]/firmar`

**Descripción**: Firmar documento (empleado)

**Body**:
```typescript
{
  aceptado: boolean; // true = firma, false = rechaza
}
```

**Proceso**:
1. Validar que firma existe y pertenece al empleado autenticado
2. Validar que estado es "pendiente" o "visto"
3. Validar que no está expirada
4. Si aceptado = true:
   - Generar certificado de firma (hash SHA-256)
   - Registrar IP, User-Agent, ubicación
   - Actualizar estado a "firmado"
   - Actualizar Documento.firmado = true (si todos firmaron)
   - Si es de plantilla: Actualizar DocumentoGenerado.firmado = true
   - Enviar notificación a HR
5. Si aceptado = false:
   - Actualizar estado a "rechazado"
   - Enviar notificación a HR
6. Verificar si solicitud está completada (todos firmaron)
7. Retornar firma actualizada

**Response**:
```typescript
{
  success: true,
  firma: {
    id: "uuid",
    estado: "firmado",
    firmadoEn: "2025-11-12T14:30:00Z",
    certificado: "abc123..."
  }
}
```

---

#### `GET /api/firmas/pendientes`

**Descripción**: Listar firmas pendientes del empleado autenticado

**Query Params**:
- `incluirFirmadas`: boolean (default: false)

**Response**:
```typescript
{
  success: true,
  firmas: [
    {
      id: "uuid",
      solicitudFirma: {
        id: "uuid",
        mensaje: "Por favor firma tu contrato",
        fechaLimite: "2025-11-20T23:59:59Z",
        documento: {
          id: "uuid",
          nombre: "Contrato_Juan_Perez.docx",
          url: "/api/documentos/uuid"
        }
      },
      estado: "pendiente",
      enviadoEn: "2025-11-12T10:00:00Z"
    }
  ],
  total: 3
}
```

---

#### `GET /api/firmas/solicitudes`

**Descripción**: Listar solicitudes de firma (HR Admin)

**Query Params**:
- `estado`: pendiente | completada | expirada | cancelada
- `tipo`: individual | masiva | automatica
- `empleadoId`: UUID (filtrar por empleado)
- `documentoId`: UUID (filtrar por documento)

**Response**:
```typescript
{
  success: true,
  solicitudes: [
    {
      id: "uuid",
      documento: {
        nombre: "Política Teletrabajo 2025",
        carpeta: { nombre: "Políticas" }
      },
      tipo: "masiva",
      estado: "pendiente",
      solicitadoPor: { nombre: "María HR" },
      solicitadoEn: "2025-11-10T09:00:00Z",
      fechaLimite: "2025-11-25T23:59:59Z",
      firmas: [
        { empleado: { nombre: "Juan" }, estado: "firmado", firmadoEn: "..." },
        { empleado: { nombre: "Ana" }, estado: "pendiente", enviadoEn: "..." }
      ],
      estadisticas: {
        total: 100,
        firmados: 85,
        pendientes: 15,
        porcentaje: 85
      }
    }
  ]
}
```

---

#### `POST /api/firmas/solicitudes/[solicitudId]/recordar`

**Descripción**: Enviar recordatorio manual a empleados pendientes

**Response**:
```typescript
{
  success: true,
  recordatoriosEnviados: 15
}
```

---

#### `DELETE /api/firmas/solicitudes/[solicitudId]`

**Descripción**: Cancelar solicitud de firma (HR Admin)

**Proceso**:
1. Validar permisos
2. Cambiar estado a "cancelada"
3. Notificar a empleados pendientes que se canceló
4. Retornar confirmación

---

### 4.2 Utilidades y Funciones Helper

#### `lib/firmas/generar-certificado.ts`

```typescript
import crypto from 'crypto';

/**
 * Genera certificado de firma digital (firma simple)
 * 
 * @param documentoId - ID del documento firmado
 * @param empleadoId - ID del empleado que firma
 * @param timestamp - Timestamp de la firma
 * @returns Hash SHA-256 como certificado
 */
export function generarCertificadoFirma(
  documentoId: string,
  empleadoId: string,
  timestamp: Date
): string {
  // Crear firma digital simple con datos del evento
  const dataToSign = `${documentoId}|${empleadoId}|${timestamp.toISOString()}`;
  
  // Hash SHA-256
  const hash = crypto.createHash('sha256').update(dataToSign).digest('hex');
  
  return hash;
}

/**
 * Verifica certificado de firma
 */
export function verificarCertificadoFirma(
  certificado: string,
  documentoId: string,
  empleadoId: string,
  timestamp: Date
): boolean {
  const expectedHash = generarCertificadoFirma(documentoId, empleadoId, timestamp);
  return certificado === expectedHash;
}
```

---

#### `lib/firmas/agregar-marca-visual.ts`

```typescript
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Agrega marca visual de firma a PDF
 * 
 * @param pdfBuffer - Buffer del PDF original
 * @param firmaData - Datos de la firma
 * @returns Buffer del PDF con marca visual
 */
export async function agregarMarcaVisualFirma(
  pdfBuffer: Buffer,
  firmaData: {
    empleadoNombre: string;
    firmadoEn: Date;
    certificado: string;
  }
): Promise<Buffer> {
  // Cargar PDF
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  
  // Última página
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  
  // Font
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 8;
  
  // Texto de firma
  const textoFirma = `Firmado digitalmente por ${firmaData.empleadoNombre}`;
  const textoFecha = `Fecha: ${firmaData.firmadoEn.toLocaleString('es-ES')}`;
  const textoCertificado = `Certificado: ${firmaData.certificado.substring(0, 16)}...`;
  
  // Agregar al PDF (esquina inferior derecha)
  const { width, height } = lastPage.getSize();
  const x = width - 250;
  const y = 50;
  
  lastPage.drawText(textoFirma, {
    x,
    y,
    size: fontSize,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  lastPage.drawText(textoFecha, {
    x,
    y: y - 12,
    size: fontSize,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  lastPage.drawText(textoCertificado, {
    x,
    y: y - 24,
    size: fontSize,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
  
  // Generar buffer
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
```

---

#### `lib/firmas/recordatorios.ts`

```typescript
/**
 * Enviar recordatorios automáticos de firma
 * Cron job que se ejecuta diariamente
 */
export async function enviarRecordatoriosFirma() {
  console.log('[recordatorios-firma] Iniciando envío de recordatorios...');
  
  const ahora = new Date();
  
  // Obtener firmas pendientes que necesitan recordatorio
  const firmasPendientes = await prisma.firma.findMany({
    where: {
      estado: 'pendiente',
      solicitud: {
        estado: 'pendiente',
        fechaLimite: {
          gte: ahora // Solo si no está expirada
        }
      }
    },
    include: {
      solicitud: {
        include: {
          documento: true,
        }
      },
      empleado: {
        include: {
          usuario: true
        }
      }
    }
  });
  
  const configEmpresa = await obtenerConfigFirmaEmpresa(empresaId);
  const diasRecordatorio = configEmpresa.recordatoriosDias || [3, 7, 14];
  
  let recordatoriosEnviados = 0;
  
  for (const firma of firmasPendientes) {
    const diasDesdeEnvio = Math.floor(
      (ahora.getTime() - firma.enviadoEn.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Verificar si corresponde enviar recordatorio
    if (diasRecordatorio.includes(diasDesdeEnvio)) {
      // Enviar recordatorio
      await prisma.notificacion.create({
        data: {
          empresaId: firma.solicitud.empresaId,
          usuarioId: firma.empleado.usuarioId,
          tipo: 'warning',
          titulo: 'Recordatorio: Documento pendiente de firma',
          mensaje: `Tienes un documento pendiente de firma: ${firma.solicitud.documento.nombre}`,
          metadata: {
            firmaId: firma.id,
            solicitudId: firma.solicitudFirmaId,
            documentoId: firma.solicitud.documentoId,
          }
        }
      });
      
      // Actualizar contador
      await prisma.firma.update({
        where: { id: firma.id },
        data: {
          recordatoriosEnviados: { increment: 1 },
          ultimoRecordatorio: ahora
        }
      });
      
      recordatoriosEnviados++;
    }
  }
  
  console.log(`[recordatorios-firma] Enviados ${recordatoriosEnviados} recordatorios`);
  
  return recordatoriosEnviados;
}
```

---

### 4.3 Cron Jobs

**Archivo**: `lib/cron/firma-digital.ts`

```typescript
import cron from 'node-cron';
import { enviarRecordatoriosFirma } from '@/lib/firmas/recordatorios';
import { expirarSolicitudesFirma } from '@/lib/firmas/expiracion';

/**
 * Cron job diario para recordatorios y expiraciones de firma
 * Se ejecuta todos los días a las 9:00 AM
 */
export function iniciarCronFirmaDigital() {
  // Recordatorios diarios a las 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] Ejecutando recordatorios de firma...');
    await enviarRecordatoriosFirma();
  });
  
  // Expiración de solicitudes a las 0:00 AM
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Verificando solicitudes expiradas...');
    await expirarSolicitudesFirma();
  });
  
  console.log('[CRON] Firma digital: Jobs programados correctamente');
}
```

---

## 5. Flujos de Uso

### 5.1 Flujo: HR Solicita Firma en Documento Existente

```
ESCENARIO: HR tiene un contrato subido manualmente y necesita que el empleado lo firme

1. HR → Navega a /hr/documentos
2. HR → Abre carpeta "Contratos"
3. HR → Ve documento "Contrato_Juan_2025.pdf"
4. HR → Click en menú (⋮) → "Solicitar Firma"
5. Modal se abre:
   ┌────────────────────────────────────────┐
   │ Solicitar Firma                        │
   │                                        │
   │ Documento: Contrato_Juan_2025.pdf     │
   │                                        │
   │ Firmante(s):                           │
   │ [🔍 Buscar empleado...]                │
   │ ✅ Juan Pérez                          │
   │                                        │
   │ Mensaje (opcional):                    │
   │ [Por favor firma tu contrato laboral] │
   │                                        │
   │ Fecha límite (opcional):               │
   │ [📅 20/11/2025]                        │
   │                                        │
   │         [Cancelar] [Enviar Solicitud]  │
   └────────────────────────────────────────┘
6. HR → Click "Enviar Solicitud"
7. Sistema:
   a. Crea SolicitudFirma
   b. Crea Firma para Juan
   c. Envía notificación a Juan
   d. Actualiza Documento.requiereFirma = true
8. HR ve confirmación: "Solicitud enviada correctamente"
9. Documento ahora tiene badge "⏳ Pendiente de firma"

10. Juan → Recibe notificación in-app y email
11. Juan → Click en notificación
12. Redirige a /empleado/mi-espacio/documentos/firmas-pendientes
13. Juan ve documento en lista
14. Juan → Click "Firmar Ahora"
15. Modal de firma:
    ┌────────────────────────────────────────┐
    │ Firmar Documento                       │
    │                                        │
    │ [📄 Visor del PDF]                     │
    │                                        │
    │ ✅ He leído y acepto este documento    │
    │                                        │
    │         [Cancelar] [Firmar Documento]  │
    └────────────────────────────────────────┘
16. Juan → Scroll obligatorio hasta el final
17. Juan → Check "He leído y acepto"
18. Juan → Click "Firmar Documento"
19. Sistema:
    a. Registra firma con timestamp, IP, User-Agent
    b. Genera certificado SHA-256
    c. Actualiza Firma.estado = "firmado"
    d. Actualiza Documento.firmado = true
    e. Agrega marca visual al PDF (opcional)
    f. Notifica a HR
20. Juan ve: "✅ Documento firmado correctamente"
21. Juan puede descargar documento firmado

22. HR → Recibe notificación: "Juan Pérez firmó Contrato_Juan_2025.pdf"
23. HR → Ve en dashboard que documento está firmado ✅
```

---

### 5.2 Flujo: Generación desde Plantilla con Firma Automática

```
ESCENARIO: HR genera contratos desde plantilla, automáticamente solicita firmas

1. HR → Navega a /hr/plantillas
2. HR → Selecciona plantilla "Contrato Indefinido"
3. Sistema muestra: "⚠️ Esta plantilla requiere firma digital"
4. HR → Click "Generar Documentos"
5. Modal de generación:
   ┌────────────────────────────────────────┐
   │ Generar: Contrato Indefinido           │
   │                                        │
   │ Empleados:                             │
   │ ✅ Juan Pérez                          │
   │ ✅ Ana García                          │
   │ ✅ Carlos López                        │
   │                                        │
   │ ⚠️ Se solicitará firma automáticamente │
   │                                        │
   │ Fecha límite de firma:                 │
   │ [📅 30/11/2025]                        │
   │                                        │
   │              [Cancelar] [Generar]      │
   └────────────────────────────────────────┘
6. HR → Click "Generar"
7. Sistema (automático):
   Para cada empleado:
   a. Genera documento desde plantilla
   b. Crea Documento en BD
   c. Crea DocumentoGenerado con requiereFirma = true
   d. Crea SolicitudFirma automáticamente
   e. Crea Firma para empleado
   f. Envía notificación al empleado
8. HR ve resumen:
   "✅ 3 documentos generados
    ✉️ 3 solicitudes de firma enviadas"

9. Empleados (Juan, Ana, Carlos) → Reciben notificación
10. Cada empleado sigue flujo de firma normal (ver flujo anterior)

11. HR → Navega a /hr/firmas
12. HR ve dashboard:
    ┌────────────────────────────────────────────────┐
    │ Solicitudes de Firma                          │
    │                                               │
    │ 📄 Contrato Indefinido (Masiva)               │
    │ ├─ Progreso: 2/3 firmados (67%)              │
    │ ├─ ✅ Juan Pérez - Firmado 12/11 14:30       │
    │ ├─ ✅ Ana García - Firmado 12/11 16:45       │
    │ └─ ⏳ Carlos López - Pendiente               │
    │                                               │
    │ [Enviar Recordatorio a Carlos]                │
    └────────────────────────────────────────────────┘
```

---

### 5.3 Flujo: Firma Masiva de Política Empresarial

```
ESCENARIO: Nueva política de teletrabajo, todos deben firmar

1. HR → Sube documento "Política_Teletrabajo_2025.pdf" a carpeta "Compartidos"
2. HR → Click "Solicitar Firma Masiva"
3. Modal:
   ┌────────────────────────────────────────┐
   │ Solicitar Firma Masiva                 │
   │                                        │
   │ Documento: Política_Teletrabajo_2025   │
   │                                        │
   │ Firmantes:                             │
   │ ● Todos los empleados (127)            │
   │ ○ Por equipo                           │
   │ ○ Por departamento                     │
   │ ○ Selección manual                     │
   │                                        │
   │ Mensaje:                               │
   │ [Nueva política de teletrabajo]        │
   │                                        │
   │ Fecha límite:                          │
   │ [📅 30/11/2025]                        │
   │                                        │
   │        [Cancelar] [Enviar a 127 empleados] │
   └────────────────────────────────────────┘
4. HR → Click "Enviar"
5. Sistema:
   a. Crea 1 SolicitudFirma con tipo="masiva"
   b. Crea 127 Firmas individuales
   c. Envía 127 notificaciones
6. HR ve confirmación: "✅ Solicitud enviada a 127 empleados"

7. Empleados → Reciben notificación
8. Empleados → Van firmando progresivamente

9. HR → Navega a /hr/firmas
10. HR ve dashboard en tiempo real:
    ┌────────────────────────────────────────────────┐
    │ 📄 Política Teletrabajo 2025                   │
    │                                                │
    │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░ 85/127 (67%)            │
    │                                                │
    │ ✅ Firmados: 85                                │
    │ ⏳ Pendientes: 42                              │
    │                                                │
    │ [Ver Lista Detallada]                          │
    │ [Enviar Recordatorio a Pendientes]             │
    │ [Exportar CSV]                                 │
    └────────────────────────────────────────────────┘

11. HR → Click "Enviar Recordatorio a Pendientes"
12. Sistema envía recordatorio a 42 empleados pendientes

13. Después de 3 días:
    - Sistema envía recordatorio automático
    - Progreso: 120/127 (94%)

14. Al llegar a 30/11:
    - Sistema marca 7 solicitudes como "expirado"
    - Notifica a HR: "7 empleados no firmaron antes de la fecha límite"
    - HR puede reenviar o gestionar manualmente
```

---

## 6. Integraciones con Módulos Existentes

### 6.1 Integración con Sistema de Documentos

**Modificación**: Agregar botón "Solicitar Firma" en vista de documento

**Archivo**: `app/(dashboard)/hr/documentos/[id]/carpeta-detail-client.tsx`

```typescript
// Agregar acción en menú de documento
{documento.tipoDocumento === 'contrato' && (
  <DropdownMenuItem
    onClick={() => solicitarFirma(documento.id)}
  >
    <FileSignature className="mr-2 h-4 w-4" />
    Solicitar Firma
  </DropdownMenuItem>
)}

// Handler
const solicitarFirma = async (documentoId: string) => {
  setModalFirma({ open: true, documentoId });
};
```

**Nuevo Componente**: `components/hr/solicitar-firma-modal.tsx`

```typescript
'use client';

export function SolicitarFirmaModal({ 
  open, 
  onClose, 
  documentoId 
}: Props) {
  // Formulario para solicitar firma
  // - Selector de empleados
  // - Mensaje opcional
  // - Fecha límite
  // - Submit → POST /api/firmas/solicitar
}
```

---

### 6.2 Integración con Sistema de Plantillas

**Modificación**: Al generar desde plantilla con `requiereFirma = true`, crear solicitud automática

**Archivo**: `app/api/plantillas/[id]/generar/route.ts`

```typescript
// Después de generar cada documento
if (plantilla.requiereFirma) {
  // Crear solicitud de firma automática
  const solicitudFirma = await prisma.solicitudFirma.create({
    data: {
      empresaId: session.user.empresaId,
      documentoId: documento.id,
      solicitadoPor: session.user.id,
      tipo: 'automatica',
      estado: 'pendiente',
      fechaLimite: configuracion.fechaLimiteFirma, // Opcional
    }
  });
  
  // Crear firma para el empleado
  await prisma.firma.create({
    data: {
      solicitudFirmaId: solicitudFirma.id,
      empleadoId: empleadoId,
      estado: 'pendiente',
    }
  });
  
  // Notificar al empleado
  await prisma.notificacion.create({
    data: {
      empresaId: session.user.empresaId,
      usuarioId: empleadoId,
      tipo: 'info',
      titulo: 'Nuevo documento para firmar',
      mensaje: `Tienes un nuevo documento pendiente de firma: ${documento.nombre}`,
      metadata: {
        firmaId: firma.id,
        documentoId: documento.id,
      }
    }
  });
}
```

---

### 6.3 Integración con Onboarding

**Modificación**: Al finalizar onboarding, solicitar firma de contrato automáticamente

**Archivo**: `app/api/onboarding/[token]/completar/route.ts`

```typescript
// Después de completar onboarding
// Si hay contrato generado
const contrato = await prisma.documento.findFirst({
  where: {
    empleadoId: onboarding.empleadoId,
    tipoDocumento: 'contrato',
  },
  orderBy: { createdAt: 'desc' }
});

if (contrato) {
  // Solicitar firma del contrato
  await solicitarFirmaDocumento({
    documentoId: contrato.id,
    empleadoId: onboarding.empleadoId,
    empresaId: onboarding.empresaId,
    mensaje: 'Bienvenido! Por favor firma tu contrato laboral',
    tipo: 'automatica'
  });
}
```

---

### 6.4 Integración con Notificaciones

**Modificación**: Agregar nuevos tipos de notificación

**Tipos de Notificación**:
- `firma_solicitada`: Nueva solicitud de firma
- `firma_recordatorio`: Recordatorio de firma pendiente
- `firma_expirada`: Solicitud expiró sin firmar
- `firma_completada`: Documento firmado (para HR)
- `firma_rechazada`: Empleado rechazó firma (para HR)

---

## 7. Proveedores de Firma

### 7.1 Firma Simple Interna (MVP)

**Implementación**:
```typescript
// lib/firmas/firma-interna.ts
export async function firmarDocumentoInterno(
  documentoId: string,
  empleadoId: string
): Promise<{ certificado: string; documentoFirmado: Buffer }> {
  // 1. Obtener documento
  const documento = await prisma.documento.findUnique({
    where: { id: documentoId },
    include: { empleado: true }
  });
  
  // 2. Descargar archivo
  const buffer = await descargarDocumento(documento.s3Key);
  
  // 3. Generar certificado
  const timestamp = new Date();
  const certificado = generarCertificadoFirma(documentoId, empleadoId, timestamp);
  
  // 4. Agregar marca visual al PDF
  const bufferFirmado = await agregarMarcaVisualFirma(buffer, {
    empleadoNombre: `${documento.empleado.nombre} ${documento.empleado.apellidos}`,
    firmadoEn: timestamp,
    certificado
  });
  
  // 5. Subir documento firmado (reemplazar original o crear nuevo)
  const s3KeyFirmado = documento.s3Key.replace('.pdf', '_firmado.pdf');
  await subirDocumento(bufferFirmado, s3KeyFirmado);
  
  // 6. Actualizar BD
  await prisma.documento.update({
    where: { id: documentoId },
    data: {
      firmado: true,
      fechaFirma: timestamp,
      s3Key: s3KeyFirmado // Actualizar a documento firmado
    }
  });
  
  return { certificado, documentoFirmado: bufferFirmado };
}
```

**Validez Legal**:
- ✅ Firma electrónica simple según eIDAS (Nivel 1)
- ✅ Válida para documentos internos
- ✅ Trazabilidad completa (timestamp, IP, certificado)
- ⚠️ No es firma avanzada ni cualificada
- ⚠️ Menor peso en litigios legales

---

### 7.2 Lleidanetworks (Fase 2)

**Setup**:
```bash
npm install @lleida/signature-sdk
```

**Implementación**:
```typescript
// lib/firmas/lleida-client.ts
import { LleidaSignature } from '@lleida/signature-sdk';

const lleida = new LleidaSignature({
  apiKey: process.env.LLEIDA_API_KEY,
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
});

export async function solicitarFirmaLleida(
  documentoBuffer: Buffer,
  empleado: { email: string; nombre: string },
  config: { mensaje?: string; fechaLimite?: Date }
): Promise<{ envelopeId: string; accessUrl: string }> {
  // Crear envelope de firma
  const envelope = await lleida.createEnvelope({
    document: {
      name: 'documento.pdf',
      content: documentoBuffer.toString('base64'),
      format: 'pdf'
    },
    signers: [
      {
        email: empleado.email,
        name: empleado.nombre,
        language: 'es',
        signatureType: 'cualificada' // Máximo nivel legal
      }
    ],
    expirationDate: config.fechaLimite,
    message: config.mensaje,
    callbackUrl: `${process.env.APP_URL}/api/firmas/webhook/lleida`
  });
  
  return {
    envelopeId: envelope.id,
    accessUrl: envelope.signers[0].accessUrl
  };
}

// Webhook para recibir notificaciones de Lleida
export async function webhookLleida(payload: LleidaWebhookPayload) {
  const { envelopeId, status, signerId } = payload;
  
  // Buscar solicitud por envelopeId
  const solicitud = await prisma.solicitudFirma.findFirst({
    where: {
      proveedorData: {
        path: ['envelopeId'],
        equals: envelopeId
      }
    },
    include: { firmas: true }
  });
  
  if (!solicitud) return;
  
  // Actualizar estado según webhook
  if (status === 'signed') {
    // Empleado firmó
    const firma = solicitud.firmas.find(f => 
      f.proveedorData?.signerId === signerId
    );
    
    if (firma) {
      await prisma.firma.update({
        where: { id: firma.id },
        data: {
          estado: 'firmado',
          firmadoEn: new Date(),
          certificado: payload.certificateHash
        }
      });
      
      // Descargar documento firmado de Lleida
      const documentoFirmado = await lleida.downloadSignedDocument(envelopeId);
      
      // Subir a S3
      // Actualizar BD
      // Notificar a HR
    }
  }
}
```

**Costes**:
- Plan SMB: ~25-35 €/usuario/mes
- Firmas ilimitadas
- Firma cualificada incluida
- Soporte técnico

---

## 8. Seguridad y Cumplimiento

### 8.1 Cumplimiento eIDAS (Reglamento UE)

**Niveles de Firma Electrónica** (eIDAS):

1. **Firma Electrónica Simple**:
   - Datos en formato electrónico anexos a otros datos
   - Nuestro MVP implementa este nivel
   - Válida para contratos laborales internos
   - Menor peso en litigios

2. **Firma Electrónica Avanzada**:
   - Vinculada únicamente al firmante
   - Capaz de identificar al firmante
   - Creada bajo control exclusivo del firmante
   - Lleidanetworks, DocuSign proveen este nivel

3. **Firma Electrónica Cualificada**:
   - Firma avanzada + certificado cualificado
   - Máxima validez legal (equivalente a manuscrita)
   - Lleidanetworks provee este nivel

**Nuestra Implementación MVP**:
- ✅ Firma Simple (Nivel 1)
- ✅ Timestamp preciso
- ✅ Identificación del firmante (empleadoId)
- ✅ IP y User-Agent registrados
- ✅ Certificado SHA-256 generado
- ✅ Documento no modificable después de firma

---

### 8.2 GDPR/LOPD

**Datos Personales Tratados**:
- Nombre del firmante
- Email del firmante
- IP del firmante
- User-Agent del navegador
- Timestamp de firma
- Ubicación (opcional)

**Base Legal**:
- **Artículo 6.1.b**: Ejecución de contrato (contratos laborales)
- **Artículo 6.1.a**: Consentimiento (políticas internas)

**Auditoría** (Tabla `AuditoriaAcceso`):
```typescript
// Al firmar documento
await prisma.auditoriaAcceso.create({
  data: {
    empresaId: session.user.empresaId,
    usuarioId: empleadoId,
    accion: 'firma_documento',
    recurso: 'documento',
    camposAccedidos: ['documento', 'firma_digital'],
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    motivo: `Firma de documento: ${documento.nombre}`
  }
});
```

**Derecho al Olvido**:
- Si empleado solicita eliminación de datos
- Mantener registro de firma (obligación legal)
- Anonimizar datos personales (nombre → "Usuario Eliminado")

---

### 8.3 Conservación de Documentos

**Plazos Legales** (España):
- Contratos laborales: 4 años (mínimo)
- Documentos fiscales: 4-6 años
- Nóminas: 4 años

**Implementación**:
- Documentos firmados NO se pueden eliminar antes del plazo
- Validación en `DELETE /api/documentos/[id]`:
  ```typescript
  if (documento.firmado) {
    const añosConservacion = 4;
    const fechaMinEliminacion = addYears(documento.fechaFirma, añosConservacion);
    
    if (new Date() < fechaMinEliminacion) {
      throw new Error('No se puede eliminar documento firmado antes de 4 años');
    }
  }
  ```

---

## 9. UI/UX - Componentes y Páginas

### 9.1 Página: `/hr/firmas` (Dashboard HR)

```
┌─────────────────────────────────────────────────────────┐
│ ✍️ Solicitudes de Firma                                 │
├─────────────────────────────────────────────────────────┤
│ [Pendientes] [Firmadas] [Expiradas] [Todas]            │
│                                                         │
│ 🔍 Buscar por documento o empleado...                  │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 📄 Política Teletrabajo 2025           [Masiva]        │
│ ├─ Solicitado: 10/11/2025 por María HR                │
│ ├─ Progreso: ▓▓▓▓▓▓▓▓▓░░░ 85/127 (67%)               │
│ ├─ Fecha límite: 30/11/2025 (18 días restantes)       │
│ └─ [Ver Detalle] [Recordar Pendientes] [Exportar]     │
│                                                         │
│ 📄 Contrato_Juan_Perez.pdf             [Individual]    │
│ ├─ Solicitado: 12/11/2025 por Ana HR                  │
│ ├─ Estado: ✅ Firmado el 12/11/2025 14:30             │
│ └─ [Ver Certificado]                                   │
│                                                         │
│ 📄 Modelo_145_Ana_Garcia.pdf           [Automática]    │
│ ├─ Solicitado: 11/11/2025 (desde plantilla)           │
│ ├─ Estado: ⏳ Pendiente (Enviado hace 1 día)          │
│ ├─ Recordatorios enviados: 0                           │
│ └─ [Enviar Recordatorio] [Cancelar]                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### 9.2 Página: `/empleado/mi-espacio/documentos/firmas-pendientes`

```
┌─────────────────────────────────────────────────────────┐
│ ✍️ Documentos Pendientes de Firma                       │
├─────────────────────────────────────────────────────────┤
│ Tienes 3 documentos pendientes de firma                │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 📄 Contrato_Juan_Perez.docx                            │
│ ├─ Solicitado por: Ana HR                              │
│ ├─ Mensaje: "Por favor firma tu contrato laboral"      │
│ ├─ Fecha límite: ⚠️ 20/11/2025 (8 días restantes)     │
│ └─ [Firmar Ahora]                                       │
│                                                         │
│ 📄 Modelo_145_2025.pdf                                  │
│ ├─ Solicitado por: Sistema (desde plantilla)           │
│ ├─ Fecha límite: 30/11/2025 (18 días)                  │
│ └─ [Firmar Ahora]                                       │
│                                                         │
│ 📄 Politica_Teletrabajo_2025.pdf                       │
│ ├─ Solicitado por: María HR                            │
│ ├─ Mensaje: "Nueva política de teletrabajo"            │
│ ├─ Sin fecha límite                                     │
│ └─ [Firmar Ahora]                                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### 9.3 Modal: Firmar Documento

```
┌───────────────────────────────────────────────────────┐
│ Firmar Documento                               [X]    │
├───────────────────────────────────────────────────────┤
│                                                       │
│ 📄 Contrato_Juan_Perez.pdf                           │
│                                                       │
│ ┌─────────────────────────────────────────────────┐  │
│ │                                                 │  │
│ │         [Visor de PDF embebido]                 │  │
│ │                                                 │  │
│ │         (Scroll obligatorio hasta el final)     │  │
│ │                                                 │  │
│ └─────────────────────────────────────────────────┘  │
│                                                       │
│ ℹ️ Por favor lee el documento completo antes de firmar │
│                                                       │
│ ✅ He leído y acepto este documento                   │
│                                                       │
│ ⚖️ Al firmar, este documento tendrá validez legal    │
│                                                       │
├───────────────────────────────────────────────────────┤
│             [Cancelar] [Firmar Documento]             │
└───────────────────────────────────────────────────────┘

```

---

## 10. Testing

### 10.1 Unit Tests

```typescript
// lib/firmas/__tests__/generar-certificado.test.ts
describe('generarCertificadoFirma', () => {
  it('genera certificado SHA-256 consistente', () => {
    const cert1 = generarCertificadoFirma('doc1', 'emp1', new Date('2025-11-12'));
    const cert2 = generarCertificadoFirma('doc1', 'emp1', new Date('2025-11-12'));
    
    expect(cert1).toBe(cert2);
    expect(cert1).toHaveLength(64); // SHA-256 = 64 chars hex
  });
  
  it('verifica certificado correctamente', () => {
    const timestamp = new Date('2025-11-12');
    const cert = generarCertificadoFirma('doc1', 'emp1', timestamp);
    
    const valido = verificarCertificadoFirma(cert, 'doc1', 'emp1', timestamp);
    expect(valido).toBe(true);
  });
});
```

---

## 11. Roadmap

### Fase 1: MVP (3 semanas)
- ✅ Modelos de BD
- ✅ APIs básicas
- ✅ Firma simple interna
- ✅ UI HR y Empleado
- ✅ Notificaciones
- ✅ Recordatorios automáticos

### Fase 2: Mejoras (2 semanas)
- ✅ Dashboard analytics avanzado
- ✅ Exportar certificados
- ✅ Rechazar firma (empleado)
- ✅ Firma en lote

### Fase 3: Firma Cualificada (1 semana)
- ✅ Integración Lleidanetworks
- ✅ Migración de firma simple a cualificada
- ✅ Certificados profesionales

---

**FIN DE LA ESPECIFICACIÓN**

**Versión**: 1.0.0  
**Última actualización**: 12 de Noviembre 2025  
**Autor**: Sofia Roig (con asistencia de Claude AI)  
**Proyecto**: Clousadmin - Sistema de Gestión de RRHH




