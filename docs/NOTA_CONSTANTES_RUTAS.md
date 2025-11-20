# ⚠️ NOTA IMPORTANTE SOBRE CONSTANTES DE RUTAS

**Fecha:** 2025-01-19
**Archivo:** `/lib/constants/rutas.ts`
**Estado:** ⚠️ DESALINEADO CON CÓDIGO ACTUAL

## Problema Identificado

Durante la verificación exhaustiva del código, se descubrió que las constantes de rutas definidas en `/lib/constants/rutas.ts` **NO coinciden completamente** con la estructura real de rutas del proyecto.

## Discrepancias Principales

### 1. Dashboards
- **Constantes definen:** `/hr`, `/empleado`, `/manager`
- **Código real usa:** `/hr/dashboard`, `/empleado/dashboard`, `/manager/dashboard`

### 2. Empleados (HR)
- **Constantes definen:** `/hr/empleados/*`
- **Código real usa:** `/hr/organizacion/personas/*`

### 3. Configuración (HR)
- **Constantes definen:** `/hr/configuracion/*`
- **Código real usa:** `/hr/settings/*`

### 4. Nóminas (HR)
- **Constantes definen:** `/hr/nominas/*`
- **Código real usa:** `/hr/payroll/*`

### 5. Perfil (Empleado)
- **Constantes definen:** `/empleado/perfil`
- **Código real usa:** `/empleado/mi-perfil`

### 6. Mi Espacio
- **Falta completamente** en constantes
- **Código real tiene:** `/empleado/mi-espacio/*` con múltiples subcarpetas

## Rutas API Faltantes (Críticas)

Las siguientes rutas de API **no están** en las constantes pero sí existen en el código:

- `/api/auth/google` y `/api/auth/google/callback`
- `/api/auth/verify-password`
- `/api/campanas-vacaciones`
- `/api/contratos`
- `/api/compensaciones-horas-extra`
- `/api/auditoria`
- `/api/analytics`
- `/api/festivos`
- `/api/jornadas`
- `/api/upload`
- `/api/hr/onboarding-config`
- `/api/integrations`
- `/api/admin`
- `/api/onboarding`
- `/api/plantillas`
- `/api/tipos-complemento`

Y aproximadamente 30+ rutas más...

## Recomendaciones

### Opción 1: Actualizar Constantes (Recomendado)
Actualizar `/lib/constants/rutas.ts` para que refleje la estructura **real** del código.

**Ventajas:**
- Mantiene consistencia con código existente
- No requiere cambios en múltiples archivos
- Menor riesgo de romper funcionalidad

**Desventajas:**
- Las constantes no serán "ideales" sino reflejarán realidad actual

### Opción 2: Refactorizar Código
Cambiar las rutas en el código para que coincidan con las constantes.

**Ventajas:**
- Estructura "ideal" según diseño
- URLs más limpias

**Desventajas:**
- Alto riesgo de romper funcionalidad
- Requiere cambios en 50+ archivos
- Puede afectar links guardados, favoritos, historial

### Opción 3: Mantener Como Está (NO Recomendado)
Dejar las constantes como están y continuar usando strings hardcodeados.

**Desventajas:**
- Inconsistencia permanente
- Las constantes no servirán para nada
- Riesgo de errores de navegación

## Decisión Pendiente

**⚠️ SE REQUIERE DECISIÓN:** ¿Qué opción seguir?

Por ahora, las constantes están creadas pero **NO SE DEBEN USAR** sin antes validar cada ruta contra el código real.

## Estado Actual

✅ **Constantes creadas** en `/lib/constants/rutas.ts`
⚠️ **Validación completada** - se identificaron discrepancias
⏸️ **Uso bloqueado** hasta resolver discrepancias
🔄 **Acción requerida** - decidir opción 1, 2 o 3

---

**Archivo de verificación completo:** Ver output del agente de verificación en logs
