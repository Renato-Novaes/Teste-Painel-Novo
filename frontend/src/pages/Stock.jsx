import { useEffect, useState } from 'react';
import { Package, ArrowUpCircle, ArrowDownCircle, TrendingUp, RefreshCw, Plus, Save, X, AlertCircle, CheckCircle2 } from 'lucide-react';
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
  CHEP:     { label: 'CHEP',     color: 'blue',   hex: '#3b82f6', border: 'border-blue-500/20',   bg: 'bg-blue-500/10',   text: 'text-blue-400',   icon: 'bg-blue-600' },
  fumegado: { label: 'FUMEGADO', color: 'amber',  hex: '#f59e0b', border: 'border-amber-500/20',  bg: 'bg-amber-500/10',  text: 'text-amber-400',  icon: 'bg-amber-600' },
  PBR:      { label: 'PBR',      color: 'purple', hex: '#8b5cf6', border: 'border-purple-500/20', bg: 'bg-purple-500/10', text: 'text-purple-400', icon: 'bg-purple-600' },
};

const PALLET_KEYS = ['CHEP', 'fumegado', 'PBR'];

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-fadeIn ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
      {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      {msg}
    </div>
  );
}

function StockCard({ palletType, quantity, stats }) {
  const c = PALLET_CONFIG[palletType];
  const totalMoves = (stats?.entries || 0) + (stats?.exits || 0);
  const entryPct = totalMoves > 0 ? Math.round(((stats?.entries || 0) / totalMoves) * 100) : 0;

  return (
    <div className={`card p-6 border-2 ${c.border}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Pallet {c.label}</p>
          <p className={`text-4xl font-black ${c.text}`}>{fmtNum(quantity)}</p>
          <p className="text-sm text-slate-500 mt-1">unidades em estoque</p>
        </div>
        <div className={`${c.icon} p-4 rounded-2xl`}>
          <Package size={28} className="text-white" />
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Nível de estoque</span>
          <span>{quantity > 0 ? 'Disponível' : 'Zerado'}</span>
        </div>
        <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${c.icon}`}
            style={{ width: `${Math.min(100, (quantity / Math.max(quantity, 500)) * 100)}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/10">
          <ArrowUpCircle size={16} className="text-emerald-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-slate-500">Entradas</p>
            <p className="text-sm font-bold text-emerald-400">{fmtNum(stats?.entries || 0)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2.5 bg-red-500/10 rounded-lg border border-red-500/10">
          <ArrowDownCircle size={16} className="text-red-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-slate-500">Saídas</p>
            <p className="text-sm font-bold text-red-400">{fmtNum(stats?.exits || 0)}</p>
          </div>
        </div>
      </div>

      {totalMoves > 0 && (
        <div className="mt-3 flex items-center gap-1.5">
          <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${entryPct}%` }} />
          </div>
          <span className="text-xs text-slate-500">{entryPct}% entradas</span>
        </div>
      )}
    </div>
  );
}

