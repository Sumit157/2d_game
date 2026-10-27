/** Shape of the `/healthz` response. Contains no personal or player data. */
export interface HealthPayload {
  status: 'ok';
  service: string;
  version: string;
  uptimeSeconds: number;
}

/**
 * Builds the health-check payload.
 *
 * Kept as a pure function so it can be unit tested without binding a port.
 */
export function buildHealthPayload(
  service: string,
  version: string,
  uptimeMs: number,
): HealthPayload {
  return {
    status: 'ok',
    service,
    version,
    uptimeSeconds: Math.max(0, Math.floor(uptimeMs / 1000)),
  };
}
