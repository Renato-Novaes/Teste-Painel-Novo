const express = require('express');
const db = require('../database/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/stock - current stock by pallet type
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

  res.json({
    success: true,
    data: { stock, stats, total }
  });
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
