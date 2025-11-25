# Referencia API - Equipos

**Última actualización:** 27 de enero de 2025  
**Estado:** Resumen. Ver documentación funcional relacionada en [`docs/funcionalidades/jornadas.md`](../../funcionalidades/jornadas.md) y [`docs/funcionalidades/analytics.md`](../../funcionalidades/analytics.md).

---

## Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/equipos` | GET | Listar equipos por empresa |
| `/api/equipos` | POST | Crear equipo |
| `/api/equipos/{id}` | PATCH | Actualizar equipo |
| `/api/equipos/{id}` | DELETE | Eliminar equipo |
| `/api/equipos/{id}/miembros` | POST | Añadir miembros al equipo |

---

## Recursos Relacionados

- `app/api/equipos/route.ts`
- `app/api/equipos/[id]/route.ts`
- `app/api/equipos/[id]/miembros/route.ts`

