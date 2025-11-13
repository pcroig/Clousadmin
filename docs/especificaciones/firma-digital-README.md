# ✍️ Especificaciones - Firma Digital

Esta carpeta contiene la especificación completa del sistema de **Firma Digital** para Clousadmin, integrado con los sistemas de Documentos y Plantillas existentes.

---

## 📂 Documentos Disponibles

### 1️⃣ **Resumen Ejecutivo** 📊
**Archivo**: `firma-digital-resumen.md`

**Para quién**: Product Manager, Stakeholders, Decisores

**Contenido**:
- ✅ Qué es y para qué sirve
- ✅ Comparativa de proveedores (Lleidanetworks, DocuSign, interno)
- ✅ Casos de uso con métricas (95% ahorro de tiempo)
- ✅ Arquitectura de integración con sistemas existentes
- ✅ Decisiones pendientes (proveedor, documentos obligatorios)
- ✅ Estimación de costes (MVP vs Lleidanetworks)
- ✅ Métricas de éxito y KPIs

**Cuándo leer**: Antes de aprobar el proyecto o para entender el valor de negocio

---

### 2️⃣ **Especificación Funcional y Técnica** 📝
**Archivo**: `firma-digital.md`

**Para quién**: Product Manager, Tech Lead, Arquitecto

**Contenido**:
- ✅ Contexto e integración con Documentos y Plantillas existentes
- ✅ Requisitos funcionales completos (MVP + fases futuras)
- ✅ Modelos de datos (Prisma schema: SolicitudFirma, Firma)
- ✅ APIs y endpoints detallados
- ✅ Flujos de uso paso a paso
- ✅ Integraciones con módulos existentes
- ✅ Proveedores de firma (interno vs Lleidanetworks)
- ✅ Seguridad, permisos, cumplimiento legal (eIDAS, GDPR)
- ✅ UI/UX (wireframes textuales)
- ✅ Testing strategy
- ✅ Roadmap de implementación

**Cuándo leer**: Al diseñar la solución técnica, antes de empezar implementación

---

## 🎯 Resumen de la Funcionalidad

### ¿Qué es?
Un sistema de firma electrónica integrado que permite:
- ✅ **Solicitar firmas** en documentos existentes o generados desde plantillas
- ✅ **Firma digital simple** (MVP) con validación legal en España
- ✅ **Tracking completo** del proceso (enviado, visto, firmado)
- ✅ **Recordatorios automáticos** si no se firma
- ✅ **Auditoría GDPR/LOPD/eIDAS compliant**

### Integraciones Clave

**1. Con Sistema de Documentos** (✅ Existente):
```
Documento existente 
  → HR click "Solicitar Firma" 
  → Empleado recibe notificación 
  → Empleado firma online 
  → Documento marcado como firmado
```

**2. Con Sistema de Plantillas** (⏳ En especificación):
```
Plantilla con requiereFirma = true 
  → Al generar documento 
  → Sistema crea solicitud de firma automáticamente 
  → Empleado recibe documento + solicitud 
  → Workflow de firma integrado
```

**3. Carpetas Compartidas**:
```
Política empresarial en "Compartidos" 
  → HR click "Solicitar Firma Masiva" 
  → Selecciona "Todos (127 empleados)" 
  → 127 solicitudes automáticas 
  → Dashboard HR: progreso en tiempo real
```

---

## 🏆 Comparativa de Proveedores

| Proveedor | Precio/usuario | Nivel eIDAS | Recomendación |
|-----------|---------------|-------------|---------------|
| **Interno (MVP)** | ~5 €/mes total | Simple | ⭐⭐⭐⭐ MVP rápido |
| **Lleidanetworks** | 25-35 €/mes | Cualificada | ⭐⭐⭐⭐⭐ Producción España |
| **DocuSign** | 40-60 €/mes | Avanzada | ⭐⭐⭐ Enterprise internacional |

