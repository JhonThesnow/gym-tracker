const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// --- ENDPOINTS RÁPIDOS ---

// 1. Obtener todos los programas
app.get('/api/programs', (req, res) => {
    const stmt = db.prepare('SELECT * FROM programs ORDER BY created_at DESC');
    res.json(stmt.all());
});

// 2. Crear Programa Completo (Ejemplo simplificado)
app.post('/api/programs', (req, res) => {
    const { name, description } = req.body;
    const info = db.prepare('INSERT INTO programs (name, description) VALUES (?, ?)').run(name, description);
    res.json({ id: info.lastInsertRowid });
});

// 3. Obtener estructura de un programa (Weeks -> Days -> Exercises)
app.get('/api/programs/:id/full', (req, res) => {
    const { id } = req.params;

    // Queries individuales para simplicidad (en local es muy rápido)
    const program = db.prepare('SELECT * FROM programs WHERE id = ?').get(id);
    const weeks = db.prepare('SELECT * FROM program_weeks WHERE program_id = ? ORDER BY week_number').all(id);

    const fullData = weeks.map(week => {
        const days = db.prepare('SELECT * FROM program_days WHERE week_id = ? ORDER BY day_order').all(week.id);
        const daysWithExercises = days.map(day => {
            const exercises = db.prepare('SELECT * FROM exercises WHERE day_id = ? ORDER BY exercise_order').all(day.id);
            return { ...day, exercises };
        });
        return { ...week, days: daysWithExercises };
    });

    res.json({ ...program, weeks: fullData });
});

// 4. Registrar Sesión (Guardar entrenamiento)
app.post('/api/workouts', (req, res) => {
    const { day_id, notes, sets } = req.body;

    const insertLog = db.prepare('INSERT INTO workout_logs (day_id, notes) VALUES (?, ?)');
    const insertSet = db.prepare(`
    INSERT INTO set_logs (workout_log_id, exercise_name, set_number, weight, reps, rpe, is_completed)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

    const transaction = db.transaction(() => {
        const info = insertLog.run(day_id, notes);
        const logId = info.lastInsertRowid;

        for (const set of sets) {
            insertSet.run(logId, set.exercise_name, set.set_number, set.weight, set.reps, set.rpe, set.is_completed ? 1 : 0);
        }
        return logId;
    });

    const logId = transaction();
    res.json({ success: true, logId });
});

// Configuración package.json del server debe tener: "start": "node index.js"
const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));