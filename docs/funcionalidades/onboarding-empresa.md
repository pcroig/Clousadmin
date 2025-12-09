# 🚀 Onboarding de Empresa (HR Admin)

**Estado**: ✅ Implementado
**Versión**: 2.1
**Última actualización**: 2025-11-29

---

## 🎯 Visión General

El onboarding de empresa es el proceso mediante el cual un nuevo HR Admin configura su empresa en Clousadmin después de recibir una invitación. **Todo el proceso se completa en una única ruta: `/signup`**.

**Características clave:**
- ✅ Flujo multi-paso (7 pasos) en una sola página
- ✅ Progreso visual con stepper
- ✅ Cada paso se guarda individualmente
- ✅ Navegación entre pasos sin pérdida de datos
- ✅ Componentes reutilizables del panel de HR admin

---

## 📍 Ubicación

**Ruta:** `/signup?token=...`

**Componente principal:** `app/(auth)/signup/signup-form.tsx`

**Server Actions:** `app/(auth)/signup/actions.ts`

---

## 🔄 Flujo Completo (7 Pasos)

### Paso 0: Crear Cuenta

**Objetivo:** Crear la empresa y el usuario HR Admin inicial.

**Campos:**
- Avatar del administrador (opcional, imagen hasta 2MB)
- Nombre de la empresa * (obligatorio)
- Sitio web (opcional, normalización automática de URL)
- Nombre del administrador * (obligatorio)
- Apellidos del administrador * (obligatorio)
- Email (pre-rellenado desde la invitación, bloqueado)
- Contraseña * (mínimo 8 caracteres)
- Consentimiento de tratamiento de datos * (obligatorio)

**Acción:**
- Valida el token de invitación
- Crea empresa, usuario HR Admin y empleado en una transacción
- **Sube avatar a S3** si se proporciona (formato: `avatars/{empresaId}/{empleadoId}/{timestamp}.{ext}`)
- **Normaliza URL** del sitio web (añade `https://` automáticamente si no tiene protocolo)
- Marca invitación como usada
- Autentica automáticamente al usuario
- Avanza al paso 1

**Normalización de URL:**
- Input: `"www.empresa.com"` → Output: `"https://www.empresa.com"`
- Input: `"empresa.com"` → Output: `"https://empresa.com"`
- Input: vacío → Output: `null`

**Server Action:** `signupEmpresaAction`

---

### Paso 1: Importar Empleados

**Objetivo:** Importar empleados masivamente desde Excel.

**Componente:** `components/shared/importar-empleados-excel.tsx`

**Funcionalidad:**
- Subida de archivo Excel (.xlsx, .xls, .csv)
- Procesamiento con IA para detectar estructura automáticamente
- **Importación directa sin paso de confirmación** (simplificado en v2.2)
- Validación de datos
- Creación automática de equipos y puestos detectados
- Opción de enviar invitaciones por email
- **Persistencia:** Al volver a este paso, se cargan automáticamente empleados sin onboarding completado

**Mejoras en v2.2:**
- ❌ Eliminado paso intermedio "Confirmar e importar X empleados"
- ✅ Botón cambiado de "Guardar y volver" a "Guardar"
- ✅ Banner solo muestra empleados del equipo (no cuenta al HR admin)
- ✅ Banner solo aparece con 2+ empleados totales (admin + al menos 1 del equipo)

**Persistencia de Datos:**
```typescript
// Al montar el componente en modo onboarding:
useEffect(() => {
  // Carga empleados con onboardingCompletado === false
  fetch('/api/empleados?limit=100')
  // Filtra y muestra los empleados creados durante este flujo
}, []);
```

**Nota importante:**
- Los empleados se crean **sin jornada asignada**
- La jornada se asignará automáticamente en el paso 3
- Al importar y luego volver al paso 1, los empleados previamente importados se muestran

**API:** `POST /api/empleados/importar-excel`

📖 **Ver documentación completa:** [`docs/funcionalidades/importacion-empleados-excel.md`](./importacion-empleados-excel.md)

---

### Paso 2: Configurar Sedes

**Objetivo:** Crear sedes (oficinas) de la empresa y asignarlas.

**Componente:** `components/onboarding/sedes-form.tsx`

**Funcionalidad:**
- Crear nuevas sedes (botón integrado en el campo de ciudad)
- Asignar sedes a toda la empresa o equipos específicos
- Ver sedes creadas en formato compacto (ciudad + asignación inline)
- Eliminar sedes (si no tienen empleados asignados)
- **Persistencia:** Al volver a este paso, se cargan automáticamente las sedes creadas

