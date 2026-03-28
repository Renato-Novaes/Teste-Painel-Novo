import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const pageTitles = {
  '/': 'Dashboard',
  '/movimentacoes': 'Movimentações',
  '/estoque': 'Estoque',
  '/financeiro': 'Financeiro',
  '/frete': 'Gestão de Frete',
};

const pageDescriptions = {
  '/': 'Visão geral do sistema',
  '/movimentacoes': 'Registros de entrada e saída',
  '/estoque': 'Posição atual dos pallets',
  '/financeiro': 'Análise de receitas e custos',
  '/frete': 'Controle de custos de transporte',
};

export default function Header({ onMenuClick }) {
  const { pathname } = useLocation();
  const title = pageTitles[pathname] || 'PalletControl';
  const description = pageDescriptions[pathname] || '';
  const now = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700/40 px-4 lg:px-6 py-3 flex items-center justify-between flex-shrink-0 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:bg-slate-800 transition-colors"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-base font-bold text-slate-100">{title}</h1>
          <p className="text-[11px] text-slate-500 hidden sm:block">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <p className="text-[11px] text-slate-500 hidden md:block capitalize">{now}</p>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Online</span>
        </div>
      </div>
    </header>
  );
}
