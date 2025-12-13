# Gestión de Empleados

**Última actualización:** 10 de diciembre de 2025
**Estado:** Documentación de funcionalidad completa

---

## Visión General

El sistema de gestión de empleados permite administrar el ciclo completo de vida laboral de los empleados, desde su onboarding hasta su offboarding, incluyendo gestión de datos personales, documentación, fichajes, ausencias y nóminas.

---

## Ciclo de Vida del Empleado

### 1. Alta de Empleado

**Métodos disponibles:**

#### a) Alta Manual (HR Admin)
- Acceso: `/hr/organizacion/personas` → "Añadir persona"
- Formulario completo con datos personales y laborales
- Campos requeridos: nombre, apellidos, email, DNI, fecha de ingreso
- Asignación automática de jornada por defecto

#### b) Proceso de Onboarding
- El empleado completa su propio perfil mediante link de invitación
- Incluye subida de documentación requerida
- Firma digital de documentos
- Ver: [Onboarding de Empleado](./onboarding-empleado.md)

#### c) Importación Masiva desde Excel
- Carga múltiple de empleados desde archivo Excel
- Validación automática de datos
- Asignación masiva de equipos, puestos y jornadas
- Ver: [Importación de Empleados Excel](./importacion-empleados-excel.md)

---

### 2. Gestión de Datos

**Datos Personales:**
- Nombre completo
- DNI/NIE
- Fecha de nacimiento
- Teléfono
- Email corporativo
- Dirección postal
- Avatar/foto de perfil

**Datos Laborales:**
- Puesto
- Equipos (relación N:N)
- Sede
- Fecha de ingreso
- Tipo de contrato
- Salario bruto anual
- Jornada laboral
- Manager asignado

**Datos Bancarios:**
- IBAN (encriptado)
- Para pago de nóminas

---

### 3. Gestión de Avatar

**Subida de Avatar:**
- Formatos permitidos: JPG, PNG, GIF, WebP
- Tamaño máximo: 5MB
- Se redimensiona automáticamente
- Accesible desde: `/empleado/mi-espacio` → Tab General

**Permisos:**
- Empleado: Puede subir/actualizar/eliminar su propio avatar
- HR Admin: Puede gestionar avatar de cualquier empleado

---

### 4. Espacio Individual del Empleado

**Ubicación:** `/hr/organizacion/personas/[id]`

**Tabs disponibles:**

#### General
- Datos personales y laborales
- Avatar
- Equipo(s) asignado(s)
- Manager
- Sede

#### Fichajes
- Historial completo de fichajes
- Balance de horas (trabajadas, esperadas, saldo)
- Botón "Renovar saldo" (solo HR Admin)
- Botón "Añadir fichaje" (HR Admin)
- Ver: [Fichajes](./fichajes.md)

#### Ausencias
- Historial de ausencias
- Saldo disponible por tipo
- Botón "Asignar saldo" (HR Admin)
- Ver: [Ausencias](./ausencias.md)

#### Nóminas
- Listado de nóminas generadas
- Descarga de PDFs
- Ver: [Gestión de Nóminas](./gestion-nominas.md)

#### Documentos
- Carpetas del sistema (Contratos, Nóminas, Justificantes, Otros)
- Subida de documentos
- Ver: [Documentos](./documentos.md)

#### Contratos
- Listado de contratos del empleado
- Subida de contratos firmados
- Generación desde plantillas

---

### 5. Baja de Empleado (Offboarding)

**Proceso:**
1. HR Admin accede a `/hr/organizacion/personas/[id]`
2. Click en "Dar de baja"
3. Introducir fecha de baja
4. Motivo de baja (opcional)
5. Confirmar

**Efectos de la baja:**
- `activo: false`
- `fechaBaja` se registra
- Aparece en filtro "Inactivos"
- NO se eliminan datos históricos (fichajes, ausencias, nóminas)
- El empleado pierde acceso al sistema

**Ver:** [Offboarding](./offboarding.md)

---

## Permisos por Rol

| Acción | Empleado | Manager | HR Admin |
|--------|----------|---------|----------|
| Ver propios datos | ✅ | ✅ | ✅ |
| Editar propios datos básicos | ✅ | ✅ | ✅ |
| Ver empleados de equipo | ❌ | ✅ | ✅ |
| Ver todos los empleados | ❌ | ❌ | ✅ |
| Crear empleados | ❌ | ❌ | ✅ |
| Editar datos laborales | ❌ | ❌ | ✅ |
| Dar de baja | ❌ | ❌ | ✅ |
| Asignar equipos | ❌ | ❌ | ✅ |
| Asignar jornadas | ❌ | ❌ | ✅ |
| Gestionar avatar propio | ✅ | ✅ | ✅ |
| Gestionar avatar de otros | ❌ | ❌ | ✅ |
| Exportar a Excel | ❌ | ❌ | ✅ |

---

## Validaciones

### Al Crear Empleado

✅ Email único en la empresa
✅ DNI único en la empresa
✅ Fecha de ingreso no puede ser futura
✅ Fecha de nacimiento debe ser > 18 años
✅ Si se asigna equipo, el empleado debe añadirse a la relación N:N
✅ Si no se especifica jornadaId, se asigna la jornada por defecto

### Al Actualizar Empleado

✅ Email único (excepto el propio)
✅ DNI único (excepto el propio)
✅ No se puede cambiar `empresaId`
✅ No se puede reactivar empleado dado de baja desde PATCH (requiere proceso específico)

### Al Dar de Baja

✅ Fecha de baja no puede ser futura
✅ Fecha de baja debe ser >= fecha de ingreso
✅ Se valida que no tenga solicitudes pendientes críticas

---

## Exportación a Excel

**Ubicación:** `/hr/organizacion/personas` → Botón "Exportar"

**Contenido del Excel:**
- Todos los empleados activos
- Columnas: Nombre, Apellidos, Email, DNI, Puesto, Equipo(s), Fecha Ingreso, Salario
- Formato `.xlsx` con estilos

**Permisos:** Solo HR Admin

---

## Integraciones

### Con Fichajes
- Cada empleado tiene su widget de fichaje
- Historial completo visible en su espacio individual
- Balance de horas actualizado en tiempo real

### Con Ausencias
- Saldo de ausencias calculado automáticamente
- Política de ausencias por equipo
- Validación de solapamientos

### Con Nóminas
- Generación automática mensual
- Inclusión de complementos salariales
- Descarga de PDFs firmados

### Con Documentos
- Carpetas automáticas del sistema
- Subida de justificantes por el empleado
- Gestión documental completa por HR

---

## Recursos Relacionados

**API:**
- [Referencia API Empleados](../api/reference/empleados.md)

**Funcionalidades:**
- [Onboarding](./onboarding-empleado.md)
- [Offboarding](./offboarding.md)
- [Importación Excel](./importacion-empleados-excel.md)
- [Fichajes](./fichajes.md)
- [Ausencias](./ausencias.md)
- [Nóminas](./gestion-nominas.md)

**Backend:**
- `app/api/empleados/route.ts`
- `app/api/empleados/[id]/route.ts`
- `app/api/empleados/me/route.ts`
- `lib/empleados/`

**Frontend:**
- `app/(dashboard)/hr/organizacion/personas/`
- `app/(dashboard)/empleado/mi-espacio/`
- `components/organizacion/`
