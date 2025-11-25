# Referencia API - Fichajes

**Última actualización:** 27 de enero de 2025  
**Estado:** Resumen. Para la funcionalidad completa consulta [`docs/funcionalidades/fichajes.md`](../../funcionalidades/fichajes.md).

---

## Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/fichajes` | POST | Registrar fichaje (entrada, pausa, salida) |
| `/api/fichajes` | GET | Listar fichajes con filtros (incluye `horasEsperadas` y `balance`) |
| `/api/fichajes/eventos` | POST | Crear evento en fichaje existente |
| `/api/fichajes/eventos/{id}` | PATCH | Editar evento (sin auto-guardado, se acumula hasta guardar) |
| `/api/fichajes/eventos/{id}` | DELETE | Eliminar evento |
| `/api/fichajes/balance/{empleadoId}` | GET | Balance de horas |
| `/api/fichajes/correccion` | POST | Solicitar corrección |
| `/api/fichajes/bolsa-horas` | GET | Bolsa de horas para HR |
| `/api/empleados/{id}/renovar-saldo` | POST | Renovar saldo de horas (HR Admin) |
| `/api/empleados/{id}/renovar-saldo` | GET | Obtener fecha de última renovación |
| `/api/jornadas/asegurar-empleados` | POST | Asignar jornada por defecto a empleados sin jornada |

---

## Recursos Relacionados

- `app/api/fichajes/route.ts`  
- `app/api/fichajes/balance/[empleadoId]/route.ts`  
- `lib/calculos/fichajes.ts`

