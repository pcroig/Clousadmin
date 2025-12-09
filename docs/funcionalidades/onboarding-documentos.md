# Onboarding de Empleados - Sistema Unificado

## 📋 Visión General

El sistema de onboarding permite a HR crear nuevos empleados con un proceso automatizado y configurable. El sistema unifica **pasos base obligatorios** (credenciales, integraciones, PWA) con **acciones dinámicas de workflow** configuradas por la empresa.

**Tipos de Onboarding:**
- **Completo (`completo`)**: Para nuevos empleados - Incluye pasos base + workflow configurable
- **Simplificado (`simplificado`)**: Para empleados existentes - Solo pasos base

---

## 🎯 Flujo Completo

### 1. **HR Configura Workflow de Onboarding** (Una sola vez)

**Ubicación:** `/hr/organizacion/personas` → "Gestionar Onboarding"

**Acciones configurables:**
- **Rellenar campos**: Solicitar datos personales, bancarios, fiscales, etc.
- **Compartir documentos**: Mostrar manuales, políticas, documentos de empresa
- **Solicitar documentos**: Pedir DNI, titulación, certificados, etc.
- **Solicitar firma**: Contratos, acuerdos, documentos legales

### 2. **HR Crea Empleado y Envía Invitación**

**Ubicación:** `/hr/organizacion/personas` → "Añadir Persona" → Tipo "Nuevo"

**Pasos:**
1. HR completa datos básicos (nombre, apellidos, email, puesto, equipo)
2. HR revisa las acciones del workflow y puede activar/desactivar acciones específicas para este empleado
3. HR hace clic en "Enviar Invitación"
4. El sistema:
   - Crea el empleado (`activo: false`)
   - Crea registro de `onboarding_empleados` con token único
   - Inicializa progreso con pasos base + acciones seleccionadas
   - Envía email con link de onboarding

### 3. **Empleado Completa Onboarding**

**Ubicación:** `/onboarding/[token]`

**Layout:**
- **Izquierda**: Checklist con todos los pasos (base + workflow)
- **Derecha**: Contenido del paso actual

**Pasos Base (Obligatorios para todos):**
1. **Credenciales**: Establece contraseña y sube avatar (opcional)
2. **Integraciones**: Conecta herramientas (Slack, Google, etc.) - opcional
3. **PWA**: Explicación de cómo instalar la app móvil

**Pasos de Workflow (Configurables):**
4. **Acciones dinámicas** según configuración de la empresa
   - Ejemplo: Rellenar datos personales (NIF, NSS, dirección)
   - Ejemplo: Subir documentos (DNI, titulación)
   - Ejemplo: Firmar contrato

**Finalización:**
- Empleado completa todos los pasos
- Sistema valida que todos los pasos base y acciones estén completados
- Transfiere datos de `datosTemporales` a `empleados`
- Activa el empleado (`activo: true`)
- Marca onboarding como completado
- Redirige a `/empleado/mi-espacio`

---

## 📁 Gestión de Documentos

### Carpetas Automáticas

El sistema crea automáticamente carpetas organizadas:

#### Para HR (Carpetas Compartidas)
- `Onboarding - {nombreDocumento}` - Carpeta compartida por tipo de documento
- Ejemplo: `Onboarding - Contrato`, `Onboarding - DNI/NIE`

#### Para Empleado (Carpetas Personales)
- `Onboarding/` - Carpeta principal de onboarding del empleado
  - `{nombreDocumento}/` - Subcarpeta por tipo de documento
    - Documentos subidos

### Tipos de Documentos Soportados

El sistema utiliza **4 tipos de documentos** unificados:

- **contrato** - Contratos laborales
- **nomina** - Nóminas
- **justificante** - Justificantes de ausencias y documentos médicos (comparte tipo con "Médicos")
- **otro** - Otros documentos (incluye Personales, DNI, y cualquier carpeta personalizada)

> ℹ️ **Nota importante**: 
> - Las carpetas "Médicos" y "Justificantes" comparten el mismo tipo `justificante` a nivel de datos
> - Las carpetas "Personales" y cualquier carpeta personalizada se mapean automáticamente a `otro`
> - El tipo se infiere automáticamente desde el nombre de la carpeta si no se especifica

