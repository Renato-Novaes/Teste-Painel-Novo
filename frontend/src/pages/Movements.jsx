import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, X, ChevronLeft, ChevronRight, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function fmt(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0); }
function fmtNum(v) { return new Intl.NumberFormat('pt-BR').format(v || 0); }

const PALLET_TYPES = ['CHEP', 'fumegado', 'PBR'];
const PALLET_LABELS = { CHEP: 'CHEP', fumegado: 'FUMEGADO', PBR: 'PBR' };
const MOVEMENT_TYPES = [{ v: 'entry', l: 'Entrada' }, { v: 'exit', l: 'Saída' }];

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-fadeIn ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
      {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      {msg}
    </div>
  );
}

function MovementModal({ movement, onClose, onSaved, currentStock }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    movement_type: movement?.movement_type || 'entry',
    pallet_type: movement?.pallet_type || 'CHEP',
    quantity: movement?.quantity || '',
    unit_price: movement?.unit_price || '',
    freight_value: movement?.freight_value || '',
    counterpart: movement?.counterpart || '',
    notes: movement?.notes || '',
    movement_date: movement?.movement_date || today
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleChange(field, value) { setForm(f => ({ ...f, [field]: value })); }

  const totalValue = (parseFloat(form.quantity) || 0) * (parseFloat(form.unit_price) || 0);
  const totalWithFreight = totalValue + (parseFloat(form.freight_value) || 0);
  const availableStock = currentStock?.[form.pallet_type] || 0;
  const stockAfter = form.movement_type === 'entry'
    ? availableStock + (parseInt(form.quantity) || 0)
    : availableStock - (parseInt(form.quantity) || 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form, quantity: parseInt(form.quantity),
        unit_price: parseFloat(form.unit_price) || 0,
        freight_value: parseFloat(form.freight_value) || 0
      };
      if (movement?.id) { await api.put(`/api/movements/${movement.id}`, payload); }
      else { await api.post('/api/movements', payload); }
      onSaved();
    } catch (err) { setError(err.response?.data?.error || 'Erro ao salvar movimentação'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl shadow-2xl shadow-black/40 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fadeIn border border-slate-700/60">
        <div className={`flex items-center justify-between px-6 py-4 border-b border-slate-700/40 ${form.movement_type === 'entry' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
          <h2 className="text-base font-bold text-slate-100">{movement?.id ? 'Editar Movimentação' : 'Nova Movimentação'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de Movimentação *</label>
            <div className="grid grid-cols-2 gap-2">
              {MOVEMENT_TYPES.map(({ v, l }) => (
                <button key={v} type="button" onClick={() => handleChange('movement_type', v)}
                  className={`py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                    form.movement_type === v
                      ? v === 'entry' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-red-600 border-red-600 text-white'
                      : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}>{l}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de Pallet *</label>
            <div className="grid grid-cols-3 gap-2">
              {PALLET_TYPES.map(t => (
                <button key={t} type="button" onClick={() => handleChange('pallet_type', t)}
                  className={`py-2.5 rounded-lg text-sm font-medium border-2 transition-all ${
                    form.pallet_type === t
                      ? t === 'CHEP' ? 'bg-blue-600 border-blue-600 text-white'
                        : t === 'fumegado' ? 'bg-amber-600 border-amber-600 text-white'
                        : 'bg-purple-600 border-purple-600 text-white'
                      : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}>{PALLET_LABELS[t]}</button>
              ))}
            </div>
            {form.movement_type === 'exit' && (
              <p className="text-xs text-slate-500 mt-1">
                Estoque disponível: <span className={`font-medium ${availableStock < (parseInt(form.quantity) || 0) ? 'text-red-400' : 'text-emerald-400'}`}>{fmtNum(availableStock)} pallets</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Data *</label>
              <input type="date" value={form.movement_date} onChange={e => handleChange('movement_date', e.target.value)} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Quantidade *</label>
              <input type="number" value={form.quantity} onChange={e => handleChange('quantity', e.target.value)} min="1" className="input-field" placeholder="Ex: 100" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">{form.movement_type === 'entry' ? 'Custo Unitário (R$)' : 'Preço de Venda (R$)'}</label>
              <input type="number" step="0.01" min="0" value={form.unit_price} onChange={e => handleChange('unit_price', e.target.value)} className="input-field" placeholder="0,00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Frete (R$)</label>
              <input type="number" step="0.01" min="0" value={form.freight_value} onChange={e => handleChange('freight_value', e.target.value)} className="input-field" placeholder="0,00" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">{form.movement_type === 'entry' ? 'Fornecedor *' : 'Cliente *'}</label>
            <input type="text" value={form.counterpart} onChange={e => handleChange('counterpart', e.target.value)} className="input-field"
              placeholder={form.movement_type === 'entry' ? 'Nome do fornecedor' : 'Nome do cliente'} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Observações</label>
            <textarea value={form.notes} onChange={e => handleChange('notes', e.target.value)} rows={2} className="input-field resize-none" placeholder="Observações opcionais..." />
          </div>

          {(totalValue > 0 || totalWithFreight > 0) && (
            <div className="bg-slate-900/50 rounded-xl p-3 space-y-1.5 text-sm border border-slate-700/30">
              <div className="flex justify-between">
                <span className="text-slate-400">Valor total ({fmtNum(form.quantity || 0)} × {fmt(form.unit_price || 0)}):</span>
                <span className="font-medium text-slate-200">{fmt(totalValue)}</span>
              </div>
              {parseFloat(form.freight_value) > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">+ Frete:</span>
                  <span className="font-medium text-amber-400">{fmt(form.freight_value)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-700/40 pt-1.5">
                <span className="font-semibold text-slate-300">Total geral:</span>
                <span className={`font-bold text-base ${form.movement_type === 'entry' ? 'text-red-400' : 'text-emerald-400'}`}>{fmt(totalWithFreight)}</span>
              </div>
              {form.movement_type === 'exit' && form.quantity && (
                <p className="text-xs text-slate-500 pt-0.5">Estoque após: <span className={`font-medium ${stockAfter < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{fmtNum(stockAfter)}</span></p>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              <AlertCircle size={15} />{error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={15} />}
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-slate-800 rounded-2xl shadow-2xl shadow-black/40 w-full max-w-sm p-6 animate-fadeIn border border-slate-700/60">
        <div className="w-12 h-12 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} className="text-red-400" />
        </div>
        <h3 className="text-base font-bold text-slate-100 text-center mb-2">Confirmar Exclusão</h3>
        <p className="text-sm text-slate-400 text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancelar</button>
          <button onClick={onConfirm} disabled={loading} className="btn-danger flex-1 justify-center">
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Trash2 size={15} />}
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Movements() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [movements, setMovements] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [currentStock, setCurrentStock] = useState({});
  const [filters, setFilters] = useState({ movement_type: '', pallet_type: '', start_date: '', end_date: '', search: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [modal, setModal] = useState({ open: false, movement: null });
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchMovements = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20, ...filters };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const res = await api.get('/api/movements', { params });
      setMovements(res.data.data);
      setPagination(res.data.pagination);
    } catch { showToast('Erro ao carregar movimentações', 'error'); }
    finally { setLoading(false); }
  }, [filters]);

  async function fetchStock() { try { const res = await api.get('/api/stock'); setCurrentStock(res.data.data.stock); } catch {} }

  useEffect(() => { fetchMovements(1); fetchStock(); }, [fetchMovements]);
  function showToast(msg, type = 'success') { setToast({ msg, type }); }
  function handleFilterChange(field, value) { setFilters(f => ({ ...f, [field]: value })); }
  function clearFilters() { setFilters({ movement_type: '', pallet_type: '', start_date: '', end_date: '', search: '' }); }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      await api.delete(`/api/movements/${confirmDelete.id}`);
      setConfirmDelete({ open: false, id: null });
      showToast('Movimentação excluída com sucesso');
      fetchMovements(pagination.page); fetchStock();
    } catch (err) { showToast(err.response?.data?.error || 'Erro ao excluir', 'error'); }
    finally { setDeleteLoading(false); }
  }

  function handleSaved() {
    setModal({ open: false, movement: null });
    showToast(modal.movement?.id ? 'Movimentação atualizada!' : 'Movimentação registrada!');
    fetchMovements(pagination.page); fetchStock();
  }

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {modal.open && <MovementModal movement={modal.movement} onClose={() => setModal({ open: false, movement: null })} onSaved={handleSaved} currentStock={currentStock} />}
      {confirmDelete.open && <ConfirmModal message="Tem certeza que deseja excluir esta movimentação? Esta ação não pode ser desfeita." onConfirm={handleDelete} onCancel={() => setConfirmDelete({ open: false, id: null })} loading={deleteLoading} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Movimentações</h2>
          <p className="text-sm text-slate-500">{pagination.total} registros encontrados</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary relative ${activeFiltersCount > 0 ? 'ring-2 ring-blue-500' : ''}`}>
            <Filter size={15} />Filtros
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-bold">{activeFiltersCount}</span>
            )}
          </button>
          {isAdmin && (
            <button onClick={() => setModal({ open: true, movement: null })} className="btn-primary"><Plus size={15} />Nova Movimentação</button>
          )}
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input type="text" value={filters.search} onChange={e => handleFilterChange('search', e.target.value)}
          placeholder="Buscar por fornecedor ou cliente..." className="input-field pl-9" />
      </div>

      {showFilters && (
        <div className="card p-4 animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-300">Filtros Avançados</p>
            {activeFiltersCount > 0 && (
              <button onClick={clearFilters} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"><X size={12} /> Limpar</button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Tipo</label>
              <select value={filters.movement_type} onChange={e => handleFilterChange('movement_type', e.target.value)} className="input-field text-sm">
                <option value="">Todos</option><option value="entry">Entrada</option><option value="exit">Saída</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Pallet</label>
              <select value={filters.pallet_type} onChange={e => handleFilterChange('pallet_type', e.target.value)} className="input-field text-sm">
                <option value="">Todos</option>
                {PALLET_TYPES.map(t => <option key={t} value={t}>{PALLET_LABELS[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Data início</label>
              <input type="date" value={filters.start_date} onChange={e => handleFilterChange('start_date', e.target.value)} className="input-field text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Data fim</label>
              <input type="date" value={filters.end_date} onChange={e => handleFilterChange('end_date', e.target.value)} className="input-field text-sm" />
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-striped">
            <thead className="bg-slate-900/50 border-b border-slate-700/40">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Pallet</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Qtd</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Preço Unit.</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Frete</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Parceiro</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</th>
                {isAdmin && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {loading ? (
                <tr><td colSpan="9" className="text-center py-12 text-slate-500">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />Carregando...
                  </div>
                </td></tr>
              ) : movements.length === 0 ? (
                <tr><td colSpan="9" className="text-center py-12 text-slate-500">
                  <div className="flex flex-col items-center gap-2"><Filter size={32} className="text-slate-600" /><p>Nenhuma movimentação encontrada</p></div>
                </td></tr>
              ) : (
                movements.map(m => (
                  <tr key={m.id} className={`hover:bg-slate-700/20 transition-colors ${m.movement_type === 'entry' ? 'border-l-2 border-l-emerald-500/50' : 'border-l-2 border-l-red-500/50'}`}>
                    <td className="px-4 py-3">
                      <span className={m.movement_type === 'entry' ? 'badge-entry' : 'badge-exit'}>{m.movement_type === 'entry' ? '↑ Entrada' : '↓ Saída'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={m.pallet_type === 'CHEP' ? 'badge-chep' : m.pallet_type === 'fumegado' ? 'badge-fumegado' : 'badge-pbr'}>{PALLET_LABELS[m.pallet_type] || m.pallet_type}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-200">{fmtNum(m.quantity)}</td>
                    <td className="px-4 py-3 text-right text-slate-400">{fmt(m.unit_price)}</td>
                    <td className="px-4 py-3 text-right text-amber-400 hidden sm:table-cell">
                      {m.freight_value > 0 ? fmt(m.freight_value) : <span className="text-slate-600">—</span>}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${m.movement_type === 'entry' ? 'text-red-400' : 'text-emerald-400'}`}>{fmt(m.quantity * m.unit_price)}</td>
                    <td className="px-4 py-3 text-slate-400 max-w-[140px] truncate hidden md:table-cell" title={m.counterpart}>{m.counterpart}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{format(parseISO(m.movement_date), 'dd/MM/yyyy')}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setModal({ open: true, movement: m })} className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Editar"><Edit2 size={14} /></button>
                          <button onClick={() => setConfirmDelete({ open: true, id: m.id })} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Excluir"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/40 bg-slate-900/30">
            <p className="text-xs text-slate-500">
              Exibindo {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => fetchMovements(pagination.page - 1)} disabled={pagination.page === 1}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={16} /></button>
              <span className="px-3 py-1 text-sm font-medium text-slate-300">{pagination.page} / {pagination.totalPages}</span>
              <button onClick={() => fetchMovements(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
