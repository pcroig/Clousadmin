# 📋 Integración de Documentos con Procesos de Onboarding/Offboarding

**Fecha**: 13 de Noviembre 2025  
**Estado**: ✅ Implementado (Estructura Base)  
**Versión**: 1.0.0

---

## 🎯 Resumen Ejecutivo

Este documento describe cómo el sistema de Gestión Documental se integra con los procesos de Onboarding (alta de empleado) y Offboarding (baja de empleado), permitiendo a HR Admin:

1. **Solicitar documentos** al empleado durante el proceso
2. **Solicitar firma digital** de documentos (Fase 2 - en desarrollo)
3. **Solicitar completar datos** para generar documentos desde plantillas (Fase 2 - en desarrollo)

---

## 📊 Arquitectura

### Modelo de Datos: Carpeta (Actualizado)

```prisma
model Carpeta {
  id        String  @id @default(uuid())
  empresaId String
  empleadoId String? // NULL = carpeta compartida
  nombre    String
  esSistema Boolean
  compartida Boolean
  asignadoA String?
  
  // ✨ NUEVOS CAMPOS - Vinculación a procesos
  vinculadaAProceso     String?  @db.VarChar(50)  // 'onboarding' | 'offboarding' | null
  requiereFirma         Boolean  @default(false)  // Si requiere firma digital
  requiereRellenarDatos Boolean  @default(false)  // Si requiere completar campos
  camposRequeridos      Json?                      // Array: ["nif", "direccion", "iban"]
  
  // ... otros campos ...
  
  @@index([vinculadaAProceso])
}
```

### Campos Explicados

#### `vinculadaAProceso`
- **Tipo**: `String?` (opcional)
- **Valores**: `'onboarding'` | `'offboarding'` | `null`
- **Propósito**: Marca la carpeta como parte de un proceso específico
- **Ejemplo**: Carpeta "Documentos de Alta" vinculada a `onboarding`

#### `requiereFirma`
- **Tipo**: `Boolean`
- **Default**: `false`
- **Propósito**: Indica que los documentos de esta carpeta requieren firma digital del empleado
- **Fase**: 2 (integración con sistema de firma digital)

#### `requiereRellenarDatos`
- **Tipo**: `Boolean`
- **Default**: `false`
- **Propósito**: Indica que el empleado debe completar ciertos campos antes de generar el documento
- **Fase**: 2 (integración con sistema de plantillas)

#### `camposRequeridos`
- **Tipo**: `Json?` (array de strings)
- **Ejemplo**: `["empleado_nif", "empleado_direccion", "empleado_iban"]`
- **Propósito**: Lista de campos que el empleado debe completar
- **Fase**: 2 (integración con sistema de plantillas)

---

## 🚀 Funcionalidades Implementadas (Fase 1)

### 1. Crear Carpeta Vinculada a Proceso

**Componente**: `CrearCarpetaConDocumentosModal`

**Ubicación**: `components/hr/crear-carpeta-con-documentos-modal.tsx`

**Características**:
- ✅ Seleccionar si la carpeta está vinculada a onboarding o offboarding
- ✅ Marcar si requiere firma digital (preparado para Fase 2)
- ✅ Marcar si requiere completar datos (preparado para Fase 2)
- ✅ Subir documentos directamente al crear la carpeta
- ✅ Asignar a todos los empleados o grupos específicos

**Flujo de Uso**:
```
1. HR Admin → /hr/documentos
2. Click "Crear Carpeta"
3. Completa formulario:
   - Nombre: "Documentos de Alta"
   - Vinculada a: "Onboarding"
   - ☑️ Requiere firma digital
   - ☑️ Requiere completar datos
   - Subir documentos (opcional)
4. Sistema crea carpeta con metadatos de proceso
5. Carpeta disponible para uso en onboarding
```

### 2. Subida Directa de Documentos en Diálogo

**Componente**: `DocumentUploaderInline`

**Ubicación**: `components/shared/document-uploader-inline.tsx`

**Características**:
- ✅ Subir múltiples archivos (hasta 20)
- ✅ Previsualización de archivos seleccionados
- ✅ Editar nombre de documento antes de subir
- ✅ Validación de formatos (PDF, DOC, DOCX, JPG, PNG)
- ✅ Mostrar tamaño de archivo
- ✅ Eliminar archivos antes de subir

**Uso**:
```tsx
<DocumentUploaderInline
  onFilesChange={(files) => setDocumentos(files)}
  maxFiles={20}
  acceptedTypes=".pdf,.doc,.docx,.jpg,.jpeg,.png"
  disabled={loading}
/>
```

