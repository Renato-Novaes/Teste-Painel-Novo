/**
 * Local API adapter — replaces axios calls when running natively (Android).
 * Uses Capacitor SQLite so no server is needed.
 * Returns data in the same { data: { ... } } shape that axios would.
 */
import { query, run, getOne } from './localDb';

function ok(data) { return { data: { success: true, data } }; }
function okMsg(data, message) { return { data: { success: true, data, message } }; }
function err(error, status = 400) { const e = new Error(error); e.response = { status, data: { success: false, error } }; throw e; }

function todayStr() { return new Date().toISOString().split('T')[0]; }
function dateStr(d) { return d.toISOString().split('T')[0]; }
function f2(v) { return parseFloat((v || 0).toFixed(2)); }

// ── Auth ──────────────────────────────────────────────────────────────

async function authLogin(data) {
  const { username, password } = data;
  if (!username || !password) err('Usuário e senha são obrigatórios');
  const user = await getOne('SELECT * FROM users WHERE username = ?', [username.trim()]);
  if (!user) err('Usuário ou senha inválidos', 401);
  // Simple password check (no bcrypt on mobile — passwords stored as plaintext)
  if (user.password !== password) err('Usuário ou senha inválidos', 401);
  const token = `local_${user.id}_${Date.now()}`;
  localStorage.setItem('_local_user', JSON.stringify({ id: user.id, username: user.username, name: user.name, role: user.role }));
  return ok({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
}

async function authMe() {
  const u = JSON.parse(localStorage.getItem('_local_user') || 'null');
  if (!u) err('Não autenticado', 401);
  return ok(u);
}

// ── Dashboard ─────────────────────────────────────────────────────────

async function dashboard() {
  const today = todayStr();
  // Stock
  const stockRows = await query(`SELECT pallet_type, SUM(CASE WHEN movement_type='entry' THEN quantity ELSE -quantity END) as quantity FROM movements GROUP BY pallet_type`);
  const stock = { CHEP: 0, fumegado: 0, PBR: 0 };
  for (const r of stockRows) stock[r.pallet_type] = Math.max(0, r.quantity || 0);

  // Today
  const todayRows = await query(`SELECT movement_type, COUNT(*) as count, SUM(quantity) as total_qty, SUM(quantity*unit_price) as total_value, SUM(freight_value) as total_freight FROM movements WHERE movement_date=? GROUP BY movement_type`, [today]);
  const ts = { entries_count: 0, entries_qty: 0, entries_value: 0, exits_count: 0, exits_qty: 0, exits_value: 0, freight_total: 0 };
  for (const r of todayRows) {
    if (r.movement_type === 'entry') { ts.entries_count = r.count; ts.entries_qty = r.total_qty; ts.entries_value = r.total_value || 0; }
    else { ts.exits_count = r.count; ts.exits_qty = r.total_qty; ts.exits_value = r.total_value || 0; }
    ts.freight_total += r.total_freight || 0;
  }

  // Week
  const ws = new Date(); ws.setDate(ws.getDate() - ws.getDay());
  const wf = await getOne(`SELECT SUM(CASE WHEN movement_type='exit' THEN quantity*unit_price ELSE 0 END) as revenue, SUM(CASE WHEN movement_type='entry' THEN quantity*unit_price ELSE 0 END) as cost, SUM(freight_value) as freight FROM movements WHERE movement_date>=?`, [dateStr(ws)]);

  // Month
  const ms = new Date(); ms.setDate(1);
  const mf = await getOne(`SELECT SUM(CASE WHEN movement_type='exit' THEN quantity*unit_price ELSE 0 END) as revenue, SUM(CASE WHEN movement_type='entry' THEN quantity*unit_price ELSE 0 END) as cost, SUM(freight_value) as freight FROM movements WHERE movement_date>=?`, [dateStr(ms)]);

  // Charts (30 days)
  const ago = new Date(); ago.setDate(ago.getDate() - 29);
  const agoStr = dateStr(ago);

  const dmRaw = await query(`SELECT movement_date as date, movement_type, SUM(quantity) as qty, SUM(quantity*unit_price) as value, SUM(freight_value) as freight FROM movements WHERE movement_date>=? GROUP BY date, movement_type ORDER BY date`, [agoStr]);
  const mm = {};
  for (const r of dmRaw) {
    if (!mm[r.date]) mm[r.date] = { date: r.date, entries: 0, exits: 0, revenue: 0, cost: 0, freight: 0 };
    if (r.movement_type === 'entry') { mm[r.date].entries = r.qty; mm[r.date].cost = r.value || 0; }
    else { mm[r.date].exits = r.qty; mm[r.date].revenue = r.value || 0; }
    mm[r.date].freight += r.freight || 0;
  }
  const movementsChart = [];
  for (let i = 0; i < 30; i++) { const d = new Date(ago); d.setDate(d.getDate() + i); const ds = dateStr(d); movementsChart.push(mm[ds] || { date: ds, entries: 0, exits: 0, revenue: 0, cost: 0, freight: 0 }); }

  const financialChart = movementsChart.map(d => ({ date: d.date, receita: f2(d.revenue), custo: f2(d.cost), frete: f2(d.freight), lucro: f2((d.revenue||0)-(d.cost||0)-(d.freight||0)) }));

  // Stock chart
  const blRows = await query(`SELECT pallet_type, SUM(CASE WHEN movement_type='entry' THEN quantity ELSE -quantity END) as qty FROM movements WHERE movement_date<? GROUP BY pallet_type`, [agoStr]);
  const bl = { CHEP: 0, fumegado: 0, PBR: 0 };
  for (const r of blRows) bl[r.pallet_type] = r.qty || 0;

  const dsRaw = await query(`SELECT movement_date as date, pallet_type, SUM(CASE WHEN movement_type='entry' THEN quantity ELSE -quantity END) as net FROM movements WHERE movement_date>=? GROUP BY date, pallet_type ORDER BY date`, [agoStr]);
  const dsm = {};
  for (const r of dsRaw) { if (!dsm[r.date]) dsm[r.date] = {}; dsm[r.date][r.pallet_type] = r.net; }

  const stockChart = [];
  const running = { ...bl };
  for (let i = 0; i < 30; i++) {
    const d = new Date(ago); d.setDate(d.getDate() + i); const ds = dateStr(d);
    if (dsm[ds]) { for (const t of ['CHEP','fumegado','PBR']) { if (dsm[ds][t] !== undefined) running[t] += dsm[ds][t]; } }
    stockChart.push({ date: ds, CHEP: Math.max(0,running.CHEP), fumegado: Math.max(0,running.fumegado), PBR: Math.max(0,running.PBR), total: Math.max(0,running.CHEP+running.fumegado+running.PBR) });
  }

  const recentMovements = await query(`SELECT * FROM movements ORDER BY movement_date DESC, created_at DESC LIMIT 8`);

  return ok({
    stock: { ...stock, total: stock.CHEP + stock.fumegado + stock.PBR },
    today: ts,
    weekly: { revenue: (wf?.revenue||0), cost: (wf?.cost||0), freight: (wf?.freight||0), profit: (wf?.revenue||0)-(wf?.cost||0)-(wf?.freight||0) },
    monthly: { revenue: (mf?.revenue||0), cost: (mf?.cost||0), freight: (mf?.freight||0), profit: (mf?.revenue||0)-(mf?.cost||0)-(mf?.freight||0) },
    stockChart, movementsChart, financialChart, recentMovements
  });
}

// ── Movements ─────────────────────────────────────────────────────────

async function getMovements(params) {
  const { page = 1, limit = 20, movement_type, pallet_type, start_date, end_date, search } = params;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const conds = []; const vals = [];
  if (movement_type && ['entry','exit'].includes(movement_type)) { conds.push('movement_type=?'); vals.push(movement_type); }
  if (pallet_type && ['CHEP','fumegado','PBR'].includes(pallet_type)) { conds.push('pallet_type=?'); vals.push(pallet_type); }
  if (start_date) { conds.push('movement_date>=?'); vals.push(start_date); }
  if (end_date) { conds.push('movement_date<=?'); vals.push(end_date); }
  if (search) { conds.push('counterpart LIKE ?'); vals.push(`%${search}%`); }
  const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : '';

  const countRow = await getOne(`SELECT COUNT(*) as count FROM movements ${where}`, vals);
  const total = countRow?.count || 0;
  const movements = await query(`SELECT m.*, u.name as created_by_name FROM movements m LEFT JOIN users u ON m.created_by=u.id ${where} ORDER BY m.movement_date DESC, m.created_at DESC LIMIT ? OFFSET ?`, [...vals, parseInt(limit), offset]);
  return { data: { success: true, data: movements, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } } };
}

async function createMovement(data) {
  const { movement_type, pallet_type, quantity, unit_price, freight_value = 0, counterpart, notes, movement_date } = data;
  if (!movement_type || !pallet_type || !quantity || !counterpart || !movement_date) err('Campos obrigatórios não preenchidos');
  if (!['entry','exit'].includes(movement_type)) err('Tipo inválido');
  if (!['CHEP','fumegado','PBR'].includes(pallet_type)) err('Pallet inválido');
  if (parseInt(quantity) <= 0) err('Quantidade deve ser maior que zero');

  if (movement_type === 'exit') {
    const s = await getOne(`SELECT SUM(CASE WHEN movement_type='entry' THEN quantity ELSE -quantity END) as qty FROM movements WHERE pallet_type=?`, [pallet_type]);
    if (parseInt(quantity) > (s?.qty || 0)) err(`Estoque insuficiente. Disponível: ${s?.qty || 0} pallets ${pallet_type}`);
  }

  const user = JSON.parse(localStorage.getItem('_local_user') || '{}');
  const res = await run(`INSERT INTO movements (movement_type,pallet_type,quantity,unit_price,freight_value,counterpart,notes,movement_date,created_by) VALUES (?,?,?,?,?,?,?,?,?)`,
    [movement_type, pallet_type, parseInt(quantity), parseFloat(unit_price)||0, parseFloat(freight_value)||0, counterpart.trim(), notes||null, movement_date, user.id||1]);
  const created = await getOne(`SELECT * FROM movements WHERE id=?`, [res.lastId]);
  return okMsg(created, 'Movimentação registrada com sucesso');
}

async function updateMovement(id, data) {
  const { movement_type, pallet_type, quantity, unit_price, freight_value = 0, counterpart, notes, movement_date } = data;
  const existing = await getOne('SELECT * FROM movements WHERE id=?', [id]);
  if (!existing) err('Movimentação não encontrada', 404);
  if (!movement_type || !pallet_type || !quantity || !counterpart || !movement_date) err('Campos obrigatórios não preenchidos');

  if (movement_type === 'exit') {
    const s = await getOne(`SELECT SUM(CASE WHEN movement_type='entry' THEN quantity ELSE -quantity END) as qty FROM movements WHERE pallet_type=? AND id!=?`, [pallet_type, id]);
    if (parseInt(quantity) > (s?.qty || 0)) err(`Estoque insuficiente. Disponível: ${s?.qty || 0} pallets ${pallet_type}`);
  }

  await run(`UPDATE movements SET movement_type=?,pallet_type=?,quantity=?,unit_price=?,freight_value=?,counterpart=?,notes=?,movement_date=? WHERE id=?`,
    [movement_type, pallet_type, parseInt(quantity), parseFloat(unit_price)||0, parseFloat(freight_value)||0, counterpart.trim(), notes||null, movement_date, id]);
  const updated = await getOne('SELECT * FROM movements WHERE id=?', [id]);
  return okMsg(updated, 'Movimentação atualizada com sucesso');
}

async function deleteMovement(id) {
  const existing = await getOne('SELECT * FROM movements WHERE id=?', [id]);
  if (!existing) err('Movimentação não encontrada', 404);
  await run('DELETE FROM movements WHERE id=?', [id]);
  return okMsg(null, 'Movimentação excluída com sucesso');
}

// ── Stock ─────────────────────────────────────────────────────────────

async function getStock() {
  const rows = await query(`SELECT pallet_type, SUM(CASE WHEN movement_type='entry' THEN quantity ELSE -quantity END) as quantity, SUM(CASE WHEN movement_type='entry' THEN 1 ELSE 0 END) as total_entries, SUM(CASE WHEN movement_type='exit' THEN 1 ELSE 0 END) as total_exits FROM movements GROUP BY pallet_type`);
  const stock = { CHEP: 0, fumegado: 0, PBR: 0 };
  const stats = { CHEP: { entries: 0, exits: 0 }, fumegado: { entries: 0, exits: 0 }, PBR: { entries: 0, exits: 0 } };
  for (const r of rows) { stock[r.pallet_type] = Math.max(0, r.quantity||0); stats[r.pallet_type] = { entries: r.total_entries||0, exits: r.total_exits||0 }; }
  return ok({ stock, stats, total: stock.CHEP + stock.fumegado + stock.PBR });
}

async function getStockChart(params) {
  const days = parseInt(params.days) || 30;
  const start = new Date(); start.setDate(start.getDate() - days + 1);
  const startStr = dateStr(start);

  const blRows = await query(`SELECT pallet_type, SUM(CASE WHEN movement_type='entry' THEN quantity ELSE -quantity END) as qty FROM movements WHERE movement_date<? GROUP BY pallet_type`, [startStr]);
  const bl = { CHEP: 0, fumegado: 0, PBR: 0 };
  for (const r of blRows) bl[r.pallet_type] = r.qty || 0;

  const dmRaw = await query(`SELECT movement_date as date, pallet_type, SUM(CASE WHEN movement_type='entry' THEN quantity ELSE -quantity END) as net FROM movements WHERE movement_date>=? GROUP BY date, pallet_type ORDER BY date`, [startStr]);
  const dm = {};
  for (const r of dmRaw) { if (!dm[r.date]) dm[r.date] = {}; dm[r.date][r.pallet_type] = r.net; }

  const chart = []; const running = { ...bl };
  for (let i = 0; i < days; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i); const ds = dateStr(d);
    if (dm[ds]) { for (const t of ['CHEP','fumegado','PBR']) { if (dm[ds][t] !== undefined) running[t] += dm[ds][t]; } }
    chart.push({ date: ds, CHEP: Math.max(0,running.CHEP), fumegado: Math.max(0,running.fumegado), PBR: Math.max(0,running.PBR), total: Math.max(0,running.CHEP+running.fumegado+running.PBR) });
  }
  return ok(chart);
}

