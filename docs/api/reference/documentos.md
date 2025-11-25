# Referencia API - Documentos

**Última actualización:** 27 de enero de 2025  
**Estado:** Resumen de endpoints principales. Ver funcionalidad completa en [`docs/funcionalidades/documentos.md`](../../funcionalidades/documentos.md).

---

## Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/documentos` | GET | Listado de documentos con filtros (empleado, carpeta, tipo) |
| `/api/documentos` | POST | Subida de documento (multipart) |
| `/api/documentos/{id}` | GET | Descargar documento |
| `/api/documentos/{id}` | DELETE | Eliminar documento |
| `/api/documentos/{id}/firmar` | POST | Firmar documento (flujo en desarrollo) |

---

## Recursos Relacionados

- `app/api/documentos/route.ts`
- `app/api/documentos/[id]/route.ts`
- `lib/documentos/*`



