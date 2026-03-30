require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const isElectron = !!process.env.ELECTRON;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Serve built frontend in Electron / production mode
const staticDir = process.env.PALLET_STATIC_DIR;
if (staticDir) {
  app.use(express.static(staticDir));
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/movements', require('./routes/movements'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/financial', require('./routes/financial'));
app.use('/api/daily-stock', require('./routes/dailyStock'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Pallet Control API running', timestamp: new Date().toISOString() });
});

// SPA fallback — serve index.html for non-API routes (Electron/production)
if (staticDir) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(staticDir, 'index.html'));
  });
}

// 404 handler (API routes only when static is active)
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Rota não encontrada' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Erro interno do servidor' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📦 Painel de Controle de Pallets - API\n`);
});

module.exports = app;
