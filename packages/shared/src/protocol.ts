/**
 * Network protocol contracts.
 *
 * The client sends *intent only* — never damage, position claims, cooldown
 * completions or round outcomes (see `docs/02_ARCHITECTURE.md`). The server is
 * authoritative for room membership, ready state, selections, health, timer,
 * hit validation, round result and rematch state.
 *
 * Phase 0 ships only the version tag and a ping/pong pair so that latency can
 * be measured from the first day. Lobby, input and match messages are added in
 * Phase 4.
 */

/** Bump on breaking message changes so mismatched clients fail fast. */
export const PROTOCOL_VERSION = 1;

/** Messages sent from the client to the server. */
export type ClientMessage = {
  /** Round-trip time probe. Carries no gameplay intent. */
  type: 'ping';
  /** Client clock at send time, echoed back unchanged. */
  clientTimeMs: number;
};

/** Messages sent from the server to the client. */
export type ServerMessage = {
  type: 'pong';
  /** Echo of the client's timestamp so the client can compute RTT. */
  clientTimeMs: number;
  /** Authoritative server clock at reply time. */
  serverTimeMs: number;
};