> ℹ️ **Integración con Mi Espacio**  
> Los documentos compartidos apuntan al mismo datastore que `Mi Espacio`.  
> Componentes como `DocumentList` y `DocumentUploader` se reutilizan tanto en onboarding como en Mi Espacio.

### Formatos Aceptados

- PDF (`application/pdf`)
- Imágenes JPEG (`image/jpeg`, `image/jpg`)
- Imágenes PNG (`image/png`)
- **Tamaño máximo:** 5MB por archivo

---

## 🔌 API Endpoints

### Endpoints de Configuración

#### 1. Obtener Workflow de Onboarding

**Endpoint:** `GET /api/onboarding/config`

**Autenticación:** Requiere sesión de HR Admin

**Response:**
```json
{
  "success": true,
  "workflowAcciones": [
    {
      "id": "accion-1",
      "orden": 0,
      "tipo": "rellenar_campos",
      "titulo": "Datos Personales",
      "activo": true,
      "config": {
        "campos": ["nif", "nss", "telefono"]
      }
    }
  ]
}
```

### Endpoints de Progreso (Empleado)

#### 2. Obtener Datos de Onboarding

**Endpoint:** `GET /api/onboarding/[token]`

**Autenticación:** Token de onboarding (válido por 7 días)

**Response:**
```json
{
  "workflow": [...],
  "progreso": {
    "credenciales_completadas": true,
    "integraciones": false,
    "pwa_explicacion": false,
    "acciones": {}
  },
  "datosTemporales": {}
}
```

#### 3. Actualizar Progreso de Acción

**Endpoint:** `POST /api/onboarding/[token]/progreso`

**Request:**
```json
{
  "accionId": "accion-rellenar-datos",
  "completado": true,
  "datos": {
    "nif": "12345678A",
    "nss": "123456789012"
  }
}
```

**Response:**
```json
{
  "success": true
}
```

#### 4. Marcar Integraciones Completadas

**Endpoint:** `POST /api/onboarding/[token]/integraciones-completado`

**Response:**
```json
{
  "success": true,
  "message": "Paso de integraciones marcado como completado"
}
```

#### 5. Marcar PWA Completado

**Endpoint:** `POST /api/onboarding/[token]/pwa-completado`

**Response:**
```json
{
  "success": true,
  "message": "Paso de PWA marcado como completado"
}
```

#### 6. Finalizar Onboarding

**Endpoint:** `POST /api/onboarding/[token]/finalizar`

**Validaciones:**
- Todos los pasos base completados
- Todas las acciones activas completadas
- Documentos requeridos subidos (si aplica)

**Response:**
```json
{
  "success": true,
  "message": "Onboarding completado correctamente",
  "empleadoId": "uuid"
}
```

### Endpoints de Credenciales

#### 7. Establecer Credenciales

**Endpoint:** `POST /api/onboarding/[token]/credenciales`

**Request:** FormData
```typescript
{
  password: string;
  confirmPassword: string;
  avatar?: File;
}
```

**Response:**
```json
{
  "success": true,
  "avatarUrl": "https://..."
}
```

---

## 🏗️ Arquitectura

### Componentes Frontend

#### `OnboardingForm` (Empleado)
- **Ubicación:** `app/(auth)/onboarding/[token]/onboarding-form.tsx`
- **Funcionalidad:**
  - Layout unificado con checklist (izquierda) + contenido (derecha)
  - Renderiza pasos base: Credenciales, Integraciones, PWA
  - Renderiza acciones dinámicas del workflow
  - Gestiona estado de progreso local y sincroniza con servidor
  - Navegación entre pasos
  - Botón de finalizar cuando todos los pasos están completados

#### `CredencialesForm`
- **Ubicación:** `components/onboarding/credenciales-form.tsx`
- **Funcionalidad:**
  - Establecer contraseña (mínimo 8 caracteres)
  - Subir avatar opcional
  - Validación de contraseñas coincidentes
  - Funciona para ambos tipos de onboarding (completo y simplificado)

