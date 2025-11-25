# 🕒 Inventario de Cron Jobs

| Cron | Endpoint | Configuración | Programación | Logs |
|------|----------|---------------|--------------|------|
| Revisar solicitudes con IA | `POST /api/cron/revisar-solicitudes` | `crontab` en Hetzner | Diario 02:00 UTC | `/var/log/clousadmin-cron.log` |
| Cerrar jornadas anteriores | `POST /api/cron/clasificar-fichajes` | `crontab` en Hetzner | Diario 23:30 UTC | `/var/log/clousadmin-cron.log` |
| Backup base de datos | `scripts/backup-db.sh` | `crontab` en Hetzner | Diario 02:00 UTC | `/var/log/clousadmin-cron.log` |

## Configuración Actual

Los cron jobs están configurados en el servidor Hetzner usando `crontab`. Para instalarlos:

```bash
cd /opt/clousadmin
CRON_SECRET="tu-secret" APP_URL="https://app.tu-dominio.com" \
  ./scripts/hetzner/setup-cron.sh
```

## Variables Requeridas

```bash
CRON_SECRET=              # Obligatoria. Se valida en todos los endpoints /api/cron/*
APP_URL=                  # URL de la aplicación (ej: https://app.hrcron.com)
SOLICITUDES_PERIODO_REVISION_HORAS=48  # Umbral horas para auto-revisar solicitudes (opcional)
CRON_ALERT_WEBHOOK=       # Opcional. Webhook HTTPS (Slack/Teams) para alertas de fallo
```

## Verificación

```bash
# Probar manualmente
./scripts/hetzner/test-crons.sh

# Ver logs
tail -f /var/log/clousadmin-cron.log

# Verificar crontab
crontab -l
```

## GitHub Actions (Respaldo Manual)

Los workflows de GitHub Actions están disponibles como respaldo manual:
- Configura `ENABLE_GITHUB_CRONS=false` en GitHub Variables para desactivarlos
- Útiles para ejecución manual desde la UI de GitHub

## Monitorización

- Logs consolidados en `/var/log/clousadmin-cron.log`
- Script de verificación: `npx tsx scripts/verificar-crons.ts`
- Alertas opcionales vía `CRON_ALERT_WEBHOOK` cuando un cron falla

**Última actualización**: 21 de noviembre 2025
