import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  Clock,
  ShieldCheck,
  User,
  Mail,
  Lock,
  LogIn,
  Eye,
  EyeOff,
  ShieldAlert,
  Maximize2,
  Check,
  UserPlus,
  Sparkles,
  Building2,
  CheckCircle2,
  Code,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '../../components/shared/Toast';
import TermsModal from '../../components/shared/TermsModal';
import Modal from '../../components/shared/Modal';
import { validateIdDocument } from '../../utils/idValidator';
import RecaptchaWidget from '../../components/shared/RecaptchaWidget';

export const LoginPage = () => {
  // Mode: 'SIGN_IN' | 'REGISTER'
  const [authMode, setAuthMode] = useState('SIGN_IN');

  // Employee Self-Service credentials
  const [email, setEmail] = useState('juan.cruz');
  const [password, setPassword] = useState('Emp@123');
  const [showPassword, setShowPassword] = useState(false);
  const [trustDevice, setTrustDevice] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(true);

  // Google reCAPTCHA Enterprise Verification State & Modal
  const [recaptchaVerified, setRecaptchaVerified] = useState(false);
  const [recaptchaError, setRecaptchaError] = useState('');
  const [showCaptchaModal, setShowCaptchaModal] = useState(false);
  const [pendingAction, setPendingAction] = useState('SIGN_IN');

  // Registration form state for employee
  const [regForm, setRegForm] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    branchId: 'BRANCH-001',
    position: 'Staff Member',
    department: 'Operations',
    idType: 'PhilID / National ID',
    idDocumentUrl: null,
    idDocumentName: '',
  });

  const [idPreview, setIdPreview] = useState(null);
  const [idValidating, setIdValidating] = useState(false);
  const [idValidationError, setIdValidationError] = useState('');

  const { login, loading } = useAuth();
  const { registerEmployeeAccount, branches } = useData();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setRecaptchaError('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter your username/ID and password.');
      return;
    }

    if (!recaptchaVerified) {
      setPendingAction('SIGN_IN');
      setShowCaptchaModal(true);
      return;
    }

    executeSignIn();
  };

  const executeSignIn = async () => {
    setSubmitting(true);
    try {
      // Unified login: accepts Super Admin, Supervisor, and Employee
      const result = await login(email, password);
      if (result.success) {
        setShowCaptchaModal(false);
        const userRole = result.user?.role;
        addToast({
          title: 'Welcome Back',
          message: `Signed in as ${result.user?.name || 'User'} (${userRole || 'Staff'}).`,
          type: 'success',
        });

        if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
          navigate('/admin/dashboard');
        } else if (userRole === 'SUPERVISOR') {
          navigate('/supervisor/dashboard');
        } else {
          navigate('/employee/dashboard');
        }
      } else {
        setShowCaptchaModal(false);
        setRecaptchaVerified(false);
        setErrorMessage(result.message || 'Login failed. Check your credentials.');
      }
    } catch (err) {
      setShowCaptchaModal(false);
      setRecaptchaVerified(false);
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleIdFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIdValidationError('');
    setIdValidating(true);

    try {
      const validation = await validateIdDocument(file, regForm.idType);
      if (!validation.isValid) {
        setIdValidationError(validation.error);
        setIdPreview(null);
        setRegForm((prev) => ({
          ...prev,
          idDocumentUrl: null,
          idDocumentName: '',
        }));
        addToast({
          title: 'Invalid ID Document',
          message: validation.error,
          type: 'error',
        });
      } else {
        setIdPreview(validation.dataUrl || URL.createObjectURL(file));
        setIdValidationError('');
        setRegForm((prev) => ({
          ...prev,
          idDocumentUrl: validation.dataUrl || URL.createObjectURL(file),
          idDocumentName: file.name,
        }));
        addToast({
          title: 'ID Validated',
          message: `${regForm.idType} document format verified successfully.`,
          type: 'success',
        });
      }
    } catch (err) {
      setIdValidationError('Failed to validate ID document. Please try another clear photo.');
    } finally {
      setIdValidating(false);
      e.target.value = '';
    }
  };

  const handleUseSampleId = () => {
    setIdValidationError('');
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 400;
    sampleCanvas.height = 250;
    const ctx = sampleCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 400, 250);
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(10, 10, 380, 50);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('GOVERNMENT IDENTITY CARD', 25, 42);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(25, 80, 80, 100);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(regForm.name || 'EMPLOYEE ID', 120, 110);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText(`Type: ${regForm.idType}`, 120, 135);
      ctx.fillText('Status: OFFICIAL VERIFIED ID', 120, 160);
      ctx.fillStyle = '#10b981';
      ctx.fillText('VERIFIED AUTHENTIC', 120, 185);
      const dataUrl = sampleCanvas.toDataURL('image/png');
      setIdPreview(dataUrl);
      setRegForm((prev) => ({
        ...prev,
        idDocumentUrl: dataUrl,
        idDocumentName: `${(prev.name || 'employee').toLowerCase().replace(/\s+/g, '_')}_verified_id.png`,
      }));
      addToast({
        title: 'Sample ID Attached',
        message: 'Pre-verified sample ID badge attached.',
        type: 'info',
      });
    }
  };

  const handleRemoveId = () => {
    setIdPreview(null);
    setIdValidationError('');
    setRegForm((prev) => ({
      ...prev,
      idDocumentUrl: null,
      idDocumentName: '',
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!regForm.name.trim() || !regForm.username.trim() || !regForm.password.trim()) {
      setErrorMessage('Please fill in your name, username, and password.');
      return;
    }

    if (!regForm.idDocumentUrl) {
      setErrorMessage('Please upload a valid, readable ID document to verify your identity before creating your account.');
      return;
    }

    if (idValidationError) {
      setErrorMessage(idValidationError);
      return;
    }

    if (!recaptchaVerified) {
      setPendingAction('REGISTER');
      setShowCaptchaModal(true);
      return;
    }

    executeRegister();
  };

  const executeRegister = async () => {
    setSubmitting(true);
    try {
      const res = await registerEmployeeAccount(regForm);
      if (res.success) {
        setShowCaptchaModal(false);
        addToast({
          title: 'Account Created & ID Verified!',
          message: `Welcome, ${regForm.name}! Your Employee ID is ${res.employee?.employeeCode || res.employee?.id}.`,
          type: 'success',
        });
        setEmail(regForm.username);
        setPassword(regForm.password);
        setAuthMode('SIGN_IN');
      } else {
        setShowCaptchaModal(false);
        setRecaptchaVerified(false);
        setErrorMessage(res.message || 'Registration failed. Try again.');
      }
    } catch (err) {
      setShowCaptchaModal(false);
      setRecaptchaVerified(false);
      setErrorMessage(err.message || 'An error occurred during registration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#060c18] font-sans antialiased text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* ─────────────────────────────────────────────────────────────
          LEFT COLUMN: Deep Navy Brand Panel (#081226)
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-[48%] xl:w-[45%] bg-[#081226] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800/80">
        {/* Subtle Decorative Curved Radial Blobs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
        <div className="absolute top-1/4 -right-16 w-80 h-80 rounded-full bg-indigo-600/15 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-blue-700/20 blur-3xl pointer-events-none" />

        {/* Top: Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-white flex items-center justify-center text-[#081226] shadow-md shadow-black/20">
              <Clock className="w-6 h-6 text-[#1d4ed8]" strokeWidth={2.3} />
            </div>
            <div>
              <h2 className="text-[17px] font-bold tracking-tight text-white leading-snug">
                REDDMART
              </h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                Multi-Branch Digital Timekeeping &amp; Payroll System
              </p>
            </div>
          </div>
        </div>

        {/* Center: Main Statement & Value Props */}
        <div className="my-10 lg:my-0 relative z-10 space-y-6 max-w-lg">
          {/* Top Pill Badge */}
          <div>
            <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white text-[#0f172a] text-[11px] font-semibold tracking-wide shadow-sm">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              Secure workforce operations
            </span>
          </div>

          {/* Large Headline */}
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-[1.12]">
            Every workday,<br />
            accurately accounted<br />
            for.
          </h1>

          {/* Subtext */}
          <p className="text-[14px] text-slate-300 leading-relaxed max-w-md">
            Attendance, Daily Time Records, payroll, and employee self-service in one reliable workspace.
          </p>

          {/* Bulleted Capabilities with Circle Checkmarks */}
          <div className="space-y-3.5 pt-2 text-[13px] text-slate-200">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 text-blue-300" strokeWidth={2.8} />
              </div>
              <span className="font-medium text-slate-200">Role-based access controls</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 text-blue-300" strokeWidth={2.8} />
              </div>
              <span className="font-medium text-slate-200">Encrypted attendance and payroll records</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-blue-600/30 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 text-blue-300" strokeWidth={2.8} />
              </div>
              <span className="font-medium text-slate-200">Real-time audit trails and approvals</span>
            </div>
          </div>
        </div>

        {/* Bottom System Status Bar */}
        <div className="relative z-10 pt-6">
          <div className="bg-[#111e38]/80 border border-slate-700/60 rounded-2xl px-4 py-3 flex items-center justify-between text-xs text-slate-300 backdrop-blur-sm shadow-inner">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-medium text-slate-200">All systems operational</span>
            </div>
            <div className="text-[11px] font-mono text-slate-400 tracking-wider">
              SOC 2 · TLS 1.3
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT COLUMN: Sleek Dark Auth Card Container (#060c18)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 overflow-y-auto bg-[#060c18]">


        {/* Center Card Container */}
        <div className="w-full max-w-[520px] mx-auto my-auto">
          <div className="bg-[#0b1528] rounded-3xl shadow-2xl border border-slate-800/90 p-7 sm:p-9 space-y-5 backdrop-blur-md">
            {/* Mode Switcher Tabs */}
            <div className="flex bg-[#081226] p-1 rounded-2xl border border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('SIGN_IN');
                  setErrorMessage('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                  authMode === 'SIGN_IN'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5 text-blue-400" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('REGISTER');
                  setErrorMessage('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                  authMode === 'REGISTER'
                    ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                <span>Create Employee Account</span>
              </button>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl font-medium flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                <div className="flex-1">
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            {authMode === 'SIGN_IN' ? (
              <>
                {/* Header */}
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-600/20 text-blue-300 text-[10px] font-bold uppercase tracking-wider mb-2 border border-blue-500/30">
                    <ShieldCheck className="w-3 h-3 text-blue-400" />
                    <span>Single Sign-In · All Roles</span>
                  </div>
                  <h2 className="text-2xl sm:text-[26px] font-bold text-white tracking-tight">
                    Welcome to REDDMART
                  </h2>
                  <p className="mt-1 text-[13px] text-slate-400">
                    Sign in with your Admin, Supervisor, or Employee account.
                  </p>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-4 pt-1">
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-300 mb-1.5">
                      Full Name, Username, or Employee ID
                    </label>
                    <div className="relative rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        autoComplete="off"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. juan.cruz or EMP-001-01"
                        className="block w-full pl-10 pr-3.5 py-2.5 sm:py-3 bg-[#081226] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-inner font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-slate-300 mb-1.5">
                      Password
                    </label>
                    <div className="relative rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="block w-full pl-10 pr-10 py-2.5 sm:py-3 bg-[#081226] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition shadow-inner font-mono"
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

                  <div className="flex items-center justify-between text-[12px] text-slate-400 pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={trustDevice}
                        onChange={(e) => setTrustDevice(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-700 bg-[#081226] transition"
                      />
                      <span>Trust this device for 30 days</span>
                    </label>

                    <a
                      href="#forgot"
                      onClick={(e) => {
                        e.preventDefault();
                        addToast({
                          title: 'Password Reset',
                          message: 'Password reset request notified to your branch supervisor.',
                          type: 'info',
                        });
                      }}
                      className="text-blue-400 hover:text-blue-300 font-semibold transition"
                    >
                      Forgot password?
                    </a>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting || loading}
                      className="w-full flex justify-center items-center gap-2 py-3 sm:py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-lg shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 disabled:opacity-50"
                    >
                      <LogIn className="h-4 w-4" strokeWidth={2.2} />
                      <span>{submitting ? 'Signing in...' : 'Sign in securely'}</span>
                    </button>
                  </div>



                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setAuthMode('REGISTER')}
                      className="text-xs text-blue-400 hover:text-blue-300 font-semibold inline-flex items-center gap-1 transition"
                    >
                      <span>No account yet? Create employee profile &amp; account</span>
                      <span>→</span>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                {/* Employee Account Creation Form */}
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-600/20 text-blue-300 text-[10px] font-bold uppercase tracking-wider mb-2 border border-blue-500/30">
                    <Sparkles className="w-3 h-3 text-blue-400" />
                    <span>Self-Service Employee Portal</span>
                  </div>
                  <h2 className="text-2xl sm:text-[26px] font-bold text-white tracking-tight">
                    Create Employee Account
                  </h2>
                  <p className="mt-1 text-[13px] text-slate-400">
                    If your name is not registered in the system yet, an employee profile &amp; QR badge will be created automatically.
                  </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-3.5 pt-1">
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-300 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={regForm.name}
                      onChange={(e) => {
                        const newName = e.target.value;
                        const autoUser = newName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
                        setRegForm({
                          ...regForm,
                          name: newName,
                          username: regForm.username ? regForm.username : autoUser,
                        });
                      }}
                      placeholder="e.g. Maria Santos"
                      className="block w-full px-3.5 py-2.5 bg-[#081226] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-semibold text-slate-300 mb-1">
                        Username (Sign-in ID) *
                      </label>
                      <input
                        type="text"
                        required
                        value={regForm.username}
                        onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                        placeholder="e.g. maria.santos"
                        className="block w-full px-3.5 py-2.5 bg-[#081226] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-semibold text-slate-300 mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={regForm.password}
                        onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                        placeholder="••••••••••••"
                        className="block w-full px-3.5 py-2.5 bg-[#081226] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-semibold text-slate-300 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={regForm.email}
                        onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                        placeholder="name@reddmart.enterprise"
                        className="block w-full px-3.5 py-2.5 bg-[#081226] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-semibold text-slate-300 mb-1">
                        Assigned Branch
                      </label>
                      <select
                        value={regForm.branchId}
                        onChange={(e) => setRegForm({ ...regForm, branchId: e.target.value })}
                        className="block w-full px-3.5 py-2.5 bg-[#081226] border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner"
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id} className="bg-[#081226] text-white">
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-semibold text-slate-300 mb-1">
                        Job Position
                      </label>
                      <input
                        type="text"
                        value={regForm.position}
                        onChange={(e) => setRegForm({ ...regForm, position: e.target.value })}
                        placeholder="e.g. Front Desk & Staff"
                        className="block w-full px-3.5 py-2.5 bg-[#081226] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-slate-300 mb-1">
                        Department
                      </label>
                      <input
                        type="text"
                        value={regForm.department}
                        onChange={(e) => setRegForm({ ...regForm, department: e.target.value })}
                        placeholder="Operations"
                        className="block w-full px-3.5 py-2.5 bg-[#081226] border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner"
                      />
                    </div>
                  </div>

                  {/* ID Document Upload & Verification Section */}
                  <div className="p-4 rounded-2xl bg-[#081226]/80 border border-slate-800/90 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-bold text-white">ID Document Verification *</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/30">
                        Required
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      Upload a valid government or company ID to verify your identity and confirm account activation.
                    </p>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                        Select ID Type
                      </label>
                      <select
                        value={regForm.idType}
                        onChange={(e) => setRegForm({ ...regForm, idType: e.target.value })}
                        className="block w-full px-3 py-2 bg-[#060c18] border border-slate-700/80 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="PhilID / National ID" className="bg-[#081226] text-white">PhilID / National ID (Philippine Identification System)</option>
                        <option value="Driver's License" className="bg-[#081226] text-white">Driver's License (LTO)</option>
                        <option value="Passport" className="bg-[#081226] text-white">Passport</option>
                        <option value="SSS / UMID Card" className="bg-[#081226] text-white">SSS / UMID Card</option>
                        <option value="PRC ID" className="bg-[#081226] text-white">PRC ID / Professional License</option>
                        <option value="Company / Work ID" className="bg-[#081226] text-white">Company / Work ID</option>
                        <option value="Voter's ID / Certificate" className="bg-[#081226] text-white">Voter's ID / Certificate</option>
                      </select>
                    </div>

                    {/* Validation Error Alert */}
                    {idValidationError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-medium flex items-start gap-2.5 animate-in fade-in">
                        <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-rose-300">Invalid ID Document</p>
                          <p className="text-[11px] text-rose-400 mt-0.5">{idValidationError}</p>
                        </div>
                      </div>
                    )}

                    {/* Validating Spinner */}
                    {idValidating && (
                      <div className="p-4 bg-blue-600/10 border border-blue-500/30 rounded-xl flex items-center justify-center gap-3 text-xs text-blue-300 font-semibold animate-pulse">
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                        <span>Analyzing &amp; validating {regForm.idType} document format...</span>
                      </div>
                    )}

                    {/* Upload Box or Live Preview */}
                    {!idValidating && idPreview ? (
                      <div className="p-3 bg-[#060c18] border border-emerald-500/40 rounded-xl flex items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <img
                            src={idPreview}
                            alt="ID Preview"
                            className="w-14 h-10 object-cover rounded-lg border border-slate-700 shrink-0 bg-slate-900"
                          />
                          <div className="truncate">
                            <p className="text-xs font-bold text-white truncate">
                              {regForm.idDocumentName || 'Uploaded ID Document'}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-semibold mt-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{regForm.idType} Verified &amp; Accepted</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleRemoveId}
                          className="px-2.5 py-1 text-[11px] font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg transition shrink-0"
                        >
                          Change
                        </button>
                      </div>
                    ) : !idValidating ? (
                      <div className="space-y-2">
                        <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 hover:border-blue-500 bg-[#060c18] rounded-2xl cursor-pointer transition group">
                          <ShieldCheck className="w-7 h-7 text-slate-500 group-hover:text-blue-400 transition mb-1" />
                          <span className="text-xs font-bold text-slate-300 group-hover:text-blue-400">
                            Click to upload ID photo or scan
                          </span>
                          <span className="text-[10px] text-slate-500 mt-0.5">
                            JPG, PNG, or PDF (Must be a clear landscape ID card)
                          </span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleIdFileUpload}
                            className="hidden"
                          />
                        </label>

                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-500">Or use instant sample ID:</span>
                          <button
                            type="button"
                            onClick={handleUseSampleId}
                            className="text-[11px] text-blue-400 hover:text-blue-300 font-bold hover:underline"
                          >
                            + Attach Verified Sample ID
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Terms & Conditions Agreement Checkbox */}
                  <div className="flex items-start gap-2 pt-1 text-xs text-slate-400">
                    <input
                      type="checkbox"
                      id="termsAgree"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-700 bg-[#081226] transition"
                      required
                    />
                    <label htmlFor="termsAgree" className="text-[11px] leading-tight">
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={() => setIsTermsOpen(true)}
                        className="font-bold text-blue-400 hover:underline"
                      >
                        Terms of Service &amp; Data Privacy Act (R.A. 10173)
                      </button>
                    </label>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting || !acceptedTerms}
                      className="w-full flex justify-center items-center gap-2 py-3 sm:py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-lg shadow-blue-600/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 disabled:opacity-50"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>{submitting ? 'Creating account...' : 'Confirm ID & Create Account'}</span>
                    </button>
                  </div>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setAuthMode('SIGN_IN')}
                      className="text-xs text-slate-400 hover:text-blue-400 font-semibold inline-flex items-center gap-1 transition"
                    >
                      <span>Already have an account? Sign in here</span>
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>

        {/* Bottom Page Footer */}
        <div className="w-full max-w-[500px] mx-auto mt-6 pt-2 flex flex-col gap-2.5 text-[11px] text-slate-500">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>AES-256 Protected &amp; R.A. 10173 Compliant</span>
            </span>
            <div className="flex items-center gap-3 text-slate-400">
              <button
                type="button"
                onClick={() => setIsTermsOpen(true)}
                className="hover:text-white font-semibold transition"
              >
                Privacy Policy
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => setIsTermsOpen(true)}
                className="hover:text-white font-semibold transition"
              >
                Terms of Service
              </button>
            </div>
          </div>

          {/* Developer Watermark */}
          <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-[#0b1528] border border-slate-800/80 text-[10px] font-mono font-bold text-slate-400">
            <Code className="w-3 h-3 text-blue-400" />
            <span>Devs: LAWRENCE, A &amp; TAZPER</span>
          </div>
        </div>

        {/* Render Terms & Conditions Modal */}
        <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />

        {/* reCAPTCHA Security Verification Modal (Pops up only when clicking Sign in securely / Submit) */}
        <Modal
          isOpen={showCaptchaModal}
          onClose={() => setShowCaptchaModal(false)}
          title="Security Verification"
          subtitle="Confirm you are human to proceed"
          maxWidth="max-w-md"
        >
          <div className="p-6 flex flex-col items-center space-y-4">
            <p className="text-xs text-slate-600 text-center">
              Please check the box below to complete security verification.
            </p>

            <RecaptchaWidget
              verified={recaptchaVerified}
              onVerify={(val) => {
                setRecaptchaVerified(val);
                setRecaptchaError('');
                setTimeout(() => {
                  setShowCaptchaModal(false);
                  if (pendingAction === 'REGISTER') {
                    executeRegister();
                  } else {
                    executeSignIn();
                  }
                }, 400);
              }}
              error={recaptchaError}
            />

            <p className="text-[10px] text-center text-slate-400 leading-tight">
              Protected by Google reCAPTCHA Enterprise. Google{' '}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">Privacy Policy</a>
              {' '}and{' '}
              <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">Terms of Service</a> apply.
            </p>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default LoginPage;
