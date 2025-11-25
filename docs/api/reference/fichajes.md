# Referencia API - Fichajes

**Última actualización:** 27 de enero de 2025  
**Estado:** Resumen. Para la funcionalidad completa consulta [`docs/funcionalidades/fichajes.md`](../../funcionalidades/fichajes.md).

---

## Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/fichajes` | POST | Registrar fichaje (entrada, pausa, salida) |
| `/api/fichajes` | GET | Listar fichajes con filtros por empleado, estado y fecha |
| `/api/fichajes/balance/{empleadoId}` | GET | Balance de horas |
| `/api/fichajes/correccion` | POST | Solicitar corrección |
| `/api/fichajes/bolsa-horas` | GET | Bolsa de horas para HR |

---

## Recursos Relacionados

- `app/api/fichajes/route.ts`  
- `app/api/fichajes/balance/[empleadoId]/route.ts`  
- `lib/calculos/fichajes.ts`

