import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dbPath = process.env.DB_PATH || path.resolve(process.cwd(), "data", "app.db");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function initializeDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS training_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS plan_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL,
      equipment TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      sets INTEGER NOT NULL,
      reps INTEGER,
      target_weight REAL,
      notes TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(plan_id) REFERENCES training_plans(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS training_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plan_id INTEGER,
      status TEXT NOT NULL DEFAULT 'active',
      started_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      session_notes TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(plan_id) REFERENCES training_plans(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS session_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      equipment TEXT NOT NULL,
      exercise_name TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      reps INTEGER,
      weight REAL,
      notes TEXT,
      completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(session_id) REFERENCES training_sessions(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_plans_user_id ON training_plans(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON training_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sets_session_id ON session_sets(session_id);
  `);
}