### 3. API Actualizada: Filtrar Carpetas por Proceso

**Endpoint**: `GET /api/carpetas?proceso=onboarding`

**Query Params**:
- `proceso`: `'onboarding'` | `'offboarding'`
- `empleadoId`: UUID del empleado (opcional)

**Response**:
```json
{
  "success": true,
  "carpetas": [
    {
      "id": "uuid",
      "nombre": "Documentos de Alta",
      "vinculadaAProceso": "onboarding",
      "requiereFirma": true,
      "requiereRellenarDatos": true,
      "camposRequeridos": ["empleado_nif", "empleado_direccion"],
      "compartida": true,
      "asignadoA": "todos"
    }
  ]
}
```

---

## 🔮 Funcionalidades Futuras (Fase 2)

### 1. Solicitar Documentos en Onboarding

**Objetivo**: HR solicita documentos específicos al empleado durante el onboarding

**Flujo Propuesto**:
```
1. HR Admin crea nuevo empleado
2. En formulario de onboarding, sección "Documentos a Solicitar"
3. Selecciona carpeta vinculada a onboarding (ej: "Documentos de Alta")
4. Sistema:
   a. Crea solicitud de documentos
   b. Envía notificación al empleado
   c. Empleado sube documentos desde su espacio
   d. HR recibe notificación cuando se completa
```

**Componente Propuesto**: `SolicitarDocumentosOnboardingModal`

### 2. Solicitar Firma Digital

**Objetivo**: Empleado firma digitalmente documentos durante onboarding

**Integración con**: Sistema de Firma Digital (ver `docs/especificaciones/firma-digital-README.md`)

**Flujo Propuesto**:
```
1. HR genera documento desde plantilla (ej: Contrato)
2. Si carpeta tiene `requiereFirma: true`:
   a. Sistema crea solicitud de firma automáticamente
   b. Empleado recibe notificación
   c. Empleado visualiza documento y firma digitalmente
   d. Documento se marca como firmado
   e. Se genera certificado digital
```

**API Propuesta**:
```typescript
POST /api/firmas/solicitar
{
  "documentoId": "uuid",
  "empleadoId": "uuid",
  "carpetaId": "uuid", // Carpeta vinculada a onboarding
  "mensaje": "Por favor firma tu contrato de trabajo"
}
```

### 3. Solicitar Completar Datos para Generar Documento

**Objetivo**: Empleado completa campos faltantes para generar documento desde plantilla

**Integración con**: Sistema de Plantillas (ver `docs/especificaciones/plantillas-documentos.md`)

**Flujo Propuesto**:
```
1. HR selecciona plantilla con `requiereRellenarDatos: true`
2. Empleado recibe notificación: "Completa tus datos para generar contrato"
3. Empleado accede a formulario con campos requeridos:
   - NIF
   - Dirección completa
   - IBAN
   - Número de hijos
   - Estado civil
4. Empleado completa formulario
5. Sistema:
   a. Valida datos
   b. Genera documento desde plantilla
   c. Guarda en carpeta correspondiente
   d. Notifica a HR y empleado
```

**Componente Propuesto**: `CompletarDatosDocumentoModal`

**API Propuesta**:
```typescript
POST /api/plantillas/[id]/completar-datos
{
  "empleadoId": "uuid",
  "carpetaId": "uuid",
  "datos": {
    "empleado_nif": "12345678A",
    "empleado_direccion": "Calle Mayor 123",
    "empleado_iban": "ES12 1234 1234 12 1234567890"
  }
}
```

---

## 📋 Casos de Uso Completos

### Caso 1: Onboarding con Solicitud de DNI

**Escenario**: HR necesita que el nuevo empleado suba su DNI durante el onboarding

**Paso a Paso**:
```
1. HR crea carpeta "Documentación Personal"
   - Vinculada a: Onboarding
   - No requiere firma
   - No requiere rellenar datos
   
2. HR crea nuevo empleado y envía invitación de onboarding

3. Empleado accede a su espacio de onboarding

4. Sistema muestra: "Sube tu DNI a la carpeta Documentación Personal"

5. Empleado sube archivo JPG/PDF de su DNI

6. Documento se guarda en carpeta "Documentación Personal" del empleado

7. HR recibe notificación: "Juan Pérez ha subido su DNI"
```

### Caso 2: Onboarding con Firma de Contrato (Fase 2)

**Escenario**: Empleado debe firmar su contrato digitalmente durante el onboarding

