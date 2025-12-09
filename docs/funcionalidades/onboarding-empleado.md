# 👤 Onboarding de Empleado

**Estado**: ✅ Implementado
**Versión**: 2.0
**Última actualización**: 2025-12-09

---

## 🎯 Visión General

El onboarding de empleado es el proceso mediante el cual un nuevo empleado activa su cuenta en Clousadmin después de ser invitado por su empresa. Existen **dos tipos de onboarding**:

1. **Onboarding Simplificado**: Para empleados existentes importados masivamente (solo credenciales, integraciones y PWA)
2. **Onboarding con Workflow**: Para nuevos empleados con acciones personalizadas configuradas por la empresa

---

## 📍 Ubicación

### Onboarding Completo (con Workflow)
**Ruta:** `/onboarding/[token]`
**Componente:** `app/(auth)/onboarding/[token]/onboarding-form.tsx`
**Page:** `app/(auth)/onboarding/[token]/page.tsx`

### Onboarding Simplificado
**Ruta:** `/onboarding-simplificado/[token]`
**Componente:** `app/(auth)/onboarding-simplificado/[token]/onboarding-simplificado-form.tsx`
**Page:** `app/(auth)/onboarding-simplificado/[token]/page.tsx`

---

## 🔄 Flujo de Onboarding Completo (con Workflow)

### Estructura de Pasos

El onboarding con workflow tiene **4 pasos** (3 base + 1 workflow):

#### **Paso 1: Credenciales**
- Avatar del empleado (opcional, imagen hasta 2MB)
- Contraseña (mínimo 8 caracteres)

**Título dinámico:** `"Hola [Nombre], bienvenido a [Empresa]"`
**Descripción:** `"Configura tu acceso a [Empresa]."`

#### **Paso 2: Integraciones**
- Sincronización de calendario (Google Calendar)
- App de mensajería
- Puede omitirse haciendo clic en "Omitir"

**Título dinámico:** `"Conecta tus herramientas de trabajo"`
**Descripción:** `"Sincroniza tu calendario y app de mensajería."`

#### **Paso 3: PWA (Progressive Web App)**
- Explicación de cómo instalar Clousadmin en el móvil
- Instrucciones específicas para iOS y Android
- Botón de instalación automática (si el navegador lo soporta)
- **Navegación:** Botones "Anterior" y "Siguiente"

**Título dinámico:** `"Instala Clousadmin en tu móvil"`
**Descripción:** `"Accede fácilmente desde tu smartphone."`

**Comportamiento del botón:**
- Si hay workflow configurado → "Siguiente"
- Si NO hay workflow → "Completar onboarding"

#### **Paso 4: Acciones del Workflow** (solo si hay workflow configurado)

**Diseño:** Todas las acciones se muestran en **acordeones** en una sola pantalla.

**Título dinámico:** `"Completa tu perfil"`
**Descripción:** `"Finaliza las acciones pendientes para activar tu cuenta."`

**Tipos de acciones disponibles:**

1. **`rellenar_campos`** - Rellenar datos personales
   - Formulario con campos configurables
   - Campos disponibles: NIF, NSS, teléfono, fecha nacimiento, dirección, IBAN, BIC, salario, tipo contrato
   - Validación automática
   - Botón: "Guardar"

2. **`compartir_docs`** - Documentos compartidos por la empresa
   - Lista de documentos para revisar
   - Checkbox de confirmación: "He revisado y leído todos los documentos compartidos"
   - Descarga de documentos
   - Botón: "Marcar como leído"

3. **`solicitar_docs`** - Subir documentos requeridos
   - Documentos requeridos (obligatorios)
   - Documentos opcionales
   - Upload individual por documento
   - Botón: "Confirmar documentos"

4. **`solicitar_firma`** - Firmar documentos
   - Lista de documentos pendientes de firma
   - Enlace para ir a firmar (abre en nueva ventana)
   - Botón "Refrescar Estado" para actualizar
   - Botón: "Confirmar firmas"