**Estrategia Recomendada**:
1. **Fase 1**: Implementación interna (firma simple) para MVP
2. **Fase 2**: Migrar a Lleidanetworks si >100 firmas/mes o necesitas firma cualificada

---

## 💡 Casos de Uso Principales

### 1. Firma de Contrato al Onboarding
**Antes**: 2-5 días (imprimir, firmar, escanear, enviar)  
**Después**: 10 minutos (firma online)  
**Ahorro**: ~95% de tiempo

### 2. Firma Masiva de Modelo 145
**Antes**: 2-3 semanas, 60% adopción  
**Después**: 3-5 días, 95% adopción  
**Ahorro**: ~80% de tiempo

### 3. Firma de Políticas Empresariales
**Escenario**: 127 empleados deben firmar nueva política  
**Resultado**: 85% firmado en 3 días, tracking en tiempo real

---

## 📊 Modelos de Datos (Nuevo)

### Tablas Nuevas:

1. **SolicitudFirma**: Tracking de solicitudes de firma
   - Documento a firmar
   - Solicitante (HR Admin)
   - Estado general (pendiente, completada, expirada)
   - Configuración (mensaje, fecha límite)
   - Proveedor (interno, lleida, docusign)

2. **Firma**: Tracking individual por empleado
   - Estado (pendiente, visto, firmado, rechazado)
   - Timestamps (enviado, visto, firmado)
   - Datos de firma (IP, User-Agent, ubicación)
   - Certificado digital (SHA-256)
   - Recordatorios enviados

### Modificaciones en Tablas Existentes:

- **Documento**: 
  - `solicitudesFirma` (relación)
  - `requiereFirma`, `firmado`, `fechaFirma` (campos)

- **Empleado**:
  - `firmas` (relación)

- **Empresa**:
  - `solicitudesFirma` (relación)
  - `configFirma` (JSONB: proveedor, recordatorios, etc)

---

## 🛠️ Stack Tecnológico

### MVP (Firma Simple Interna)
```typescript
// Backend: Firma con SHA-256
import crypto from 'crypto';
const signature = crypto.createSign('SHA256');
const certificate = signature.sign(privateKey, 'hex');

// Frontend: Visor de documento + botón firmar
import { PDFViewer } from '@/components/pdf-viewer';
```

**Ventajas**:
- ✅ Rápido (3 semanas implementación)
- ✅ Sin costes recurrentes (~5 €/mes hosting)
- ✅ Control total
- ✅ Válido legalmente para documentos internos

**Desventajas**:
- ⚠️ Firma simple (no cualificada)
- ⚠️ Menor validez en litigios

---

### Fase 2 (Lleidanetworks)
```typescript
// Integración con API
import { LleidaSignature } from '@lleida/signature-sdk';

const envelope = await lleida.createEnvelope({
  document: documentBuffer,
  signers: [{ email, name }],
  signatureType: 'cualificada'
});
```

**Ventajas**:
- ✅ Firma cualificada eIDAS (máxima validez legal)
- ✅ Cumplimiento automático
- ✅ Certificados profesionales

**Desventajas**:
- ⚠️ Coste: 25-35 €/usuario/mes
- ⚠️ Dependencia de tercero

---

## 🚀 Fases de Implementación

### 📌 Fase 1: MVP Básico (3 semanas)

**Semana 1**: Backend
- Modelos BD (SolicitudFirma, Firma)
- APIs (`POST /api/firmas/solicitar`, `POST /api/firmas/[id]/firmar`)
- Lógica de firma digital simple
- Sistema de notificaciones

**Semana 2**: Frontend
- Vista HR: Solicitar firma
- Vista Empleado: Firmar documento
- Dashboard de tracking
- Visor de documentos

**Semana 3**: Integraciones y Testing
- Integración con Plantillas (auto-solicitar)
- Integración con Documentos (botón solicitar)
- Recordatorios automáticos (cron jobs)
- Testing E2E

