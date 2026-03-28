import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, PackageSearch, ArrowLeftRight,
  TrendingUp, Truck, LogOut, X, Package2, ShieldCheck
} from 'lucide-react';

const navItems = [
  { to: '/',              label: 'Dashboard',        icon: LayoutDashboard,  end: true },
  { to: '/movimentacoes', label: 'Movimentações',    icon: ArrowLeftRight },
  { to: '/estoque',       label: 'Estoque',          icon: PackageSearch },
  { to: '/financeiro',    label: 'Financeiro',       icon: TrendingUp },
  { to: '/frete',         label: 'Frete',            icon: Truck },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-30 w-64 flex flex-col bg-slate-900 text-white
        transform transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-slate-700/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Package2 size={20} />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">PalletControl</p>
            <p className="text-xs text-slate-400">Gestão Logística</p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white p-1">
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Pallet type legend */}
      <div className="px-4 py-3 mx-3 mb-3 bg-slate-800/60 rounded-lg">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Tipos de Pallet</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            <span className="text-xs text-slate-300">CHEP</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-xs text-slate-300">FUMEGADO</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-400" />
            <span className="text-xs text-slate-300">PBR</span>
          </div>
        </div>
      </div>

      {/* User footer */}
      <div className="border-t border-slate-700/60 px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-slate-300">
              {user?.name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <div className="flex items-center gap-1">
              <ShieldCheck size={11} className={user?.role === 'admin' ? 'text-blue-400' : 'text-slate-500'} />
              <p className="text-xs text-slate-400 capitalize">{user?.role === 'admin' ? 'Administrador' : 'Usuário'}</p>
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          Sair
        </button>
      </div>
    </aside>
  );
}