#### `IntegracionesForm`
- **Ubicación:** `components/onboarding/integraciones-form.tsx`
- **Funcionalidad:**
  - Conectar con Slack, Google Calendar, etc.
  - Botones "Completar" y "Saltar"
  - Persiste progreso al servidor

#### `PWAExplicacion`
- **Ubicación:** `components/onboarding/pwa-explicacion.tsx`
- **Funcionalidad:**
  - Explicación de instalación de PWA
  - Botón "Continuar" que persiste progreso
  - Botón "Finalizar" si no hay más acciones

#### Componentes de Acciones de Workflow

- `RellenarCamposStep` - Formulario para rellenar campos configurados
- `CompartirDocsStep` - Visualización de documentos compartidos
- `SolicitarDocsStep` - Subida de documentos solicitados
- `SolicitarFirmaStep` - Firma digital de documentos

#### `AddPersonaOnboardingForm` (HR)
- **Ubicación:** `components/organizacion/add-persona-onboarding-form.tsx`
- **Funcionalidad:**
  - Crear empleado tipo "nuevo" o "existente"
  - Para tipo "nuevo": Muestra workflow con switches para activar/desactivar acciones
  - Envía invitación de onboarding
  - Para tipo "existente": Flujo separado (no modificado)

### Backend

#### `lib/onboarding.ts`
- **Funciones principales:**
  - `verificarTokenOnboarding()` - Valida token y retorna onboarding
  - `crearOnboarding()` - Crea registro de onboarding con progreso inicial
  - `obtenerWorkflowConfig()` - Obtiene workflow configurado de la empresa
  - `actualizarProgresoAccion()` - Actualiza progreso de una acción específica
  - `guardarProgresoIntegraciones()` - Marca integraciones como completadas
  - `finalizarOnboarding()` - Valida todos los pasos y activa empleado
  - `validarTodasAccionesCompletadas()` - Verifica que todas las acciones estén completadas

#### `lib/onboarding-config-types.ts`
- **Tipos principales:**
  - `WorkflowAccion` - Define una acción del workflow
  - `RellenarCamposConfig`, `CompartirDocsConfig`, `SolicitarDocsConfig`, `SolicitarFirmaConfig`
  - `ProgresoOnboardingWorkflow` - Estructura de progreso unificada

---

## 🔄 Flujo de Datos

### Flujo Completo de Onboarding

```
1. HR crea empleado:
   → POST /api/invitaciones/onboarding
   → Crea empleado (activo: false)
   → Crea onboarding_empleados con token
   → Inicializa progreso:
     {
       credenciales_completadas: false,
       integraciones: false,
       pwa_explicacion: false,
       acciones: { accion1: false, accion2: false }
     }
   → Envía email con token

2. Empleado accede con token:
   → GET /api/onboarding/[token]
   → Retorna workflow, progreso, datosTemporales
   → Frontend renderiza checklist + paso actual

3. Empleado completa pasos base:
   → POST /api/onboarding/[token]/credenciales
     (actualiza password en usuarios)
   → POST /api/onboarding/[token]/integraciones-completado
     (actualiza progreso.integraciones = true)
   → POST /api/onboarding/[token]/pwa-completado
     (actualiza progreso.pwa_explicacion = true)

4. Empleado completa acciones de workflow:
   → POST /api/onboarding/[token]/progreso
     {
       accionId: "accion-rellenar-datos",
       completado: true,
       datos: { nif: "12345678A", ... }
     }
   → Actualiza progreso.acciones[accionId] = true
   → Guarda datos en datosTemporales

5. Empleado finaliza:
   → POST /api/onboarding/[token]/finalizar
   → Valida todos los pasos completados
   → Transfiere datosTemporales a empleados
   → Marca onboarding.completado = true
   → Activa empleado (activo: true)
   → Redirige a /empleado/mi-espacio
```

### Flujo de Actualización de Progreso

```
Frontend (OnboardingForm):
1. Usuario completa paso
2. Llama a endpoint correspondiente:
   - Pasos base: /credenciales, /integraciones-completado, /pwa-completado
   - Acciones: /progreso con accionId
3. Actualiza estado local
4. Avanza al siguiente paso no completado

Backend (lib/onboarding.ts):
1. Verifica token válido
2. Lee progreso actual
3. Actualiza campo correspondiente
4. Preserva todos los demás campos (importante para evitar pérdida de datos)
5. Guarda en BD
6. Retorna success
```

