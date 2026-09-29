/**
 * APEX HRIS – Session Guard Component (P0 – Critical)
 * ----------------------------------------------------
 * Global wrapper that:
 *  1. Starts session manager when user is authenticated
 *  2. Shows idle-timeout warning modal 2 minutes before logout
 *  3. Auto-logs out on idle or absolute timeout
 *  4. Logs session events to auditLogger
 *
 * Mount in App.jsx wrapping AppRoutes.
 * Usage:
 *   <SessionGuard>
 *     <AppRoutes />
 *   </SessionGuard>
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { sessionManager } from './sessionManager';
import { tokenStore } from './tokenStore';
import auditLogger from './auditLogger';
import { AlertTriangle, Clock, LogOut } from 'lucide-react';

const SessionGuard = ({ children }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const [warningVisible, setWarningVisible] = useState(false);
  const [secondsLeft, setSecondsLeft]       = useState(120);
  const countdownRef                        = useRef(null);

  const handleLogout = useCallback(async (reason = 'manual') => {
    setWarningVisible(false);
    clearInterval(countdownRef.current);

    await auditLogger.log(
      reason === 'idle'     ? 'SESSION_TIMEOUT'  :
      reason === 'absolute' ? 'SESSION_EXPIRED'  : 'LOGOUT',
      { reason },
      user ? { id: user.id, name: user.name, role: user.role } : null
    );

    tokenStore.clear();
    sessionManager.invalidate();
    logout();
  }, [user, logout]);

  const handleWarn = useCallback((secondsRemaining) => {
    setSecondsLeft(secondsRemaining);
    setWarningVisible(true);

    // Start countdown
    clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleStayLoggedIn = useCallback(() => {
    setWarningVisible(false);
    clearInterval(countdownRef.current);
    // Restart idle timers by simulating activity
    sessionManager.start(handleLogout, handleWarn);
    auditLogger.log('SESSION_EXTENDED', { reason: 'User clicked Stay Logged In' }, user);
  }, [handleLogout, handleWarn, user]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      sessionManager.stop();
      return;
    }

    // Log successful session start
    auditLogger.log('SESSION_STARTED', { userId: user.id, role: user.role }, user);
    sessionManager.start(handleLogout, handleWarn);

    return () => sessionManager.stop();
  }, [isAuthenticated, user?.id]);   // eslint-disable-line

  useEffect(() => {
    return () => clearInterval(countdownRef.current);
  }, []);

  return (
    <>
      {children}

      {/* Idle Timeout Warning Modal */}
      {warningVisible && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-amber-500 px-6 py-5 flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-white font-black text-base">Session Timeout Warning</h2>
                <p className="text-amber-100 text-xs">APEX HRIS Security Policy</p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-6 space-y-4">
              <div className="text-center">
                <div className="text-5xl font-black text-amber-600 font-mono">
                  {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:
                  {String(secondsLeft % 60).padStart(2, '0')}
                </div>
                <p className="text-slate-500 text-xs mt-1">until automatic logout</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Your session has been idle for 13 minutes. For your security,
                    you will be automatically logged out in{' '}
                    <strong>{secondsLeft} seconds</strong>.
                    Any unsaved data may be lost.
                  </span>
                </div>
              </div>

              <div className="flex gap-2.5">
                <button
                  onClick={() => handleLogout('manual')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out Now</span>
                </button>
                <button
                  onClick={handleStayLoggedIn}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
                >
                  Stay Logged In
                </button>
              </div>
            </div>

            {/* Footer compliance note */}
            <div className="px-6 pb-4 text-center">
              <p className="text-[10px] text-slate-400">
                RA 10173 • APEX Security Policy v2 • 15-min idle timeout
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SessionGuard;
