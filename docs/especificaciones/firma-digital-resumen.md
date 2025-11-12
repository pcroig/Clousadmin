# ✍️ Sistema de Firma Digital - Resumen Ejecutivo

**Proyecto**: Clousadmin  
**Fecha**: 12 de Noviembre 2025  
**Versión**: 1.0.0 (MVP)  
**Estado**: 📋 Especificación en Definición

---

## 🎯 Resumen Rápido

### ¿Qué es?
Un sistema de firma electrónica integrado con el módulo de Documentos y Plantillas que permite:
- ✅ **Solicitar firmas** en documentos existentes o generados desde plantillas
- ✅ **Firma electrónica simple** (MVP) con validación legal en España
- ✅ **Tracking completo** del proceso de firma (enviado, visto, firmado)
- ✅ **Recordatorios automáticos** si no se firma
- ✅ **Auditoría completa** (GDPR/LOPD/eIDAS)

### ¿Para qué sirve?
- ✅ **Contratos laborales**: Firma digital al onboarding
- ✅ **Documentos de nómina**: Modelo 145, justificantes
- ✅ **Políticas empresariales**: Firma de políticas, manuales
- ✅ **Ausencias**: Firma de justificantes médicos
- ✅ **Cumplimiento legal**: Trazabilidad completa según eIDAS

---

## 📊 Comparativa: Proveedores de Firma Digital

| Proveedor | Precio | Firmas/mes | eIDAS | Integración | Recomendación |
|-----------|--------|------------|-------|-------------|---------------|
| **DocuSign** | $40-60/usuario | Ilimitadas | ✅ Avanzada | API REST | ⭐⭐⭐ Mejor para empresa grande |
| **Adobe Sign** | $30-50/usuario | Ilimitadas | ✅ Avanzada | API REST | ⭐⭐⭐ Muy completo |
| **Lleidanetworks** | €25-35/usuario | Ilimitadas | ✅ Cualificada | API REST | ⭐⭐⭐⭐⭐ **RECOMENDADO para España** |
| **Uanataca** | €20-30/usuario | Ilimitadas | ✅ Cualificada | API REST | ⭐⭐⭐⭐ Bueno para España |
| **SignNow** | $8-20/usuario | Ilimitadas | ⚠️ Simple | API REST | ⭐⭐ Económico, menos legal |
| **Propio (Custom)** | ~€5/mes hosting | Ilimitadas | ⚠️ Simple | - | ⭐⭐⭐ MVP rápido, menos legal |

### 🏆 Recomendación: **Lleidanetworks** (España)
**Por qué**:
- ✅ Especializado en mercado español
- ✅ Firma cualificada eIDAS (máximo nivel legal)
- ✅ Precios competitivos para SMB
- ✅ Soporte en español
- ✅ API REST bien documentada
- ✅ Almacenamiento en EU (GDPR compliant)

**Alternativa MVP**: Implementación propia con firma simple
- Más rápido de implementar
- Sin costes de terceros
- Válido legalmente para documentos internos
- Upgrade futuro a Lleidanetworks/DocuSign

---

## 💡 Casos de Uso Principales

### 1. Firma de Contrato al Onboarding

**Antes (Sin firma digital)**:
1. HR genera contrato en PDF
2. HR imprime contrato
3. Empleado lo recibe por email o en persona
4. Empleado imprime, firma, escanea
5. Empleado envía por email
6. HR guarda archivo manualmente
7. **Tiempo**: 2-5 días

**Después (Con firma digital)**:
1. HR genera contrato desde plantilla
2. Sistema solicita firma automáticamente
3. Empleado recibe notificación + link
4. Empleado revisa y firma online (2 minutos)
5. Contrato firmado se guarda automáticamente
6. HR recibe notificación de firma completada
7. **Tiempo**: 10 minutos

**Ahorro**: ~95% de tiempo, 100% paperless

---

### 2. Firma Masiva de Modelo 145

**Antes**:
1. HR genera 50 Modelos 145
2. HR envía por email a cada empleado
3. Empleados imprimen, rellenan, firman, escanean
4. Tasa de respuesta: ~60% en 2 semanas
5. HR debe perseguir a los que no enviaron
6. **Tiempo total**: 2-3 semanas

**Después**:
1. HR genera 50 Modelos 145 desde plantilla
2. Sistema marca "Requiere firma"
3. Sistema envía notificaciones automáticas
4. Empleados firman online en 2 clicks
5. Recordatorios automáticos a los 3 días
6. Tasa de respuesta: ~95% en 3 días
7. **Tiempo total**: 3-5 días

**Ahorro**: ~80% de tiempo, 95% de adopción

---

### 3. Firma de Políticas Empresariales

