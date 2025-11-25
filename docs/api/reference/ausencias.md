# Referencia API - Ausencias

**Última actualización:** 27 de enero de 2025  
**Estado:** Resumen de endpoints clave. Ver funcionalidad completa en [`docs/funcionalidades/ausencias.md`](../../funcionalidades/ausencias.md).

---

## Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/ausencias` | GET | Listado con filtros y paginación |
| `/api/ausencias` | POST | Solicitar una ausencia (empleado) o crear directamente (HR Admin) |
| `/api/ausencias/{id}` | PATCH | Aprobar, rechazar o actualizar |
| `/api/ausencias/saldo` | GET | Consultar saldo disponible (considera carry-over) |
| `/api/ausencias/saldo` | POST | Asignar saldo anual (empresa o equipos) |
| `/api/empresa/politica-ausencias` | PATCH | Configurar política de carry-over (limpiar vs extender) |

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

