import "dotenv/config";
import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { z } from "zod";
import { db, initializeDb } from "./db.js";
import { requireAuth, signToken } from "./auth.js";
import type { AuthedRequest } from "./types.js";

initializeDb();

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(helmet());
app.use(cors({ origin: true, credentials: false }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const registerSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(8).max(128)
});

app.post("/api/auth/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Ungueltige Eingabe." });
    return;
  }

  const exists = db.prepare("SELECT id FROM users WHERE username = ?").get(parsed.data.username);
  if (exists) {
    res.status(409).json({ message: "Benutzername bereits vergeben." });
    return;
  }

  const hash = await bcrypt.hash(parsed.data.password, 10);
  const info = db
    .prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
    .run(parsed.data.username, hash);

  const user = { id: Number(info.lastInsertRowid), username: parsed.data.username };
  const token = signToken(user);

  res.status(201).json({ token, user });
});

app.post("/api/auth/login", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Ungueltige Eingabe." });
    return;
  }

  const row = db
    .prepare("SELECT id, username, password_hash FROM users WHERE username = ?")
    .get(parsed.data.username) as { id: number; username: string; password_hash: string } | undefined;

  if (!row) {
    res.status(401).json({ message: "Anmeldedaten ungueltig." });
    return;
  }

  const valid = await bcrypt.compare(parsed.data.password, row.password_hash);
  if (!valid) {
    res.status(401).json({ message: "Anmeldedaten ungueltig." });
    return;
  }

  const user = { id: row.id, username: row.username };
  const token = signToken(user);
  res.json({ token, user });
});

app.get("/api/auth/me", requireAuth, (req: AuthedRequest, res) => {
  res.json({ user: req.user });
});

const createPlanSchema = z.object({
  name: z.string().min(2).max(100),
  notes: z.string().max(2000).optional()
});

app.get("/api/plans", requireAuth, (req: AuthedRequest, res) => {
  const plans = db
    .prepare("SELECT id, name, notes, created_at FROM training_plans WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.user!.id);
  res.json({ plans });
});

app.post("/api/plans", requireAuth, (req: AuthedRequest, res) => {
  const parsed = createPlanSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Ungueltige Plan-Daten." });
    return;
  }

  const info = db
    .prepare("INSERT INTO training_plans (user_id, name, notes) VALUES (?, ?, ?)")
    .run(req.user!.id, parsed.data.name, parsed.data.notes || null);

  res.status(201).json({
    id: Number(info.lastInsertRowid),
    name: parsed.data.name,
    notes: parsed.data.notes || null
  });
});

app.get("/api/plans/:id", requireAuth, (req: AuthedRequest, res) => {
  const planId = Number(req.params.id);
  if (Number.isNaN(planId)) {
    res.status(400).json({ message: "Ungueltige ID." });
    return;
  }

  const plan = db
    .prepare("SELECT id, name, notes, created_at FROM training_plans WHERE id = ? AND user_id = ?")
    .get(planId, req.user!.id);

  if (!plan) {
    res.status(404).json({ message: "Plan nicht gefunden." });
    return;
  }

  const exercises = db
    .prepare(
      `SELECT id, equipment, exercise_name, sets, reps, target_weight, notes, position
       FROM plan_exercises
       WHERE plan_id = ?
       ORDER BY position ASC, id ASC`
    )
    .all(planId);

  res.json({ plan, exercises });
});

const createPlanExerciseSchema = z.object({
  equipment: z.string().min(2).max(100),
  exerciseName: z.string().min(2).max(100),
  sets: z.number().int().min(1).max(20),
  reps: z.number().int().min(1).max(100).optional(),
  targetWeight: z.number().min(0).max(2000).optional(),
  notes: z.string().max(1500).optional(),
  position: z.number().int().min(0).max(1000).optional()
});