function QuickUpdateForm({ currentStock, onSaved }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    movement_type: 'entry', pallet_type: 'CHEP', quantity: '',
    unit_price: '', freight_value: '', counterpart: '', movement_date: today,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleChange(field, value) { setForm(f => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.quantity || !form.counterpart) { setError('Preencha quantidade e parceiro'); return; }
    setLoading(true);
    try {
      await api.post('/api/movements', {
        ...form, quantity: parseInt(form.quantity),
        unit_price: parseFloat(form.unit_price) || 0,
        freight_value: parseFloat(form.freight_value) || 0, notes: null,
      });
      setForm(f => ({ ...f, quantity: '', unit_price: '', freight_value: '', counterpart: '' }));
      onSaved(form.movement_type === 'entry' ? 'Entrada registrada!' : 'Saída registrada!');
    } catch (err) { setError(err.response?.data?.error || 'Erro ao registrar'); }
    finally { setLoading(false); }
  }

  const availableStock = currentStock?.[form.pallet_type] || 0;

  return (
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-3.5 flex items-center gap-2">
        <Plus size={16} className="text-white" />
        <h3 className="text-sm font-bold text-white">Atualização Diária de Estoque</h3>
      </div>
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tipo</label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => handleChange('movement_type', 'entry')}
              className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${form.movement_type === 'entry' ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-900/30' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
              ↑ Entrada
            </button>
            <button type="button" onClick={() => handleChange('movement_type', 'exit')}
              className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${form.movement_type === 'exit' ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/30' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
              ↓ Saída
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tipo de Pallet</label>
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              {form.movement_type === 'entry' ? 'Custo Unit. (R$)' : 'Preço Venda (R$)'}
            </label>
            <input type="number" step="0.01" min="0" value={form.unit_price} onChange={e => handleChange('unit_price', e.target.value)} className="input-field" placeholder="0,00" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Frete (R$)</label>
            <input type="number" step="0.01" min="0" value={form.freight_value} onChange={e => handleChange('freight_value', e.target.value)} className="input-field" placeholder="0,00" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            {form.movement_type === 'entry' ? 'Fornecedor' : 'Cliente'}
          </label>
          <input type="text" value={form.counterpart} onChange={e => handleChange('counterpart', e.target.value)} className="input-field"
            placeholder={form.movement_type === 'entry' ? 'Nome do fornecedor' : 'Nome do cliente'} required />
        </div>

        {(parseFloat(form.quantity) > 0 && parseFloat(form.unit_price) > 0) && (
          <div className="bg-slate-900/50 rounded-xl p-3 text-sm border border-slate-700/30">
            <div className="flex justify-between">
              <span className="text-slate-400">Total:</span>
              <span className={`font-bold ${form.movement_type === 'entry' ? 'text-red-400' : 'text-emerald-400'}`}>
                {fmt((parseFloat(form.quantity) || 0) * (parseFloat(form.unit_price) || 0))}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
          {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={15} />}
          {loading ? 'Salvando...' : 'Registrar Movimentação'}
        </button>
      </form>
    </div>
  );
}

export default function Stock() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [stockData, setStockData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartDays, setChartDays] = useState(30);
  const [toast, setToast] = useState(null);

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
  function handleSaved(msg) { setToast({ msg, type: 'success' }); fetchData(); }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { stock, stats, total } = stockData || { stock: {}, stats: {}, total: 0 };

  return (
    <div className="space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Controle de Estoque</h2>
          <p className="text-sm text-slate-500">Posição atual e histórico dos pallets</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="btn-secondary">
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Total summary */}
      <div className="card p-5 bg-gradient-to-r from-slate-800 to-slate-900 text-white border-slate-700/40">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm font-medium">Total em Estoque</p>
            <p className="text-5xl font-black mt-1">{fmtNum(total)}</p>
            <p className="text-slate-500 text-sm mt-1">pallets disponíveis (todos os tipos)</p>
          </div>
          <div className="flex gap-3">
            {PALLET_KEYS.map(type => {
              const c = PALLET_CONFIG[type];
              return (
                <div key={type} className="text-center">
                  <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: c.hex }} />
                  <p className="text-xs text-slate-400">{c.label}</p>
                  <p className="text-sm font-bold text-white">{fmtNum(stock[type] || 0)}</p>
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
                    <span className="text-xs text-slate-400">
                      {c.label}: {total > 0 ? Math.round(((stock[type] || 0) / total) * 100) : 0}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Quick Update + Per-type cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-5">
          {PALLET_KEYS.map(type => (
            <StockCard key={type} palletType={type} quantity={stock[type] || 0} stats={stats[type]} />
          ))}
        </div>
        {isAdmin && (
          <div>
            <QuickUpdateForm currentStock={stock} onSaved={handleSaved} />
          </div>
        )}
      </div>

      {/* Stock evolution chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-400" />
            Evolução do Estoque
          </h3>
          <div className="flex gap-2">
            {[7, 30, 60].map(d => (
              <button key={d} onClick={() => setChartDays(d)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${chartDays === d ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-700'}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} width={50} />
            <Tooltip
              formatter={(v, name) => [fmtNum(v), name === 'total' ? 'Total' : PALLET_LABELS[name] || name]}
              labelFormatter={l => `Data: ${fmtDate(l)}`}
              contentStyle={darkTooltipStyle}
            />
            <Legend formatter={name => name === 'total' ? 'Total' : PALLET_LABELS[name] || name} wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="CHEP" stroke={PALLET_CONFIG.CHEP.hex} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="fumegado" stroke={PALLET_CONFIG.fumegado.hex} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="PBR" stroke={PALLET_CONFIG.PBR.hex} strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="total" stroke="#64748b" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
