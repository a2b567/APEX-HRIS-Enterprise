/**
 * APEX HRIS – In-Memory Token Store (P0 – Critical)
 * --------------------------------------------------
 * Replaces localStorage token storage with in-memory storage.
 * Access tokens live ONLY in memory (no XSS-accessible storage).
 * Refresh tokens are stored in sessionStorage (httpOnly cookie
 * in real backend deployment).
 *
 * Token lifecycle:
 *  - Access token: 15 min (in-memory, wiped on page close)
 *  - Session token: sessionStorage (cleared on tab close)
 *
 * Note: In production with a real backend, the refresh token
 * should be issued as an httpOnly, SameSite=Strict cookie by
 * the server. This file handles the frontend memory layer only.
 */

const ACCESS_TOKEN_TTL_MS  = 15 * 60 * 1000;   // 15 minutes
const SESSION_TOKEN_KEY     = 'APEX_SESSION_TOK';

let _accessToken  = null;
let _tokenExpiry  = null;
let _refreshTimer = null;
let _onExpiredCb  = null;

function scheduleExpiry(ttlMs) {
  clearTimeout(_refreshTimer);
  _refreshTimer = setTimeout(() => {
    _accessToken = null;
    _tokenExpiry = null;
    if (_onExpiredCb) _onExpiredCb();
  }, ttlMs);
}

export const tokenStore = {
  /** Store a new access token in memory */
  setAccessToken(token, ttlMs = ACCESS_TOKEN_TTL_MS) {
    _accessToken = token;
    _tokenExpiry = Date.now() + ttlMs;
    scheduleExpiry(ttlMs);
  },

  /** Retrieve the in-memory access token (null if expired/missing) */
  getAccessToken() {
    if (!_accessToken || Date.now() > _tokenExpiry) {
      _accessToken = null;
      _tokenExpiry = null;
      return null;
    }
    return _accessToken;
  },

  /** Returns milliseconds until token expiry */
  getTimeToExpiry() {
    if (!_tokenExpiry) return 0;
    return Math.max(0, _tokenExpiry - Date.now());
  },

  /** Store session identifier in sessionStorage (clears on tab close) */
  setSessionToken(sessionId) {
    if (!sessionId) return;
    sessionStorage.setItem(SESSION_TOKEN_KEY, sessionId);
  },

  getSessionToken() {
    return sessionStorage.getItem(SESSION_TOKEN_KEY);
  },

  /** Register a callback to fire when access token expires */
  onExpired(cb) {
    _onExpiredCb = cb;
  },

  /** Wipe all tokens — call on logout */
  clear() {
    clearTimeout(_refreshTimer);
    _accessToken = null;
    _tokenExpiry = null;
    _refreshTimer = null;
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
  },

  isValid() {
    return !!_accessToken && Date.now() < (_tokenExpiry || 0);
  },
};

export default tokenStore;
