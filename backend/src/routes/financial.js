const express = require('express');
const db = require('../database/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/financial/summary?period=month|week|day|all&start_date=&end_date=
router.get('/summary', (req, res) => {
  const { period = 'month', start_date, end_date } = req.query;

  let startStr, endStr;
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  if (start_date && end_date) {
    startStr = start_date;
    endStr = end_date;
  } else {
    endStr = todayStr;
    if (period === 'day') {
      startStr = todayStr;
    } else if (period === 'week') {
      const d = new Date(today);
      d.setDate(d.getDate() - 6);
      startStr = d.toISOString().split('T')[0];
    } else if (period === 'month') {
      const d = new Date(today);
      d.setDate(d.getDate() - 29);
      startStr = d.toISOString().split('T')[0];
    } else {
      startStr = '2000-01-01';
    }
  }

  // Overall summary
  const overall = db.prepare(`
    SELECT
      SUM(CASE WHEN movement_type = 'exit' THEN quantity * unit_price ELSE 0 END) as revenue,
      SUM(CASE WHEN movement_type = 'entry' THEN quantity * unit_price ELSE 0 END) as cost,
      SUM(freight_value) as freight,
      SUM(CASE WHEN movement_type = 'entry' THEN quantity ELSE 0 END) as total_bought,
      SUM(CASE WHEN movement_type = 'exit' THEN quantity ELSE 0 END) as total_sold,
      COUNT(*) as total_movements
    FROM movements
    WHERE movement_date BETWEEN ? AND ?
  `).get(startStr, endStr);

  // By pallet type
  const byType = db.prepare(`
    SELECT
      pallet_type,
      SUM(CASE WHEN movement_type = 'exit' THEN quantity * unit_price ELSE 0 END) as revenue,
      SUM(CASE WHEN movement_type = 'entry' THEN quantity * unit_price ELSE 0 END) as cost,
      SUM(CASE WHEN movement_type = 'entry' THEN quantity ELSE 0 END) as bought,
      SUM(CASE WHEN movement_type = 'exit' THEN quantity ELSE 0 END) as sold,
      SUM(freight_value) as freight,
      AVG(CASE WHEN movement_type = 'entry' THEN unit_price ELSE NULL END) as avg_entry_price,
      AVG(CASE WHEN movement_type = 'exit' THEN unit_price ELSE NULL END) as avg_exit_price
    FROM movements
    WHERE movement_date BETWEEN ? AND ?
    GROUP BY pallet_type
  `).all(startStr, endStr);

  // Daily chart for period
  const dailyChart = db.prepare(`
    SELECT movement_date as date,
      SUM(CASE WHEN movement_type = 'exit' THEN quantity * unit_price ELSE 0 END) as receita,
      SUM(CASE WHEN movement_type = 'entry' THEN quantity * unit_price ELSE 0 END) as custo,
      SUM(freight_value) as frete
    FROM movements
    WHERE movement_date BETWEEN ? AND ?
    GROUP BY date
    ORDER BY date
  `).all(startStr, endStr);

  const chartWithProfit = dailyChart.map(d => ({
    ...d,
    receita: parseFloat((d.receita || 0).toFixed(2)),
    custo: parseFloat((d.custo || 0).toFixed(2)),
    frete: parseFloat((d.frete || 0).toFixed(2)),
    lucro: parseFloat(((d.receita || 0) - (d.custo || 0) - (d.frete || 0)).toFixed(2))
  }));

  const revenue = overall.revenue || 0;
  const cost = overall.cost || 0;
  const freight = overall.freight || 0;
  const profit = revenue - cost - freight;

  res.json({
    success: true,
    data: {
      period: { start: startStr, end: endStr },
      summary: {
        revenue: parseFloat(revenue.toFixed(2)),
        cost: parseFloat(cost.toFixed(2)),
        freight: parseFloat(freight.toFixed(2)),
        profit: parseFloat(profit.toFixed(2)),
        total_bought: overall.total_bought || 0,
        total_sold: overall.total_sold || 0,
        total_movements: overall.total_movements || 0
      },
      byType,
      chart: chartWithProfit
    }
  });
});

// GET /api/financial/freight - freight analysis
router.get('/freight', (req, res) => {
  const { start_date, end_date } = req.query;
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);

  const startStr = start_date || thirtyDaysAgo.toISOString().split('T')[0];
  const endStr = end_date || today;

  const summary = db.prepare(`
    SELECT
      SUM(freight_value) as total_freight,
      SUM(CASE WHEN movement_type = 'entry' THEN freight_value ELSE 0 END) as entry_freight,
      SUM(CASE WHEN movement_type = 'exit' THEN freight_value ELSE 0 END) as exit_freight,
      COUNT(CASE WHEN freight_value > 0 THEN 1 END) as movements_with_freight,
      AVG(CASE WHEN freight_value > 0 THEN freight_value END) as avg_freight
    FROM movements
    WHERE movement_date BETWEEN ? AND ?
  `).get(startStr, endStr);

  const byType = db.prepare(`
    SELECT pallet_type,
      SUM(freight_value) as total_freight,
      COUNT(CASE WHEN freight_value > 0 THEN 1 END) as count
    FROM movements
    WHERE movement_date BETWEEN ? AND ? AND freight_value > 0
    GROUP BY pallet_type
  `).all(startStr, endStr);

  const byMovementType = db.prepare(`
    SELECT movement_type,
      SUM(freight_value) as total_freight,
      COUNT(CASE WHEN freight_value > 0 THEN 1 END) as count
    FROM movements
    WHERE movement_date BETWEEN ? AND ? AND freight_value > 0
    GROUP BY movement_type
  `).all(startStr, endStr);

  const topCounterparts = db.prepare(`
    SELECT counterpart,
      SUM(freight_value) as total_freight,
      COUNT(*) as count
    FROM movements
    WHERE movement_date BETWEEN ? AND ? AND freight_value > 0
    GROUP BY counterpart
    ORDER BY total_freight DESC
    LIMIT 10
  `).all(startStr, endStr);

  const dailyFreight = db.prepare(`
    SELECT movement_date as date,
      SUM(freight_value) as total_freight,
      SUM(CASE WHEN movement_type = 'entry' THEN freight_value ELSE 0 END) as entry_freight,
      SUM(CASE WHEN movement_type = 'exit' THEN freight_value ELSE 0 END) as exit_freight
    FROM movements
    WHERE movement_date BETWEEN ? AND ?
    GROUP BY date ORDER BY date
  `).all(startStr, endStr);

  res.json({
    success: true,
    data: {
      period: { start: startStr, end: endStr },
      summary: {
        total_freight: parseFloat((summary.total_freight || 0).toFixed(2)),
        entry_freight: parseFloat((summary.entry_freight || 0).toFixed(2)),
        exit_freight: parseFloat((summary.exit_freight || 0).toFixed(2)),
        movements_with_freight: summary.movements_with_freight || 0,
        avg_freight: parseFloat((summary.avg_freight || 0).toFixed(2))
      },
      byType,
      byMovementType,
      topCounterparts,
      dailyChart: dailyFreight
    }
  });
});

module.exports = router;