**Escenario**: Nueva política de teletrabajo
1. HR crea documento en "Compartidos"
2. HR marca "Requiere firma de todos"
3. Sistema envía a 100 empleados
4. Empleados firman desde notificación
5. Dashboard muestra: 95/100 firmados
6. Recordatorios automáticos a pendientes
7. Compliance completo con auditoría

---

## 🏗️ Arquitectura de Integración

### Integración con Sistema Existente

```
┌─────────────────────────────────────────────────┐
│           DOCUMENTOS (Existente)                │
│  - Upload documentos                            │
│  - Carpetas (Contratos, Nóminas, etc.)         │
│  - Permisos (HR, Empleado, Manager)            │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│        PLANTILLAS (Implementado)                │
│  - Generación con variables                     │
│  - Envío masivo                                 │
│  - Campo: requiereFirma                         │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│          FIRMA DIGITAL (Nuevo)                  │
│  - Solicitar firma en documento existente       │
│  - Auto-solicitar en plantillas con flag        │
│  - Tracking: enviado → visto → firmado          │
│  - Recordatorios automáticos                    │
│  - Auditoría completa                           │
└─────────────────────────────────────────────────┘
```

### Flujo Integrado

**Opción 1: Firma en Documento Existente**
```
1. HR sube documento PDF (contrato manual)
2. HR click "Solicitar Firma" → Selecciona empleado(s)
3. Sistema crea SolicitudFirma
4. Empleado recibe notificación
5. Empleado firma online
6. Documento firmado reemplaza original
7. Auditoría registrada
```

**Opción 2: Firma en Plantilla Automática**
```
1. HR genera contrato desde plantilla
2. Plantilla tiene requiereFirma = true
3. Sistema genera documento + crea SolicitudFirma automáticamente
4. Empleado recibe notificación
5. Empleado firma
6. DocumentoGenerado.firmado = true
```

**Opción 3: Firma Masiva de Política**
```
1. HR sube política de teletrabajo a carpeta "Compartidos"
2. HR click "Solicitar Firma Masiva" → Selecciona "Todos"
3. Sistema crea SolicitudFirma para cada empleado
4. Empleados reciben notificación
5. Dashboard HR muestra progreso (85/100 firmados)
6. Recordatorios automáticos cada 3 días
```

---

## 📋 Requisitos Funcionales (MVP)

### ✅ PRIORIDAD ALTA: Funcionalidades Básicas

**1. Solicitar Firma Individual**
- HR puede solicitar firma en cualquier documento existente
- Seleccionar firmantes (1 o múltiples empleados)
- Mensaje opcional al solicitar
- Fecha límite opcional
- Notificación automática al empleado

**2. Solicitar Firma Masiva**
- Desde plantilla con flag `requiereFirma`
- Desde documento en carpeta compartida
- Selección masiva de empleados (todos, equipo, departamento)
- Generación automática de solicitudes individuales

**3. Proceso de Firma (Empleado)**
- Recibir notificación (email + in-app)
- Ver documento en visor
- Firma con click (firma simple)
- Confirmación de firma
- Descarga de documento firmado

**4. Tracking y Estados**
- **Pendiente**: Solicitud enviada, no vista
- **Visto**: Empleado abrió documento
- **Firmado**: Firmado correctamente
- **Rechazado**: Empleado rechazó firmar (opcional)
- **Expirado**: Pasó fecha límite sin firmar

**5. Recordatorios Automáticos**
- Recordatorio a los 3 días si no firmado
- Recordatorio a los 7 días
- Notificación a HR si expira sin firmar

**6. Dashboard HR**
- Vista de solicitudes de firma
- Filtros: pendientes, firmadas, expiradas
- Progreso masivo: "85/100 empleados han firmado"
- Exportar lista de firmantes/no firmantes

**7. Auditoría Completa**
- Quién solicitó la firma
- Cuándo se envió
- Cuándo se vio
- Cuándo se firmó
- IP del firmante
- User-Agent del firmante
- Certificado de firma generado

---

## 🛠️ Stack Tecnológico

### MVP (Firma Simple - Implementación Propia)

**Backend**:
```typescript
// Firma con clave privada del servidor
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';

// Generar firma digital simple
const signature = crypto.createSign('SHA256');
signature.update(documentBuffer);
const digitalSignature = signature.sign(privateKey, 'hex');

// Agregar marca visual al PDF
const pdfDoc = await PDFDocument.load(documentBuffer);
// Agregar texto: "Firmado digitalmente por {nombre} el {fecha}"
// Agregar código QR con link de verificación
```

**Ventajas**:
- ✅ Rápido de implementar
- ✅ Sin costes de terceros
- ✅ Control total
- ✅ Válido para documentos internos

**Desventajas**:
- ⚠️ No es firma cualificada eIDAS
- ⚠️ Menor validez legal en litigios
- ⚠️ Requiere infraestructura de certificados

---

### Fase 2 (Firma Avanzada - Lleidanetworks)

