import { useEffect, useState } from 'react';
import { Users as UsersIcon, Plus, Edit2, Trash2, Shield, Eye, Wrench, X, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const ROLE_CONFIG = {
  admin: { label: 'Administrador', color: 'bg-red-500/15 text-red-400 border-red-500/20', icon: Shield },
  operator: { label: 'Operador', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20', icon: Wrench },
  viewer: { label: 'Visualizador', color: 'bg-slate-500/15 text-slate-400 border-slate-500/20', icon: Eye }
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

function UserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    username: user?.username || '',
    name: user?.name || '',
    role: user?.role || 'operator',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleChange(field, value) { setForm(f => ({ ...f, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.username.trim() || !form.name.trim()) { setError('Preencha todos os campos obrigatórios'); return; }
    if (!user && !form.password) { setError('Senha é obrigatória para novos usuários'); return; }
    if (form.password && form.password.length < 6) { setError('Senha deve ter no mínimo 6 caracteres'); return; }
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (user?.id) { await api.put(`/api/auth/users/${user.id}`, payload); }
      else { await api.post('/api/auth/users', payload); }
      onSaved(user?.id ? 'Usuário atualizado!' : 'Usuário criado com sucesso!');
    } catch (err) { setError(err.response?.data?.error || 'Erro ao salvar usuário'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl shadow-2xl shadow-black/40 w-full max-w-md animate-fadeIn border border-slate-700/60">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/40">
          <h2 className="text-base font-bold text-slate-100">{user?.id ? 'Editar Usuário' : 'Novo Usuário'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Username *</label>
            <input type="text" value={form.username} onChange={e => handleChange('username', e.target.value)}
              className="input-field" placeholder="Ex: joao.silva" required disabled={!!user?.id} />
            {user?.id && <p className="text-xs text-slate-500 mt-1">Username não pode ser alterado</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Nome Completo *</label>
            <input type="text" value={form.name} onChange={e => handleChange('name', e.target.value)}
              className="input-field" placeholder="Ex: João da Silva" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Perfil de Acesso *</label>
            <div className="space-y-2">
              {Object.entries(ROLE_CONFIG).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button key={key} type="button" onClick={() => handleChange('role', key)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                      form.role === key ? cfg.color + ' border-current' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}>
                    <Icon size={18} />
                    <div>
                      <p className="text-sm font-semibold">{cfg.label}</p>
                      <p className="text-xs opacity-70">
                        {key === 'admin' ? 'Acesso total ao sistema' : key === 'operator' ? 'Pode registrar e editar movimentações' : 'Apenas visualização de dados'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              {user?.id ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}
            </label>
            <input type="password" value={form.password} onChange={e => handleChange('password', e.target.value)}
              className="input-field" placeholder={user?.id ? '••••••' : 'Mínimo 6 caracteres'}
              {...(!user?.id && { required: true, minLength: 6 })} />
          </div>

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

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, user: null });
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, name: '' });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [toast, setToast] = useState(null);

  async function fetchUsers() {
    setLoading(true);
    try { const res = await api.get('/api/auth/users'); setUsers(res.data.data || []); }
    catch { setToast({ msg: 'Erro ao carregar usuários', type: 'error' }); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      await api.delete(`/api/auth/users/${confirmDelete.id}`);
      setConfirmDelete({ open: false, id: null, name: '' });
      setToast({ msg: 'Usuário excluído com sucesso', type: 'success' });
      fetchUsers();
    } catch (err) { setToast({ msg: err.response?.data?.error || 'Erro ao excluir', type: 'error' }); }
    finally { setDeleteLoading(false); }
  }

  function handleSaved(msg) {
    setModal({ open: false, user: null });
    setToast({ msg, type: 'success' });
    fetchUsers();
  }

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Shield size={48} className="text-slate-600 mb-4" />
        <h2 className="text-lg font-bold text-slate-300 mb-2">Acesso Restrito</h2>
        <p className="text-sm text-slate-500">Somente administradores podem gerenciar usuários.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {modal.open && <UserModal user={modal.user} onClose={() => setModal({ open: false, user: null })} onSaved={handleSaved} />}
      {confirmDelete.open && (
        <ConfirmModal
          message={`Tem certeza que deseja excluir o usuário "${confirmDelete.name}"? Esta ação não pode ser desfeita.`}
          onConfirm={handleDelete} onCancel={() => setConfirmDelete({ open: false, id: null, name: '' })} loading={deleteLoading} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Gerenciar Usuários</h2>
          <p className="text-sm text-slate-500">{users.length} usuários cadastrados</p>
        </div>
        <button onClick={() => setModal({ open: true, user: null })} className="btn-primary"><Plus size={15} />Novo Usuário</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-slate-700 rounded-full" />
                <div className="flex-1"><div className="h-4 bg-slate-700 rounded w-2/3 mb-1.5" /><div className="h-3 bg-slate-700/50 rounded w-1/2" /></div>
              </div>
            </div>
          ))
        ) : users.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <UsersIcon size={36} className="text-slate-600 mb-3" />
            <p className="font-medium text-slate-400">Nenhum usuário encontrado</p>
          </div>
        ) : (
          users.map(u => {
            const cfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.viewer;
            const Icon = cfg.icon;
            const isCurrentUser = u.id === currentUser.id;
            return (
              <div key={u.id} className={`card p-5 transition-all ${isCurrentUser ? 'ring-2 ring-blue-500/30' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${cfg.color} border`}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-200 text-sm">{u.name}</p>
                      <p className="text-xs text-slate-500">@{u.username}</p>
                    </div>
                  </div>
                  {isCurrentUser && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full">Você</span>
                  )}
                </div>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
                  <Icon size={12} />{cfg.label}
                </div>
                {u.created_at && (
                  <p className="text-[11px] text-slate-600 mt-3">
                    Criado em {new Date(u.created_at).toLocaleDateString('pt-BR')}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/30">
                  <button onClick={() => setModal({ open: true, user: u })}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-400 transition-colors">
                    <Edit2 size={13} /> Editar
                  </button>
                  {!isCurrentUser && (
                    <button onClick={() => setConfirmDelete({ open: true, id: u.id, name: u.name })}
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 transition-colors ml-auto">
                      <Trash2 size={13} /> Excluir
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
