/**
 * APEX HRIS – Session Manager (P0 – Critical)
 * --------------------------------------------
 * Handles:
 *  - Idle timeout: 15 minutes
 *  - Absolute session ceiling: 8 hours
 *  - Activity listeners: mousemove, keypress, click, touchstart, scroll
 *  - Warning callback 2 minutes before idle logout
 *  - Session invalidation on logout
 *
 * Usage (App.jsx):
 *   import { sessionManager } from './security/sessionManager';
 *   sessionManager.start(logoutFn, warnFn);
 *   sessionManager.stop(); // on logout
 */

const IDLE_TIMEOUT_MS     = 15 * 60 * 1000;   // 15 minutes
const WARN_BEFORE_MS      =  2 * 60 * 1000;   // warn 2 min early
const ABSOLUTE_TIMEOUT_MS =  8 * 60 * 60 * 1000; // 8 hours
const SESSION_START_KEY   = 'APEX_SESSION_START';
const ACTIVITY_EVENTS     = ['mousemove', 'mousedown', 'keypress', 'click', 'touchstart', 'scroll'];

let idleTimer     = null;
let warnTimer     = null;
let absoluteTimer = null;
let logoutCb      = null;
let warnCb        = null;

function resetIdleTimers() {
  clearTimeout(idleTimer);
  clearTimeout(warnTimer);

  // Warn 2 minutes before idle logout
  warnTimer = setTimeout(() => {
    if (warnCb) warnCb(WARN_BEFORE_MS / 1000);   // pass seconds remaining
  }, IDLE_TIMEOUT_MS - WARN_BEFORE_MS);

  // Logout on idle
  idleTimer = setTimeout(() => {
    if (logoutCb) logoutCb('idle');
  }, IDLE_TIMEOUT_MS);
}

function handleActivity() {
  resetIdleTimers();
}

export const sessionManager = {
  start(onLogout, onWarn) {
    logoutCb = onLogout;
    warnCb   = onWarn;

    // Record absolute session start
    if (!sessionStorage.getItem(SESSION_START_KEY)) {
      sessionStorage.setItem(SESSION_START_KEY, Date.now().toString());
    }

    // Attach activity listeners
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));

    // Start idle timers
    resetIdleTimers();

    // Absolute session timer
    const started    = parseInt(sessionStorage.getItem(SESSION_START_KEY), 10) || Date.now();
    const elapsed    = Date.now() - started;
    const remaining  = Math.max(ABSOLUTE_TIMEOUT_MS - elapsed, 0);

    absoluteTimer = setTimeout(() => {
      if (logoutCb) logoutCb('absolute');
    }, remaining);
  },

  stop() {
    clearTimeout(idleTimer);
    clearTimeout(warnTimer);
    clearTimeout(absoluteTimer);
    ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, handleActivity));
    sessionStorage.removeItem(SESSION_START_KEY);
    logoutCb = null;
    warnCb   = null;
  },

  /** Call whenever user manually logs out — clears session data */
  invalidate() {
    this.stop();
    // Clear all APEX session artifacts
    sessionStorage.clear();
    // Remove auth-related localStorage keys
    const keysToRemove = Object.keys(localStorage).filter(
      (k) => k.startsWith('APEX_') || k.startsWith('dtr_payroll_auth')
    );
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  },

  getIdleTimeoutSec: () => IDLE_TIMEOUT_MS / 1000,
  getAbsoluteTimeoutSec: () => ABSOLUTE_TIMEOUT_MS / 1000,
};

export default sessionManager;
