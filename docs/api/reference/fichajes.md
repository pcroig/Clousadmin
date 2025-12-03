# Referencia API - Fichajes

**Última actualización:** 2 de diciembre de 2025  
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
| `/api/fichajes/revision` | GET | Obtener fichajes pendientes de revisión. **⚠️ Actualizado**: Ahora incluye fichajes de HOY (lazy recovery con offset=0) |
| `/api/fichajes/revision` | POST | Procesar revisiones (actualizar/descartar fichajes) |
| `/api/fichajes/cuadrar` | POST | Cuadrar fichajes masivamente creando eventos según jornada |
| `/api/fichajes/balance/{empleadoId}` | GET | Balance de horas |
| `/api/fichajes/correccion` | POST | Solicitar corrección |
| `/api/fichajes/bolsa-horas` | GET | Bolsa de horas para HR |
| `/api/empleados/{id}/renovar-saldo` | POST | Renovar saldo de horas (HR Admin) |
| `/api/empleados/{id}/renovar-saldo` | GET | Obtener fecha de última renovación |
| `/api/jornadas/asegurar-empleados` | POST | Asignar jornada por defecto a empleados sin jornada |

---

---

## 📋 Cambios Recientes (2025-12-02)

### `PATCH /api/fichajes/{id}`
- ✅ **Mejora**: Ahora recalcula `horasTrabajadas` y `horasEnPausa` al aprobar/rechazar fichajes
- ✅ Garantiza que los datos mostrados en la tabla siempre reflejen valores reales
- ✅ El balance se actualiza inmediatamente sin necesidad de editar eventos

### `GET /api/fichajes/revision`
- ✅ **Corrección crítica**: Ahora incluye fichajes del día actual (HOY)
- ✅ Lazy recovery procesa desde `offset = 0` (incluye hoy)
- ✅ Filtro de fecha usa `lte: hoy` (incluye hoy)
- ✅ Los empleados que no fichan hoy aparecen inmediatamente en cuadrar

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