// ── Financial ─────────────────────────────────────────────────────────

async function financialSummary(params) {
  const { period = 'month', start_date, end_date } = params;
  const today = new Date(); const td = todayStr();
  let startStr, endStr;
  if (start_date && end_date) { startStr = start_date; endStr = end_date; }
  else {
    endStr = td;
    if (period === 'day') startStr = td;
    else if (period === 'week') { const d = new Date(today); d.setDate(d.getDate()-6); startStr = dateStr(d); }
    else if (period === 'month') { const d = new Date(today); d.setDate(d.getDate()-29); startStr = dateStr(d); }
    else startStr = '2000-01-01';
  }

  const ov = await getOne(`SELECT SUM(CASE WHEN movement_type='exit' THEN quantity*unit_price ELSE 0 END) as revenue, SUM(CASE WHEN movement_type='entry' THEN quantity*unit_price ELSE 0 END) as cost, SUM(freight_value) as freight, SUM(CASE WHEN movement_type='entry' THEN quantity ELSE 0 END) as total_bought, SUM(CASE WHEN movement_type='exit' THEN quantity ELSE 0 END) as total_sold, COUNT(*) as total_movements FROM movements WHERE movement_date BETWEEN ? AND ?`, [startStr, endStr]);

  const byType = await query(`SELECT pallet_type, SUM(CASE WHEN movement_type='exit' THEN quantity*unit_price ELSE 0 END) as revenue, SUM(CASE WHEN movement_type='entry' THEN quantity*unit_price ELSE 0 END) as cost, SUM(CASE WHEN movement_type='entry' THEN quantity ELSE 0 END) as bought, SUM(CASE WHEN movement_type='exit' THEN quantity ELSE 0 END) as sold, SUM(freight_value) as freight, AVG(CASE WHEN movement_type='entry' THEN unit_price ELSE NULL END) as avg_entry_price, AVG(CASE WHEN movement_type='exit' THEN unit_price ELSE NULL END) as avg_exit_price FROM movements WHERE movement_date BETWEEN ? AND ? GROUP BY pallet_type`, [startStr, endStr]);

  const dailyChart = await query(`SELECT movement_date as date, SUM(CASE WHEN movement_type='exit' THEN quantity*unit_price ELSE 0 END) as receita, SUM(CASE WHEN movement_type='entry' THEN quantity*unit_price ELSE 0 END) as custo, SUM(freight_value) as frete FROM movements WHERE movement_date BETWEEN ? AND ? GROUP BY date ORDER BY date`, [startStr, endStr]);
  const chart = dailyChart.map(d => ({ ...d, receita: f2(d.receita), custo: f2(d.custo), frete: f2(d.frete), lucro: f2((d.receita||0)-(d.custo||0)-(d.frete||0)) }));

  const rev = ov?.revenue||0, cost = ov?.cost||0, fr = ov?.freight||0;
  return ok({ period: { start: startStr, end: endStr }, summary: { revenue: f2(rev), cost: f2(cost), freight: f2(fr), profit: f2(rev-cost-fr), total_bought: ov?.total_bought||0, total_sold: ov?.total_sold||0, total_movements: ov?.total_movements||0 }, byType, chart });
}

