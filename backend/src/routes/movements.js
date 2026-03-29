const express = require('express');
const db = require('../database/database');
const { authenticate, requireAdmin, requireOperator } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// GET /api/movements - list with filters and pagination
router.get('/', (req, res) => {
  const {
    page = 1,
    limit = 20,
    movement_type,
    pallet_type,
    start_date,
    end_date,
    search
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conditions = [];
  const params = [];

  if (movement_type && ['entry', 'exit'].includes(movement_type)) {
    conditions.push('movement_type = ?');
    params.push(movement_type);
  }
  if (pallet_type && ['CHEP', 'fumegado', 'PBR'].includes(pallet_type)) {
    conditions.push('pallet_type = ?');
    params.push(pallet_type);
  }
  if (start_date) {
    conditions.push('movement_date >= ?');
    params.push(start_date);
  }
  if (end_date) {
    conditions.push('movement_date <= ?');
    params.push(end_date);
  }
  if (search) {
    conditions.push('counterpart LIKE ?');
    params.push(`%${search}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = db.prepare(`SELECT COUNT(*) as count FROM movements ${where}`).get(...params).count;
  const movements = db.prepare(`
    SELECT m.*, u.name as created_by_name
    FROM movements m
    LEFT JOIN users u ON m.created_by = u.id
    ${where}
    ORDER BY m.movement_date DESC, m.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  res.json({
    success: true,
    data: movements,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    }
  });
});

// POST /api/movements - create movement
router.post('/', requireOperator, (req, res) => {
  const { movement_type, pallet_type, quantity, unit_price, freight_value = 0, counterpart, notes, movement_date } = req.body;

  if (!movement_type || !pallet_type || !quantity || !counterpart || !movement_date) {
    return res.status(400).json({ success: false, error: 'Campos obrigatórios não preenchidos' });
  }
  if (!['entry', 'exit'].includes(movement_type)) {
    return res.status(400).json({ success: false, error: 'Tipo de movimentação inválido' });
  }
  if (!['CHEP', 'fumegado', 'PBR'].includes(pallet_type)) {
    return res.status(400).json({ success: false, error: 'Tipo de pallet inválido' });
  }
  if (parseInt(quantity) <= 0) {
    return res.status(400).json({ success: false, error: 'Quantidade deve ser maior que zero' });
  }

  // Check stock for exits
  if (movement_type === 'exit') {
    const stock = db.prepare(`
      SELECT SUM(CASE WHEN movement_type = 'entry' THEN quantity ELSE -quantity END) as qty
      FROM movements WHERE pallet_type = ?
    `).get(pallet_type);
    const currentStock = stock.qty || 0;
    if (parseInt(quantity) > currentStock) {
      return res.status(400).json({ success: false, error: `Estoque insuficiente. Disponível: ${currentStock} pallets ${pallet_type}` });
    }
  }

  const result = db.prepare(`
    INSERT INTO movements (movement_type, pallet_type, quantity, unit_price, freight_value, counterpart, notes, movement_date, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(movement_type, pallet_type, parseInt(quantity), parseFloat(unit_price) || 0, parseFloat(freight_value) || 0, counterpart.trim(), notes || null, movement_date, req.user.id);

  const newMovement = db.prepare('SELECT * FROM movements WHERE id = ?').get(result.lastInsertRowid);

  // Audit trail
  db.prepare('INSERT INTO movement_audit (movement_id, action, new_data, changed_by) VALUES (?, ?, ?, ?)')
    .run(newMovement.id, 'created', JSON.stringify(newMovement), req.user.id);

  res.status(201).json({ success: true, data: newMovement, message: 'Movimentação registrada com sucesso' });
});

// PUT /api/movements/:id - update movement
router.put('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { movement_type, pallet_type, quantity, unit_price, freight_value = 0, counterpart, notes, movement_date } = req.body;

  const existing = db.prepare('SELECT * FROM movements WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ success: false, error: 'Movimentação não encontrada' });

  if (!movement_type || !pallet_type || !quantity || !counterpart || !movement_date) {
    return res.status(400).json({ success: false, error: 'Campos obrigatórios não preenchidos' });
  }
  if (!['entry', 'exit'].includes(movement_type)) {
    return res.status(400).json({ success: false, error: 'Tipo de movimentação inválido' });
  }
  if (!['CHEP', 'fumegado', 'PBR'].includes(pallet_type)) {
    return res.status(400).json({ success: false, error: 'Tipo de pallet inválido' });
  }

  // For stock validation on edit, compute stock excluding this movement
  if (movement_type === 'exit') {
    const stock = db.prepare(`
      SELECT SUM(CASE WHEN movement_type = 'entry' THEN quantity ELSE -quantity END) as qty
      FROM movements WHERE pallet_type = ? AND id != ?
    `).get(pallet_type, id);
    const stockWithout = stock.qty || 0;
    if (parseInt(quantity) > stockWithout) {
      return res.status(400).json({ success: false, error: `Estoque insuficiente. Disponível: ${stockWithout} pallets ${pallet_type}` });
    }
  }

  db.prepare(`
    UPDATE movements
    SET movement_type=?, pallet_type=?, quantity=?, unit_price=?, freight_value=?, counterpart=?, notes=?, movement_date=?
    WHERE id=?
  `).run(movement_type, pallet_type, parseInt(quantity), parseFloat(unit_price) || 0, parseFloat(freight_value) || 0, counterpart.trim(), notes || null, movement_date, id);

  const updated = db.prepare('SELECT * FROM movements WHERE id = ?').get(id);

  // Audit trail
  db.prepare('INSERT INTO movement_audit (movement_id, action, old_data, new_data, changed_by) VALUES (?, ?, ?, ?, ?)')
    .run(id, 'updated', JSON.stringify(existing), JSON.stringify(updated), req.user.id);

  res.json({ success: true, data: updated, message: 'Movimentação atualizada com sucesso' });
});

// DELETE /api/movements/:id
router.delete('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM movements WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ success: false, error: 'Movimentação não encontrada' });

  // Audit trail
  db.prepare('INSERT INTO movement_audit (movement_id, action, old_data, changed_by) VALUES (?, ?, ?, ?)')
    .run(id, 'deleted', JSON.stringify(existing), req.user.id);

  db.prepare('DELETE FROM movements WHERE id = ?').run(id);
  res.json({ success: true, message: 'Movimentação excluída com sucesso' });
});

// GET /api/movements/:id/audit - audit history for a movement
router.get('/:id/audit', (req, res) => {
  const { id } = req.params;
  const audits = db.prepare(`
    SELECT a.*, u.name as changed_by_name
    FROM movement_audit a
    LEFT JOIN users u ON a.changed_by = u.id
    WHERE a.movement_id = ?
    ORDER BY a.changed_at DESC
  `).all(id);
  res.json({ success: true, data: audits });
});

// GET /api/movements/counterparts - autocomplete for counterparts
router.get('/counterparts/list', (req, res) => {
  const counterparts = db.prepare(`
    SELECT DISTINCT counterpart FROM movements ORDER BY counterpart
  `).all();
  res.json({ success: true, data: counterparts.map(c => c.counterpart) });
});

// GET /api/movements/export - export all filtered movements as CSV
router.get('/export/csv', (req, res) => {
  const { movement_type, pallet_type, start_date, end_date, search } = req.query;
  const conditions = [];
  const params = [];

  if (movement_type && ['entry', 'exit'].includes(movement_type)) {
    conditions.push('movement_type = ?'); params.push(movement_type);
  }
  if (pallet_type && ['CHEP', 'fumegado', 'PBR'].includes(pallet_type)) {
    conditions.push('pallet_type = ?'); params.push(pallet_type);
  }
  if (start_date) { conditions.push('movement_date >= ?'); params.push(start_date); }
  if (end_date) { conditions.push('movement_date <= ?'); params.push(end_date); }
  if (search) { conditions.push('counterpart LIKE ?'); params.push(`%${search}%`); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const movements = db.prepare(`
    SELECT m.*, u.name as created_by_name
    FROM movements m LEFT JOIN users u ON m.created_by = u.id
    ${where} ORDER BY m.movement_date DESC, m.created_at DESC
  `).all(...params);

  const BOM = '\uFEFF';
  const header = 'ID;Data;Tipo;Pallet;Quantidade;Preço Unit.;Frete;Total;Parceiro;Observações;Criado por;Criado em';
  const rows = movements.map(m => {
    const total = (m.quantity * m.unit_price).toFixed(2);
    const tipo = m.movement_type === 'entry' ? 'Entrada' : 'Saída';
    const notes = (m.notes || '').replace(/;/g, ',').replace(/\n/g, ' ');
    const counterpart = (m.counterpart || '').replace(/;/g, ',');
    return `${m.id};${m.movement_date};${tipo};${m.pallet_type};${m.quantity};${(m.unit_price || 0).toFixed(2)};${(m.freight_value || 0).toFixed(2)};${total};${counterpart};${notes};${m.created_by_name || ''};${m.created_at || ''}`;
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=movimentacoes.csv');
  res.send(BOM + header + '\n' + rows.join('\n'));
});

module.exports = router;
