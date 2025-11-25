# Paginación en la API de Clousadmin

**Última actualización:** 27 de enero de 2025  
**Estado:** Documentación resumida (detalle completo en `lib/utils/pagination.ts`).

---

## Parámetros Soportados

- `page` (number) – Página solicitada. Default: 1.
- `limit` (number) – Registros por página. Default: 10. Máximo recomendado: 100.
- `search`, `filters` – Cada endpoint puede exponer filtros adicionales documentados en sus secciones específicas.

---

## Formato de Respuesta

Todas las respuestas paginadas siguen el mismo formato:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "pages": 15
  }
}
```

---

## Recursos Relacionados

- [`API_REFACTORING.md`](../API_REFACTORING.md) – Patrones aplicados en las API routes.
- `lib/utils/pagination.ts` – Helpers `getPaginationParams` y `buildPaginationMeta`.
- `lib/utils/api-response.ts` – Helper `paginatedResponse`.

---

## Notas

- Todos los endpoints documentados en `docs/api/reference/*.md` usan estos helpers.
- Para listas muy grandes, considera `limit` pequeños y filtros específicos.

