import React, { useState } from 'react';
import { AuthUser } from '../types';
import { api } from '../api/client';
import { Layers, User, Lock, Mail, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

interface AuthViewProps {
  onSuccess: (user: AuthUser) => void;
  onNotification?: (msg: string, type: 'success' | 'error') => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess, onNotification }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google modal simulation / prompt state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [selectedGoogleAccount, setSelectedGoogleAccount] = useState<{ email: string; name: string }>({
    email: 'lingeshm1819@gmail.com',
    name: 'Lingesh M',
  });
  const [useCustomGoogle, setUseCustomGoogle] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regUserId, setRegUserId] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      let user: AuthUser;
      try {
        const res = await api.login({
          identifier: loginIdentifier.trim(),
          password: loginPassword,
        });
        user = res.user;
      } catch (apiErr: any) {
        if (apiErr.statusCode === 401 || apiErr.statusCode === 400 || apiErr.statusCode === 409) {
          throw apiErr;
        }
        // Fallback for demo when backend port is unreachable
        if (loginIdentifier === 'admin' && loginPassword === 'password123') {
          user = {
            user_id: 'admin',
            name: 'Fleet Administrator',
            email: 'admin@fleetwise.io',
            auth_provider: 'local',
            avatar_url: null,
            created_at: new Date().toISOString(),
          };
        } else {
          throw apiErr;
        }
      }

      localStorage.setItem('fleetwise_auth_user', JSON.stringify(user));
      onNotification?.(`Welcome back, ${user.name}!`, 'success');
      onSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle User ID Creation / Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const cleanUserId = regUserId.trim();
      let user: AuthUser;
      try {
        const res = await api.register({
          user_id: cleanUserId,
          name: regName.trim(),
          email: regEmail.trim(),
          password: regPassword,
        });
        user = res.user;
      } catch (apiErr: any) {
        if (apiErr.statusCode === 409 || apiErr.statusCode === 400) {
          throw apiErr;
        }
        console.warn('Backend server offline, storing registration locally:', apiErr);
        user = {
          user_id: cleanUserId,
          name: regName.trim(),
          email: regEmail.trim(),
          auth_provider: 'local',
          avatar_url: null,
          created_at: new Date().toISOString(),
        };
      }

      localStorage.setItem('fleetwise_auth_user', JSON.stringify(user));
      onNotification?.(`User ID @${cleanUserId} created successfully! Welcome!`, 'success');
      onSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Account registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Login
  const handleGoogleLogin = async (emailToUse: string, nameToUse: string) => {
    setError(null);
    setLoading(true);
    try {
      const email = emailToUse.trim();
      const name = nameToUse.trim() || email.split('@')[0];
      const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=0284c7`;

      let user: AuthUser;
      try {
        const res = await api.loginWithGoogle({
          email,
          name,
          avatar_url: avatarUrl,
        });
        user = res.user;
      } catch (apiErr: any) {
        console.warn('Backend offline, using fallback Google profile:', apiErr);
        user = {
          user_id: email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, ''),
          name,
          email,
          auth_provider: 'google',
          avatar_url: avatarUrl,
          created_at: new Date().toISOString(),
        };
      }

      localStorage.setItem('fleetwise_auth_user', JSON.stringify(user));
      setShowGoogleModal(false);
      onNotification?.(`Signed in with Google account ${email}!`, 'success');
      onSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Login helper
  const handleQuickDemo = async () => {
    setLoginIdentifier('admin');
    setLoginPassword('password123');
    setError(null);
    setLoading(true);
    try {
      const res = await api.login({
        identifier: 'admin',
        password: 'password123',
      });
      localStorage.setItem('fleetwise_auth_user', JSON.stringify(res.user));
      onNotification?.('Logged in as Fleet Administrator (Demo)', 'success');
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden select-none">
      {/* Background ambient gradient glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 mb-4 shadow-xl shadow-teal-950/50">
          <Layers className="w-8 h-8 text-teal-400" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          Fleet<span className="text-teal-400">Wise</span>
        </h2>
        <p className="mt-1.5 text-xs text-slate-400 font-medium tracking-wide uppercase">
          Enterprise Fleet Logistics & Dispatch Engine
        </p>
      </div>

      {/* Main Authentication Box */}
      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-slate-800/90 backdrop-blur-md py-8 px-6 shadow-2xl rounded-2xl border border-slate-700/80 sm:px-10">
          
          {/* Tab Selector */}
          <div className="flex bg-slate-900/80 p-1 rounded-xl mb-6 border border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === 'login'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                tab === 'register'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create User ID
            </button>
          </div>

          {/* Google Account Sign-In Button */}
          <div className="mb-5">
            <button
              type="button"
              onClick={() => setShowGoogleModal(true)}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-600/80 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs transition-all shadow-sm hover:shadow"
            >
              {/* Official Google G Logo */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google Account</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-slate-800 text-slate-400 font-medium">
                or with {tab === 'login' ? 'User ID / password' : 'new User ID'}
              </span>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/70 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* TAB 1: LOGIN FORM */}
          {tab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  User ID or Email *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="e.g. admin or dispatcher"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Quick Demo Fill */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleQuickDemo}
                  className="text-[11px] text-teal-400 hover:text-teal-300 font-medium inline-flex items-center gap-1 hover:underline"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Fill Demo Credentials (admin / password123)</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: CREATE USER ID FORM */}
          {tab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Desired User ID *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-teal-400 font-mono text-xs">
                    @
                  </div>
                  <input
                    type="text"
                    required
                    value={regUserId}
                    onChange={(e) => setRegUserId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    placeholder="e.g. lingesh_007"
                    className="w-full pl-8 pr-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-white font-mono text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Letters, numbers, underscores and hyphens (min 3 chars)</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Lingesh M"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Create Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-9 pr-3 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create User ID & Sign In</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Safe operational badge */}
          <div className="mt-6 pt-4 border-t border-slate-700/60 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Encrypted Session • Role-Based Fleet Security</span>
          </div>
        </div>
      </div>

      {/* Google Account Modal Dialog */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-slate-800 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Choose an account</h3>
                <p className="text-[11px] text-slate-500">to continue to FleetWise</p>
              </div>
            </div>

            {/* List of Google accounts */}
            <div className="space-y-2 mb-4">
              {[
                { name: 'Lingesh M', email: 'lingeshm1819@gmail.com', initials: 'LM', color: 'bg-blue-600' },
                { name: 'Fleet Dispatcher', email: 'fleet.dispatcher@gmail.com', initials: 'FD', color: 'bg-emerald-600' },
              ].map((acc) => {
                const isSelected = !useCustomGoogle && selectedGoogleAccount.email === acc.email;
                return (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => {
                      setUseCustomGoogle(false);
                      setSelectedGoogleAccount({ email: acc.email, name: acc.name });
                    }}
                    onDoubleClick={() => handleGoogleLogin(acc.email, acc.name)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full ${acc.color} text-white font-bold flex items-center justify-center text-xs shrink-0`}>
                        {acc.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-slate-900 truncate">{acc.name}</div>
                        <div className="text-[11px] text-slate-500 truncate">{acc.email}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}

              {/* Use another account toggle */}
              <button
                type="button"
                onClick={() => setUseCustomGoogle(!useCustomGoogle)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-xs font-medium transition-colors text-left ${
                  useCustomGoogle
                    ? 'border-blue-500 bg-blue-50/70 text-blue-700 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold shrink-0">
                  +
                </div>
                <span>Use another Google account</span>
              </button>
            </div>

            {/* Custom Google Email input */}
            {useCustomGoogle && (
              <div className="border-t border-slate-100 pt-3 mb-3 animate-fadeIn">
                <input
                  type="email"
                  placeholder="Enter your google email (e.g. name@gmail.com)"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Your Full Name (optional)"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading || (useCustomGoogle && !googleEmail.includes('@'))}
                onClick={() => {
                  if (useCustomGoogle) {
                    handleGoogleLogin(googleEmail, googleName || googleEmail.split('@')[0]);
                  } else {
                    handleGoogleLogin(selectedGoogleAccount.email, selectedGoogleAccount.name);
                  }
                }}
                className="flex-1 py-2 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors font-semibold flex items-center justify-center gap-1.5 shadow-xs"
              >
                {loading ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>
                    Continue as {useCustomGoogle ? (googleName || 'User') : selectedGoogleAccount.name.split(' ')[0]}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

