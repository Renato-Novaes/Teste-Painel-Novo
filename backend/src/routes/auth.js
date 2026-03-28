const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/database');
const { authenticate } = require('../middleware/auth');

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

module.exports = router;
