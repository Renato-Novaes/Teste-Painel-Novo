const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Allow Electron to override the DB path (stores in userData)
const DB_PATH = process.env.PALLET_DB_PATH || path.join(__dirname, '../../data/pallets.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    movement_type TEXT NOT NULL CHECK(movement_type IN ('entry', 'exit')),
    pallet_type TEXT NOT NULL CHECK(pallet_type IN ('CHEP', 'fumegado', 'PBR')),
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    unit_price REAL NOT NULL DEFAULT 0 CHECK(unit_price >= 0),
    freight_value REAL NOT NULL DEFAULT 0 CHECK(freight_value >= 0),
    counterpart TEXT NOT NULL,
    notes TEXT,
    movement_date DATE NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_movements_date ON movements(movement_date);
  CREATE INDEX IF NOT EXISTS idx_movements_type ON movements(movement_type);
  CREATE INDEX IF NOT EXISTS idx_movements_pallet ON movements(pallet_type);
  CREATE INDEX IF NOT EXISTS idx_movements_counterpart ON movements(counterpart);
`);

function seedData() {
  const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (usersCount.count === 0) {
    const adminPass = bcrypt.hashSync('admin123', 10);
    const userPass = bcrypt.hashSync('user123', 10);
    db.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)').run('admin', adminPass, 'Administrador', 'admin');
    db.prepare('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)').run('usuario', userPass, 'Usuário Padrão', 'user');
    console.log('✓ Usuários criados: admin/admin123 e usuario/user123');
  }

}

seedData();

module.exports = db;