**UI Mejorada:**
- Diseño compacto: muestra ciudad, nombre y asignación en una línea
- Botón "Agregar" integrado junto al input de ciudad
- Asignación mostrada inline: "Todos los empleados" o "Equipo: [nombre]"
- Sin bordes en radio buttons (diseño más limpio)

**Persistencia de Datos:**
```typescript
// Al montar el componente:
useEffect(() => {
  // Si no hay sedes iniciales, carga desde API
  if (sedesIniciales.length === 0) {
    fetch('/api/sedes')
    setSedes(sedesNormalizadas)
  }
}, []);
```

**Server Actions:**
- `crearSedeAction` - Crear nueva sede con asignación
- `asignarSedeAction` - Cambiar asignación de sede existente
- `eliminarSedeAction` - Eliminar sede sin empleados

---

### Paso 3: Jornada Laboral

**Objetivo:** Configurar la jornada predefinida de la empresa.

**Componente:** `components/onboarding/jornada-step.tsx`

**Características:**
- Usa `JornadaFormFields` con `showNombre={false}` y `showAsignacion={true}`
- **Diseño embedded** (sin fondo ni border, integrado directamente en el paso)
- **Sin loader inicial** - renderiza instantáneamente con valores por defecto
- **Asignación al principio** - La sección de asignación aparece primero (es la agrupación lógica)
- **Sin campo nombre visible** - El nombre se genera automáticamente como "Jornada base"
- Valores por defecto pre-rellenados:
  - Tipo: Flexible
  - Horas semanales: 40
  - Días laborables: Lunes a Viernes
  - Límites: opcionales

**Configuración:**
- **Asignación** (aparece primero): Nivel empresa (fijo para onboarding)
- Tipo de jornada: Fija o Flexible
- Horas semanales * (obligatorio)
- Días laborables (selector visual)
- Horarios por día (para jornada fija)
- Descansos en minutos
- Límites de fichaje (opcionales)

**Acción al guardar:**
- Crea o actualiza la jornada predefinida
- Valida solapamientos y cobertura 100% (empresa es excluyente)
- Desasigna jornadas obsoletas y asigna automáticamente a toda la empresa
- El nombre se establece internamente como "Jornada base"
- No requiere selección manual de asignación (simplificado para onboarding)

**Notas técnicas:**
- El campo `nombre` está oculto (`showNombre={false}`)
- La asignación está visible y fija en nivel "empresa"
- Si existe una jornada no predefinida, se actualiza en lugar de crear nueva
- Los límites solo se envían si tienen valor (opcionales)

**Server Action:** `configurarCalendarioYJornadaAction`

📖 **Ver documentación completa:** [`docs/funcionalidades/jornadas.md`](./jornadas.md)

---

### Paso 4: Calendario Laboral

**Objetivo:** Configurar días laborables, límites de fichaje y festivos de la empresa.

**Componente:** `components/onboarding/calendario-step.tsx`

**Características principales:**
- ✅ Usa `CalendarioFestivos` y `ListaFestivos` (componentes reutilizables del panel de HR)
- ✅ Selector visual de días laborables de la semana (L-D)
- ✅ Campos de límites de fichaje (hora mínima inicio / hora máxima salida)
- ✅ **Calendario visual de dos meses** (`numberOfMonths={2}`)
- ✅ **Gestión de festivos por año** con selector integrado
- ✅ **Modal unificado de importación** (`ImportarFestivosModal`)
- ✅ **Importación automática de festivos nacionales** al entrar al paso
- ✅ **Sincronización completa** con configuración de HR Admin

**Secciones del paso:**

1. **Días laborables de la semana**
   - Selector visual con botones toggle para L-D
   - Por defecto: Lunes a Viernes activos

2. **Límites de fichaje globales**
   - **Hora mínima de inicio**: Campo time input (ej: 07:00)
   - **Hora máxima de salida**: Campo time input (ej: 21:00)
   - Aplicable a TODAS las jornadas de la empresa
   - Opcional: Se pueden dejar vacíos

3. **Festivos** (con tabs: Calendario / Lista)
   - **Tab Calendario**: Vista visual de 2 meses con festivos marcados
   - **Tab Lista**: Tabla con gestión por año
     - Selector de año en header de tabla
     - Visualización con `FechaCalendar` (diseño tipo calendario)
     - Alerta si faltan festivos nacionales (< 10)
     - Crear festivos inline en la tabla
     - Toggle activo/inactivo
   - **Botones de acción**:
     - "Añadir festivo": Crea festivo inline en la tabla
     - "Importar": Abre modal unificado con 2 opciones

**Modal de Importación (`ImportarFestivosModal`)**:

Opciones disponibles:
1. **Desde archivo**:
   - Formatos: .ics, .csv
   - Preview del archivo seleccionado
   - Import directo
