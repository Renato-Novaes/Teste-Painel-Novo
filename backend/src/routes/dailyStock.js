const express = require('express');
const db = require('../database/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/daily-stock?date=YYYY-MM-DD  (defaults to today)
router.get('/', (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const row = db.prepare('SELECT * FROM daily_stock WHERE stock_date = ?').get(date);

  const data = row
    ? {
        stock_date: row.stock_date,
        CHEP: row.chep,
        PBR: row.pbr,
        fumegado: row.fumegado,
        quebrado: row.quebrado,
        paraTriar: row.para_triar,
        pbrTriados: row.pbr_triados,
        pbrParaTriar: row.pbr_para_triar,
        fumegadoTriados: row.fumegado_triados,
        fumegadoParaTriar: row.fumegado_para_triar,
      }
    : null;

  res.json({ success: true, data });
});

// PUT /api/daily-stock  — upsert today's count
router.put('/', (req, res) => {
  const {
    stock_date,
    CHEP = 0, PBR = 0, fumegado = 0,
    quebrado = 0, paraTriar = 0,
    pbrTriados = 0, pbrParaTriar = 0,
    fumegadoTriados = 0, fumegadoParaTriar = 0,
  } = req.body;

  const date = stock_date || new Date().toISOString().split('T')[0];

  db.prepare(`
    INSERT INTO daily_stock (stock_date, chep, pbr, fumegado, quebrado, para_triar, pbr_triados, pbr_para_triar, fumegado_triados, fumegado_para_triar, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(stock_date) DO UPDATE SET
      chep = excluded.chep,
      pbr = excluded.pbr,
      fumegado = excluded.fumegado,
      quebrado = excluded.quebrado,
      para_triar = excluded.para_triar,
      pbr_triados = excluded.pbr_triados,
      pbr_para_triar = excluded.pbr_para_triar,
      fumegado_triados = excluded.fumegado_triados,
      fumegado_para_triar = excluded.fumegado_para_triar,
      updated_by = excluded.updated_by,
      updated_at = CURRENT_TIMESTAMP
  `).run(
    date,
    parseInt(CHEP) || 0,
    parseInt(PBR) || 0,
    parseInt(fumegado) || 0,
    parseInt(quebrado) || 0,
    parseInt(paraTriar) || 0,
    parseInt(pbrTriados) || 0,
    parseInt(pbrParaTriar) || 0,
    parseInt(fumegadoTriados) || 0,
    parseInt(fumegadoParaTriar) || 0,
    req.user.id,
  );

  const saved = db.prepare('SELECT * FROM daily_stock WHERE stock_date = ?').get(date);

  res.json({
    success: true,
    data: {
      stock_date: saved.stock_date,
      CHEP: saved.chep,
      PBR: saved.pbr,
      fumegado: saved.fumegado,
      quebrado: saved.quebrado,
      paraTriar: saved.para_triar,
      pbrTriados: saved.pbr_triados,
      pbrParaTriar: saved.pbr_para_triar,
      fumegadoTriados: saved.fumegado_triados,
      fumegadoParaTriar: saved.fumegado_para_triar,
    },
    message: 'Contagem diária salva',
  });
});

module.exports = router;
