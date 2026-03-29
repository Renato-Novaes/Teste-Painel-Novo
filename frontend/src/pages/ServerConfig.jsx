import { useState } from 'react';
import { Wifi, Server, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import api, { setServerUrl } from '../services/api';

export default function ServerConfig({ onConnected }) {
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleConnect(e) {
    e.preventDefault();
    if (!url.trim()) return;

    const clean = url.trim().replace(/\/+$/, '');
    setTesting(true);
    setError('');
    setSuccess(false);

    try {
      setServerUrl(clean);
      const res = await api.get('/api/health');
      if (res.data?.success) {
        setSuccess(true);
        setTimeout(() => onConnected(), 800);
      } else {
        throw new Error('Resposta inválida');
      }
    } catch {
      setError('Não foi possível conectar. Verifique o IP e se o servidor está rodando.');
      setServerUrl('');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f1a] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-2xl bg-blue-500/15 mb-4">
            <Server size={32} className="text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">PalletControl</h1>
          <p className="text-sm text-slate-500 mt-2">Conecte ao servidor para começar</p>
        </div>

        <form onSubmit={handleConnect} className="card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Wifi size={14} className="inline mr-1.5" />
              Endereço do servidor
            </label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="http://192.168.1.100:3001"
              className="input-field text-base"
              autoFocus
            />
            <p className="text-xs text-slate-500 mt-2">
              Digite o IP do computador onde o servidor está rodando.
              Ex: http://192.168.1.100:3001
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
              <CheckCircle size={16} />
              Conectado com sucesso!
            </div>
          )}

          <button
            type="submit"
            disabled={testing || !url.trim()}
            className="btn-primary w-full py-3 text-base"
          >
            {testing ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
            ) : (
              <>Conectar <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        <div className="mt-6 card p-4">
          <p className="text-xs font-semibold text-slate-400 mb-2">Como encontrar o IP:</p>
          <ol className="text-xs text-slate-500 space-y-1 list-decimal list-inside">
            <li>No PC com o servidor, abra o Prompt de Comando</li>
            <li>Digite <code className="text-slate-400 bg-slate-800 px-1 rounded">ipconfig</code></li>
            <li>Use o IPv4 da sua rede Wi-Fi + porta 3001</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
