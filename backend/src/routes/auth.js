const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Usuário e senha são obrigatórios' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
  if (!user) {
    return res.status(401).json({ success: false, error: 'Usuário ou senha inválidos' });
  }

  const validPassword = bcrypt.compareSync(password, user.password);
  if (!validPassword) {
    return res.status(401).json({ success: false, error: 'Usuário ou senha inválidos' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({
    success: true,
    data: {
      token,
      user: { id: user.id, username: user.username, name: user.name, role: user.role }
    }
  });
});

router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, username, name, role FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
  res.json({ success: true, data: user });
});

// GET /api/auth/users - list all users (admin only)
router.get('/users', authenticate, requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, username, name, role, created_at FROM users ORDER BY id').all();
  res.json({ success: true, data: users });
});

// POST /api/auth/users - create user (admin only)
router.post('/users', authenticate, requireAdmin, (req, res) => {
  const { username, password, name, role } = req.body;
  if (!username || !password || !name || !role) {
    return res.status(400).json({ success: false, error: 'Todos os campos são obrigatórios' });
  }
  if (!['admin', 'operator', 'viewer'].includes(role)) {
    return res.status(400).json({ success: false, error: 'Role inválido' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username.trim());
  if (existing) {
    return res.status(400).json({ success: false, error: 'Username já existe' });
  }
  const hashed = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)')
    .run(username.trim(), hashed, name.trim(), role);
  const user = db.prepare('SELECT id, username, name, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, data: user });
});

// PUT /api/auth/users/:id - update user (admin only)
router.put('/users/:id', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, role, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado' });

  if (name) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), id);
  if (role && ['admin', 'operator', 'viewer'].includes(role)) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  }
  if (password) {
    const hashed = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, id);
  }

  const updated = db.prepare('SELECT id, username, name, role, created_at FROM users WHERE id = ?').get(id);
  res.json({ success: true, data: updated });
});

// DELETE /api/auth/users/:id - delete user (admin only)
router.delete('/users/:id', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ success: false, error: 'Não é possível excluir seu próprio usuário' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ success: true, message: 'Usuário excluído' });
});

module.exports = router;
