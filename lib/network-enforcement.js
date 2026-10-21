'use strict';

/**
 * Network enforcement boundary.
 *
 * This module deliberately does not pretend that QR validation grants Internet
 * access. A production adapter must be implemented for the actual gateway and
 * must identify a client using a gateway-observed identity (not a client-
 * supplied MAC/IP alone). Until then, enforcement stays disconnected.
 */
function createNetworkEnforcer({ mode = 'simulation', adapter = null } = {}) {
  if (mode === 'simulation') {
    return Object.freeze({
      mode,
      connected: false,
      async grantAccess() {
        return { ok: false, enforcement: 'NOT_CONNECTED', reason: 'simulation_mode' };
      },
      async revokeAccess() {
        return { ok: false, enforcement: 'NOT_CONNECTED', reason: 'simulation_mode' };
      },
      async getStatus() {
        return { mode, enforcement: 'NOT_CONNECTED', note: 'Simulation does not change real network access.' };
      }
    });
  }

  if (mode !== 'real') {
    throw new Error(`Unsupported NETWORK_MODE: ${mode}`);
  }
  if (!adapter || typeof adapter.grantAccess !== 'function' ||
      typeof adapter.revokeAccess !== 'function' || typeof adapter.getStatus !== 'function') {
    throw new Error('NETWORK_MODE=real requires a complete, verified network adapter.');
  }

  return Object.freeze({
    mode,
    connected: true,
    async grantAccess(session) {
      if (!session || !session.clientId || !Number.isFinite(session.activeUntil) || session.activeUntil <= Date.now()) {
        throw new Error('A verified clientId and future activeUntil are required.');
      }
      return adapter.grantAccess(session);
    },
    async revokeAccess(session) {
      if (!session || !session.clientId) throw new Error('A verified clientId is required.');
      return adapter.revokeAccess(session);
    },
    async getStatus() {
      return adapter.getStatus();
    }
  });
}

module.exports = { createNetworkEnforcer };
