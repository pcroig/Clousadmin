# Verificación en Staging - Lista Rápida

Última actualización: 16/11/2025

---

## Precondiciones
- Entorno staging desplegado con:
  - `ENABLE_CLOUD_STORAGE=true` + `STORAGE_*`
  - `REDIS_URL` válido
  - `NEXT_PUBLIC_APP_URL` apuntando a staging
  - `DISABLE_EMBEDDED_WORKER="true"` en el web y `clousadmin-worker` corriendo

---

## Pasos (HR Admin)
1. Login en `/login`.
2. Ir a `/hr/documentos`:
   - Subir un documento (PDF/JPG/PNG).
   - Verificar que aparece y se puede descargar.
3. Ir a `/hr/payroll` → Eventos:
   - Importar ZIP de nóminas (pruebas).
   - Confirmar asignaciones y publicar (si aplica).
4. Ir a `/hr/documentos/plantillas` (si está habilitado):
   - Generar documento desde plantilla en 1 empleado de prueba.
   - Ver que se crea el documento y se descarga.
5. Firma digital:
   - Crear una solicitud de firma sobre un documento de prueba.
   - Firmar desde la UI y validar que se genera PDF firmado.
6. Export Gestoría:
   - Ejecutar `/api/nominas/export-gestoria?mes=X&anio=Y`.
   - Ver que genera y guarda el Excel (S3 o local según config).
7. Notificaciones:
   - Disparar una acción que cree notificación.
   - Ver el widget de notificaciones actualizado.

---

## Checks técnicos
1. Health:
   ```
   curl -s https://staging.tu-dominio.com/api/health | jq
   ```
   Debe volver `healthy: true`.
2. Workers:
   ```
   pm2 status clousadmin-worker
   pm2 logs clousadmin-worker --lines 50
   ```
3. Storage:
   - Ver en Hetzner Object Storage que se crean objetos bajo prefijos `documentos/`, `uploads/`, `nominas/`, `exports/`.
4. Redis:
   - Validar que no hay errores en logs (`[Redis] No disponible`).

---

## Aprobación
- Si todos los pasos anteriores pasan, staging queda aprobado para promover a producción.
