import * as Sentry from '@sentry/nextjs';

import { buildEdgeOptions, sanitizeEvent } from '@/lib/observabilidad/sentry-config';

Sentry.init({
  ...buildEdgeOptions(),
  beforeSend(event) {
    return sanitizeEvent(event);
  },
});