async function financialFreight(params) {
  const { start_date, end_date } = params;
  const td = todayStr(); const ago = new Date(); ago.setDate(ago.getDate()-29);
  const startStr = start_date || dateStr(ago); const endStr = end_date || td;

  const s = await getOne(`SELECT SUM(freight_value) as total_freight, SUM(CASE WHEN movement_type='entry' THEN freight_value ELSE 0 END) as entry_freight, SUM(CASE WHEN movement_type='exit' THEN freight_value ELSE 0 END) as exit_freight, COUNT(CASE WHEN freight_value>0 THEN 1 END) as movements_with_freight, AVG(CASE WHEN freight_value>0 THEN freight_value END) as avg_freight FROM movements WHERE movement_date BETWEEN ? AND ?`, [startStr, endStr]);

  const byType = await query(`SELECT pallet_type, SUM(freight_value) as total_freight, COUNT(CASE WHEN freight_value>0 THEN 1 END) as count FROM movements WHERE movement_date BETWEEN ? AND ? AND freight_value>0 GROUP BY pallet_type`, [startStr, endStr]);
  const byMovementType = await query(`SELECT movement_type, SUM(freight_value) as total_freight, COUNT(CASE WHEN freight_value>0 THEN 1 END) as count FROM movements WHERE movement_date BETWEEN ? AND ? AND freight_value>0 GROUP BY movement_type`, [startStr, endStr]);
  const topCounterparts = await query(`SELECT counterpart, SUM(freight_value) as total_freight, COUNT(*) as count FROM movements WHERE movement_date BETWEEN ? AND ? AND freight_value>0 GROUP BY counterpart ORDER BY total_freight DESC LIMIT 10`, [startStr, endStr]);
  const dailyChart = await query(`SELECT movement_date as date, SUM(freight_value) as total_freight, SUM(CASE WHEN movement_type='entry' THEN freight_value ELSE 0 END) as entry_freight, SUM(CASE WHEN movement_type='exit' THEN freight_value ELSE 0 END) as exit_freight FROM movements WHERE movement_date BETWEEN ? AND ? GROUP BY date ORDER BY date`, [startStr, endStr]);

  return ok({ period: { start: startStr, end: endStr }, summary: { total_freight: f2(s?.total_freight), entry_freight: f2(s?.entry_freight), exit_freight: f2(s?.exit_freight), movements_with_freight: s?.movements_with_freight||0, avg_freight: f2(s?.avg_freight) }, byType, byMovementType, topCounterparts, dailyChart });
}

