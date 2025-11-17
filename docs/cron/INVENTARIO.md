# 🕒 Inventario de Cron Jobs (nov 2025)

| Cron | Endpoint | Trigger | Programación recomendada | Logs / Alertas |
|------|----------|---------|--------------------------|----------------|
| Revisar solicitudes con IA | `POST /api/cron/revisar-solicitudes` | GitHub Action (`cron-revisar-solicitudes.yml`) o `crontab` en Hetzner | Diario 02:00 UTC (variable `SOLICITUDES_PERIODO_REVISION_HORAS`) | Consola + `CRON_ALERT_WEBHOOK` cuando falla |
| Cerrar jornadas anteriores | `POST /api/cron/clasificar-fichajes` | `crontab` servidor Hetzner (`scripts/hetzner/setup-cron.sh`) o GitHub Action auxiliar | Diario 23:30 hora servidor | Consola + `CRON_ALERT_WEBHOOK` cuando falla |

## Variables implicadas

```
CRON_SECRET=  # Obligatoria. Se valida en todos los endpoints /api/cron/*
SOLICITUDES_PERIODO_REVISION_HORAS=48  # Umbral horas para auto-revisar solicitudes
CRON_ALERT_WEBHOOK=  # Opcional. Webhook HTTPS (Slack/Teams) para alertas de fallo
```

> ⚠️ `.env.example` no puede modificarse desde este entorno (archivo bloqueado). Añade manualmente `CRON_ALERT_WEBHOOK` en tu `.env` cuando quieras activar alertas.

## Ejecución en Hetzner (crontab)

```
# Revisar solicitudes (02:00 UTC)
0 2 * * * curl -X POST https://app.tu-dominio.com/api/cron/revisar-solicitudes \
  -H "Authorization: Bearer $CRON_SECRET"

# Cerrar jornadas (23:30 hora servidor)
30 23 * * * curl -X POST https://app.tu-dominio.com/api/cron/clasificar-fichajes \
  -H "Authorization: Bearer $CRON_SECRET"
```

## Monitorización básica

- Ambos cron jobs usan `lib/cron/logger.ts`:
  - Registra inicio/fin + métricas (duración, registros procesados).
  - Si `CRON_ALERT_WEBHOOK` está definido y el cron falla, envía `POST` con `{ cron, durationMs, errors }`.
- Para GitHub Actions, habilita notificaciones de workflow fallidos.
- En Hetzner, redirige la salida de `curl` a `/var/log/clousadmin-cron.log` para revisión rápida.

## Checklist después de deploy

1. Secretos sincronizados (`CRON_SECRET`, `CRON_ALERT_WEBHOOK`) en hosting y GitHub.
2. Prueba manual de cada endpoint:
   ```
   curl -X POST https://app.../api/cron/revisar-solicitudes \
     -H "Authorization: Bearer <CRON_SECRET>"
   ```
3. Confirmar logs en servidor o GitHub.
4. Verificar que el webhook recibe alertas simulando un fallo (opcional: forzar `throw` temporalmente).

## Próximos cron jobs sugeridos

- Recordatorios diarios/semanales (`/api/cron/daily-notifications`).
- Limpieza de sesiones expiradas (`lib/auth.ts` ya expone helper).
- Backups (`scripts/backup-db.sh` + `docs/DISASTER_RECOVERY.md`).

Mantén este inventario actualizado cada vez que se añada un nuevo cron job.


