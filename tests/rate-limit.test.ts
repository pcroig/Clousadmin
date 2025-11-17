import { strict as assert } from 'node:assert';

import { rateLimitApi, resetRateLimit } from '@/lib/rate-limit';

async function testRateLimitWindow() {
  const identifier = `test-${Date.now()}`;

  for (let i = 0; i < 100; i++) {
    const result = await rateLimitApi(identifier);
    assert.equal(result.success, true, `La llamada ${i} debería pasar`);
  }

  const bloqueado = await rateLimitApi(identifier);
  assert.equal(bloqueado.success, false, 'La llamada 101 debe bloquearse');
  assert.ok(typeof bloqueado.retryAfter === 'number');

  resetRateLimit(identifier);

  const trasReset = await rateLimitApi(identifier);
  assert.equal(trasReset.success, true, 'Después del reset debe permitirse');
}

await testRateLimitWindow();