**Comportamiento de acordeones:**
- Se pueden abrir/cerrar de forma independiente
- Múltiples acordeones pueden estar abiertos simultáneamente
- El empleado puede completarlos en **cualquier orden**
- Al completar una acción:
  - Se marca automáticamente con ✓ verde
  - El acordeón muestra "✓ Acción completada"
  - Se actualiza el progreso en tiempo real
- El botón "Completar onboarding" se activa solo cuando **todas** las acciones están completadas

**Navegación:**
- Botón "Anterior" → Vuelve al paso 3 (PWA)
- Botón "Completar onboarding" → Solo activo cuando todas las acciones están marcadas

---

## 🔄 Flujo de Onboarding Simplificado

El onboarding simplificado solo tiene **3 pasos**:

1. Credenciales
2. Integraciones (opcional)
3. PWA

**Diferencias con el onboarding completo:**
- NO tiene paso 4 (workflow)
- Al finalizar redirige a `/login?onboarding=success`
- No usa `WorkflowAccionesStep`

---

## 🏗️ Arquitectura

### Componentes Principales

#### `onboarding-form.tsx` (Onboarding Completo)

**Características clave:**
- ✅ Títulos y descripciones **dinámicos** que cambian por paso
- ✅ Stepper visual (barra de progreso)
- ✅ Estado local de progreso (`progresoLocal`) para actualización inmediata
- ✅ Navegación secuencial en pasos 1-3
- ✅ Acordeones en paso 4 (no secuencial)

**Estado:**
```typescript
const [currentStep, setCurrentStep] = useState(1); // 1-4
const [progresoLocal, setProgresoLocal] = useState(progreso); // Sincronizado con servidor
const [isCompleting, setIsCompleting] = useState(false);
```

**Handlers importantes:**
```typescript
// Completar pasos base (1-3)
const handleStepComplete = async (stepNumber: number) => {
  if (stepNumber < totalPasos) {
    setCurrentStep(stepNumber + 1);
  } else {
    handleFinalizarOnboarding();
  }
};

// Completar acciones del workflow (paso 4)
const handleActualizarDatos = async (accionId: string, datos?: Record<string, unknown>) => {
  // 1. Guarda en servidor
  await fetch(`/api/onboarding/${token}/progreso`, { ... });

  // 2. Actualiza estado local INMEDIATAMENTE
  setProgresoLocal(prev => ({
    ...prev,
    acciones: { ...prev.acciones, [accionId]: true }
  }));

  // 3. Muestra toast de éxito
  toast.success('Acción completada correctamente');
};
```

### Componentes de Pasos

**Pasos base (1-3):**
- `components/onboarding/credenciales-form.tsx`
- `components/onboarding/integraciones-form.tsx`
- `components/onboarding/pwa-explicacion.tsx`

**Paso 4 - Workflow:**
- `components/onboarding/workflow-acciones-step.tsx` (contenedor de acordeones)

**Componentes de acciones individuales:**
- `components/onboarding/rellenar-campos-step.tsx`
- `components/onboarding/compartir-docs-step.tsx`
- `components/onboarding/solicitar-docs-step.tsx`
- `components/onboarding/solicitar-firma-step.tsx`

### Sistema de Workflow

**Tipos definidos en:** `lib/onboarding-config-types.ts`

```typescript
interface WorkflowAccion {
  id: string;
  orden: number;
  tipo: 'rellenar_campos' | 'compartir_docs' | 'solicitar_docs' | 'solicitar_firma';
  titulo: string;
  activo: boolean;
  config: RellenarCamposConfig | CompartirDocsConfig | SolicitarDocsConfig | SolicitarFirmaConfig;
}
```