**Paso a Paso**:
```
1. HR crea carpeta "Contratos"
   - Vinculada a: Onboarding
   - ☑️ Requiere firma digital
   
2. HR crea contrato para nuevo empleado

3. HR genera documento desde plantilla "Contrato Indefinido"

4. Sistema detecta que carpeta requiere firma:
   a. Crea solicitud de firma automáticamente
   b. Envía notificación al empleado
   
5. Empleado accede a onboarding:
   - Ve banner: "Tienes un documento pendiente de firma"
   - Click en "Firmar Contrato"
   
6. Empleado visualiza contrato en PDF

7. Empleado firma digitalmente (botón "Firmar")

8. Sistema:
   - Marca documento como firmado
   - Genera certificado digital SHA-256
   - Notifica a HR
   
9. HR ve en panel: "Juan Pérez ha firmado su contrato"
```

### Caso 3: Offboarding con Firma de Finiquito (Fase 2)

**Escenario**: Empleado debe firmar finiquito al darse de baja

**Paso a Paso**:
```
1. HR crea carpeta "Finiquitos"
   - Vinculada a: Offboarding
   - ☑️ Requiere firma digital
   
2. HR inicia proceso de baja para empleado

3. HR genera finiquito desde plantilla

4. Sistema crea solicitud de firma automática

5. Empleado recibe notificación y firma documento

6. Una vez firmado, proceso de offboarding se completa

7. Empleado pierde acceso a la plataforma

8. Finiquito firmado queda archivado en carpeta de empleado
```

### Caso 4: Onboarding con Rellenar Datos Fiscales (Fase 2)

**Escenario**: Empleado debe completar Modelo 145 (IRPF) durante el onboarding

**Paso a Paso**:
```
1. HR crea carpeta "Documentos Fiscales"
   - Vinculada a: Onboarding
   - ☑️ Requiere rellenar datos
   - Campos: ["empleado_nif", "empleado_estado_civil", "empleado_numero_hijos"]
   
2. HR selecciona plantilla "Modelo 145" y la vincula a esta carpeta

3. Empleado accede a onboarding:
   - Ve tarea: "Completa tus datos fiscales"
   - Click en "Completar"
   
4. Sistema muestra formulario con campos requeridos:
   - NIF: [_________]
   - Estado civil: [Soltero/a ▼]
   - Número de hijos: [0]
   
5. Empleado completa formulario

6. Sistema:
   - Valida datos (NIF correcto, etc.)
   - Genera Modelo 145 desde plantilla
   - Rellena variables con datos del empleado
   - Guarda PDF en carpeta "Documentos Fiscales"
   
7. Empleado puede descargar Modelo 145 pre-rellenado

8. HR recibe notificación: "Juan Pérez ha completado el Modelo 145"
```

---

## 🔧 Implementación Técnica

### Fase 1 (✅ Completada)

**Archivos Creados/Modificados**:

1. **Migration SQL**:
   - `prisma/migrations/add_carpeta_proceso_fields.sql`
   - Agrega campos `vinculadaAProceso`, `requiereFirma`, `requiereRellenarDatos`, `camposRequeridos`

2. **Componente Modal**:
   - `components/hr/crear-carpeta-con-documentos-modal.tsx`
   - Diálogo para crear carpeta con subida directa de documentos

3. **Componente Uploader**:
   - `components/shared/document-uploader-inline.tsx`
   - Subida inline de múltiples archivos con previsualización

4. **API Actualizada**:
   - `app/api/carpetas/route.ts`
   - Soporte para `vinculadaAProceso`, `requiereFirma`, `requiereRellenarDatos`
   - Filtrado por proceso: `GET /api/carpetas?proceso=onboarding`

### Fase 2 (⏳ En Desarrollo)

**Componentes a Crear**:

1. **SolicitarDocumentosOnboardingModal**:
   ```tsx
   // components/onboarding/solicitar-documentos-modal.tsx
   interface SolicitarDocumentosModalProps {
     empleadoId: string;
     carpetasDisponibles: Carpeta[];
     onSuccess: () => void;
   }
   ```

2. **CompletarDatosDocumentoModal**:
   ```tsx
   // components/onboarding/completar-datos-documento-modal.tsx
   interface CompletarDatosDocumentoModalProps {
     plantillaId: string;
     empleadoId: string;
     camposRequeridos: string[];
     onSuccess: (documentoId: string) => void;
   }
   ```

