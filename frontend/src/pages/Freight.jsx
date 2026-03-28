import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Truck, ArrowUpCircle, ArrowDownCircle, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import api from '../services/api';

const darkTooltipStyle = {
  fontSize: 12, borderRadius: 12,
  border: '1px solid rgba(51,65,85,0.6)',
  backgroundColor: 'rgba(15,23,42,0.95)',
  color: '#e2e8f0',
  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
};

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
function fmtNum(v) {
  return new Intl.NumberFormat('pt-BR').format(v || 0);
}
function fmtDate(dateStr) {
  try { return format(parseISO(dateStr), 'dd/MM'); }
  catch { return dateStr; }
}

const PALLET_LABELS = { CHEP: 'CHEP', fumegado: 'FUMEGADO', PBR: 'PBR' };

function FreightCard({ label, value, sub, icon: Icon, iconBg, textColor }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{label}</p>
          <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={`${iconBg} p-3 rounded-xl`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </div>
  );
}

export default function Freight() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/financial/freight', { params: { start_date: startDate, end_date: endDate } });
      setData(res.data.data);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { summary, byType, byMovementType, topCounterparts, dailyChart } = data || {};

  const entryFreightPct = summary?.total_freight > 0
    ? Math.round((summary.entry_freight / summary.total_freight) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Gestão de Frete</h2>
          <p className="text-sm text-slate-500">Análise de custos de transporte</p>
        </div>
        <button onClick={handleRefresh} disabled={refreshing} className="btn-secondary">
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Date filter */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Data de início</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field w-auto text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Data de fim</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field w-auto text-sm" />
          </div>
          <button onClick={fetchData} className="btn-primary py-2">Filtrar</button>
          <p className="text-xs text-slate-500 self-center">
            Período: {data?.period ? `${format(parseISO(data.period.start), 'dd/MM/yyyy')} a ${format(parseISO(data.period.end), 'dd/MM/yyyy')}` : ''}
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <FreightCard label="Frete Total Pago" value={fmt(summary?.total_freight)} sub={`${fmtNum(summary?.movements_with_freight)} movs. com frete`} icon={Truck} iconBg="bg-amber-600" textColor="text-amber-400" />
        <FreightCard label="Frete de Entradas" value={fmt(summary?.entry_freight)} sub={`${entryFreightPct}% do total`} icon={ArrowUpCircle} iconBg="bg-emerald-600" textColor="text-emerald-400" />
        <FreightCard label="Frete de Saídas" value={fmt(summary?.exit_freight)} sub={`${100 - entryFreightPct}% do total`} icon={ArrowDownCircle} iconBg="bg-red-600" textColor="text-red-400" />
        <FreightCard label="Frete Médio" value={fmt(summary?.avg_freight)} sub="por movimentação" icon={Truck} iconBg="bg-blue-600" textColor="text-blue-400" />
      </div>

      {/* Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By pallet type */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Frete por Tipo de Pallet</h3>
          {byType && byType.length > 0 ? (
            <div className="space-y-3">
              {byType.map(row => {
                const pct = summary?.total_freight > 0 ? (row.total_freight / summary.total_freight) * 100 : 0;
                const colors = { CHEP: 'bg-blue-500', fumegado: 'bg-amber-500', PBR: 'bg-purple-500' };
                return (
                  <div key={row.pallet_type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-300">{PALLET_LABELS[row.pallet_type] || row.pallet_type}</span>
                      <span className="font-semibold text-slate-200">{fmt(row.total_freight)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${colors[row.pallet_type] || 'bg-slate-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 w-10 text-right">{pct.toFixed(0)}%</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{fmtNum(row.count)} movimentações com frete</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-4 text-center">Sem dados para o período</p>
          )}
        </div>

        {/* Top counterparts */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Maiores Gastos de Frete por Parceiro</h3>
          {topCounterparts && topCounterparts.length > 0 ? (
            <div className="space-y-2">
              {topCounterparts.slice(0, 8).map((row, i) => {
                const pct = summary?.total_freight > 0 ? (row.total_freight / summary.total_freight) * 100 : 0;
                return (
                  <div key={row.counterpart} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-500 w-5 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-slate-300 truncate">{row.counterpart}</span>
                        <span className="font-semibold text-slate-200 flex-shrink-0 ml-2">{fmt(row.total_freight)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 w-8 text-right">{fmtNum(row.count)}x</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-4 text-center">Sem dados para o período</p>
          )}
        </div>
      </div>

      {/* Daily freight chart */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Frete Diário no Período</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={dailyChart} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: '#64748b' }} />
            <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#64748b' }} width={55} />
            <Tooltip
              formatter={(v, name) => [fmt(v), name === 'entry_freight' ? 'Frete Entrada' : name === 'exit_freight' ? 'Frete Saída' : 'Total']}
              labelFormatter={l => `Data: ${fmtDate(l)}`}
              contentStyle={darkTooltipStyle}
            />
            <Legend formatter={name => name === 'entry_freight' ? 'Frete Entrada' : 'Frete Saída'} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="entry_freight" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
            <Bar dataKey="exit_freight" stackId="a" fill="#f59e0b" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* By movement type */}
      {byMovementType && byMovementType.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {byMovementType.map(row => (
            <div key={row.movement_type} className={`card p-5 border-2 ${row.movement_type === 'entry' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${row.movement_type === 'entry' ? 'bg-emerald-600' : 'bg-amber-600'}`}>
                  {row.movement_type === 'entry' ? <ArrowUpCircle size={20} className="text-white" /> : <ArrowDownCircle size={20} className="text-white" />}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">
                    Frete em {row.movement_type === 'entry' ? 'Entradas' : 'Saídas'}
                  </p>
                  <p className={`text-xl font-bold ${row.movement_type === 'entry' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {fmt(row.total_freight)}
                  </p>
                  <p className="text-xs text-slate-500">{fmtNum(row.count)} movimentações</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
