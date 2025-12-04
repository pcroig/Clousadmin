# Referencia API - Fichajes

**Última actualización:** 4 de diciembre de 2025  
**Estado:** Resumen. Para la funcionalidad completa consulta [`docs/funcionalidades/fichajes.md`](../../funcionalidades/fichajes.md).

---

## Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/fichajes` | POST | Registrar fichaje (entrada, pausa, salida) |
| `/api/fichajes` | GET | Listar fichajes con filtros (incluye `horasEsperadas` y `balance`) |
| `/api/fichajes/{id}` | GET | Obtener fichaje por ID |
| `/api/fichajes/{id}` | PATCH | Aprobar/rechazar o editar fichaje. **⚠️ Actualizado**: Ahora recalcula `horasTrabajadas` y `horasEnPausa` al aprobar/rechazar |
| `/api/fichajes/eventos` | POST | Crear evento en fichaje existente. Recalcula horas automáticamente |
| `/api/fichajes/eventos/{id}` | PATCH | Editar evento. Recalcula horas automáticamente |
| `/api/fichajes/eventos/{id}` | DELETE | Eliminar evento |
| `/api/fichajes/revision` | GET | Obtener fichajes pendientes de revisión. **Solo días vencidos** (lazy recovery con offset=1, excluye HOY) |
| `/api/fichajes/revision` | POST | Procesar revisiones (actualizar/descartar fichajes) |
| `/api/fichajes/cuadrar` | POST | Cuadrar fichajes masivamente. **Nuevo**: Usa promedios históricos de los últimos 5 días con eventos del empleado. **Límite**: Máximo 50 fichajes por request. Crea eventos faltantes según jornada o promedio histórico |
| `/api/fichajes/balance/{empleadoId}` | GET | Balance de horas |
| `/api/fichajes/correccion` | POST | Solicitar corrección |
| `/api/fichajes/bolsa-horas` | GET | Bolsa de horas para HR |
| `/api/empleados/{id}/renovar-saldo` | POST | Renovar saldo de horas (HR Admin) |
| `/api/empleados/{id}/renovar-saldo` | GET | Obtener fecha de última renovación |
| `/api/jornadas/asegurar-empleados` | POST | Asignar jornada por defecto a empleados sin jornada |

---

---

## 📋 Cambios Recientes

### 2025-12-04: Promedios Históricos y Rate Limiting

#### `POST /api/fichajes/cuadrar`
- ✅ **Nuevo**: Sistema de promedios históricos para calcular eventos propuestos
  - Usa los últimos 5 días con eventos registrados del mismo empleado
  - Filtra por `jornadaId` para garantizar consistencia
  - Ajusta la salida si el promedio supera las horas esperadas del día
  - Fallback automático a lógica de jornada si no hay suficientes históricos
- ✅ **Rate Limiting**: Límite de 50 fichajes por request para proteger la transacción
- ✅ **Migración de datos**: Backfill de `jornadaId` en fichajes antiguos para habilitar promedios históricos

**Archivos relacionados:**
- `lib/calculos/fichajes-historico.ts` (nuevo módulo)
- `lib/calculos/fichajes-helpers.ts` (función `calcularHorasEsperadasDelDia`)
- `prisma/migrations/20251204111828_backfill_jornada_id_fichajes/`

### 2025-12-02: Mejoras en Cálculo de Horas

### `PATCH /api/fichajes/{id}`
- ✅ **Mejora**: Ahora recalcula `horasTrabajadas` y `horasEnPausa` al aprobar/rechazar fichajes
- ✅ Garantiza que los datos mostrados en la tabla siempre reflejen valores reales
- ✅ El balance se actualiza inmediatamente sin necesidad de editar eventos

### `GET /api/fichajes/revision`
- ✅ **CORRECTO**: Solo fichajes de días VENCIDOS (excluye el día actual)
- ✅ Lazy recovery procesa desde `offset = 1` (excluye hoy)
- ✅ Filtro de fecha usa `lt: hoy` (excluye hoy)
- ✅ Los empleados que no fichan aparecen al día siguiente después del CRON nocturno (23:30)

### Actualización en Tiempo Real
- ✅ La tabla de fichajes se actualiza automáticamente mediante eventos `fichaje-updated`
- ✅ Los cambios se reflejan instantáneamente sin necesidad de refrescar manualmente
- ✅ El listener usa dependencias correctas para mantener referencias actualizadas

---

## Recursos Relacionados

- `app/api/fichajes/route.ts`  
- `app/api/fichajes/[id]/route.ts`  
- `app/api/fichajes/revision/route.ts`  
- `app/api/fichajes/cuadrar/route.ts`  
- `app/api/fichajes/balance/[empleadoId]/route.ts`  
- `lib/calculos/fichajes.ts`

