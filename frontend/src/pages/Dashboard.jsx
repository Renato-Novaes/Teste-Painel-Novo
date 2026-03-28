import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Package, TrendingUp, TrendingDown, DollarSign,
  Truck, ArrowUpCircle, ArrowDownCircle, RefreshCw,
  Plus, ArrowRight, BarChart3, Layers, Clock, Sparkles
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const darkTooltipStyle = {
  fontSize: 12, borderRadius: 12,
  border: '1px solid rgba(51,65,85,0.6)',
  backgroundColor: 'rgba(15,23,42,0.95)',
  color: '#e2e8f0',
  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
};

function StatCard({ title, value, subtitle, icon: Icon, color, glow }) {
  const colors = {
    blue:    { gradient: 'from-blue-500 to-blue-600',     text: 'text-blue-400',    border: 'border-blue-500/20',    iconBg: 'bg-blue-500/15',    iconText: 'text-blue-400' },
    green:   { gradient: 'from-emerald-500 to-emerald-600', text: 'text-emerald-400', border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/15', iconText: 'text-emerald-400' },
    red:     { gradient: 'from-red-500 to-red-600',       text: 'text-red-400',     border: 'border-red-500/20',     iconBg: 'bg-red-500/15',     iconText: 'text-red-400' },
    amber:   { gradient: 'from-amber-500 to-amber-600',   text: 'text-amber-400',   border: 'border-amber-500/20',   iconBg: 'bg-amber-500/15',   iconText: 'text-amber-400' },
    purple:  { gradient: 'from-purple-500 to-purple-600', text: 'text-purple-400',  border: 'border-purple-500/20',  iconBg: 'bg-purple-500/15',  iconText: 'text-purple-400' },
    slate:   { gradient: 'from-slate-500 to-slate-600',   text: 'text-slate-300',   border: 'border-slate-600/30',   iconBg: 'bg-slate-600/20',   iconText: 'text-slate-400' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={`relative overflow-hidden bg-slate-800/60 rounded-2xl border ${c.border} p-5 transition-all duration-200 hover:bg-slate-800/80 hover:-translate-y-0.5 group backdrop-blur-sm`}>
      {glow && <div className={`absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br ${c.gradient} opacity-[0.08] rounded-full blur-xl group-hover:opacity-[0.15] transition-opacity`} />}
      <div className="flex items-start justify-between relative">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{title}</p>
          <p className={`text-2xl font-extrabold ${c.text} truncate leading-tight`}>{value}</p>
          {subtitle && <p className="text-[11px] text-slate-500 mt-1.5">{subtitle}</p>}
        </div>
        <div className={`${c.iconBg} p-2.5 rounded-xl flex-shrink-0 ml-3`}>
          <Icon size={18} className={c.iconText} />
        </div>
      </div>
    </div>
  );
}

function fmt(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}
function fmtNum(value) {
  return new Intl.NumberFormat('pt-BR').format(value || 0);
}
function fmtDate(dateStr) {
  try { return format(parseISO(dateStr), 'dd/MM', { locale: ptBR }); }
  catch { return dateStr; }
}

const PALLET_COLORS = { CHEP: '#3b82f6', fumegado: '#f59e0b', PBR: '#8b5cf6' };
const PIE_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6'];

function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mb-4">
        <Icon size={28} className="text-slate-500" />
      </div>
      <h3 className="text-base font-semibold text-slate-300 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-xs mb-4">{description}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-primary"><Plus size={15} />{actionLabel}</button>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  async function fetchData() {
    try {
      const res = await api.get('/api/dashboard');
      setData(res.data.data);
    } catch {
      setError('Erro ao carregar dados do dashboard');
    } finally { setLoading(false); setRefreshing(false); }
  }
  useEffect(() => { fetchData(); }, []);
  async function handleRefresh() { setRefreshing(true); await fetchData(); }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 border-4 border-slate-700 rounded-full" />
            <div className="absolute inset-0 w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-300">Carregando dashboard</p>
            <p className="text-xs text-slate-500 mt-0.5">Preparando seus dados...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package size={28} className="text-red-400" />
          </div>
          <p className="text-red-400 font-semibold mb-1">Ops! Algo deu errado</p>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
          <button onClick={fetchData} className="btn-primary">Tentar novamente</button>
        </div>
      </div>
    );
  }

  const { stock, today, weekly, monthly, stockChart, movementsChart, financialChart, recentMovements } = data;
  const hasMovements = recentMovements && recentMovements.length > 0;
  const hasChartData = movementsChart?.some(d => d.entries > 0 || d.exits > 0);
  const greeting = (() => { const h = new Date().getHours(); if (h < 12) return 'Bom dia'; if (h < 18) return 'Boa tarde'; return 'Boa noite'; })();
  const pieData = [
    { name: 'CHEP', value: stock.CHEP || 0 },
    { name: 'FUMEGADO', value: stock.fumegado || 0 },
    { name: 'PBR', value: stock.PBR || 0 },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Welcome Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-800/80 via-slate-800/60 to-blue-900/40 rounded-2xl p-6 lg:p-8 text-white border border-slate-700/40 backdrop-blur-sm">
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-500/8 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/8 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-blue-400" />
              <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">{greeting}</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white">{user?.name || 'Administrador'}</h1>
            <p className="text-slate-400 text-sm mt-1.5 max-w-md">
              {hasMovements ? 'Confira o resumo do seu estoque e movimentações de pallets.' : 'Bem-vindo ao PalletControl! Comece adicionando sua primeira movimentação.'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={handleRefresh} disabled={refreshing} className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 backdrop-blur-sm text-white text-sm font-medium rounded-xl transition-all border border-white/10">
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />Atualizar
            </button>
            {isAdmin && (
              <button onClick={() => navigate('/movimentacoes')} className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-blue-900/40">
                <Plus size={15} />Nova Movimentação
              </button>
            )}
          </div>
        </div>
        <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Estoque Total</p>
            <p className="text-xl font-extrabold mt-0.5">{fmtNum(stock.total)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">pallets</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3.5">
            <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Entradas Hoje</p>
            <p className="text-xl font-extrabold mt-0.5">{fmtNum(today.entries_qty)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{today.entries_count} registros</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3.5">
            <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Saídas Hoje</p>
            <p className="text-xl font-extrabold mt-0.5">{fmtNum(today.exits_qty)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{today.exits_count} registros</p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3.5">
            <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Lucro Mensal</p>
            <p className={`text-xl font-extrabold mt-0.5 ${monthly.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(monthly.profit)}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">estimado</p>
          </div>
        </div>
      </div>

      {/* Stock cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers size={15} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-300">Estoque por Tipo</h3>
          </div>
          <button onClick={() => navigate('/estoque')} className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1">Ver detalhes <ArrowRight size={12} /></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard title="CHEP" value={fmtNum(stock.CHEP)} subtitle="pallets" icon={Package} color="blue" glow />
            <StatCard title="FUMEGADO" value={fmtNum(stock.fumegado)} subtitle="pallets" icon={Package} color="amber" glow />
            <StatCard title="PBR" value={fmtNum(stock.PBR)} subtitle="pallets" icon={Package} color="purple" glow />
            <StatCard title="Total" value={fmtNum(stock.total)} subtitle="todos os tipos" icon={Layers} color="slate" glow />
          </div>
          <div className="bg-slate-800/60 rounded-2xl border border-slate-700/40 p-4 flex items-center justify-center backdrop-blur-sm">
            {pieData.length > 0 ? (
              <div className="flex items-center gap-4 w-full">
                <ResponsiveContainer width={100} height={100}>
                  <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={28} outerRadius={44} paddingAngle={3} dataKey="value" stroke="none">
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie></PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 flex-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Distribuição</p>
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                        <span className="text-xs text-slate-400">{d.name}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-300">{stock.total > 0 ? Math.round((d.value / stock.total) * 100) : 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <Package size={24} className="text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Sem estoque</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={15} className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-300">Resumo Financeiro do Mês</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title="Receita" value={fmt(monthly.revenue)} subtitle="vendas de pallets" icon={TrendingUp} color="green" glow />
          <StatCard title="Custos" value={fmt(monthly.cost)} subtitle="compras de pallets" icon={TrendingDown} color="red" glow />
          <StatCard title="Frete" value={fmt(monthly.freight)} subtitle="transporte" icon={Truck} color="amber" glow />
          <StatCard title="Lucro" value={fmt(monthly.profit)} subtitle="receita - custo - frete" icon={DollarSign} color={monthly.profit >= 0 ? 'green' : 'red'} glow />
        </div>
      </div>

      {/* Charts */}
      {hasChartData ? (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="bg-slate-800/60 rounded-2xl border border-slate-700/40 p-5 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={15} className="text-blue-400" />
                <h3 className="text-sm font-semibold text-slate-200">Evolução do Estoque</h3>
                <span className="text-[10px] text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full ml-auto">30 dias</span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={stockChart} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} width={45} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v, name) => [fmtNum(v), name]} labelFormatter={l => fmtDate(l)} contentStyle={darkTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="CHEP" stroke={PALLET_COLORS.CHEP} strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="fumegado" stroke={PALLET_COLORS.fumegado} strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="PBR" stroke={PALLET_COLORS.PBR} strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-slate-800/60 rounded-2xl border border-slate-700/40 p-5 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-4">
                <ArrowUpCircle size={15} className="text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-200">Entradas vs Saídas</h3>
                <span className="text-[10px] text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full ml-auto">30 dias</span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={movementsChart} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} width={45} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v, name) => [fmtNum(v), name === 'entries' ? 'Entradas' : 'Saídas']} labelFormatter={l => fmtDate(l)} contentStyle={darkTooltipStyle} />
                  <Legend formatter={name => name === 'entries' ? 'Entradas' : 'Saídas'} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="entries" fill="#10b981" name="entries" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="exits" fill="#ef4444" name="exits" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-slate-800/60 rounded-2xl border border-slate-700/40 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={15} className="text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-200">Análise Financeira Diária</h3>
              <span className="text-[10px] text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full ml-auto">30 dias</span>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={financialChart} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCusto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.4)" />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => v === 0 ? 'R$0' : `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#64748b' }} width={55} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v, name) => [fmt(v), name === 'receita' ? 'Receita' : name === 'custo' ? 'Custo' : 'Lucro']} labelFormatter={l => fmtDate(l)} contentStyle={darkTooltipStyle} />
                <Legend formatter={name => name === 'receita' ? 'Receita' : name === 'custo' ? 'Custo' : 'Lucro'} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={2} fill="url(#colorReceita)" />
                <Area type="monotone" dataKey="custo" stroke="#ef4444" strokeWidth={2} fill="url(#colorCusto)" />
                <Area type="monotone" dataKey="lucro" stroke="#3b82f6" strokeWidth={2} fill="url(#colorLucro)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <div className="bg-slate-800/60 rounded-2xl border border-slate-700/40 backdrop-blur-sm">
          <EmptyState icon={BarChart3} title="Gráficos aparecerão aqui" description="Adicione movimentações para visualizar gráficos de estoque, entradas/saídas e análise financeira."
            actionLabel={isAdmin ? 'Adicionar Movimentação' : undefined} onAction={isAdmin ? () => navigate('/movimentacoes') : undefined} />
        </div>
      )}

      {/* Recent movements */}
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700/40 overflow-hidden backdrop-blur-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/40">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-200">Últimas Movimentações</h3>
          </div>
          {hasMovements && (
            <button onClick={() => navigate('/movimentacoes')} className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1">Ver todas <ArrowRight size={12} /></button>
          )}
        </div>
        {hasMovements ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900/40">
                  <th className="text-left py-2.5 px-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                  <th className="text-left py-2.5 px-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Pallet</th>
                  <th className="text-right py-2.5 px-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Qtd</th>
                  <th className="text-left py-2.5 px-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Parceiro</th>
                  <th className="text-right py-2.5 px-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Valor</th>
                  <th className="text-left py-2.5 px-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {recentMovements.map(m => (
                  <tr key={m.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="py-2.5 px-4">
                      <span className={m.movement_type === 'entry' ? 'badge-entry' : 'badge-exit'}>{m.movement_type === 'entry' ? '↑ Entrada' : '↓ Saída'}</span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={m.pallet_type === 'CHEP' ? 'badge-chep' : m.pallet_type === 'fumegado' ? 'badge-fumegado' : 'badge-pbr'}>{m.pallet_type === 'fumegado' ? 'FUMEGADO' : m.pallet_type}</span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-200">{fmtNum(m.quantity)}</td>
                    <td className="py-2.5 px-4 text-slate-400 hidden md:table-cell">{m.counterpart}</td>
                    <td className="py-2.5 px-4 text-right text-slate-300 hidden sm:table-cell font-medium">{fmt(m.quantity * m.unit_price)}</td>
                    <td className="py-2.5 px-4 text-slate-500 text-xs">{format(parseISO(m.movement_date), 'dd/MM/yyyy')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={ArrowDownCircle} title="Nenhuma movimentação ainda" description="Registre entradas e saídas de pallets para acompanhar seu estoque em tempo real."
            actionLabel={isAdmin ? 'Registrar Primeira Movimentação' : undefined} onAction={isAdmin ? () => navigate('/movimentacoes') : undefined} />
        )}
      </div>

      {/* Quick Actions */}
      {isAdmin && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={15} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-300">Ações Rápidas</h3>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { nav: '/movimentacoes', icon: ArrowUpCircle, color: 'emerald', label: 'Registrar Entrada', sub: 'Adicionar pallets ao estoque' },
              { nav: '/movimentacoes', icon: ArrowDownCircle, color: 'red', label: 'Registrar Saída', sub: 'Retirar pallets do estoque' },
              { nav: '/financeiro', icon: DollarSign, color: 'blue', label: 'Relatório Financeiro', sub: 'Receita, custo e lucros' },
              { nav: '/frete', icon: Truck, color: 'amber', label: 'Gestão de Fretes', sub: 'Custos de transporte' },
            ].map(({ nav, icon: I, color, label, sub }) => (
              <button key={label} onClick={() => navigate(nav)} className={`group bg-slate-800/60 rounded-2xl border border-slate-700/40 p-4 text-left hover:bg-slate-800/80 hover:border-${color}-500/30 hover:-translate-y-0.5 transition-all`}>
                <div className={`w-10 h-10 bg-${color}-500/15 rounded-xl flex items-center justify-center mb-3 group-hover:bg-${color}-500/25 transition-colors`}>
                  <I size={18} className={`text-${color}-400`} />
                </div>
                <p className="text-sm font-semibold text-slate-200">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
