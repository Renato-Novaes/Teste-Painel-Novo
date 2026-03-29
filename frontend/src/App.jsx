import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Movements from './pages/Movements';
import Stock from './pages/Stock';
import Financial from './pages/Financial';
import Freight from './pages/Freight';
import UpdateModal from './components/UpdateModal';
import { isNative } from './services/api';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f1a]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Carregando...</p>
        </div>
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" replace /> : children;
}

export default function App() {
  const [updateInfo, setUpdateInfo] = useState(null);

  useEffect(() => {
    if (!isNative) return;
    // Check for updates after a short delay so the app loads first
    const timer = setTimeout(async () => {
      try {
        const { checkForUpdate } = await import('./services/updateService');
        const info = await checkForUpdate();
        if (info) setUpdateInfo(info);
      } catch { /* silent */ }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        {updateInfo && (
          <UpdateModal updateInfo={updateInfo} onDismiss={() => setUpdateInfo(null)} />
        )}
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="movimentacoes" element={<Movements />} />
            <Route path="estoque" element={<Stock />} />
            <Route path="financeiro" element={<Financial />} />
            <Route path="frete" element={<Freight />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
