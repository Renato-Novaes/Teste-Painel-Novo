const express = require('express');
const db = require('../database/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/stock - current stock by pallet type with alerts
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT
      pallet_type,
      SUM(CASE WHEN movement_type = 'entry' THEN quantity ELSE -quantity END) as quantity,
      SUM(CASE WHEN movement_type = 'entry' THEN 1 ELSE 0 END) as total_entries,
      SUM(CASE WHEN movement_type = 'exit' THEN 1 ELSE 0 END) as total_exits
    FROM movements
    GROUP BY pallet_type
  `).all();

  const stock = { CHEP: 0, fumegado: 0, PBR: 0 };
  const stats = { CHEP: { entries: 0, exits: 0 }, fumegado: { entries: 0, exits: 0 }, PBR: { entries: 0, exits: 0 } };

  for (const row of rows) {
    stock[row.pallet_type] = Math.max(0, row.quantity || 0);
    stats[row.pallet_type] = { entries: row.total_entries || 0, exits: row.total_exits || 0 };
  }

  const total = stock.CHEP + stock.fumegado + stock.PBR;

  // Get stock settings for alerts
  const settings = db.prepare('SELECT * FROM stock_settings').all();
  const settingsMap = {};
  for (const s of settings) settingsMap[s.pallet_type] = s;

  // Build alerts
  const alerts = [];
  for (const type of ['CHEP', 'fumegado', 'PBR']) {
    const s = settingsMap[type] || { min_stock: 50, warning_stock: 100 };
    const qty = stock[type];
    let level = 'ok'; // green
    if (qty <= s.min_stock) level = 'critical'; // red
    else if (qty <= s.warning_stock) level = 'warning'; // yellow

    if (level !== 'ok') {
      alerts.push({
        pallet_type: type,
        level,
        quantity: qty,
        min_stock: s.min_stock,
        warning_stock: s.warning_stock,
        message: level === 'critical'
          ? `Estoque ${type} CRÍTICO: ${qty} pallets (mínimo: ${s.min_stock})`
          : `Estoque ${type} baixo: ${qty} pallets (alerta: ${s.warning_stock})`
      });
    }

    stats[type].level = level;
    stats[type].min_stock = s.min_stock;
    stats[type].warning_stock = s.warning_stock;
  }

  // Average cost per pallet type
  const avgCost = db.prepare(`
    SELECT pallet_type,
      AVG(unit_price) as avg_price,
      SUM(quantity * unit_price) as total_cost,
      SUM(quantity) as total_qty
    FROM movements
    WHERE movement_type = 'entry' AND unit_price > 0
    GROUP BY pallet_type
  `).all();

  const avgCostMap = {};
  for (const row of avgCost) {
    avgCostMap[row.pallet_type] = {
      avg_price: parseFloat((row.avg_price || 0).toFixed(2)),
      weighted_avg: row.total_qty > 0 ? parseFloat((row.total_cost / row.total_qty).toFixed(2)) : 0
    };
  }

  res.json({
    success: true,
    data: { stock, stats, total, alerts, avgCost: avgCostMap }
  });
});

// GET /api/stock/settings - get stock alert settings
router.get('/settings', (req, res) => {
  const settings = db.prepare('SELECT * FROM stock_settings').all();
  res.json({ success: true, data: settings });
});

// PUT /api/stock/settings - update stock alert settings
router.put('/settings', requireAdmin, (req, res) => {
  const { settings } = req.body;
  if (!Array.isArray(settings)) {
    return res.status(400).json({ success: false, error: 'Settings deve ser um array' });
  }

  for (const s of settings) {
    if (!['CHEP', 'fumegado', 'PBR'].includes(s.pallet_type)) continue;
    const minStock = Math.max(0, parseInt(s.min_stock) || 0);
    const warningStock = Math.max(0, parseInt(s.warning_stock) || 0);
    db.prepare('UPDATE stock_settings SET min_stock = ?, warning_stock = ? WHERE pallet_type = ?')
      .run(minStock, warningStock, s.pallet_type);
  }

  const updated = db.prepare('SELECT * FROM stock_settings').all();
  res.json({ success: true, data: updated, message: 'Configurações atualizadas' });
});

// GET /api/stock/chart - stock evolution for last N days
router.get('/chart', (req, res) => {
  const days = parseInt(req.query.days) || 30;

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days + 1);
  const startDateStr = startDate.toISOString().split('T')[0];

  const baseline = db.prepare(`
    SELECT pallet_type,
      SUM(CASE WHEN movement_type = 'entry' THEN quantity ELSE -quantity END) as qty
    FROM movements
    WHERE movement_date < ?
    GROUP BY pallet_type
  `).all(startDateStr);

  const baselineStock = { CHEP: 0, fumegado: 0, PBR: 0 };
  for (const row of baseline) baselineStock[row.pallet_type] = row.qty || 0;

  const dailyMovements = db.prepare(`
    SELECT movement_date as date, pallet_type,
      SUM(CASE WHEN movement_type = 'entry' THEN quantity ELSE -quantity END) as net
    FROM movements
    WHERE movement_date >= ?
    GROUP BY date, pallet_type
    ORDER BY date
  `).all(startDateStr);

  const dailyNetMap = {};
  for (const row of dailyMovements) {
    if (!dailyNetMap[row.date]) dailyNetMap[row.date] = {};
    dailyNetMap[row.date][row.pallet_type] = row.net;
  }

  const chartData = [];
  const running = { ...baselineStock };

  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];

    if (dailyNetMap[dateStr]) {
      for (const type of ['CHEP', 'fumegado', 'PBR']) {
        if (dailyNetMap[dateStr][type] !== undefined) {
          running[type] += dailyNetMap[dateStr][type];
        }
      }
    }

    chartData.push({
      date: dateStr,
      CHEP: Math.max(0, running.CHEP),
      fumegado: Math.max(0, running.fumegado),
      PBR: Math.max(0, running.PBR),
      total: Math.max(0, running.CHEP + running.fumegado + running.PBR)
    });
  }

  res.json({ success: true, data: chartData });
});

module.exports = router;
