/**
 * Local SQLite database for native (Android) standalone mode.
 * Mirrors the backend schema so the app works without a server.
 */
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

const sqlite = new SQLiteConnection(CapacitorSQLite);
let db = null;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movement_type TEXT NOT NULL,
  pallet_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL DEFAULT 0,
  freight_value REAL NOT NULL DEFAULT 0,
  counterpart TEXT NOT NULL,
  notes TEXT,
  movement_date DATE NOT NULL,
  created_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_mov_date ON movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_mov_type ON movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_mov_pallet ON movements(pallet_type);
`;

export async function initLocalDb() {
  if (db) return db;
  const ret = await sqlite.checkConnectionsConsistency();
  const isConn = (await sqlite.isConnection('pallets', false)).result;
  if (isConn) {
    db = await sqlite.retrieveConnection('pallets', false);
  } else {
    db = await sqlite.createConnection('pallets', false, 'no-encryption', 1, false);
  }
  await db.open();
  await db.execute(SCHEMA);
  // Seed default users if empty
  const { values } = await db.query('SELECT COUNT(*) as c FROM users');
  if (!values || values[0]?.c === 0) {
    await db.run(`INSERT INTO users (username, password, name, role) VALUES ('admin', 'admin123', 'Administrador', 'admin')`);
    await db.run(`INSERT INTO users (username, password, name, role) VALUES ('usuario', 'user123', 'Usuário Padrão', 'user')`);
  }
  return db;
}

export async function query(sql, params = []) {
  const d = await initLocalDb();
  const res = await d.query(sql, params);
  return res.values || [];
}

export async function run(sql, params = []) {
  const d = await initLocalDb();
  const res = await d.run(sql, params);
  return res.changes || {};
}

export async function getOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}
