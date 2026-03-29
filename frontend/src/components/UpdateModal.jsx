    import { useState } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';
import { downloadAndInstall } from '../services/updateService';

export default function UpdateModal({ updateInfo, onDismiss }) {
  const [status, setStatus] = useState('idle'); // idle | downloading | installing | error
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  if (!updateInfo) return null;

  const handleUpdate = async () => {
    try {
      setStatus('downloading');
      setProgress(0);
      await downloadAndInstall(updateInfo, (pct) => setProgress(pct));
      setStatus('installing');
    } catch (e) {
      setError(e.message || 'Erro ao baixar atualização');
      setStatus('error');
    }
  };

  const sizeMB = updateInfo.size ? (updateInfo.size / 1024 / 1024).toFixed(1) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-700/60 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <div className="flex items-center gap-2 text-blue-400">
            <RefreshCw size={20} />
            <span className="font-semibold text-base">Nova Versão Disponível</span>
          </div>
          {status === 'idle' && (
            <button onClick={onDismiss} className="text-slate-500 hover:text-slate-300 transition">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-5 pb-5 space-y-4">
          {/* Version info */}
          <div className="flex items-center gap-3 bg-slate-900/60 rounded-xl p-3">
            <div className="text-center">
              <p className="text-xs text-slate-500">Atual</p>
              <p className="text-sm font-mono text-slate-300">{updateInfo.currentVersion}</p>
            </div>
            <div className="text-slate-600">→</div>
            <div className="text-center">
              <p className="text-xs text-slate-500">Nova</p>
              <p className="text-sm font-mono text-emerald-400 font-bold">{updateInfo.version}</p>
            </div>
            {sizeMB && (
              <div className="ml-auto text-xs text-slate-500">{sizeMB} MB</div>
            )}
          </div>

          {/* Status content */}
          {status === 'idle' && (
            <div className="flex gap-3">
              <button
                onClick={onDismiss}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 bg-slate-700/50 hover:bg-slate-700 transition"
              >
                Depois
              </button>
              <button
                onClick={handleUpdate}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 transition flex items-center justify-center gap-2"
              >
                <Download size={16} />
                Atualizar
              </button>
            </div>
          )}

          {status === 'downloading' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Baixando...</span>
                <span className="text-blue-400 font-mono">{progress}%</span>
              </div>
              <div className="h-2 bg-slate-900/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {status === 'installing' && (
            <div className="flex items-center justify-center gap-2 py-2 text-emerald-400">
              <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Instalando atualização...</span>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <p className="text-sm text-red-400 text-center">{error}</p>
              <div className="flex gap-3">
                <button
                  onClick={onDismiss}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 bg-slate-700/50 hover:bg-slate-700 transition"
                >
                  Fechar
                </button>
                <button
                  onClick={handleUpdate}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 transition"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
