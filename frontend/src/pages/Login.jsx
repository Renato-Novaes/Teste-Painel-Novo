import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Package2, Eye, EyeOff, LogIn } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/8 rounded-full blur-3xl animate-glow" style={{ animationDelay: '1.5s' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Card */}
        <div className="bg-slate-800/70 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/30 overflow-hidden border border-slate-700/50">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-8 text-center relative">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
            <div className="relative">
              <div className="w-16 h-16 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/10">
                <Package2 size={32} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">PalletControl</h1>
              <p className="text-blue-200 text-sm mt-1">Sistema de Gestão de Pallets</p>
            </div>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <p className="text-slate-400 text-sm text-center mb-6">Entre com suas credenciais para acessar o sistema</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Usuário</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="input-field"
                  placeholder="Digite seu usuário"
                  required
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Senha</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-field pr-10"
                    placeholder="Digite sua senha"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <LogIn size={16} />
                )}
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/15">
              <p className="text-xs font-semibold text-blue-400 mb-2 uppercase tracking-wide">Credenciais de Acesso</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-blue-300">
                <div>
                  <p className="font-medium">Administrador</p>
                  <p className="text-blue-400/70">admin / admin123</p>
                </div>
                <div>
                  <p className="font-medium">Usuário</p>
                  <p className="text-blue-400/70">usuario / user123</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          PalletControl v1.0 — Sistema de Controle Logístico
        </p>
      </div>
    </div>
  );
}
