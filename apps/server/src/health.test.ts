import { describe, expect, it } from 'vitest';

import { buildHealthPayload } from './health.js';

describe('buildHealthPayload', () => {
  it('reports ok status with service identity', () => {
    expect(buildHealthPayload('svc', '1.2.3', 0)).toEqual({
      status: 'ok',
      service: 'svc',
      version: '1.2.3',
      uptimeSeconds: 0,
    });
  });

  it('converts uptime from milliseconds to whole seconds', () => {
    expect(buildHealthPayload('svc', '1.0.0', 9_999).uptimeSeconds).toBe(9);
  });

  it('never reports a negative uptime', () => {
    expect(buildHealthPayload('svc', '1.0.0', -500).uptimeSeconds).toBe(0);
  });
});
