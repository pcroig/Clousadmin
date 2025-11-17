interface CronSummary {
  success: boolean;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  errors?: string[];
}

const ALERT_WEBHOOK = process.env.CRON_ALERT_WEBHOOK;

export function initCronLogger(cronName: string) {
  const startedAt = Date.now();
  console.info(`[CRON ${cronName}] Inicio ${new Date(startedAt).toISOString()}`);

  return {
    async finish(result: CronSummary) {
      const durationMs = Date.now() - startedAt;
      const payload = {
        ...result,
        durationMs,
      };

      const logFn = result.success ? console.info : console.error;
      logFn(
        `[CRON ${cronName}] Finalizado en ${durationMs}ms`,
        payload.metadata || ''
      );

      if (!result.success && ALERT_WEBHOOK) {
        try {
          await fetch(ALERT_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              cron: cronName,
              ...payload,
              timestamp: new Date().toISOString(),
            }),
          });
        } catch (error) {
          console.error(`[CRON ${cronName}] Error notificando webhook`, error);
        }
      }
    },
  };
}