2. **Festivos nacionales**:
   - Lista de 10 festivos nacionales de España
   - Selección del año (usa año del selector de la tabla)
   - Confirmación explícita
   - Detección de duplicados automática (upsert)

**Importación automática inicial:**
```typescript
useEffect(() => {
  // Al montar el componente por primera vez
  // Importa festivos nacionales del año actual automáticamente
  fetch('/api/festivos/importar-nacionales', { method: 'POST' });
}, []);
```

**Sincronización con HR Admin:**
- Usa el **mismo modal** de importación (`ImportarFestivosModal`)
- Usa los **mismos componentes** de calendario y lista
- Misma UX y funcionalidad en ambos contextos
- Hook `useFestivos` para actualización automática

**Acción al guardar (imperative handle):**
```typescript
const guardar = async (): Promise<boolean> => {
  // Guarda:
  // 1. Días laborables
  // 2. Límites de fichaje globales
  // NO guarda festivos (se guardan automáticamente al crear/editar)
};
```

**Server Action:** `configurarCalendarioYJornadaAction` (actualiza calendario y límites de fichaje)

**Datos persistidos:**
- Días laborables → `empresa.config.diasLaborables`
- Límites de fichaje → `empresa.config.limiteInferiorFichaje` y `limiteSuperiorFichaje`
- Festivos → Tabla `festivos` (se guardan inmediatamente al crear/editar)

---

### Paso 5: Integraciones (Opcional)

**Objetivo:** Configurar integraciones opcionales con herramientas externas.

**Componente:** `components/onboarding/integraciones-form.tsx`

**Integraciones disponibles:**
- Google Calendar
- Otras integraciones futuras

**Server Action:** `configurarIntegracionAction`

---

### Paso 6: Invitar HR Admins (Opcional)

**Objetivo:** Invitar otros miembros del equipo como HR Admin.

**Componente:** `components/onboarding/invitar-hr-admins.tsx`

**Funcionalidad:**
- Invitar por email (nuevo usuario)
- Seleccionar empleado existente del paso 1
- Generar enlaces de invitación con URL de producción
- Envío de emails de invitación automático

**Al finalizar:**
- Llama a `completarOnboardingAction()`
- Marca `empleado.onboardingCompletado = true`
- Redirige a `/hr/dashboard`

**Server Action:** `invitarHRAdminAction`

---

## 🏗️ Arquitectura

### Componentes Principales

**`app/(auth)/signup/signup-form.tsx`**
- Componente principal que orquesta todos los pasos
- Maneja el estado del paso actual (0-6)
- Renderiza el componente apropiado según el paso
- Controla la navegación entre pasos

**Componentes de Pasos:**
- `components/onboarding/importar-empleados.tsx`
- `components/onboarding/sedes-form.tsx`
- `components/onboarding/jornada-step.tsx`
- `components/onboarding/calendario-step.tsx`
- `components/onboarding/integraciones-form.tsx`
- `components/onboarding/invitar-hr-admins.tsx`

**Componentes Reutilizables:**
- `components/shared/jornada-form-fields.tsx` (usado en paso 3)
- `components/hr/calendario-festivos.tsx` (usado en paso 4)
- `components/hr/lista-festivos.tsx` (usado en paso 4)
- `components/hr/importar-festivos-modal.tsx` (usado en paso 4)
- `components/shared/fecha-calendar.tsx` (usado en lista de festivos)

### Server Actions

**Archivo:** `app/(auth)/signup/actions.ts`

**Actions disponibles:**
- `signupEmpresaAction` - Crear empresa y usuario inicial
- `configurarCalendarioYJornadaAction` - Configurar jornada y calendario
- `crearSedeAction` - Crear sede
- `asignarSedeAction` - Asignar sede a empresa/equipo
- `eliminarSedeAction` - Eliminar sede
- `configurarIntegracionAction` - Configurar integración
- `invitarHRAdminAction` - Invitar HR Admin
- `completarOnboardingAction` - Marcar onboarding como completado

---

## 🔐 Permisos y Seguridad

- ✅ Solo usuarios con token de invitación válido pueden acceder a `/signup`
- ✅ Token debe ser válido, no expirado y no usado previamente
- ✅ Email debe coincidir con el de la invitación
- ✅ Todas las acciones validan `empresaId` desde la sesión
- ✅ Validación de datos con Zod en todas las acciones

---

## 📊 Estado de Progreso

El progreso se controla mediante:
- **Stepper visual** en la parte superior del formulario
- **Estado del componente** (`pasoActual` en `signup-form.tsx`)
- **Persistencia:** Cada paso se guarda individualmente (no se pierde progreso al navegar)

---

## 🎨 UI/UX

### Stepper Visual