**Integración con API**:
```typescript
import axios from 'axios';

const lleidaClient = axios.create({
  baseURL: 'https://api.lleidanetworks.com/v2',
  headers: {
    'Authorization': `Bearer ${process.env.LLEIDA_API_KEY}`,
    'Content-Type': 'application/json'
  }
});

// Solicitar firma
const response = await lleidaClient.post('/signature/request', {
  document: documentBase64,
  signers: [
    {
      email: 'empleado@empresa.com',
      name: 'Juan Pérez',
      language: 'es'
    }
  ],
  callback_url: 'https://clousadmin.com/api/firma/webhook'
});
```

**Ventajas**:
- ✅ Firma cualificada eIDAS (máxima validez legal)
- ✅ Cumplimiento regulatorio automático
- ✅ Certificados profesionales
- ✅ Soporte técnico y legal

**Desventajas**:
- ⚠️ Coste por usuario (~25-35€/mes)
- ⚠️ Dependencia de tercero
- ⚠️ Integración más compleja

---

## 📊 Modelos de Datos (Nuevos)

### Tabla: `SolicitudFirma`

```prisma
model SolicitudFirma {
  id          String @id @default(uuid())
  empresaId   String
  documentoId String // Documento a firmar
  
  // Solicitante
  solicitadoPor String // Usuario ID (HR Admin)
  solicitadoEn  DateTime @default(now())
  
  // Firmantes (array de empleados)
  firmantes Json // [{ empleadoId, email, nombre }]
  
  // Configuración
  mensaje        String? @db.Text
  fechaLimite    DateTime?
  requiereOrden  Boolean @default(false) // Firma secuencial
  
  // Estado general
  estado String @default("pendiente") // pendiente, completada, expirada, cancelada
  
  // Proveedor (para fase 2)
  proveedor String @default("interno") // interno, lleida, docusign
  
  // Metadata del proveedor
  proveedorData Json? // ID externo, envelope, etc
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  empresa   Empresa         @relation(fields: [empresaId], references: [id], onDelete: Cascade)
  documento Documento       @relation(fields: [documentoId], references: [id], onDelete: Cascade)
  firmas    Firma[]
  
  @@index([empresaId])
  @@index([documentoId])
  @@index([estado])
  @@index([fechaLimite])
  @@map("solicitudes_firma")
}
```

### Tabla: `Firma`

```prisma
model Firma {
  id                String @id @default(uuid())
  solicitudFirmaId  String
  empleadoId        String
  
  // Estado individual
  estado String @default("pendiente") // pendiente, visto, firmado, rechazado
  
  // Tracking
  enviadoEn   DateTime  @default(now())
  vistoEn     DateTime?
  firmadoEn   DateTime?
  rechazadoEn DateTime?
  
  // Datos de firma
  ipAddress   String? @db.VarChar(50)
  userAgent   String? @db.Text
  ubicacion   Json? // Geolocation opcional
  
  // Firma digital
  certificado     String? @db.Text // Certificado/hash de firma
  metodofirma     String? // click, biometrica, otp, certificado
  
  // Rechazo
  motivoRechazo String? @db.Text
  
  // Recordatorios
  recordatoriosEnviados Int @default(0)
  ultimoRecordatorio    DateTime?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  solicitud SolicitudFirma @relation(fields: [solicitudFirmaId], references: [id], onDelete: Cascade)
  empleado  Empleado       @relation(fields: [empleadoId], references: [id], onDelete: Cascade)
  
  @@index([solicitudFirmaId])
  @@index([empleadoId])
  @@index([estado])
  @@index([firmadoEn])
  @@map("firmas")
}
```

### Modificaciones en Tablas Existentes

```prisma
// Documento
model Documento {
  // ... campos existentes ...
  
  solicitudesFirma SolicitudFirma[]
  
  // Campos de firma (agregados)
  requiereFirma Boolean @default(false)
  firmado       Boolean @default(false)
  fechaFirma    DateTime?
  
  // ... resto de relaciones ...
}

// Empleado
model Empleado {
  // ... campos existentes ...
  
  firmas Firma[]
  
  // ... resto de relaciones ...
}

// Empresa
model Empresa {
  // ... campos existentes ...
  
  solicitudesFirma SolicitudFirma[]
  
  // Configuración de firma (JSONB)
  configFirma Json? // { proveedor, apiKey, recordatoriosDias, etc }
  
  // ... resto de relaciones ...
}
```

---

## 💰 Estimación de Costes

### Opción 1: MVP Interno (Firma Simple)

**Desarrollo**:
- Backend: 3 días
- Frontend: 2 días
- Testing: 1 día
- **Total**: 6 días (~1,200-1,500 €)

**Costes Recurrentes**:
- Hosting: ~5 €/mes
- SSL Certificados: Incluido
- **Total mensual**: ~5 €/mes

