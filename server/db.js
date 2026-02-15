const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.resolve(__dirname, 'gym.db'), { verbose: console.log });
db.pragma('journal_mode = WAL'); // Optimización para concurrencia y velocidad

// Inicialización de Tablas (Schema)
const initScript = `
  CREATE TABLE IF NOT EXISTS programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS program_weeks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id INTEGER,
    week_number INTEGER,
    FOREIGN KEY(program_id) REFERENCES programs(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS program_days (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_id INTEGER,
    name TEXT, -- Ej: "Día de Pierna" o "Lunes"
    day_order INTEGER,
    FOREIGN KEY(week_id) REFERENCES program_weeks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day_id INTEGER,
    name TEXT NOT NULL,
    target_sets INTEGER DEFAULT 3,
    target_reps TEXT, -- Texto para permitir rangos "8-12"
    target_rpe REAL,
    notes TEXT,
    exercise_order INTEGER,
    FOREIGN KEY(day_id) REFERENCES program_days(id) ON DELETE CASCADE
  );

  -- Historial de Sesiones (Logs)
  CREATE TABLE IF NOT EXISTS workout_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day_id INTEGER, -- Link al día del programa planeado
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS set_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_log_id INTEGER,
    exercise_name TEXT, -- Guardamos nombre por si el ejercicio se borra del plan
    set_number INTEGER,
    weight REAL,
    reps INTEGER,
    rpe REAL,
    is_completed BOOLEAN DEFAULT 0,
    FOREIGN KEY(workout_log_id) REFERENCES workout_logs(id) ON DELETE CASCADE
  );
`;

db.exec(initScript);

module.exports = db;