El stepper muestra:
- ✅ Pasos completados (línea gris)
- 🔵 Paso actual (línea gris más gruesa)
- ⚪ Pasos pendientes (línea gris clara)

### Navegación

- Botón "Anterior" - Disponible desde el paso 1 en adelante
- Botón "Siguiente" / "Guardar y continuar" - Depende del paso
- Botón "Finalizar y empezar" - Solo en el paso 6

### Feedback al Usuario

- ✅ Toast notifications para éxito/error
- ✅ Indicadores de carga durante operaciones async
- ✅ Validación en tiempo real de formularios

---

## 🔄 Migración desde `/onboarding/cargar-datos`

**Cambio realizado:** 2025-01-27

**Antes:**
- Onboarding dividido en dos rutas: `/signup` (crear cuenta) → `/onboarding/cargar-datos` (configuración)

**Ahora:**
- Todo el onboarding consolidado en `/signup` (7 pasos)

**Beneficios:**
- ✅ Flujo más coherente y unificado
- ✅ No hay redirecciones intermedias
- ✅ Mejor experiencia de usuario
- ✅ Código más mantenible

---

## ⚠️ Notas Importantes

1. **Jornada por defecto:**
   - NO se crea automáticamente al crear la cuenta
   - Debe configurarse en el paso 3
   - Se asigna automáticamente a empleados sin jornada

2. **Empleados sin jornada:**
   - Los empleados importados en el paso 1 quedan sin jornada
   - La jornada se asigna cuando se completa el paso 3

3. **Calendario y Jornada separados:**
   - La jornada (horarios) se configura en el paso 3
   - El calendario (días laborables y festivos) se configura en el paso 4
   - Esto permite mayor flexibilidad y claridad

4. **Componentes reutilizables:**
   - Los componentes de jornada y calendario son los mismos que usa el panel de HR admin
   - Esto asegura consistencia de diseño y funcionalidad

5. **Navegación durante onboarding:**
   - **Persistencia de estado:** El paso actual se guarda en `sessionStorage` con clave `signup-step-{token}`
   - **Prevención de re-submit:** El paso 0 (crear cuenta) no se re-ejecuta al volver atrás si ya está completado
   - **Flag de completado:** Se guarda `signup-step-{token}-completed` para evitar re-crear la cuenta
   - El componente previene redirecciones automáticas al dashboard
   - Los botones "Anterior" y "Siguiente" controlan la navegación
   - El estado se mantiene durante todo el flujo (incluso con refresh)
   - Al completar el paso 6, se limpian las claves de sessionStorage y se redirige a `/hr/dashboard`
   - **Solución al bucle login/dashboard:** El paso 0 verifica si ya está completado antes de ejecutar signup

6. **Importación de empleados (Paso 1):**
   - Timeout de transacciones: 60 segundos (permite encriptación de datos)
   - Concurrencia: 3 empleados procesados en paralelo
   - Los errores en empleados individuales no bloquean la importación completa
   - Se envían invitaciones por email automáticamente si está activado

---

## 📚 Referencias

- **Autenticación:** [`docs/funcionalidades/autenticacion.md`](./autenticacion.md)
- **Jornadas:** [`docs/funcionalidades/jornadas.md`](./jornadas.md)
- **Importación Empleados:** [`docs/funcionalidades/importacion-empleados-excel.md`](./importacion-empleados-excel.md)
- **Invitaciones:** [`docs/INVITAR_USUARIOS.md`](../INVITAR_USUARIOS.md)

---

**Última actualización:** 2025-12-09
**Autor:** Clousadmin Dev Team

**Cambios en v2.2 (9 Dic 2025):**
- ✅ **Paso 1 simplificado**: Eliminado paso de confirmación intermedio en importación de empleados
- ✅ **Banner de empleados**: Solo muestra "empleados del equipo" (excluye HR admin)
- ✅ **Validación mejorada**: Banner solo aparece con 2+ empleados totales
- ✅ **Paso 4 actualizado**: Modal unificado de importación de festivos
- ✅ **Gestión por año**: Selector de año en tabla de festivos
- ✅ **Importación automática**: Festivos nacionales se importan al entrar al paso 4
- ✅ **Límites de fichaje**: Campos de hora mínima/máxima en paso 4
- ✅ **Sincronización total**: Mismo modal y componentes que gestión HR

**Cambios en v2.1:**
- ✅ Avatar en paso 0 con upload a S3
- ✅ Normalización automática de URLs (añade https://)
- ✅ Persistencia de empleados al navegar entre pasos
- ✅ Persistencia de sedes al navegar entre pasos
- ✅ Jornada sin campo nombre visible (auto-generado)
- ✅ Calendario con visualización de 2 meses
- ✅ UI compacta en sedes (asignación inline)