**Para 50 empleados**: ~0.10 €/empleado/mes

---

### Opción 2: Lleidanetworks (Firma Cualificada)

**Setup Inicial**:
- Integración API: 2 días
- Testing: 1 día
- **Total**: 3 días (~600-750 €)

**Costes Recurrentes**:
- Suscripción: 25-35 €/usuario/mes
- **Total mensual (50 empleados)**: 1,250-1,750 €/mes

**Breakeven**: Depende del volumen de firmas

---

### Recomendación de Estrategia

**Fase 1 (MVP)**: Firma Simple Interna
- Validar uso y adopción
- Sin costes recurrentes significativos
- Válido para contratos internos, políticas

**Fase 2 (6-12 meses)**: Migrar a Lleidanetworks
- Si volumen > 100 firmas/mes
- Si necesitas firma cualificada legal
- Si tienes clientes enterprise que lo requieren

---

## 🎯 Métricas de Éxito

### MVP Exitoso Si:
- ✅ >80% de empleados firman contratos en <24h
- ✅ Tiempo de firma: <2 minutos por documento
- ✅ Tasa de adopción: >90%
- ✅ Reducción de tiempo HR: >80%
- ✅ 0 errores de auditoría/compliance

### KPIs a Medir:
- **Tiempo promedio de firma**: <2 minutos
- **Tasa de respuesta**: >90% en 3 días
- **Documentos firmados/mes**: >50
- **Reducción de papel**: 100%
- **Satisfacción HR**: >4/5
- **Satisfacción Empleados**: >4/5

---

## 🚀 Fases de Implementación

### 📌 Fase 1: MVP Básico (3 semanas)

**Semana 1**: Backend
- Modelos de BD (SolicitudFirma, Firma)
- APIs de solicitud de firma
- Lógica de generación de firma digital simple
- Sistema de notificaciones

**Semana 2**: Frontend
- Vista HR: Solicitar firma
- Vista Empleado: Firmar documento
- Dashboard de tracking
- Visor de documentos

**Semana 3**: Integraciones y Testing
- Integración con Plantillas
- Integración con Documentos
- Recordatorios automáticos
- Testing E2E

---

### 📌 Fase 2: Mejoras (2 semanas)

- Firma masiva avanzada
- Dashboard analytics
- Exportar certificados
- Mejoras UX

---

### 📌 Fase 3: Firma Cualificada (1 semana)

- Integración con Lleidanetworks
- Migración de firmas existentes
- Certificados profesionales

---

## 🤔 Decisiones Pendientes

### 1. ¿Qué implementación para MVP?

**Opción A: Firma Simple Interna**
- Pros: Rápido, sin costes, control total
- Contras: Menos validez legal

**Opción B: Lleidanetworks desde inicio**
- Pros: Máxima validez legal, profesional
- Contras: Coste mensual, integración más larga

**Recomendación**: **Opción A** para MVP, migrar a B si hay demanda

---

### 2. ¿Qué documentos requieren firma obligatoria?

**Propuestas**:
- ✅ Contratos laborales (obligatorio)
- ✅ Modelo 145 (obligatorio)
- ⚠️ Políticas empresa (opcional)
- ⚠️ Justificantes vacaciones (opcional)
- ⚠️ Finiquitos (obligatorio)

**Tu decisión**: _________________

---

### 3. ¿Recordatorios automáticos?

**Frecuencia**:
- Recordatorio 1: +3 días
- Recordatorio 2: +7 días
- Recordatorio 3: +14 días (solo si fecha límite)

**Tu decisión**: _________________

---

## 📚 Documentos Complementarios

Este resumen forma parte de un conjunto de 4 documentos:

1. **Este documento** (`firma-digital-resumen.md`)
   - Resumen ejecutivo
   - Comparativa de proveedores
   - Casos de uso
   - Decisiones pendientes

2. **Especificación Funcional y Técnica** (`firma-digital.md`)
   - Requisitos completos
   - Modelos de datos
   - APIs y endpoints
   - Flujos detallados
   - Integraciones

3. **Guía de Implementación** (`firma-digital-implementacion.md`)
   - Setup paso a paso
   - Código completo
   - Integración con Lleidanetworks
   - Ejemplos de uso

4. **Checklist de Implementación** (`firma-digital-checklist.md`)
   - Tareas día por día
   - Criterios de éxito
   - Testing plan

---

## ✅ Próximos Pasos

1. **Revisar este resumen** (15 min)
2. **Tomar decisiones pendientes** (proveedor, documentos obligatorios)
3. **Aprobar especificación** completa
4. **Iniciar Fase 1** (3 semanas para MVP)

---

**Versión**: 1.0.0  
**Fecha**: 12 de Noviembre 2025  
**Autor**: Sofia Roig (con asistencia de Claude AI)  
**Proyecto**: Clousadmin