**Resultado**: Sistema funcional con firma simple interna

---

### 📌 Fase 2: Mejoras (2 semanas)
- Dashboard analytics avanzado
- Exportar certificados PDF
- Rechazar firma (empleado)
- Firma en lote mejorada

---

### 📌 Fase 3: Firma Cualificada (1 semana)
- Integración con Lleidanetworks API
- Migración de firmas existentes
- Certificados profesionales
- Cumplimiento eIDAS nivel 3

---

## 🎯 Métricas de Éxito

### MVP Exitoso Si:
- ✅ >80% de empleados firman en <24h
- ✅ Proceso de firma: <2 minutos
- ✅ Tasa de adopción: >90%
- ✅ Reducción de tiempo HR: >80%
- ✅ 0 errores de cumplimiento legal

### KPIs a Medir:
- **Tiempo promedio de firma**: <2 minutos
- **Tasa de respuesta**: >90% en 3 días
- **Documentos firmados/mes**: >50
- **Reducción de papel**: 100%
- **Satisfacción usuario**: >4/5

---

## 🤔 Decisiones Pendientes

### 1. ¿Qué implementación para MVP?

**Opción A: Firma Simple Interna** ⭐ RECOMENDADO
- Pros: Rápido, sin costes, control total
- Contras: Menos validez legal
- Duración: 3 semanas
- Coste: ~5 €/mes

**Opción B: Lleidanetworks desde inicio**
- Pros: Máxima validez legal
- Contras: 25-35 €/usuario/mes, integración más larga
- Duración: 2 semanas integración
- Coste: 1,250-1,750 €/mes (50 empleados)

**Tu decisión**: _________________

---

### 2. ¿Qué documentos requieren firma obligatoria?

**Propuestas**:
- ✅ Contratos laborales (obligatorio)
- ✅ Modelo 145 (obligatorio)
- ⚠️ Políticas empresa (opcional, configurable)
- ⚠️ Justificantes vacaciones (opcional)
- ✅ Finiquitos (obligatorio)

**Tu decisión**: _________________

---

### 3. ¿Frecuencia de recordatorios automáticos?

**Opción A: Conservadora**
- Recordatorio 1: +7 días
- Recordatorio 2: +14 días

**Opción B: Agresiva** ⭐ RECOMENDADO
- Recordatorio 1: +3 días
- Recordatorio 2: +7 días
- Recordatorio 3: +14 días (solo si fecha límite)

**Tu decisión**: _________________

---

## 🔗 Integraciones con Módulos Existentes

### Con Sistema de Documentos (✅ Implementado)
```typescript
// app/(dashboard)/hr/documentos/[id]/carpeta-detail-client.tsx
// Agregar botón "Solicitar Firma" en menú de documento

<DropdownMenuItem onClick={() => solicitarFirma(documento.id)}>
  <FileSignature className="mr-2 h-4 w-4" />
  Solicitar Firma
</DropdownMenuItem>
```

### Con Sistema de Plantillas (⏳ En especificación)
```typescript
// app/api/plantillas/[id]/generar/route.ts
// Auto-solicitar firma si plantilla tiene requiereFirma = true

if (plantilla.requiereFirma) {
  await crearSolicitudFirmaAutomatica({
    documentoId: documento.id,
    empleadoId,
    tipo: 'automatica'
  });
}
```

### Con Onboarding (✅ Existente)
```typescript
// app/api/onboarding/[token]/completar/route.ts
// Al completar onboarding, solicitar firma de contrato

if (contratoGenerado) {
  await solicitarFirmaDocumento({
    documentoId: contrato.id,
    empleadoId: onboarding.empleadoId,
    mensaje: 'Bienvenido! Firma tu contrato'
  });
}
```

---

## 📚 Cómo Usar Esta Documentación

