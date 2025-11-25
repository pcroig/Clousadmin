import * as Sentry from '@sentry/nextjs';

import { buildBrowserOptions, sanitizeEvent } from '@/lib/observabilidad/sentry-config';

Sentry.init({
  ...buildBrowserOptions(),
  beforeSend(event) {
    return sanitizeEvent(event);
  },
});




