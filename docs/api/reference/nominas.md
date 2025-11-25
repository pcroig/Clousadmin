# Referencia API - Nóminas

**Última actualización:** 27 de enero de 2025  
**Estado:** Resumen de endpoints clave. Ver detalle funcional en [`docs/funcionalidades/gestion-nominas.md`](../../funcionalidades/gestion-nominas.md).

---

## Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/nominas` | GET | Listado de nóminas con filtros y paginación |
| `/api/nominas` | POST | Generar nómina desde plantillas |
| `/api/nominas/{id}` | GET | Descargar nómina específica |
| `/api/nominas/eventos` | GET | Eventos de nómina pendientes |
| `/api/nominas/eventos/{id}/balance-horas` | GET | Balance vinculado a evento |

---

## Recursos Relacionados

- `app/api/nominas/route.ts`
- `app/api/nominas/eventos/route.ts`
- `app/api/nominas/eventos/[id]/balance-horas/route.ts`
- `lib/nominas/*`


