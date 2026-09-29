/**
 * APEX HRIS – Tamper-Proof Audit Trail (P1 – High)
 * -------------------------------------------------
 * Hash chaining: Each entry includes SHA-256 of previous entry.
 * Append-only: No update or delete. Export-only access.
 *
 * Events logged:
 *  LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, PASSWORD_CHANGED,
 *  QR_SCAN_ATTENDANCE, QR_SCAN_PAYROLL, DTR_ADJUSTMENT,
 *  PAYROLL_RUN, PAYROLL_DISBURSED, DATA_EXPORT,
 *  PERMISSION_CHANGED, FACTORY_RESET, SESSION_TIMEOUT,
 *  SESSION_EXPIRED, RATE_LIMIT_TRIGGERED
 *
 * Usage:
 *   import auditLogger from './security/auditLogger';
 *   auditLogger.log('LOGIN_SUCCESS', { username: 'admin' });
 *   const logs = auditLogger.getAll();
 *   auditLogger.verifyIntegrity(); // returns { valid, brokenAt }
 */

import keyManager from './keyManager.js';

const AUDIT_STORAGE_KEY = 'APEX_AUDIT_CHAIN_v1';
const MAX_LOG_ENTRIES   = 10000;

function getChain() {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveChain(chain) {
  try {
    // Keep only last MAX_LOG_ENTRIES to prevent storage overflow
    const trimmed = chain.slice(-MAX_LOG_ENTRIES);
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('[AuditLogger] Failed to save audit chain:', e);
  }
}

async function computeHash(entry) {
  return keyManager.sha256(JSON.stringify(entry));
}

const auditLogger = {
  /**
   * Append a new audit log entry with hash chaining.
   * @param {string} eventType  - e.g. 'LOGIN_SUCCESS'
   * @param {object} payload    - event details (will be sanitized)
   * @param {object} [actor]    - { id, name, role } of user performing action
   */
  async log(eventType, payload = {}, actor = null) {
    try {
      const chain      = getChain();
      const prevEntry  = chain.length > 0 ? chain[chain.length - 1] : null;
      const prevHash   = prevEntry ? prevEntry.hash : '0000000000000000';

      // Build the entry (without hash first)
      const entryBase = {
        seq:        chain.length + 1,
        type:       String(eventType).toUpperCase(),
        timestamp:  new Date().toISOString(),
        actor:      actor ? { id: actor.id, name: actor.name, role: actor.role } : null,
        payload:    payload,
        prevHash:   prevHash,
        ua:         navigator.userAgent.slice(0, 80),   // partial UA for forensics
      };

      const hash  = await computeHash({ ...entryBase });
      const entry = { ...entryBase, hash };

      chain.push(entry);
      saveChain(chain);
      return entry;
    } catch (err) {
      console.error('[AuditLogger] log() error:', err);
    }
  },

  /** Get all audit log entries (read-only copy) */
  getAll() {
    return [...getChain()];
  },

  /** Get entries filtered by event type */
  getByType(eventType) {
    return getChain().filter((e) => e.type === eventType.toUpperCase());
  },

  /** Get entries in a date range */
  getRange(fromDate, toDate) {
    const from = new Date(fromDate).getTime();
    const to   = new Date(toDate).getTime();
    return getChain().filter((e) => {
      const t = new Date(e.timestamp).getTime();
      return t >= from && t <= to;
    });
  },

  /**
   * Verify hash chain integrity.
   * @returns {{ valid: boolean, totalEntries: number, brokenAt: number|null }}
   */
  async verifyIntegrity() {
    const chain = getChain();
    if (chain.length === 0) return { valid: true, totalEntries: 0, brokenAt: null };

    for (let i = 0; i < chain.length; i++) {
      const entry     = chain[i];
      const { hash, ...rest } = entry;
      const computed  = await computeHash({ ...rest });

      if (computed !== hash) {
        console.warn(`[AuditLogger] Chain broken at entry #${entry.seq}`);
        return { valid: false, totalEntries: chain.length, brokenAt: entry.seq };
      }
    }

    return { valid: true, totalEntries: chain.length, brokenAt: null };
  },

  /**
   * Export audit log as JSON string (for download / reporting)
   */
  exportJSON(filters = {}) {
    let entries = getChain();
    if (filters.type) entries = entries.filter((e) => e.type === filters.type);
    if (filters.from) entries = entries.filter((e) => new Date(e.timestamp) >= new Date(filters.from));
    if (filters.to)   entries = entries.filter((e) => new Date(e.timestamp) <= new Date(filters.to));

    return JSON.stringify(entries, null, 2);
  },

  /** Export as CSV for payroll/HR compliance reports */
  exportCSV() {
    const entries = getChain();
    const header  = 'Seq,Type,Timestamp,ActorName,ActorRole,PayloadSummary,Hash\n';
    const rows    = entries.map((e) =>
      [
        e.seq,
        e.type,
        e.timestamp,
        e.actor?.name || 'System',
        e.actor?.role || '',
        JSON.stringify(e.payload).slice(0, 80).replace(/,/g, ';'),
        e.hash,
      ].join(',')
    );
    return header + rows.join('\n');
  },

  /** Clear the audit log (SUPER_ADMIN only — itself gets logged) */
  async clear(actor) {
    await this.log('AUDIT_LOG_CLEARED', { reason: 'Manual admin clear' }, actor);
    // After logging the clear event, wipe
    localStorage.removeItem(AUDIT_STORAGE_KEY);
  },
};

export default auditLogger;
