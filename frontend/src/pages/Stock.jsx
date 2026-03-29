import { useEffect, useState } from 'react';
import { Package, ArrowUpCircle, ArrowDownCircle, TrendingUp, RefreshCw, Plus, Save, X, AlertCircle, CheckCircle2, AlertTriangle, Settings, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const darkTooltipStyle = {
  fontSize: 12, borderRadius: 12,
  border: '1px solid rgba(51,65,85,0.6)',
  backgroundColor: 'rgba(15,23,42,0.95)',
  color: '#e2e8f0',
  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
};

function fmtNum(v) { return new Intl.NumberFormat('pt-BR').format(v || 0); }
function fmt(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0); }
function fmtDate(dateStr) { try { return format(parseISO(dateStr), 'dd/MM'); } catch { return dateStr; } }

const PALLET_LABELS = { CHEP: 'CHEP', fumegado: 'FUMEGADO', PBR: 'PBR' };

const PALLET_CONFIG = {
  CHEP:     { label: 'CHEP',     hex: '#3b82f6', border: 'border-blue-500/20',   bg: 'bg-blue-500/10',   text: 'text-blue-400',   icon: 'bg-blue-600' },
  fumegado: { label: 'FUMEGADO', hex: '#f59e0b', border: 'border-amber-500/20',  bg: 'bg-amber-500/10',  text: 'text-amber-400',  icon: 'bg-amber-600' },
  PBR:      { label: 'PBR',      hex: '#8b5cf6', border: 'border-purple-500/20', bg: 'bg-purple-500/10', text: 'text-purple-400', icon: 'bg-purple-600' },
};

const PALLET_KEYS = ['CHEP', 'fumegado', 'PBR'];

const LEVEL_CONFIG = {
  ok:       { label: 'Normal',  icon: CheckCircle2,  text: 'text-emerald-400', barColor: 'bg-emerald-500' },
  warning:  { label: 'Atenção', icon: AlertTriangle,  text: 'text-amber-400',   barColor: 'bg-amber-500' },
  critical: { label: 'Crítico', icon: AlertCircle,     text: 'text-red-400',     barColor: 'bg-red-500' },
};

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-fadeIn ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
      {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      {msg}
    </div>
  );
}