### Si eres Product Manager:
1. Lee **Resumen Ejecutivo** (20 min)
2. Revisa **Especificación** sección "Requisitos Funcionales" (30 min)
3. Toma decisiones sobre proveedor y documentos obligatorios
4. Aprueba especificación

### Si eres Tech Lead / Arquitecto:
1. Lee **Resumen Ejecutivo** (contexto)
2. Estudia **Especificación Completa** (arquitectura, modelos, APIs)
3. Revisa integraciones con sistemas existentes
4. Planifica sprint

### Si eres Desarrollador:
1. Revisa **Resumen Ejecutivo** (contexto rápido)
2. Lee **Especificación** sección de tu tarea
3. Implementa siguiendo flujos detallados

---

## 💰 Estimación de Costes

### Opción 1: MVP Interno (Firma Simple)

**Desarrollo**:
- Backend: 5 días x 200 €/día = 1,000 €
- Frontend: 4 días x 200 €/día = 800 €
- Testing: 2 días x 200 €/día = 400 €
- **Total**: ~2,200 €

**Costes Recurrentes**:
- Hosting: ~5 €/mes
- **Total mensual**: ~5 €/mes

**Para 50 empleados**: 0.10 €/empleado/mes

---

### Opción 2: Lleidanetworks (Firma Cualificada)

**Setup Inicial**:
- Integración API: 3 días x 200 €/día = 600 €
- Testing: 1 día x 200 €/día = 200 €
- **Total**: ~800 €

**Costes Recurrentes**:
- 50 empleados x 30 €/mes = 1,500 €/mes
- **Total mensual**: 1,500 €/mes

**Año 1**: 800 + (1,500 x 12) = 18,800 €

---

### ROI - Ahorro de Tiempo

**Escenario**: 50 empleados, 10 documentos/mes con firma

**Tiempo ahorrado**:
- Antes: 10 docs x 30 min = 5 horas/mes
- Después: 10 docs x 2 min = 0.33 horas/mes
- **Ahorro**: 4.67 horas/mes

**Valor económico**:
- 4.67 horas x 30 €/h = ~140 €/mes
- **Anual**: ~1,680 €/año

**Breakeven Opción 1 (MVP)**: ~2 meses  
**Breakeven Opción 2 (Lleida)**: ~12 meses

---

## 📞 Soporte y Referencias

### Documentación de Proveedores

**Lleidanetworks**:
- Web: https://www.lleidanetworks.com/
- API Docs: https://developers.lleidanetworks.com/
- Pricing: Contactar ventas

**DocuSign**:
- Web: https://www.docusign.com/
- API Docs: https://developers.docusign.com/
- Pricing: https://www.docusign.com/pricing

### Normativa Legal

**eIDAS** (Reglamento UE 910/2014):
- https://www.boe.es/doue/2014/257/L00073-00114.pdf

**LOPD/GDPR**:
- https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673

---

## ✅ Estado Actual

**Fecha**: 12 de Noviembre 2025  
**Estado**: 📋 **Especificación Completada** - Pendiente de Aprobación

**Próximos pasos**:
1. ✅ Revisar documentación completa
2. ⏳ Tomar decisiones pendientes (proveedor, docs obligatorios, recordatorios)
3. ⏳ Aprobar especificación
4. ⏳ Iniciar Fase 1 (3 semanas para MVP)

---

## 🔄 Dependencias

**Requisitos Previos**:
- ✅ Sistema de Documentos implementado
- ⏳ Sistema de Plantillas especificado (puede ir en paralelo)
- ✅ Sistema de Notificaciones implementado

**Sistemas que dependen de Firma Digital**:
- Onboarding (mejora con firma automática)
- Offboarding (finiquitos con firma)
- Políticas empresariales (compliance)

---

**Última actualización**: 12 de Noviembre 2025  
**Versión**: 1.0.0  
**Autor**: Sofia Roig (con asistencia de Claude AI)  
**Proyecto**: Clousadmin



