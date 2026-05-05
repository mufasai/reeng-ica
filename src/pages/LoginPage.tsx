import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, LogIn, Signal } from 'lucide-react';

const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const result = login(email, password);
    setLoading(false);
    if (!result.success) setError(result.error || 'Login gagal.');
  };

  return (
    <div style={{ background: 'linear-gradient(135deg, #0d1117 0%, #0f2044 50%, #0d1117 100%)' }}
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">

      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #1d4ed8 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)' }} />
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative w-full max-w-[420px]">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 shadow-2xl"
            style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)', boxShadow: '0 0 40px rgba(37,99,235,0.5)' }}>
            <Signal className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-[32px] font-black text-white tracking-tight leading-none">Smartelco</h1>
          <p className="text-[13px] font-semibold mt-2" style={{ color: '#58a6ff' }}>
            Re-Engineering Budget Tracking
          </p>
          <p className="text-[11px] mt-1" style={{ color: '#8b949e' }}>
            SST Team · R03 Jakarta &amp; Banten
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{
          background: 'rgba(22, 27, 34, 0.95)',
          border: '1px solid rgba(48, 54, 61, 0.9)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)'
        }}>
          <h2 className="text-[15px] font-bold mb-6" style={{ color: '#e6edf3' }}>
            Masuk ke akun Anda
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: '#8b949e' }}>
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nama@smartelco.com"
                required
                autoComplete="email"
                style={{
                  background: 'rgba(13, 17, 23, 0.8)',
                  border: '1px solid rgba(48, 54, 61, 0.9)',
                  color: '#e6edf3',
                  caretColor: '#58a6ff',
                }}
                className="w-full rounded-xl px-4 py-3 text-sm font-medium outline-none transition-all placeholder-[#484f58] focus:border-[#388bfd] focus:ring-2 focus:ring-[#388bfd]/20"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.1em] mb-2" style={{ color: '#8b949e' }}>
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{
                    background: 'rgba(13, 17, 23, 0.8)',
                    border: '1px solid rgba(48, 54, 61, 0.9)',
                    color: '#e6edf3',
                    caretColor: '#58a6ff',
                  }}
                  className="w-full rounded-xl px-4 py-3 pr-12 text-sm font-medium outline-none transition-all placeholder-[#484f58] focus:border-[#388bfd] focus:ring-2 focus:ring-[#388bfd]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ color: '#8b949e' }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl px-4 py-3 text-sm font-semibold" style={{
                background: 'rgba(248,81,73,0.12)',
                border: '1px solid rgba(248,81,73,0.35)',
                color: '#ff7b72',
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full font-bold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: loading ? '#1d4ed8' : 'linear-gradient(135deg, #2563eb, #4f46e5)',
                color: '#ffffff',
                boxShadow: '0 4px 20px rgba(37,99,235,0.4)',
              }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#ffffff' }} />
                  <span style={{ color: '#ffffff' }}>Masuk...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" style={{ color: '#ffffff' }} />
                  <span style={{ color: '#ffffff' }}>Masuk</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] font-mono mt-6" style={{ color: '#484f58' }}>
          © 2026 PT. SMARTELCO SOLUSI TEKNOLOGI · YERICO PROJECT BUDGET
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
