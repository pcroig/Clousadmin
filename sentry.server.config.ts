import * as Sentry from '@sentry/nextjs';

import { buildServerOptions, sanitizeEvent } from '@/lib/observabilidad/sentry-config';

Sentry.init({
  ...buildServerOptions(),
  beforeSend(event) {
    return sanitizeEvent(event);
  },
});


