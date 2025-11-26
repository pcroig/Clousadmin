# 🚀 Onboarding de Empresa (HR Admin)

**Estado**: ✅ Implementado  
**Versión**: 2.0  
**Última actualización**: 2025-01-27

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
- Nombre de la empresa * (obligatorio)
- Sitio web (opcional)
- Nombre del administrador * (obligatorio)
- Apellidos del administrador * (obligatorio)
- Email (pre-rellenado desde la invitación, bloqueado)
- Contraseña * (mínimo 8 caracteres)
- Consentimiento de tratamiento de datos * (obligatorio)

**Acción:**
- Valida el token de invitación
- Crea empresa, usuario HR Admin y empleado en una transacción
- Marca invitación como usada
- Autentica automáticamente al usuario
- Avanza al paso 1

**Server Action:** `signupEmpresaAction`

---

### Paso 1: Importar Empleados

**Objetivo:** Importar empleados masivamente desde Excel.

**Componente:** `components/onboarding/importar-empleados.tsx`

**Funcionalidad:**
- Subida de archivo Excel (.xlsx, .xls, .csv)
- Procesamiento con IA para detectar estructura automáticamente
- Preview completo antes de confirmar
- Validación de datos
- Creación automática de equipos y puestos detectados
- Opción de enviar invitaciones por email

**Nota importante:**
- Los empleados se crean **sin jornada asignada**
- La jornada se asignará en el paso 3

**API:** `POST /api/empleados/importar-excel`

📖 **Ver documentación completa:** [`docs/funcionalidades/importacion-empleados-excel.md`](./importacion-empleados-excel.md)

---

### Paso 2: Configurar Sedes

**Objetivo:** Crear sedes (oficinas) de la empresa y asignarlas.

**Componente:** `components/onboarding/sedes-form.tsx`

**Funcionalidad:**
- Crear nuevas sedes
- Asignar sedes a toda la empresa o equipos específicos
- Editar sedes existentes
- Eliminar sedes (si no tienen empleados asignados)

**Server Actions:**
- `crearSedeAction`
- `asignarSedeAction`
- `eliminarSedeAction`

---

### Paso 3: Jornada Laboral

**Objetivo:** Configurar la jornada predefinida de la empresa.

**Componente:** `components/onboarding/jornada-step.tsx`

**Características:**
- Usa `JornadaFormFields` (componente reutilizable del panel de HR)
- **Diseño embedded** (sin fondo ni border, integrado directamente en el paso)
- **Sin loader inicial** - renderiza instantáneamente con valores por defecto
- Valores por defecto pre-rellenados:
  - Nombre: "Jornada Estándar" (opcional, si está vacío se usa "Jornada base")
  - Tipo: Flexible
  - Horas semanales: 40
  - Días laborables: Lunes a Viernes
  - Límites: opcionales

**Configuración:**
- Tipo de jornada: Fija o Flexible
- Horas semanales * (obligatorio)
- Nombre (opcional)
- Días laborables (selector visual)
- Horarios por día (para jornada fija)
- Descansos en minutos
- Límites de fichaje (opcionales)

**Acción al guardar:**
- Crea o actualiza la jornada predefinida
- **Asigna automáticamente** a toda la empresa (nivel empresa)
- No requiere selección manual de asignación (simplificado para onboarding)

**Notas técnicas:**
- Si existe una jornada no predefinida, se actualiza en lugar de crear nueva
- El nombre se normaliza: si está vacío, se usa "Jornada base"
- Los límites solo se envían si tienen valor (opcionales)

**Server Action:** `configurarCalendarioYJornadaAction`

📖 **Ver documentación completa:** [`docs/funcionalidades/jornadas.md`](./jornadas.md)

---

### Paso 4: Calendario Laboral

**Objetivo:** Configurar días laborables y festivos de la empresa.

**Componente:** `components/onboarding/calendario-step.tsx`

**Características:**
- Usa `CalendarioFestivos` y `ListaFestivos` (componentes reutilizables del panel de HR)
- Selector visual de días laborables de la semana
- Gestión completa de festivos

**Funcionalidades:**
- **Días laborables:** Selector visual para activar/desactivar días (L-D)
- **Festivos:**
  - Importar desde archivo ICS/CSV
  - Crear festivos manualmente
  - Vista de calendario visual
  - Lista de festivos con edición/eliminación

**Acción al guardar:**
- Actualiza los días laborables de la empresa
- Guarda festivos en la base de datos

**Server Action:** `configurarCalendarioYJornadaAction` (solo actualiza calendario, no jornada)

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

**Última actualización:** 2025-01-27  
**Autor:** Clousadmin Dev Team

