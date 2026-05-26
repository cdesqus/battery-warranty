import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { Mail, Lock, Eye, EyeOff, LogIn, KeyRound, AlertCircle, Users } from 'lucide-react';

const Login: React.FC = () => {
  const { login, isBackendAvailable } = useData();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo account filler
  const handleQuickSelect = (selEmail: string, selPass: string) => {
    setEmail(selEmail);
    setPassword(selPass);
    setError(null);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 font-sans overflow-hidden py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Ambient Decorative Lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-900/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md space-y-8 z-10">
        {/* Logo and Header */}
        <div className="text-center animate-in fade-in slide-in-from-top duration-700">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 mb-4 shadow-[0_0_20px_rgba(79,70,229,0.15)]">
            <KeyRound className="w-8 h-8 text-indigo-400 animate-pulse" />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white uppercase sm:text-4xl">
            PRESALES <span className="text-indigo-400">PRO</span>
          </h2>
          <p className="mt-2 text-sm text-slate-400 font-medium">
            Warranty & Operational Monitor Console
          </p>
        </div>

        {/* Login Glassmorphic Box */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.4)] transition-all hover:border-slate-700/80 duration-500 animate-in fade-in zoom-in-95 duration-500">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-rose-950/40 border border-rose-900/50 text-rose-200 rounded-2xl p-4 flex items-start gap-3 text-sm animate-in shake duration-300">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 h-5 text-slate-500" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="block w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-sm"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 h-5 text-slate-500" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="block w-full pl-11 pr-12 py-3 bg-slate-950/50 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 h-5" /> : <Eye className="h-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 border border-transparent rounded-2xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 active:scale-[0.98] transition-all cursor-pointer shadow-[0_4px_20px_rgba(79,70,229,0.3)] disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Sign In to Console</span>
                  <LogIn className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Connection Status Badge */}
          <div className="mt-6 pt-5 border-t border-slate-800 flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>Database Mode</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isBackendAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span className={isBackendAvailable ? 'text-emerald-400' : 'text-amber-400'}>
                {isBackendAvailable ? 'PostgreSQL Live' : 'Offline Sandbox'}
              </span>
            </div>
          </div>
        </div>

        {/* Subtle developer cheat sheet toggle */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => setShowDemo(!showDemo)}
            className="text-[10px] font-bold text-slate-700 hover:text-indigo-400/80 transition-colors uppercase tracking-widest cursor-pointer"
          >
            {showDemo ? 'Hide Sandbox Access' : 'Show Sandbox Access'}
          </button>
        </div>

        {/* Quick Demo Credentials Panel */}
        {showDemo && (
          <div className="bg-slate-900/30 border border-slate-800/40 rounded-3xl p-6 shadow-md animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-2 mb-4 text-slate-400">
              <Users className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider">Demo User Credentials</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Super Admin */}
              <button
                onClick={() => handleQuickSelect('rahma@presales.com', 'rahma123')}
                className="group text-left p-3 rounded-xl bg-slate-950/40 border border-slate-800/50 hover:border-indigo-500/40 transition-all flex flex-col gap-1 cursor-pointer"
              >
                <div className="flex justify-between items-center w-full">
                  <span className="text-xs font-black text-slate-200 group-hover:text-indigo-400 transition-colors">Nur Rahma Atika</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-900">SA</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Password: rahma123</span>
                <span className="text-[9px] text-indigo-400/80 font-semibold mt-1">Role: Super Admin</span>
              </button>

              {/* Admin */}
              <button
                onClick={() => handleQuickSelect('alex@admin.com', 'alex123')}
                className="group text-left p-3 rounded-xl bg-slate-950/40 border border-slate-800/50 hover:border-emerald-500/40 transition-all flex flex-col gap-1 cursor-pointer"
              >
                <div className="flex justify-between items-center w-full">
                  <span className="text-xs font-black text-slate-200 group-hover:text-emerald-400 transition-colors">Alex Rivera</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-900">AD</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Password: alex123</span>
                <span className="text-[9px] text-emerald-400/80 font-semibold mt-1">Role: Admin</span>
              </button>

              {/* Viewer */}
              <button
                onClick={() => handleQuickSelect('sarah@viewer.com', 'sarah123')}
                className="group text-left p-3 rounded-xl bg-slate-950/40 border border-slate-800/50 hover:border-slate-500/40 transition-all flex flex-col gap-1 cursor-pointer"
              >
                <div className="flex justify-between items-center w-full">
                  <span className="text-xs font-black text-slate-200 group-hover:text-slate-300 transition-colors">Siti Sarah</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">VW</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Password: sarah123</span>
                <span className="text-[9px] text-slate-400/80 font-semibold mt-1">Role: Viewer</span>
              </button>

              {/* Inactive */}
              <button
                onClick={() => handleQuickSelect('rudi.h@admin.com', 'rudi123')}
                className="group text-left p-3 rounded-xl bg-slate-950/40 border border-slate-800/50 hover:border-rose-500/40 transition-all flex flex-col gap-1 cursor-pointer"
              >
                <div className="flex justify-between items-center w-full">
                  <span className="text-xs font-black text-slate-400 group-hover:text-rose-400 transition-colors">Rudi Hartono</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-900/30">BL</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Password: rudi123</span>
                <span className="text-[9px] text-rose-400/80 font-semibold mt-1">Role: Inactive Blocked</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
