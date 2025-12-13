import { logger } from '../logger';

interface CronSummary {
  success: boolean;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  errors?: string[];
}

const ALERT_WEBHOOK = process.env.CRON_ALERT_WEBHOOK;

export function initCronLogger(cronName: string) {
  const startedAt = Date.now();
  logger.cron(cronName, 'started', { startedAt: new Date(startedAt).toISOString() });

  return {
    async finish(result: CronSummary) {
      const durationMs = Date.now() - startedAt;
      const payload = {
        ...result,
        durationMs,
      };

      if (result.success) {
        logger.cron(cronName, 'completed', payload.metadata);
      } else {
        logger.cron(cronName, 'failed', {
          ...payload.metadata,
          errors: result.errors,
          durationMs,
        });
      }

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
          logger.error(`CRON ${cronName} webhook notification failed`, error instanceof Error ? error : new Error(String(error)));
        }
      }
    },
  };
}