---

## ✅ Validaciones

### Validación de Pasos Base

En el endpoint `POST /api/onboarding/[token]/finalizar`, se valida:

```typescript
// 1. Credenciales completadas
if (!progreso.credenciales_completadas) {
  throw new Error('Debes completar el paso de credenciales');
}

// 2. Integraciones completadas
if (!progreso.integraciones) {
  throw new Error('Debes completar el paso de integraciones');
}

// 3. PWA explicación vista
if (!progreso.pwa_explicacion) {
  throw new Error('Debes completar el paso de instalación de la app móvil');
}
```

### Validación de Acciones de Workflow

```typescript
// Obtener workflow configurado
const workflow = await obtenerWorkflowConfig(empresaId);
const accionesActivas = workflow.filter(a => a.activo);

// Validar cada acción
for (const accion of accionesActivas) {
  if (!progreso.acciones[accion.id]) {
    throw new Error(`Debes completar: ${accion.titulo}`);
  }
}
```

### Validación de Contraseña

En `CredencialesForm`:
- Mínimo 8 caracteres
- Contraseña y confirmación deben coincidir
- Validación en cliente y servidor

### Validación de Documentos Requeridos

Si una acción de tipo `solicitar_docs` está activa:
1. HR configura documentos requeridos en la configuración de la acción
2. Al subir documento, se marca en el progreso
3. Al finalizar onboarding, se valida que todos los requeridos estén subidos
4. Tipos de archivo aceptados: PDF, JPEG, PNG, DOC, DOCX
5. Tamaño máximo: 5MB por archivo

---

## 📊 Progreso de Onboarding

### Onboarding Completo (Nuevos Empleados)

El progreso se almacena en `onboarding_empleados.progreso` con estructura unificada:

```json
{
  "credenciales_completadas": true,
  "integraciones": true,
  "pwa_explicacion": false,
  "acciones": {
    "accion-rellenar-datos-personales": true,
    "accion-solicitar-dni": false,
    "accion-firmar-contrato": false
  }
}
```

**Pasos Base:**
- `credenciales_completadas`: Contraseña establecida
- `integraciones`: Integraciones configuradas (o saltadas)
- `pwa_explicacion`: PWA explicación vista

**Acciones Dinámicas:**
- `acciones`: Objeto con ID de acción → booleano de completitud
- Las acciones se definen en `onboarding_configs.workflowAcciones`

### Onboarding Simplificado (Empleados Existentes)

Mismo formato pero sin campo `acciones`:

```json
{
  "credenciales_completadas": true,
  "integraciones": true,
  "pwa_explicacion": false
}
```

---

## 🔐 Seguridad

### Permisos

- **HR Admin:** Puede subir documentos para cualquier empleado de su empresa
- **Empleado:** Solo puede subir documentos durante su propio onboarding (con token válido)

### Validaciones

- Verificación de pertenencia a empresa
- Verificación de token de onboarding (válido, no expirado, no completado)
- Validación de tipos de archivo y tamaños
- Sanitización de nombres de archivo

---

## 🐛 Troubleshooting

### Error: "El empleado no tiene un onboarding activo"

**Causa:** Se intenta subir documento antes de activar el onboarding o después de completarlo.

**Solución:** Asegurarse de que el onboarding esté activo antes de subir documentos.

### Error: "Tipo de archivo no permitido"

**Causa:** El archivo no es PDF, JPEG o PNG.

**Solución:** Convertir el archivo a un formato soportado.

### Error: "El archivo es demasiado grande"

**Causa:** El archivo supera los 5MB.

**Solución:** Comprimir el archivo o dividirlo en partes más pequeñas.

### Documentos no aparecen en la lista

**Causa:** Puede ser un problema de permisos o de token expirado.

**Solución:** 
- Verificar que el token de onboarding sea válido
- Verificar que el empleado pertenezca a la empresa correcta
- Revisar logs del servidor para más detalles

