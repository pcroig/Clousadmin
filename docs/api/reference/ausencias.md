# Referencia API - Ausencias

**Última actualización:** 27 de enero de 2025  
**Estado:** Resumen de endpoints clave. Ver funcionalidad completa en [`docs/funcionalidades/ausencias.md`](../../funcionalidades/ausencias.md).

---

## Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/ausencias` | GET | Listado con filtros y paginación |
| `/api/ausencias` | POST | Solicitar una ausencia |
| `/api/ausencias/{id}` | PATCH | Aprobar, rechazar o actualizar |
| `/api/ausencias/saldo/{empleadoId}` | GET | Consultar saldo disponible |

---

## Características

- Validación de solapamientos
- Control de saldo por tipo
- Sincronización con Google Calendar
- Campañas de vacaciones

---

## Recursos Relacionados

- `app/api/ausencias/route.ts`
- `app/api/ausencias/[id]/route.ts`
- `lib/calculos/ausencias.ts`