// ── Router ────────────────────────────────────────────────────────────

/**
 * Route a request locally. Matches the axios interface:
 *   localApi.get(url, { params })  → { data: { success, data } }
 *   localApi.post(url, body)       → { data: { success, data } }
 */
export const localApi = {
  async get(url, config = {}) {
    const params = config.params || {};
    if (url === '/api/health') return { data: { success: true, message: 'Local mode' } };
    if (url === '/api/auth/me') return authMe();
    if (url === '/api/dashboard') return dashboard();
    if (url === '/api/movements') return getMovements(params);
    if (url === '/api/stock') return getStock();
    if (url === '/api/stock/chart') return getStockChart(params);
    if (url === '/api/financial/summary') return financialSummary(params);
    if (url === '/api/financial/freight') return financialFreight(params);
    err('Rota não encontrada', 404);
  },
  async post(url, data = {}) {
    if (url === '/api/auth/login') return authLogin(data);
    if (url === '/api/movements') return createMovement(data);
    err('Rota não encontrada', 404);
  },
  async put(url, data = {}) {
    const m = url.match(/^\/api\/movements\/(\d+)$/);
    if (m) return updateMovement(parseInt(m[1]), data);
    err('Rota não encontrada', 404);
  },
  async delete(url) {
    const m = url.match(/^\/api\/movements\/(\d+)$/);
    if (m) return deleteMovement(parseInt(m[1]));
    err('Rota não encontrada', 404);
  },

  // Mimic axios interface
  defaults: { headers: { common: {} } },
  interceptors: {
    request: { use() {} },
    response: { use() {} }
  }
};