3. **FirmarDocumentoOnboardingModal**:
   ```tsx
   // components/onboarding/firmar-documento-onboarding-modal.tsx
   interface FirmarDocumentoOnboardingModalProps {
     documentoId: string;
     empleadoId: string;
     onSuccess: () => void;
   }
   ```

**APIs a Crear**:

1. **POST /api/onboarding/[empleadoId]/solicitar-documentos**:
   ```typescript
   {
     "carpetaId": "uuid",
     "documentosRequeridos": ["DNI", "Certificado bancario"],
     "mensaje": "Por favor sube los siguientes documentos"
   }
   ```

2. **POST /api/plantillas/[id]/completar-datos**:
   ```typescript
   {
     "empleadoId": "uuid",
     "carpetaId": "uuid",
     "datos": {
       "empleado_nif": "12345678A",
       "empleado_direccion": "Calle Mayor 123"
     }
   }
   ```

3. **POST /api/firmas/solicitar** (integración con sistema de firma digital):
   ```typescript
   {
     "documentoId": "uuid",
     "empleadoId": "uuid",
     "carpetaId": "uuid",
     "tipo": "onboarding"
   }
   ```

---

## 🧪 Testing

### Tests Unitarios

```typescript
// lib/documentos/__tests__/vincular-proceso.test.ts
describe('Vincular Carpeta a Proceso', () => {
  it('crea carpeta vinculada a onboarding correctamente', async () => {
    const carpeta = await crearCarpeta({
      nombre: 'Documentos de Alta',
      vinculadaAProceso: 'onboarding',
      requiereFirma: true,
    });
    
    expect(carpeta.vinculadaAProceso).toBe('onboarding');
    expect(carpeta.requiereFirma).toBe(true);
  });
  
  it('filtra carpetas por proceso', async () => {
    const carpetas = await obtenerCarpetasPorProceso('onboarding');
    expect(carpetas.every(c => c.vinculadaAProceso === 'onboarding')).toBe(true);
  });
});
```

### Tests E2E

```typescript
// tests/e2e/onboarding-documentos.spec.ts
test('HR puede crear carpeta para onboarding con documentos', async ({ page }) => {
  await page.goto('/hr/documentos');
  await page.click('text=Crear Carpeta');
  
  await page.fill('input[name="nombre"]', 'Documentos de Alta');
  await page.selectOption('select[name="vinculadaAProceso"]', 'onboarding');
  await page.check('input[name="requiereFirma"]');
  
  // Subir documento
  await page.setInputFiles('input[type="file"]', 'tests/fixtures/contrato.pdf');
  
  await page.click('button:has-text("Crear")');
  
  await expect(page.locator('text=Documentos de Alta')).toBeVisible();
});
```

---

## 📊 Métricas de Éxito

### KPIs

- **Tiempo de onboarding**: Reducción del 60% (de 2 días a <1 día)
- **Documentos faltantes**: Reducción del 80% (de 40% a <10%)
- **Satisfacción HR**: >4.5/5
- **Adopción de firma digital**: >90% de empleados firman en <24h

---

## 🔗 Referencias

### Documentación Relacionada

1. **Sistema de Documentos**: `docs/funcionalidades/documentos.md`
2. **Sistema de Plantillas**: `docs/especificaciones/plantillas-documentos.md`
3. **Sistema de Firma Digital**: `docs/especificaciones/firma-digital-README.md`

### Integraciones

- **Onboarding**: Formulario de alta de empleado
- **Offboarding**: Proceso de baja de empleado
- **Plantillas**: Generación automática de documentos
- **Firma Digital**: Firma electrónica de documentos

---

## ✅ Checklist de Implementación

### Fase 1 (✅ Completada)
- [x] Agregar campos a modelo Carpeta en Prisma
- [x] Crear migración SQL
- [x] Actualizar API `/api/carpetas` con soporte para procesos
- [x] Crear componente `CrearCarpetaConDocumentosModal`
- [x] Crear componente `DocumentUploaderInline`
- [x] Documentar flujos y casos de uso

### Fase 2 (⏳ Pendiente)
- [ ] Implementar solicitud de documentos en onboarding
- [ ] Integrar con sistema de firma digital
- [ ] Implementar formulario "completar datos"
- [ ] Crear componentes modales específicos
- [ ] Crear APIs de integración
- [ ] Testing E2E completo
- [ ] Documentación de usuario final

---

**Última actualización**: 13 de Noviembre 2025  
**Versión**: 1.0.0  
**Estado**: ✅ Fase 1 Implementada - Fase 2 En Especificación