**Configuración de campos disponibles:**
```typescript
export const CAMPOS_DISPONIBLES = [
  { id: 'nif', label: 'NIF' },
  { id: 'nss', label: 'Número de Seguridad Social' },
  { id: 'telefono', label: 'Teléfono' },
  { id: 'fechaNacimiento', label: 'Fecha de Nacimiento' },
  { id: 'direccionCalle', label: 'Calle' },
  { id: 'direccionNumero', label: 'Número' },
  { id: 'direccionPiso', label: 'Piso/Puerta' },
  { id: 'codigoPostal', label: 'Código Postal' },
  { id: 'ciudad', label: 'Ciudad' },
  { id: 'direccionProvincia', label: 'Provincia' },
  { id: 'iban', label: 'IBAN' },
  { id: 'bic', label: 'BIC/SWIFT' },
  { id: 'salarioBaseAnual', label: 'Salario Base Anual' },
  { id: 'tipoContrato', label: 'Tipo de Contrato' },
] as const;
```

---

## 🔌 API Endpoints

### POST `/api/onboarding/[token]/progreso`
Guarda el progreso de una acción del workflow.

**Body:**
```typescript
{
  accionId: string;
  completado: boolean;
  datos?: Record<string, unknown>; // Solo para rellenar_campos
}
```

**Response:**
```typescript
{ success: true }
```

### POST `/api/onboarding/[token]/pwa-completado`
Marca el paso PWA como completado.

**Response:**
```typescript
{ success: true }
```

### POST `/api/onboarding/[token]/finalizar`
Finaliza el onboarding y activa la cuenta del empleado.

**Proceso:**
1. Valida que todos los pasos estén completados
2. Transfiere `datosTemporales` al empleado
3. **Convierte `fechaNacimiento` de string a Date** (fix crítico)
4. Encripta campos sensibles
5. Marca `onboardingCompletado = true`
6. Activa empleado y usuario

**Response:**
```typescript
{
  success: true;
  message: 'Onboarding completado correctamente';
  empleadoId: string;
  redirectUrl: '/empleado/mi-espacio';
}
```

---

## 🔐 Seguridad

### Validación de Token
- Token debe ser válido y no expirado
- Token debe pertenecer a un empleado
- Empleado no debe tener onboarding completado

### Encriptación de Datos
Los siguientes campos se encriptan antes de guardar:
- NIF
- NSS
- IBAN
- Teléfono (parcial)

**Función:** `encryptEmpleadoData()` en `lib/empleado-crypto.ts`

### Conversión de Tipos

⚠️ **Fix crítico - Conversión de fechaNacimiento:**

```typescript
// En lib/onboarding.ts:741-750
for (const campo of camposATransferir) {
  if (datosTemporales[campo] !== undefined && datosTemporales[campo] !== null) {
    // Convertir fechaNacimiento de string a Date
    if (campo === 'fechaNacimiento' && typeof datosTemporales[campo] === 'string') {
      datosEmpleado[campo] = new Date(datosTemporales[campo] as string);
    } else {
      datosEmpleado[campo] = datosTemporales[campo];
    }
  }
}
```

**Razón:** El formulario envía `fechaNacimiento` como string `"2025-12-03"`, pero Prisma espera `DateTime`. Sin esta conversión, se produce error de validación de Prisma.

---

## 📊 Estado de Progreso

El progreso se rastrea en:

**Base de datos:**
```typescript
interface OnboardingEmpleados {
  id: string;
  empleadoId: string;
  token: string;
  progreso: ProgresoOnboardingWorkflow; // JSON
  datosTemporales: DatosTemporales; // JSON
  // ...
}
```

**Tipo de progreso (con workflow):**
```typescript
interface ProgresoOnboardingWorkflow {
  credenciales_completadas: boolean;
  integraciones: boolean;
  pwa_explicacion: boolean;
  acciones: Record<string, boolean>; // { [accionId]: completado }
}
```

**Estado local en el componente:**
- Se inicializa desde `progreso` del servidor
- Se actualiza inmediatamente al completar acciones (sin esperar refresh)
- Se sincroniza con el servidor en cada acción