---

## 📝 Notas de Implementación

### Características Clave del Sistema Unificado

1. **Pasos Base + Workflow Dinámico:**
   - Todos los empleados nuevos pasan por 3 pasos base obligatorios
   - Luego completan acciones configurables del workflow de la empresa
   - Sistema escalable y personalizable por empresa

2. **Persistencia de Progreso:**
   - Cada paso persiste su progreso al servidor inmediatamente
   - No se pierde progreso al recargar página
   - Estado sincronizado entre frontend y backend

3. **Navegación Flexible:**
   - Empleado puede navegar entre pasos completados
   - Checklist visual muestra progreso en tiempo real
   - Botón "Finalizar" solo aparece cuando todo está completo

4. **Validación Robusta:**
   - Validación en cliente (UX inmediata)
   - Validación en servidor (seguridad)
   - Mensajes de error claros y específicos

5. **Endpoints Unificados:**
   - Mismo código funciona para onboarding completo y simplificado
   - Eliminación de duplicación de código
   - Mantenimiento más sencillo

---

## 🔧 Troubleshooting

### Error: "Debes completar el paso de credenciales"

**Causa:** El empleado intenta finalizar sin establecer contraseña

**Solución:** Volver al paso de Credenciales y establecer contraseña válida (mínimo 8 caracteres)

### Error: "Invalid UUID" para empleadoId

**Causa:** Sistema antiguo usaba UUID, nuevo sistema usa CUID

**Solución:** Ya resuelto - todos los endpoints ahora validan con `.cuid()` en lugar de `.uuid()`

### Empleado no puede hacer login después de onboarding

**Causa:** Password no se estableció correctamente o onboarding no se completó

**Solución:**
1. Verificar que `progreso.credenciales_completadas = true`
2. Verificar que existe registro en `usuarios` con password hash
3. Verificar que `empleados.activo = true`

### Progreso se pierde al actualizar acción

**Causa:** Función `actualizarProgresoAccion` no preservaba campos base

**Solución:** Ya resuelto - función ahora preserva explícitamente `credenciales_completadas`, `integraciones`, `pwa_explicacion`

---

## 📜 Changelog

### v2.0.0 (Diciembre 2025) - Sistema Unificado

**Cambios Mayores:**
- ✅ Unificación de onboarding completo y simplificado
- ✅ Pasos base obligatorios: Credenciales, Integraciones, PWA
- ✅ Workflow dinámico con acciones configurables
- ✅ Nueva estructura de `ProgresoOnboardingWorkflow`
- ✅ Layout con checklist (izquierda) + contenido (derecha)
- ✅ Endpoints unificados para ambos tipos de onboarding
- ✅ Validación robusta de todos los pasos antes de finalizar

**Componentes Nuevos:**
- `OnboardingForm` - Componente unificado con checklist
- `RellenarCamposStep`, `CompartirDocsStep`, `SolicitarDocsStep`, `SolicitarFirmaStep`

**Endpoints Nuevos:**
- `POST /api/onboarding/[token]/integraciones-completado`
- `POST /api/onboarding/[token]/pwa-completado`
- `POST /api/onboarding/[token]/progreso`

**Funciones Modificadas:**
- `finalizarOnboarding()` - Validación unificada de pasos base + acciones
- `actualizarProgresoAccion()` - Preservación de campos base
- `guardarProgresoIntegraciones()` - Tipo genérico para ambos onboardings

**Bugs Resueltos:**
- 404 al asignar equipo durante onboarding (removida validación `activo: true`)
- Login failure después de onboarding (credenciales ahora obligatorias)
- UUID/CUID validation mismatches (todos los endpoints usan `.cuid()`)
- Pérdida de progreso al actualizar acciones (campos base preservados)
- Botones de integraciones no visibles en onboarding completo

### v1.0.0 (Noviembre 2025) - Sistema con Documentos

**Versión Inicial:**
- Sistema de onboarding con gestión de documentos
- Subida de documentos por HR y empleado
- Carpetas automáticas
- Validación de documentos requeridos

---

**Última actualización:** Diciembre 2025
**Versión:** 2.0.0







