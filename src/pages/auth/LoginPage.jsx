import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  Clock,
  ShieldCheck,
  Briefcase,
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
} from 'lucide-react';
import { useToast } from '../../components/shared/Toast';
import TermsModal from '../../components/shared/TermsModal';

export const LoginPage = () => {
  // Mode: 'SIGN_IN' | 'REGISTER'
  const [authMode, setAuthMode] = useState('SIGN_IN');

  // Role switcher: 'ADMIN' | 'PAYROLL' | 'EMPLOYEE'
  const [selectedRole, setSelectedRole] = useState('ADMIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [trustDevice, setTrustDevice] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(true);

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

  const { login, loginUserDirectly, loading } = useAuth();
  const { registerEmployeeAccount, branches } = useData();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleIdFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      setIdPreview(result);
      setRegForm((prev) => ({
        ...prev,
        idDocumentUrl: result,
        idDocumentName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleUseSampleId = () => {
    // Generate a clean SVG sample ID badge
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
    }
  };

  const handleRemoveId = () => {
    setIdPreview(null);
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
      setErrorMessage('Please upload and confirm your ID to verify your identity before creating your account.');
      return;
    }

    setSubmitting(true);
    try {
      const res = registerEmployeeAccount(regForm);
      if (res.success && res.user) {
        addToast({
          title: 'ID Verified & Account Created',
          message: res.message || `Welcome to APEX HRIS Enterprise, ${res.user.name}! ID confirmed.`,
          type: 'success',
        });
        loginUserDirectly(res.user);
        navigate('/employee/dashboard');
      } else {
        setErrorMessage(res.message || 'Unable to complete registration.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F4F6FA] font-sans antialiased selection:bg-blue-600 selection:text-white">
      
      {/* ─────────────────────────────────────────────────────────────
          LEFT COLUMN: Deep Navy Brand Panel (#081226)
         ───────────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-[48%] xl:w-[45%] bg-[#081226] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden shrink-0">
        
        {/* Subtle Decorative Curved Radial Blobs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#162a56]/60 blur-3xl pointer-events-none" />
        <div className="absolute top-1/4 -right-16 w-80 h-80 rounded-full bg-[#0d3b66]/30 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#1e3a8a]/20 blur-3xl pointer-events-none" />

        {/* Top: Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-white flex items-center justify-center text-[#081226] shadow-md shadow-black/20">
              <Clock className="w-6 h-6 text-[#1d4ed8]" strokeWidth={2.3} />
            </div>
            <div>
              <h2 className="text-[17px] font-bold tracking-tight text-white leading-snug">
                APEX HRIS Enterprise
              </h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                HUMAN RESOURCE INFORMATION SYSTEM
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
          RIGHT COLUMN: Clean White Auth Card Container (#F4F6FA)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 overflow-y-auto">
        
        {/* Top Quick Actions (Kiosk Mode & Fast Switch) */}
        <div className="flex justify-end items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => navigate('/kiosk')}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Kiosk Mode</span>
          </button>
        </div>

        {/* Center Card Container */}
        <div className="w-full max-w-[520px] mx-auto my-auto">
          <div className="bg-white rounded-[28px] shadow-[0_12px_40px_-10px_rgba(0,0,0,0.08)] border border-slate-100 p-7 sm:p-9 space-y-5">
            
            {/* Mode Switcher Tabs */}
            <div className="flex bg-slate-100/90 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('SIGN_IN');
                  setErrorMessage('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
                  authMode === 'SIGN_IN'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LogIn className="w-3.5 h-3.5 text-blue-600" />
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
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                <span>Create Employee Account</span>
              </button>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {authMode === 'SIGN_IN' ? (
              <>
                {/* Header */}
                <div>
                  <h2 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight">
                    Welcome back
                  </h2>
                  <p className="mt-1 text-[13px] text-slate-500">
                    Select your workspace role, then sign in securely.
                  </p>
                </div>

                {/* 3 Role Selection Cards */}
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  {roleConfigs.map((role) => {
                    const IconComponent = role.icon;
                    const isSelected = selectedRole === role.id;

                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => handleRoleSelect(role.id)}
                        className={`flex flex-col text-left p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 relative ${
                          isSelected
                            ? 'bg-blue-50/70 border-blue-600 shadow-sm ring-1 ring-blue-600'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        <div
                          className={`h-7 w-7 rounded-lg flex items-center justify-center mb-2.5 transition ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>

                        <span className="text-[12px] sm:text-[13px] font-bold text-slate-900 leading-tight">
                          {role.title}
                        </span>

                        <span className="text-[10px] text-slate-500 leading-tight mt-1 truncate w-full">
                          {role.subtitle}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin} className="space-y-4 pt-1">
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
                      Full Name or Username
                    </label>
                    <div className="relative rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. Maria Santos or maria.santos"
                        className="block w-full pl-10 pr-3.5 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition shadow-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
                      Password
                    </label>
                    <div className="relative rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="block w-full pl-10 pr-10 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[12px] text-slate-600 pt-0.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={trustDevice}
                        onChange={(e) => setTrustDevice(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 transition"
                      />
                      <span>Trust this device for 30 days</span>
                    </label>

                    <a
                      href="#forgot"
                      onClick={(e) => {
                        e.preventDefault();
                        addToast({
                          title: 'Password Reset',
                          message: 'Password reset link sent to your workspace administrator.',
                          type: 'info',
                        });
                      }}
                      className="text-blue-600 hover:text-blue-700 font-semibold transition"
                    >
                      Forgot password?
                    </a>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting || loading}
                      className="w-full flex justify-center items-center gap-2 py-3 sm:py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 active:bg-blue-800 shadow-md shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition duration-150 disabled:opacity-50"
                    >
                      <LogIn className="h-4 w-4" strokeWidth={2.2} />
                      <span>Sign in securely</span>
                    </button>
                  </div>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => setAuthMode('REGISTER')}
                      className="text-xs text-blue-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1 transition"
                    >
                      <span>No account yet? Create employee profile & account</span>
                      <span>→</span>
                    </button>
                  </div>

                  {/* MFA Info Banner */}
                  <div className="mt-4 p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-2.5 text-[11px] text-slate-600">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Multi-factor authentication is configured for Admin and Payroll roles.</span>
                  </div>
                </form>
              </>
            ) : (
              <>
                {/* Employee Account Creation Form */}
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider mb-2 border border-blue-200">
                    <Sparkles className="w-3 h-3" />
                    <span>Self-Service Employee Portal</span>
                  </div>
                  <h2 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight">
                    Create Employee Account
                  </h2>
                  <p className="mt-1 text-[13px] text-slate-500">
                    If your name is not registered in the system yet, an employee profile & QR badge will be created automatically.
                  </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-3.5 pt-1">
                  <div>
                    <label className="block text-[12px] font-semibold text-slate-700 mb-1">
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
                      className="block w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition shadow-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                        Username (Sign-in ID) *
                      </label>
                      <input
                        type="text"
                        required
                        value={regForm.username}
                        onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                        placeholder="e.g. maria.santos"
                        className="block w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 transition shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                        Password *
                      </label>
                      <input
                        type="password"
                        required
                        value={regForm.password}
                        onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                        placeholder="••••••••••••"
                        className="block w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 transition shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={regForm.email}
                        onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                        placeholder="name@apexhris.enterprise"
                        className="block w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                        Branch
                      </label>
                      <select
                        value={regForm.branchId}
                        onChange={(e) => setRegForm({ ...regForm, branchId: e.target.value })}
                        className="block w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition shadow-sm"
                      >
                        {branches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                        Job Position
                      </label>
                      <input
                        type="text"
                        value={regForm.position}
                        onChange={(e) => setRegForm({ ...regForm, position: e.target.value })}
                        placeholder="e.g. Front Desk & Staff"
                        className="block w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold text-slate-700 mb-1">
                        Department
                      </label>
                      <input
                        type="text"
                        value={regForm.department}
                        onChange={(e) => setRegForm({ ...regForm, department: e.target.value })}
                        placeholder="Operations"
                        className="block w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition shadow-sm"
                      />
                    </div>
                  </div>

                  {/* ID Document Upload & Verification Section */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-bold text-slate-900">ID Document Verification *</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                        Required to Confirm
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Upload a valid government or company ID to verify your identity and confirm account activation.
                    </p>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Select ID Type
                      </label>
                      <select
                        value={regForm.idType}
                        onChange={(e) => setRegForm({ ...regForm, idType: e.target.value })}
                        className="block w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="PhilID / National ID">PhilID / National ID (Philippine Identification System)</option>
                        <option value="Driver's License">Driver's License (LTO)</option>
                        <option value="Passport">Passport</option>
                        <option value="SSS / UMID Card">SSS / UMID Card</option>
                        <option value="PRC ID">PRC ID / Professional License</option>
                        <option value="Company / Work ID">Company / Work ID</option>
                        <option value="Voter's ID / Certificate">Voter's ID / Certificate</option>
                      </select>
                    </div>

                    {/* Upload Box or Live Preview */}
                    {idPreview ? (
                      <div className="p-3 bg-white border border-emerald-200 rounded-xl flex items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <img
                            src={idPreview}
                            alt="ID Preview"
                            className="w-14 h-10 object-cover rounded-lg border border-slate-200 shrink-0 bg-slate-100"
                          />
                          <div className="truncate">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {regForm.idDocumentName || 'Uploaded ID Document'}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-semibold mt-0.5">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{regForm.idType} Attached & Confirmed</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleRemoveId}
                          className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white rounded-2xl cursor-pointer transition group">
                          <ShieldCheck className="w-7 h-7 text-slate-400 group-hover:text-blue-600 transition mb-1" />
                          <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600">
                            Click to upload ID photo or scan
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            PNG, JPG, or PDF (Max 5MB)
                          </span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleIdFileUpload}
                            className="hidden"
                          />
                        </label>

                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">Or use instant demo ID:</span>
                          <button
                            type="button"
                            onClick={handleUseSampleId}
                            className="text-[11px] text-blue-600 hover:text-blue-700 font-bold hover:underline"
                          >
                            + Attach Verified Sample ID
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                    {/* Terms & Conditions Agreement Checkbox */}
                    <div className="flex items-start gap-2 pt-1 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        id="termsAgree"
                        checked={acceptedTerms}
                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 transition"
                        required
                      />
                      <label htmlFor="termsAgree" className="text-[11px] leading-tight">
                        I agree to the{' '}
                        <button
                          type="button"
                          onClick={() => setIsTermsOpen(true)}
                          className="font-bold text-blue-600 hover:underline"
                        >
                          Terms of Service & Data Privacy Act (R.A. 10173)
                        </button>
                      </label>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={submitting || !acceptedTerms}
                        className="w-full flex justify-center items-center gap-2 py-3 sm:py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-md shadow-blue-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition duration-150 disabled:opacity-50"
                      >
                        <UserPlus className="h-4 w-4" />
                        <span>Confirm ID & Create Account</span>
                      </button>
                    </div>

                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => setAuthMode('SIGN_IN')}
                        className="text-xs text-slate-600 hover:text-blue-600 font-semibold inline-flex items-center gap-1 transition"
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
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>AES-256 Protected & R.A. 10173 Compliant</span>
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsTermsOpen(true)}
                  className="hover:text-slate-800 font-semibold transition"
                >
                  Privacy Policy
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setIsTermsOpen(true)}
                  className="hover:text-slate-800 font-semibold transition"
                >
                  Terms of Service
                </button>
              </div>
            </div>

            {/* Developer Watermark */}
            <div className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-100/80 border border-slate-200/80 text-[10px] font-mono font-bold text-slate-600">
              <Code className="w-3 h-3 text-blue-600" />
              <span>Devs: LAWRENCE, A & TAZPER</span>
            </div>
          </div>

          {/* Render Terms & Conditions Modal */}
          <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
        </div>
      </div>
    );
  };

export default LoginPage;