---

## 🎨 UI/UX

### Stepper Visual
Barra de progreso horizontal que muestra:
- Paso actual (barra gris oscuro)
- Pasos completados (barra gris oscuro)
- Pasos pendientes (barra gris claro)

### Títulos Dinámicos
Cada paso muestra un título y descripción específicos:
- Paso 1: Personalizado con nombre del empleado
- Paso 2-4: Descripciones claras de la acción

### Acordeones (Paso 4)
**Diseño:**
- Checkbox verde ✓ cuando está completado
- Círculo vacío cuando está pendiente
- Título de la acción
- Icono de flecha para expandir/colapsar

**Interacción:**
- Click en el header para expandir/colapsar
- Múltiples acordeones pueden estar abiertos
- Al completar: se marca automáticamente con ✓
- Muestra "✓ Acción completada" dentro del acordeón

### Navegación
**Pasos 1-2:** Solo botón "Siguiente"
**Paso 3:** Botones "Anterior" y "Siguiente"/"Completar onboarding"
**Paso 4:** Botones "Anterior" y "Completar onboarding" (deshabilitado hasta que todas las acciones estén completadas)

---

## 🐛 Errores Conocidos y Fixes

### ✅ Fix: fechaNacimiento como string
**Problema:** Prisma rechazaba `fechaNacimiento: "2025-12-03"` esperando `DateTime`
**Solución:** Conversión explícita a `Date` en `lib/onboarding.ts:744-745`

### ✅ Fix: Progreso no se actualizaba inmediatamente
**Problema:** Al completar una acción, el checkmark no aparecía hasta recargar
**Solución:** Estado local `progresoLocal` que se actualiza inmediatamente en `handleActualizarDatos`

### ✅ Fix: Workflow actions como pasos secuenciales
**Problema:** Las acciones del workflow se mostraban como pasos separados (4, 5, 6...)
**Solución:** Todas las acciones en un solo paso 4 con acordeones

---

## 🔄 Migración y Evolución

### v1.0 → v2.0 (9 Dic 2025)

**Cambios mayores:**
1. ✅ Eliminada sidebar/checklist del onboarding
2. ✅ Implementado diseño secuencial (pasos 1-3)
3. ✅ Paso 4 con acordeones (no secuencial)
4. ✅ Títulos dinámicos por paso
5. ✅ Navegación "Anterior"/"Siguiente" en PWA
6. ✅ Estado local para actualización inmediata
7. ✅ Fix de conversión de fechaNacimiento

**Componentes modificados:**
- `app/(auth)/onboarding/[token]/onboarding-form.tsx` - Reescrito completamente
- `components/onboarding/pwa-explicacion.tsx` - Añadidos botones de navegación
- `components/onboarding/workflow-acciones-step.tsx` - Nuevo componente
- `lib/onboarding.ts` - Fix de conversión de fecha

---

## 📚 Referencias

- **Autenticación:** [`docs/funcionalidades/autenticacion.md`](./autenticacion.md)
- **Onboarding HR Admin:** [`docs/funcionalidades/onboarding-empresa.md`](./onboarding-empresa.md)
- **Invitaciones:** [`docs/INVITAR_USUARIOS.md`](../INVITAR_USUARIOS.md)

---

**Última actualización:** 2025-12-09
**Autor:** Clousadmin Dev Team

**Changelog v2.0 (9 Dic 2025):**
- ✅ Rediseño completo del flujo de onboarding
- ✅ Paso 4 con acordeones para workflow
- ✅ Títulos dinámicos por paso
- ✅ Navegación mejorada con botones Anterior/Siguiente
- ✅ Fix crítico: conversión de fechaNacimiento
- ✅ Estado local para actualización inmediata de progreso
- ✅ Simplificación de import de empleados (eliminado paso de confirmación redundante)
- ✅ Banner de empleados creados solo muestra cuando hay 2+ empleados (admin + equipo)
