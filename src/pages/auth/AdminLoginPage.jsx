import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  ShieldAlert,
  ArrowLeft,
  KeyRound,
  Server,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  Building2,
} from 'lucide-react';
import { useToast } from '../../components/shared/Toast';
import RecaptchaWidget from '../../components/shared/RecaptchaWidget';

export const AdminLoginPage = () => {
  // Role switcher: 'ADMIN' | 'SUPERVISOR'
  const [selectedRole, setSelectedRole] = useState('ADMIN');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Google reCAPTCHA Verification
  const [recaptchaVerified, setRecaptchaVerified] = useState(false);
  const [recaptchaError, setRecaptchaError] = useState('');

  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleRoleSelect = (roleKey) => {
    setSelectedRole(roleKey);
    setErrorMessage('');
    setRecaptchaError('');
    if (roleKey === 'ADMIN') {
      setUsername('admin');
      setPassword('Admin@123');
    } else {
      setUsername('aron');
      setPassword('Supervisor@123');
    }
  };

  const handleManagementLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setRecaptchaError('');

    if (!recaptchaVerified) {
      setRecaptchaError('Please check "I\'m not a robot" to verify authorization.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await login(username, password, selectedRole);
      if (result.success) {
        if (selectedRole === 'ADMIN') {
          addToast({
            title: 'Administrative Access Granted',
            message: 'Welcome back, System Administrator. Full enterprise privileges unlocked.',
            type: 'success',
          });
          navigate('/admin/dashboard');
        } else {
          addToast({
            title: 'Supervisor Access Granted',
            message: `Welcome back, Supervisor ${result.user?.name || username}. Branch management ready.`,
            type: 'success',
          });
          navigate('/supervisor/dashboard');
        }
      } else {
        setErrorMessage(
          result.message ||
            (selectedRole === 'ADMIN'
              ? 'Administrative authentication failed. Please check master credentials.'
              : 'Supervisor authentication failed. Please check branch supervisor credentials.')
        );
      }
    } catch (err) {
      setErrorMessage(err.message || 'An unexpected security gateway error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#060c18] font-sans antialiased text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* ─────────────────────────────────────────────────────────────
          LEFT PANEL: HIGH-SECURITY MANAGEMENT TERMINAL SHIELD
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-[45%] bg-[#081226] p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-slate-800/80">
        {/* Cyber Grid & Ambient Glow */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />

        {/* Top: Header */}
        <div className="relative z-10">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white mb-8 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Employee Self-Service Portal</span>
          </Link>

          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 border border-blue-400/30">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white leading-snug">
                REDMART
              </h2>
              <p className="text-[10px] text-blue-400 uppercase tracking-widest font-mono font-bold">
                MANAGEMENT &amp; ADMINISTRATIVE GATEWAY
              </p>
            </div>
          </div>
        </div>

        {/* Middle: Security Statement */}
        <div className="my-10 lg:my-0 relative z-10 space-y-6 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            RESTRICTED ACCESS • AUTHORIZED PERSONNEL ONLY
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            Central Command &amp;<br />
            5-Branch Governance.
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            This gateway provides elevated cryptographic access for Administrators and Branch Supervisors to manage payroll disbursements, attendance approvals, shift rostering, and enterprise audit logs.
          </p>

          {/* Security Protocols Strip */}
          <div className="space-y-3 pt-2 text-xs font-mono">
            <div className="flex items-center gap-2.5 text-slate-300">
              <KeyRound className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Isolated Master Administrator &amp; Supervisor Protocol</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-300">
              <Server className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Zero-Trust Role Validation (SUPER_ADMIN / SUPERVISOR)</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-300">
              <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Real-Time Audit Logging &amp; Session Isolation</span>
            </div>
          </div>
        </div>

        {/* Bottom Notice */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
          <span>Security Protocol: TLS 1.3 • AES-256 GCM • Active Rate Limiter</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT PANEL: AUTHENTICATION FORM
         ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-md space-y-6">
          {/* Card Container */}
          <div className="bg-[#0b1528] border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md relative">
            
            {/* Header Badge */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {selectedRole === 'ADMIN' ? 'Admin Authentication' : 'Supervisor Authentication'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedRole === 'ADMIN'
                    ? 'Enter root administrative credentials'
                    : 'Enter branch supervisor credentials'}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                {selectedRole === 'ADMIN' ? (
                  <Lock className="w-5 h-5" />
                ) : (
                  <Briefcase className="w-5 h-5" />
                )}
              </div>
            </div>

            {/* Role Switcher Tabs */}
            <div className="flex bg-[#081226] p-1 rounded-2xl border border-slate-800/80 mt-4">
              <button
                type="button"
                onClick={() => handleRoleSelect('ADMIN')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
                  selectedRole === 'ADMIN'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Administrator</span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleSelect('SUPERVISOR')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
                  selectedRole === 'SUPERVISOR'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Branch Supervisor</span>
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-shake">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleManagementLogin} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
                  {selectedRole === 'ADMIN' ? 'Administrator Username' : 'Supervisor Username'}
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={selectedRole === 'ADMIN' ? 'admin' : 'aron'}
                    className="block w-full pl-10 pr-3.5 py-3 bg-[#081226] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
                  {selectedRole === 'ADMIN' ? 'Master Security Password' : 'Supervisor Password'}
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="block w-full pl-10 pr-10 py-3 bg-[#081226] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* reCAPTCHA Enterprise Verification Box */}
              <div className="pt-2 flex flex-col items-center sm:items-start">
                <RecaptchaWidget
                  verified={recaptchaVerified}
                  onVerify={(val) => {
                    setRecaptchaVerified(val);
                    setRecaptchaError('');
                  }}
                  error={recaptchaError}
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || loading}
                  className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-lg shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition disabled:opacity-50"
                >
                  <LogIn className="h-4 w-4" strokeWidth={2.5} />
                  <span>
                    {selectedRole === 'ADMIN'
                      ? 'Authenticate as System Administrator'
                      : 'Authenticate as Branch Supervisor'}
                  </span>
                </button>

                <p className="text-[10px] text-center text-slate-500 mt-2 leading-tight">
                  Protected by Google reCAPTCHA Enterprise •{' '}
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-slate-300"
                  >
                    Privacy
                  </a>{' '}
                  •{' '}
                  <a
                    href="https://policies.google.com/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-slate-300"
                  >
                    Terms
                  </a>
                </p>
              </div>
            </form>
          </div>

          {/* Bottom Switch Link */}
          <div className="text-center">
            <Link
              to="/login"
              className="text-xs text-slate-400 hover:text-blue-400 font-medium inline-flex items-center gap-1.5 transition"
            >
              <span>Employee or Staff Member?</span>
              <span className="font-bold underline text-white">Sign in to Self-Service Portal →</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