app.post("/api/plans/:id/exercises", requireAuth, (req: AuthedRequest, res) => {
  const planId = Number(req.params.id);
  if (Number.isNaN(planId)) {
    res.status(400).json({ message: "Ungueltige ID." });
    return;
  }

  const ownPlan = db
    .prepare("SELECT id FROM training_plans WHERE id = ? AND user_id = ?")
    .get(planId, req.user!.id);

  if (!ownPlan) {
    res.status(404).json({ message: "Plan nicht gefunden." });
    return;
  }

  const parsed = createPlanExerciseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Ungueltige Uebungsdaten." });
    return;
  }

  const info = db
    .prepare(
      `INSERT INTO plan_exercises (plan_id, equipment, exercise_name, sets, reps, target_weight, notes, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      planId,
      parsed.data.equipment,
      parsed.data.exerciseName,
      parsed.data.sets,
      parsed.data.reps || null,
      parsed.data.targetWeight || null,
      parsed.data.notes || null,
      parsed.data.position || 0
    );

  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

const startSessionSchema = z.object({
  planId: z.number().int().positive().optional(),
  notes: z.string().max(1500).optional()
});

app.post("/api/sessions/start", requireAuth, (req: AuthedRequest, res) => {
  const parsed = startSessionSchema.safeParse(req.body || {});
  if (!parsed.success) {
    res.status(400).json({ message: "Ungueltige Session-Daten." });
    return;
  }

  if (parsed.data.planId) {
    const ownPlan = db
      .prepare("SELECT id FROM training_plans WHERE id = ? AND user_id = ?")
      .get(parsed.data.planId, req.user!.id);
    if (!ownPlan) {
      res.status(404).json({ message: "Plan nicht gefunden." });
      return;
    }
  }

  const info = db
    .prepare(
      `INSERT INTO training_sessions (user_id, plan_id, status, session_notes)
       VALUES (?, ?, 'active', ?)`
    )
    .run(req.user!.id, parsed.data.planId || null, parsed.data.notes || null);

  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

const addSetSchema = z.object({
  equipment: z.string().min(2).max(100),
  exerciseName: z.string().min(2).max(100),
  setNumber: z.number().int().positive(),
  reps: z.number().int().positive().optional(),
  weight: z.number().min(0).max(3000).optional(),
  notes: z.string().max(1000).optional(),
  completed: z.boolean().optional()
});

app.post("/api/sessions/:id/sets", requireAuth, (req: AuthedRequest, res) => {
  const sessionId = Number(req.params.id);
  if (Number.isNaN(sessionId)) {
    res.status(400).json({ message: "Ungueltige Session-ID." });
    return;
  }

  const ownSession = db
    .prepare("SELECT id FROM training_sessions WHERE id = ? AND user_id = ? AND status = 'active'")
    .get(sessionId, req.user!.id);

  if (!ownSession) {
    res.status(404).json({ message: "Aktive Session nicht gefunden." });
    return;
  }

  const parsed = addSetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Ungueltige Satz-Daten." });
    return;
  }

  const info = db
    .prepare(
      `INSERT INTO session_sets (session_id, equipment, exercise_name, set_number, reps, weight, notes, completed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      sessionId,
      parsed.data.equipment,
      parsed.data.exerciseName,
      parsed.data.setNumber,
      parsed.data.reps || null,
      parsed.data.weight || null,
      parsed.data.notes || null,
      parsed.data.completed ? 1 : 0
    );

  res.status(201).json({ id: Number(info.lastInsertRowid) });
});

app.post("/api/sessions/:id/complete", requireAuth, (req: AuthedRequest, res) => {
  const sessionId = Number(req.params.id);
  if (Number.isNaN(sessionId)) {
    res.status(400).json({ message: "Ungueltige Session-ID." });
    return;
  }

  const info = db
    .prepare(
      `UPDATE training_sessions
       SET status = 'completed', completed_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ? AND status = 'active'`
    )
    .run(sessionId, req.user!.id);

  if (info.changes === 0) {
    res.status(404).json({ message: "Aktive Session nicht gefunden." });
    return;
  }

  res.json({ success: true });
});

app.get("/api/history", requireAuth, (req: AuthedRequest, res) => {
  const sessions = db
    .prepare(
      `SELECT id, plan_id, started_at, completed_at, session_notes
       FROM training_sessions
       WHERE user_id = ? AND status = 'completed'
       ORDER BY completed_at DESC`
    )
    .all(req.user!.id);

  const withSets = sessions.map((session: any) => {
    const sets = db
      .prepare(
        `SELECT id, equipment, exercise_name, set_number, reps, weight, notes, completed
         FROM session_sets WHERE session_id = ? ORDER BY id ASC`
      )
      .all(session.id);
    return { ...session, sets };
  });

  res.json({ history: withSets });
});

app.get("/api/dashboard", requireAuth, (req: AuthedRequest, res) => {
  const activeSession = db
    .prepare(
      `SELECT id, plan_id, started_at, session_notes
       FROM training_sessions WHERE user_id = ? AND status = 'active'
       ORDER BY started_at DESC LIMIT 1`
    )
    .get(req.user!.id);

  const completedCountRow = db
    .prepare("SELECT COUNT(*) as count FROM training_sessions WHERE user_id = ? AND status = 'completed'")
    .get(req.user!.id) as { count: number };

  const planCountRow = db
    .prepare("SELECT COUNT(*) as count FROM training_plans WHERE user_id = ?")
    .get(req.user!.id) as { count: number };

  res.json({
    stats: {
      totalPlans: planCountRow.count,
      completedSessions: completedCountRow.count
    },
    activeSession
  });
});

app.listen(port, () => {
  console.log(`Backend laeuft auf Port ${port}`);
});