function StockCard({ palletType, quantity, stats, avgCost }) {
  const c = PALLET_CONFIG[palletType];
  const level = stats?.level || 'ok';
  const lc = LEVEL_CONFIG[level];
  const LevelIcon = lc.icon;
  const totalMoves = (stats?.entries || 0) + (stats?.exits || 0);
  const entryPct = totalMoves > 0 ? Math.round(((stats?.entries || 0) / totalMoves) * 100) : 0;
  const maxRef = stats?.warning_stock || 100;
  const barPct = Math.min(100, (quantity / Math.max(maxRef * 2, 1)) * 100);

  return (
    <div className={`card p-5 border-2 ${level === 'critical' ? 'border-red-500/40 shadow-red-900/20 shadow-lg' : level === 'warning' ? 'border-amber-500/30' : c.border}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Pallet {c.label}</p>
          <p className={`text-3xl font-black ${level === 'critical' ? 'text-red-400' : level === 'warning' ? 'text-amber-400' : c.text}`}>{fmtNum(quantity)}</p>
        </div>
        <div className={`${level === 'critical' ? 'bg-red-600' : level === 'warning' ? 'bg-amber-600' : c.icon} p-3 rounded-2xl`}>
          <Package size={24} className="text-white" />
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <div className="flex items-center gap-1">
            <LevelIcon size={12} className={lc.text} />
            <span className={lc.text + ' font-semibold'}>{lc.label}</span>
          </div>
          <span className="text-slate-500">mín: {fmtNum(stats?.min_stock || 50)}</span>
        </div>
        <div className="h-2.5 bg-slate-700/50 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${lc.barColor}`} style={{ width: `${barPct}%` }} />
        </div>
      </div>

      {avgCost?.weighted_avg > 0 && (
        <div className="mb-3 p-2 bg-slate-900/40 rounded-lg border border-slate-700/20">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Custo Médio</p>
          <p className="text-sm font-bold text-slate-200">{fmt(avgCost.weighted_avg)} <span className="text-xs text-slate-500">/ pallet</span></p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/10">
          <ArrowUpCircle size={14} className="text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-slate-500">Entradas</p>
            <p className="text-sm font-bold text-emerald-400">{fmtNum(stats?.entries || 0)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg border border-red-500/10">
          <ArrowDownCircle size={14} className="text-red-400 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-slate-500">Saídas</p>
            <p className="text-sm font-bold text-red-400">{fmtNum(stats?.exits || 0)}</p>
          </div>
        </div>
      </div>

      {totalMoves > 0 && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${entryPct}%` }} />
          </div>
          <span className="text-[10px] text-slate-500">{entryPct}% entradas</span>
        </div>
      )}
    </div>
  );
}

function AlertBanner({ alerts }) {
  if (!alerts || alerts.length === 0) return null;
  return (
    <div className="space-y-2 animate-fadeIn">
      {alerts.map((alert, i) => {
        const isCritical = alert.level === 'critical';
        return (
          <div key={i} className={`flex items-center gap-3 p-3.5 rounded-xl border ${isCritical ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
            <div className={`p-2 rounded-lg ${isCritical ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
              {isCritical ? <AlertCircle size={18} className="text-red-400" /> : <AlertTriangle size={18} className="text-amber-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${isCritical ? 'text-red-400' : 'text-amber-400'}`}>
                {isCritical ? '⚠️ Estoque Crítico' : '⚡ Estoque Baixo'} — {PALLET_LABELS[alert.pallet_type] || alert.pallet_type}
              </p>
              <p className="text-xs text-slate-400 truncate">{alert.message}</p>
            </div>
            <span className={`text-2xl font-black flex-shrink-0 ${isCritical ? 'text-red-400' : 'text-amber-400'}`}>{fmtNum(alert.quantity)}</span>
          </div>
        );
      })}
    </div>
  );
}

function SettingsModal({ settings, onClose, onSaved }) {
  const [form, setForm] = useState(
    PALLET_KEYS.reduce((acc, k) => {
      const s = settings?.find(s => s.pallet_type === k) || { min_stock: 50, warning_stock: 100 };
      acc[k] = { min_stock: s.min_stock, warning_stock: s.warning_stock };
      return acc;
    }, {})
  );
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      await api.put('/api/stock/settings', { settings: PALLET_KEYS.map(k => ({ pallet_type: k, ...form[k] })) });
      onSaved('Configurações atualizadas!');
    } catch { onSaved('Erro ao salvar', 'error'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md animate-fadeIn border border-slate-700/60">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/40">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2"><Settings size={16} /> Configurar Alertas</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {PALLET_KEYS.map(k => {
            const c = PALLET_CONFIG[k];
            return (
              <div key={k} className={`p-3 rounded-xl border ${c.border} ${c.bg}`}>
                <p className={`text-sm font-semibold ${c.text} mb-2`}>{c.label}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase mb-1">Mínimo (vermelho)</label>
                    <input type="number" min="0" value={form[k].min_stock}
                      onChange={e => setForm(f => ({ ...f, [k]: { ...f[k], min_stock: parseInt(e.target.value) || 0 } }))}
                      className="input-field text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase mb-1">Alerta (amarelo)</label>
                    <input type="number" min="0" value={form[k].warning_stock}
                      onChange={e => setForm(f => ({ ...f, [k]: { ...f[k], warning_stock: parseInt(e.target.value) || 0 } }))}
                      className="input-field text-sm" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
          <button onClick={handleSave} disabled={loading} className="btn-primary flex-1 justify-center">
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={15} />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function QuickUpdateForm({ currentStock, onSaved }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    movement_type: 'entry', pallet_type: 'CHEP', quantity: '',
    counterpart: '', movement_date: today,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [counterparts, setCounterparts] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    api.get('/api/movements/counterparts/list').then(r => setCounterparts(r.data.data || [])).catch(() => {});
  }, []);

  function handleChange(field, value) { setForm(f => ({ ...f, [field]: value })); }

  const filteredCounterparts = counterparts.filter(c =>
    c.toLowerCase().includes((form.counterpart || '').toLowerCase()) && c !== form.counterpart
  ).slice(0, 5);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.quantity || parseInt(form.quantity) <= 0) { setError('Quantidade deve ser maior que zero'); return; }
    if (!form.counterpart) { setError('Preencha o parceiro'); return; }
    setLoading(true);
    try {
      await api.post('/api/movements', {
        ...form, quantity: parseInt(form.quantity),
        unit_price: 0, freight_value: 0, notes: null,
      });
      setForm(f => ({ ...f, quantity: '', counterpart: '' }));
      onSaved(form.movement_type === 'entry' ? 'Entrada registrada!' : 'Saída registrada!');
    } catch (err) { setError(err.response?.data?.error || 'Erro ao registrar'); }
    finally { setLoading(false); }
  }

  const availableStock = currentStock?.[form.pallet_type] || 0;

  return (
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3.5 flex items-center gap-2">
        <Plus size={16} className="text-white" />
        <h3 className="text-sm font-bold text-white">Atualização Diária</h3>
      </div>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tipo</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => handleChange('movement_type', 'entry')}
              className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${form.movement_type === 'entry' ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-900/30' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
              ↑ Entrada
            </button>
            <button type="button" onClick={() => handleChange('movement_type', 'exit')}
              className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${form.movement_type === 'exit' ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/30' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
              ↓ Saída
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Pallet</label>
          <div className="grid grid-cols-3 gap-2">
            {PALLET_KEYS.map(t => {
              const cfg = PALLET_CONFIG[t];
              return (
                <button key={t} type="button" onClick={() => handleChange('pallet_type', t)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${form.pallet_type === t ? `${cfg.icon} border-transparent text-white shadow-lg` : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                  {cfg.label}
                </button>
              );
            })}
          </div>
          {form.movement_type === 'exit' && (
            <p className="text-xs text-slate-500 mt-1.5">
              Disponível: <span className={`font-bold ${availableStock <= 0 ? 'text-red-400' : 'text-emerald-400'}`}>{fmtNum(availableStock)}</span> {PALLET_LABELS[form.pallet_type]}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Data</label>
            <input type="date" value={form.movement_date} onChange={e => handleChange('movement_date', e.target.value)} className="input-field" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Quantidade</label>
            <input type="number" min="1" value={form.quantity} onChange={e => handleChange('quantity', e.target.value)} className="input-field" placeholder="Ex: 50" required />
          </div>
        </div>

        <div className="relative">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            {form.movement_type === 'entry' ? 'Fornecedor' : 'Cliente'}
          </label>
          <input type="text" value={form.counterpart}
            onChange={e => { handleChange('counterpart', e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="input-field"
            placeholder={form.movement_type === 'entry' ? 'Nome do fornecedor' : 'Nome do cliente'} required />
          {showSuggestions && filteredCounterparts.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-lg overflow-hidden">
              {filteredCounterparts.map(c => (
                <button key={c} type="button"
                  onMouseDown={() => { handleChange('counterpart', c); setShowSuggestions(false); }}
                  className="block w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors">{c}</button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
          {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={16} />}
          {loading ? 'Salvando...' : 'Registrar Movimentação'}
        </button>
      </form>
    </div>
  );
}

export default function Stock() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const canOperate = user?.role === 'admin' || user?.role === 'operator';
  const [stockData, setStockData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartDays, setChartDays] = useState(30);
  const [toast, setToast] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  async function fetchData() {
    try {
      const [stockRes, chartRes] = await Promise.all([
        api.get('/api/stock'), api.get(`/api/stock/chart?days=${chartDays}`)
      ]);
      setStockData(stockRes.data.data);
      setChartData(chartRes.data.data);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }

  useEffect(() => { fetchData(); }, [chartDays]);
  async function handleRefresh() { setRefreshing(true); await fetchData(); }
  function handleSaved(msg, type = 'success') { setToast({ msg, type }); fetchData(); if (showSettings) setShowSettings(false); }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { stock, stats, total, alerts, avgCost } = stockData || { stock: {}, stats: {}, total: 0, alerts: [], avgCost: {} };
  const hasData = total > 0 || (chartData && chartData.some(d => d.total > 0));

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {showSettings && <SettingsModal settings={Object.entries(stats).map(([k, v]) => ({ pallet_type: k, min_stock: v.min_stock, warning_stock: v.warning_stock }))}
        onClose={() => setShowSettings(false)} onSaved={handleSaved} />}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Controle de Estoque</h2>
          <p className="text-sm text-slate-500">Posição atual, alertas e histórico</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button onClick={() => setShowSettings(true)} className="btn-secondary" title="Configurar alertas">
              <Settings size={15} />
              <span className="hidden sm:inline">Alertas</span>
            </button>
          )}
          <button onClick={handleRefresh} disabled={refreshing} className="btn-secondary">
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      <AlertBanner alerts={alerts} />

      {/* Total summary */}
      <div className="card p-5 bg-gradient-to-r from-slate-800 to-slate-900 text-white border-slate-700/40">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-slate-400 text-sm font-medium">Total em Estoque</p>
            <p className="text-5xl font-black mt-1">{fmtNum(total)}</p>
            <p className="text-slate-500 text-sm mt-1">pallets disponíveis</p>
          </div>
          <div className="flex gap-3">
            {PALLET_KEYS.map(type => {
              const c = PALLET_CONFIG[type];
              const level = stats[type]?.level || 'ok';
              return (
                <div key={type} className="text-center">
                  <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: level === 'critical' ? '#ef4444' : level === 'warning' ? '#f59e0b' : c.hex }} />
                  <p className="text-xs text-slate-400">{c.label}</p>
                  <p className={`text-sm font-bold ${level === 'critical' ? 'text-red-400' : level === 'warning' ? 'text-amber-400' : 'text-white'}`}>{fmtNum(stock[type] || 0)}</p>
                </div>
              );
            })}
          </div>
        </div>
        {total > 0 && (
          <div className="mt-4">
            <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
              {PALLET_KEYS.map(type => {
                const c = PALLET_CONFIG[type];
                return (
                  <div key={type} className="h-full rounded-sm transition-all"
                    style={{ width: `${((stock[type] || 0) / total) * 100}%`, backgroundColor: c.hex }}
                    title={`${c.label}: ${Math.round(((stock[type] || 0) / total) * 100)}%`} />
                );
              })}
            </div>
            <div className="flex gap-4 mt-2">
              {PALLET_KEYS.map(type => {
                const c = PALLET_CONFIG[type];
                return (
                  <div key={type} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.hex }} />
                    <span className="text-xs text-slate-400">{c.label}: {total > 0 ? Math.round(((stock[type] || 0) / total) * 100) : 0}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Cards + Quick Update */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PALLET_KEYS.map(type => (
            <StockCard key={type} palletType={type} quantity={stock[type] || 0} stats={stats[type]} avgCost={avgCost?.[type]} />
          ))}
        </div>
        {canOperate && (
          <div>
            <QuickUpdateForm currentStock={stock} onSaved={(msg) => handleSaved(msg)} />
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-400" />
              Evolução do Estoque
            </h3>
            <div className="flex gap-1.5">
              {[7, 30, 60].map(d => (
                <button key={d} onClick={() => setChartDays(d)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${chartDays === d ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-700'}`}>
                  {d}d
                </button>
              ))}
            </div>
          </div>
          {hasData ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} width={45} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v, name) => [fmtNum(v), name === 'total' ? 'Total' : PALLET_LABELS[name] || name]} labelFormatter={l => `Data: ${fmtDate(l)}`} contentStyle={darkTooltipStyle} />
                <Legend formatter={name => name === 'total' ? 'Total' : PALLET_LABELS[name] || name} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="CHEP" stroke={PALLET_CONFIG.CHEP.hex} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="fumegado" stroke={PALLET_CONFIG.fumegado.hex} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="PBR" stroke={PALLET_CONFIG.PBR.hex} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="total" stroke="#64748b" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 size={32} className="text-slate-600 mb-3" />
              <p className="text-sm text-slate-400 font-medium">Nenhum dado ainda</p>
              <p className="text-xs text-slate-500 mt-1">Registre movimentações para ver o gráfico</p>
            </div>
          )}
        </div>

        {/* Pallet usage + avg cost */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <BarChart3 size={16} className="text-emerald-400" />
              Tipo de Pallet Mais Usado
            </h3>
          </div>
          {total > 0 ? (
            <div className="space-y-4">
              {PALLET_KEYS.map(type => {
                const c = PALLET_CONFIG[type];
                const qty = stock[type] || 0;
                const pct = total > 0 ? Math.round((qty / total) * 100) : 0;
                const entries = stats[type]?.entries || 0;
                const exits = stats[type]?.exits || 0;
                return (
                  <div key={type} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.hex }} />
                        <span className="text-sm font-semibold text-slate-300">{c.label}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-200">{pct}%</span>
                    </div>
                    <div className="h-4 bg-slate-700/50 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: c.hex }} />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>{fmtNum(qty)} em estoque</span>
                      <span>{fmtNum(entries)} entradas / {fmtNum(exits)} saídas</span>
                    </div>
                  </div>
                );
              })}

              {Object.keys(avgCost || {}).length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700/30">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Custo Médio por Pallet</p>
                  <div className="grid grid-cols-3 gap-2">
                    {PALLET_KEYS.map(type => {
                      const c = PALLET_CONFIG[type];
                      const avg = avgCost[type]?.weighted_avg || 0;
                      return (
                        <div key={type} className={`p-2.5 rounded-lg border ${c.border} ${c.bg} text-center`}>
                          <p className={`text-xs ${c.text} font-semibold`}>{c.label}</p>
                          <p className="text-sm font-bold text-slate-200 mt-0.5">{avg > 0 ? fmt(avg) : '—'}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package size={32} className="text-slate-600 mb-3" />
              <p className="text-sm text-slate-400 font-medium">Sem dados de estoque</p>
              <p className="text-xs text-slate-500 mt-1">Adicione sua primeira movimentação</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
