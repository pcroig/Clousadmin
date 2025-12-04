# Deprecación Temporal: Campañas de Vacaciones

**Fecha:** 3 de diciembre de 2025  
**Estado:** ⏸️ **DEPRECADA TEMPORALMENTE**  
**Razón:** Deshabilitada para el primer lanzamiento. Se retomará en futuras versiones.

---

## 📋 Resumen

La funcionalidad de **Campañas de Vacaciones** ha sido deprecada temporalmente mediante feature flag para facilitar el primer lanzamiento de la plataforma. El código completo se mantiene intacto y puede reactivarse fácilmente.

---

## 🔧 Implementación Técnica

### Feature Flag

**Variable de entorno:**
```bash
NEXT_PUBLIC_CAMPANAS_VACACIONES_ENABLED=false  # Por defecto deshabilitado
```

**Ubicación:** `lib/constants/feature-flags.ts`

```typescript
export const CAMPANAS_VACACIONES_ENABLED =
  process.env.NEXT_PUBLIC_CAMPANAS_VACACIONES_ENABLED === 'true';

export const CAMPANAS_VACACIONES_FEATURE_NAME = 'Campañas de vacaciones';
```

### Protección de Endpoints

Todos los endpoints bajo `/api/campanas-vacaciones/**` verifican el flag al inicio y retornan `503 Service Unavailable` cuando está deshabilitado:

```typescript
if (!CAMPANAS_VACACIONES_ENABLED) {
  return featureDisabledResponse(CAMPANAS_VACACIONES_FEATURE_NAME);
}
```

**Endpoints protegidos:**
- `GET /api/campanas-vacaciones`
- `POST /api/campanas-vacaciones`
- `GET /api/campanas-vacaciones/[id]`
- `POST /api/campanas-vacaciones/[id]/aceptar`
- `POST /api/campanas-vacaciones/[id]/cerrar`
- `POST /api/campanas-vacaciones/[id]/cuadrar`
- `POST /api/campanas-vacaciones/[id]/enviar-propuesta`
- `POST /api/campanas-vacaciones/[id]/finalizar`
- `GET /api/campanas-vacaciones/[id]/preferencia`
- `PATCH /api/campanas-vacaciones/[id]/preferencia`
- `POST /api/campanas-vacaciones/[id]/preferencias`
- `PATCH /api/campanas-vacaciones/[id]/propuestas`
- `POST /api/campanas-vacaciones/[id]/propuestas/cancelar`
- `POST /api/campanas-vacaciones/[id]/responder`

### Protección de UI

**HR Dashboard:**
- Botón "+ Nueva Campaña" oculto
- Panel de campaña activa muestra mensaje informativo
- Ruta `/hr/horario/ausencias/campana/[id]` redirige si la feature está deshabilitada

**Empleado/Manager Dashboard:**
- Recordatorios de campañas no se renderizan
- Widgets de campañas ocultos
- Servicios retornan `null` inmediatamente

**Eventos:**
- `emitPreferenciasVacacionesEvent()` retorna `false` si está deshabilitado
- `openPreferenciasModalFromUrl()` no procesa URLs de campañas si está deshabilitado

---

## 📁 Archivos Modificados

### Core
- `lib/constants/feature-flags.ts` - Flag de control
- `lib/api-handler.ts` - Helper `featureDisabledResponse()`

### APIs (12 archivos)
- `app/api/campanas-vacaciones/route.ts`
- `app/api/campanas-vacaciones/[id]/route.ts`
- `app/api/campanas-vacaciones/[id]/aceptar/route.ts`
- `app/api/campanas-vacaciones/[id]/cerrar/route.ts`
- `app/api/campanas-vacaciones/[id]/cuadrar/route.ts`
- `app/api/campanas-vacaciones/[id]/enviar-propuesta/route.ts`
- `app/api/campanas-vacaciones/[id]/finalizar/route.ts`
- `app/api/campanas-vacaciones/[id]/preferencia/route.ts`
- `app/api/campanas-vacaciones/[id]/preferencias/route.ts`
- `app/api/campanas-vacaciones/[id]/propuestas/route.ts`
- `app/api/campanas-vacaciones/[id]/propuestas/cancelar/route.ts`
- `app/api/campanas-vacaciones/[id]/responder/route.ts`

### UI (5 archivos)
- `app/(dashboard)/hr/horario/ausencias/page.tsx`
- `app/(dashboard)/hr/horario/ausencias/ausencias-client.tsx`
- `app/(dashboard)/hr/horario/ausencias/campana/page.tsx`
- `app/(dashboard)/empleado/dashboard/page.tsx`
- `app/(dashboard)/empleado/dashboard/dashboard-client.tsx`
- `app/(dashboard)/manager/dashboard/page.tsx`

### Servicios
- `lib/services/campanas-vacaciones.ts` - Retorna `null` si está deshabilitado
- `lib/events/vacaciones.ts` - Eventos protegidos

### Documentación
- `REVISION_FINAL_PRODUCCION.md` - Sección de deprecación agregada
- `docs/funcionalidades/ausencias.md` - Nota de deprecación
- `docs/api/reference/ausencias.md` - Nota sobre endpoints
- `docs/notificaciones/README.md` - Notas en tipos de notificación

---

## 🔄 Reactivación

Para reactivar la funcionalidad:

1. **Establecer variable de entorno:**
   ```bash
   NEXT_PUBLIC_CAMPANAS_VACACIONES_ENABLED=true
   ```

2. **Reiniciar la aplicación**

3. **Verificar:**
   - Endpoints API responden normalmente
   - UI muestra botones y paneles de campañas
   - Notificaciones se procesan correctamente

**No se requiere:**
- Cambios en código
- Migraciones de base de datos
- Recompilación

---

## ✅ Validaciones Realizadas

- ✅ Todos los endpoints protegidos con flag
- ✅ UI oculta correctamente cuando está deshabilitado
- ✅ Servicios retornan valores seguros (`null`, `false`)
- ✅ Eventos no se procesan cuando está deshabilitado
- ✅ Sin errores de linter
- ✅ Documentación actualizada

---

## 📝 Notas

- El código completo se mantiene intacto
- No se eliminó ninguna funcionalidad
- Las tablas de base de datos no se modificaron
- Los datos existentes se preservan
- La reactivación es inmediata mediante feature flag

---

**Firmado:**  
Claude (Anthropic) - Deprecación Temporal de Campañas de Vacaciones  
3 de diciembre de 2025


