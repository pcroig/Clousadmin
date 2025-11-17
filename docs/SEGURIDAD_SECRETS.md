# Gestión de secretos (GitHub + Hetzner)

## 1. GitHub Actions
1. Abre *Settings → Secrets and variables → Actions*.
2. Crea/actualiza:
   - `APP_URL`
   - `CRON_SECRET`
   - `STORAGE_*` (endpoint, keys, bucket)
   - `ENCRYPTION_KEY`
3. Habilita *required reviewers* para secrets críticos.

## 2. Servidores Hetzner
1. Guarda las variables en `/etc/clousadmin/.env` (propietario `deploy:deploy`, permisos `600`).
2. Carga el archivo desde el servicio (ejemplo systemd):
   ```
   EnvironmentFile=/etc/clousadmin/.env
   ```
3. No almacenes secretos en el repo ni en `bash_history`:
   ```
   export HISTCONTROL=ignorespace
   ```

## 3. Claves críticas
| Variable | Dónde vive | Observaciones |
|----------|------------|---------------|
| `ENCRYPTION_KEY` | Hetzner `.env`, GitHub secret | Rotar si hay fuga, nunca exponer en logs. |
| `CRON_SECRET` | Hetzner `.env`, GitHub secret | Rotar automáticamente al cambiar de hosting. |
| `STORAGE_*` | Hetzner `.env`, GitHub secret | Usa Access Keys dedicadas para backups. |
| `RESEND_API_KEY` | Hetzner `.env`, GitHub secret | Regenerar si hay sospecha. |

## 4. Procedimiento de rotación
1. Genera nueva clave (`openssl rand -base64 32`).
2. Actualiza Hetzner primero, luego GitHub.
3. Reinicia `pm2`/systemd y prueba smoke tests.
4. Documenta la rotación en `docs/daily/`.

## 5. Referencias
- `docs/CONFIGURACION_SEGURIDAD.md`
- `docs/DISASTER_RECOVERY.md`
- `docs/MIGRACION_HETZNER.md`


