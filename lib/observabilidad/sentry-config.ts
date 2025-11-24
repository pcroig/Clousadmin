type Target = 'client' | 'server' | 'edge';

const parseSampleRate = (value: string | undefined, fallback: number): number => {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const environment = process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development';
const isProduction = environment === 'production';

const defaultTracesSampleRate = parseSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE, isProduction ? 0.1 : 1);
const defaultProfilesSampleRate = parseSampleRate(process.env.SENTRY_PROFILES_SAMPLE_RATE, 0);
const defaultReplaysSessionSampleRate = parseSampleRate(process.env.SENTRY_REPLAYS_SESSION_SAMPLE_RATE, 0);
const defaultReplaysOnErrorSampleRate = parseSampleRate(
  process.env.SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
  isProduction ? 1 : 0.5
);

const SENSITIVE_HEADERS = new Set(['authorization', 'cookie', 'set-cookie']);

const buildBaseOptions = (target: Target) => {
  const dsn =
    target === 'client'
      ? process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN
      : process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

  return {
    dsn: dsn || undefined,
    environment,
    tracesSampleRate: defaultTracesSampleRate,
    profilesSampleRate: defaultProfilesSampleRate,
  };
};

export const buildBrowserOptions = () => ({
  ...buildBaseOptions('client'),
  replaysSessionSampleRate: defaultReplaysSessionSampleRate,
  replaysOnErrorSampleRate: defaultReplaysOnErrorSampleRate,
});

export const buildServerOptions = () => buildBaseOptions('server');

export const buildEdgeOptions = () => buildBaseOptions('edge');

type SanitizableEvent = {
  request?: {
    headers?: Record<string, unknown>;
    cookies?: unknown;
  };
};

export const sanitizeEvent = <T extends SanitizableEvent>(event: T): T => {
  if (event.request?.headers) {
    for (const [key] of Object.entries(event.request.headers)) {
      if (SENSITIVE_HEADERS.has(key.toLowerCase())) {
        delete event.request.headers[key];
      }
    }
  }

  if (event.request?.cookies) {
    event.request.cookies = undefined;
  }

  return event;
};

