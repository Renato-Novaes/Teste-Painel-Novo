import { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Truck, Package, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import api from '../services/api';

const darkTooltipStyle = {
  fontSize: 12, borderRadius: 12,
  border: '1px solid rgba(51,65,85,0.6)',
  backgroundColor: 'rgba(15,23,42,0.95)',
  color: '#e2e8f0',
  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
};

function fmt(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0); }
function fmtNum(v) { return new Intl.NumberFormat('pt-BR').format(v || 0); }
function fmtDate(dateStr) { try { return format(parseISO(dateStr), 'dd/MM'); } catch { return dateStr; } }

const PALLET_CONFIG = {
  CHEP:     { label: 'CHEP',     color: '#3b82f6', badge: 'badge-chep' },
  fumegado: { label: 'FUMEGADO', color: '#f59e0b', badge: 'badge-fumegado' },
  PBR:      { label: 'PBR',      color: '#8b5cf6', badge: 'badge-pbr' },
};

const PERIOD_OPTIONS = [
  { value: 'day',   label: 'Hoje' },
  { value: 'week',  label: '7 dias' },
  { value: 'month', label: '30 dias' },
  { value: 'all',   label: 'Tudo' },
];

function SummaryCard({ label, value, sub, icon: Icon, iconColor, valueBold }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <div className={`p-2.5 rounded-xl ${iconColor}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className={`text-2xl font-bold ${valueBold}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function Financial() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = useCustom && customStart && customEnd
        ? { start_date: customStart, end_date: customEnd }
        : { period };
      const res = await api.get('/api/financial/summary', { params });
      setData(res.data.data);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [period, useCustom, customStart, customEnd]);

  useEffect(() => { fetchData(); }, [fetchData]);
  async function handleRefresh() { setRefreshing(true); await fetchData(); }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { summary, byType, chart } = data || { summary: {}, byType: [], chart: [] };
  const isProfit = (summary.profit || 0) >= 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Relatório Financeiro</h2>
          <p className="text-sm text-slate-500">
            {data?.period ? `${format(parseISO(data.period.start), 'dd/MM/yyyy')} — ${format(parseISO(data.period.end), 'dd/MM/yyyy')}` : ''}
          </p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="btn-secondary">
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />Atualizar
        </button>
      </div>

      {/* Period selector */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1.5">
            {PERIOD_OPTIONS.map(({ value, label }) => (
              <button key={value} onClick={() => { setPeriod(value); setUseCustom(false); }}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  !useCustom && period === value ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700'
                }`}>{label}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="input-field w-auto text-sm" />
            <span className="text-slate-500 text-sm">até</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="input-field w-auto text-sm" />
            <button onClick={() => { setUseCustom(true); fetchData(); }} disabled={!customStart || !customEnd} className="btn-primary py-1.5">Aplicar</button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Receita Total" value={fmt(summary.revenue)} sub={`${fmtNum(summary.total_sold)} pallets vendidos`} icon={TrendingUp} iconColor="bg-emerald-600" valueBold="text-emerald-400" />
        <SummaryCard label="Custo Total" value={fmt(summary.cost)} sub={`${fmtNum(summary.total_bought)} pallets comprados`} icon={TrendingDown} iconColor="bg-red-600" valueBold="text-red-400" />
        <SummaryCard label="Frete Total" value={fmt(summary.freight)} sub={`${fmtNum(summary.total_movements)} movimentações`} icon={Truck} iconColor="bg-amber-600" valueBold="text-amber-400" />
        <SummaryCard label="Lucro Estimado" value={fmt(summary.profit)} sub="receita - custo - frete" icon={DollarSign} iconColor={isProfit ? 'bg-blue-600' : 'bg-slate-600'} valueBold={isProfit ? 'text-blue-400' : 'text-slate-400'} />
      </div>

      {/* Profit margin */}
      <div className={`card p-5 border-2 ${isProfit ? 'border-blue-500/20 bg-blue-500/5' : 'border-slate-700/40 bg-slate-800/40'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-300 mb-1">Margem de Lucro Estimada</p>
            <p className={`text-4xl font-black ${isProfit ? 'text-blue-400' : 'text-slate-500'}`}>
              {summary.revenue > 0 ? `${((summary.profit / summary.revenue) * 100).toFixed(1)}%` : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-1">Lucro ÷ Receita × 100</p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-slate-500 mb-1">Movimentações</p>
              <p className="text-lg font-bold text-slate-200">{fmtNum(summary.total_movements)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Pallets Comprados</p>
              <p className="text-lg font-bold text-slate-200">{fmtNum(summary.total_bought)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Pallets Vendidos</p>
              <p className="text-lg font-bold text-slate-200">{fmtNum(summary.total_sold)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* By pallet type table */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Package size={16} className="text-blue-400" />
          Resultado por Tipo de Pallet
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase rounded-l-lg">Tipo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Comprados</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Vendidos</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Custo Total</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Receita</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Preço Médio Compra</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell rounded-r-lg">Preço Médio Venda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {byType.map(row => (
                <tr key={row.pallet_type} className="hover:bg-slate-700/20">
                  <td className="px-4 py-3"><span className={PALLET_CONFIG[row.pallet_type]?.badge || ''}>{row.pallet_type}</span></td>
                  <td className="px-4 py-3 text-right font-medium text-slate-300">{fmtNum(row.bought)}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-300">{fmtNum(row.sold)}</td>
                  <td className="px-4 py-3 text-right text-red-400 font-medium">{fmt(row.cost)}</td>
                  <td className="px-4 py-3 text-right text-emerald-400 font-medium">{fmt(row.revenue)}</td>
                  <td className="px-4 py-3 text-right text-slate-400 hidden sm:table-cell">{fmt(row.avg_entry_price)}</td>
                  <td className="px-4 py-3 text-right text-slate-400 hidden md:table-cell">{fmt(row.avg_exit_price)}</td>
                </tr>
              ))}
              {byType.length === 0 && (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500 text-sm">Nenhum dado para o período selecionado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Financial chart */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Evolução Financeira no Período</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chart} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="gReceita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gCusto" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gLucro" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748b' }} width={55} />
            <Tooltip formatter={(v, name) => [fmt(v), name === 'receita' ? 'Receita' : name === 'custo' ? 'Custo' : 'Lucro']} labelFormatter={l => `Data: ${fmtDate(l)}`} contentStyle={darkTooltipStyle} />
            <Legend formatter={name => name === 'receita' ? 'Receita' : name === 'custo' ? 'Custo' : 'Lucro'} wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={2} fill="url(#gReceita)" />
            <Area type="monotone" dataKey="custo" stroke="#ef4444" strokeWidth={2} fill="url(#gCusto)" />
            <Area type="monotone" dataKey="lucro" stroke="#3b82f6" strokeWidth={2} fill="url(#gLucro)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bar chart by type */}
      {byType.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Receita vs Custo por Tipo de Pallet</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byType.map(r => ({ name: r.pallet_type, Receita: r.revenue, Custo: r.cost }))} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600, fill: '#94a3b8' }} />
              <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748b' }} width={55} />
              <Tooltip formatter={(v) => [fmt(v)]} contentStyle={darkTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Custo" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
