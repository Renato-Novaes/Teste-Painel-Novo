const express = require('express');
const db = require('../database/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/dashboard - all dashboard summary data
router.get('/', (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  // Current stock
  const stockRows = db.prepare(`
    SELECT pallet_type,
      SUM(CASE WHEN movement_type = 'entry' THEN quantity ELSE -quantity END) as quantity
    FROM movements
    GROUP BY pallet_type
  `).all();
  const stock = { CHEP: 0, fumegado: 0, PBR: 0 };
  for (const row of stockRows) stock[row.pallet_type] = Math.max(0, row.quantity || 0);

  // Today's stats
  const todayRows = db.prepare(`
    SELECT movement_type,
      COUNT(*) as count,
      SUM(quantity) as total_qty,
      SUM(quantity * unit_price) as total_value,
      SUM(freight_value) as total_freight
    FROM movements
    WHERE movement_date = ?
    GROUP BY movement_type
  `).all(today);

  const todayStats = {
    entries_count: 0, entries_qty: 0, entries_value: 0,
    exits_count: 0, exits_qty: 0, exits_value: 0,
    freight_total: 0
  };
  for (const row of todayRows) {
    if (row.movement_type === 'entry') {
      todayStats.entries_count = row.count;
      todayStats.entries_qty = row.total_qty;
      todayStats.entries_value = row.total_value || 0;
    } else {
      todayStats.exits_count = row.count;
      todayStats.exits_qty = row.total_qty;
      todayStats.exits_value = row.total_value || 0;
    }
    todayStats.freight_total += row.total_freight || 0;
  }

  // This week financial
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().split('T')[0];

  const weekFinancial = db.prepare(`
    SELECT
      SUM(CASE WHEN movement_type = 'exit' THEN quantity * unit_price ELSE 0 END) as revenue,
      SUM(CASE WHEN movement_type = 'entry' THEN quantity * unit_price ELSE 0 END) as cost,
      SUM(freight_value) as freight
    FROM movements
    WHERE movement_date >= ?
  `).get(weekStartStr);

  // Monthly financial
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().split('T')[0];

  const monthFinancial = db.prepare(`
    SELECT
      SUM(CASE WHEN movement_type = 'exit' THEN quantity * unit_price ELSE 0 END) as revenue,
      SUM(CASE WHEN movement_type = 'entry' THEN quantity * unit_price ELSE 0 END) as cost,
      SUM(freight_value) as freight
    FROM movements
    WHERE movement_date >= ?
  `).get(monthStartStr);

  // Last 30 days daily movements chart
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

  const dailyMovementsRaw = db.prepare(`
    SELECT movement_date as date, movement_type,
      SUM(quantity) as qty,
      SUM(quantity * unit_price) as value,
      SUM(freight_value) as freight
    FROM movements
    WHERE movement_date >= ?
    GROUP BY date, movement_type
    ORDER BY date
  `).all(thirtyDaysAgoStr);

  // Build 30-day movements chart
  const movementsMap = {};
  for (const row of dailyMovementsRaw) {
    if (!movementsMap[row.date]) movementsMap[row.date] = { date: row.date, entries: 0, exits: 0, revenue: 0, cost: 0, freight: 0 };
    if (row.movement_type === 'entry') {
      movementsMap[row.date].entries = row.qty;
      movementsMap[row.date].cost = row.value || 0;
    } else {
      movementsMap[row.date].exits = row.qty;
      movementsMap[row.date].revenue = row.value || 0;
    }
    movementsMap[row.date].freight += row.freight || 0;
  }

  const movementsChart = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    movementsChart.push(movementsMap[dateStr] || { date: dateStr, entries: 0, exits: 0, revenue: 0, cost: 0, freight: 0 });
  }

  // Financial chart (last 30 days cumulative per day)
  const financialChart = movementsChart.map(d => ({
    date: d.date,
    receita: parseFloat((d.revenue || 0).toFixed(2)),
    custo: parseFloat((d.cost || 0).toFixed(2)),
    frete: parseFloat((d.freight || 0).toFixed(2)),
    lucro: parseFloat(((d.revenue || 0) - (d.cost || 0) - (d.freight || 0)).toFixed(2))
  }));

  // Stock evolution chart (last 30 days)
  const baselineRows = db.prepare(`
    SELECT pallet_type,
      SUM(CASE WHEN movement_type = 'entry' THEN quantity ELSE -quantity END) as qty
    FROM movements WHERE movement_date < ?
    GROUP BY pallet_type
  `).all(thirtyDaysAgoStr);

  const baselineStock = { CHEP: 0, fumegado: 0, PBR: 0 };
  for (const row of baselineRows) baselineStock[row.pallet_type] = row.qty || 0;

  const dailyStockRaw = db.prepare(`
    SELECT movement_date as date, pallet_type,
      SUM(CASE WHEN movement_type = 'entry' THEN quantity ELSE -quantity END) as net
    FROM movements WHERE movement_date >= ?
    GROUP BY date, pallet_type ORDER BY date
  `).all(thirtyDaysAgoStr);

  const dailyStockMap = {};
  for (const row of dailyStockRaw) {
    if (!dailyStockMap[row.date]) dailyStockMap[row.date] = {};
    dailyStockMap[row.date][row.pallet_type] = row.net;
  }

  const stockChart = [];
  const running = { ...baselineStock };
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    if (dailyStockMap[dateStr]) {
      for (const type of ['CHEP', 'fumegado', 'PBR']) {
        if (dailyStockMap[dateStr][type] !== undefined) running[type] += dailyStockMap[dateStr][type];
      }
    }
    stockChart.push({
      date: dateStr,
      CHEP: Math.max(0, running.CHEP),
      fumegado: Math.max(0, running.fumegado),
      PBR: Math.max(0, running.PBR),
      total: Math.max(0, running.CHEP + running.fumegado + running.PBR)
    });
  }

  // Recent movements
  const recentMovements = db.prepare(`
    SELECT * FROM movements ORDER BY movement_date DESC, created_at DESC LIMIT 8
  `).all();

  res.json({
    success: true,
    data: {
      stock: { ...stock, total: stock.CHEP + stock.fumegado + stock.PBR },
      today: todayStats,
      weekly: {
        revenue: weekFinancial.revenue || 0,
        cost: weekFinancial.cost || 0,
        freight: weekFinancial.freight || 0,
        profit: (weekFinancial.revenue || 0) - (weekFinancial.cost || 0) - (weekFinancial.freight || 0)
      },
      monthly: {
        revenue: monthFinancial.revenue || 0,
        cost: monthFinancial.cost || 0,
        freight: monthFinancial.freight || 0,
        profit: (monthFinancial.revenue || 0) - (monthFinancial.cost || 0) - (monthFinancial.freight || 0)
      },
      stockChart,
      movementsChart,
      financialChart,
      recentMovements
    }
  });
});

module.exports = router;
