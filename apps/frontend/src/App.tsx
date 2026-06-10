import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { api, clearToken, saveToken } from "./api";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">TrainFlow</div>
        <nav>
          <Link to="/dashboard">Uebersicht</Link>
          <Link to="/plans">Trainingsplaene</Link>
          <Link to="/session">Training starten</Link>
          <Link to="/history">Historie</Link>
        </nav>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}

function LoginPage({ onAuth }: { onAuth: () => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const result = isRegister ? await api.register(username, password) : await api.login(username, password);
      saveToken(result.token);
      onAuth();
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Login fehlgeschlagen.");
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>{isRegister ? "Konto erstellen" : "Anmelden"}</h1>
        <p>Begleite dein Training, speichere Saetze und verfolge deinen Fortschritt.</p>
        <form onSubmit={submit}>
          <label>Benutzername</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} minLength={3} required />
          <label>Passwort</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={8} required />
          {error ? <div className="error">{error}</div> : null}
          <button type="submit">{isRegister ? "Registrieren" : "Login"}</button>
        </form>
        <button className="ghost" onClick={() => setIsRegister((v) => !v)}>
          {isRegister ? "Schon ein Konto? Jetzt anmelden" : "Noch kein Konto? Jetzt registrieren"}
        </button>
      </div>
    </div>
  );
}

function DashboardPage() {
  const [data, setData] = useState<{ stats: { totalPlans: number; completedSessions: number }; activeSession: any } | null>(null);

  useEffect(() => {
    api.dashboard().then(setData).catch(() => null);
  }, []);

  return (
    <Shell>
      <section className="panel">
        <h2>Funktionen</h2>
        <div className="cards">
          <Link className="card" to="/plans">
            <h3>Trainingsplan anlegen</h3>
            <p>Plane Geraete, Uebungen, Saetze und Zielgewichte.</p>
          </Link>
          <Link className="card" to="/session">
            <h3>Training starten</h3>
            <p>Training live begleiten und Sets direkt dokumentieren.</p>
          </Link>
          <Link className="card" to="/history">
            <h3>Trainingshistorie</h3>
            <p>Vergangene Sessions mit Details und Notizen einsehen.</p>
          </Link>
        </div>
      </section>
      <section className="panel stats">
        <div>
          <h3>Gesamtplaene</h3>
          <strong>{data?.stats.totalPlans ?? 0}</strong>
        </div>
        <div>
          <h3>Abgeschlossene Sessions</h3>
          <strong>{data?.stats.completedSessions ?? 0}</strong>
        </div>
        <div>
          <h3>Aktive Session</h3>
          <strong>{data?.activeSession ? `#${data.activeSession.id}` : "Keine"}</strong>
        </div>
      </section>
    </Shell>
  );
}

function PlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [planName, setPlanName] = useState("");
  const [planNotes, setPlanNotes] = useState("");
  const [exercise, setExercise] = useState({ equipment: "", exerciseName: "", sets: 3, reps: 10, targetWeight: 0, notes: "" });

  async function load() {
    const result = await api.plans();
    setPlans(result.plans);
    if (!selectedPlanId && result.plans[0]) setSelectedPlanId(result.plans[0].id);
  }

  useEffect(() => {
    load().catch(() => null);
  }, []);

  async function createPlan(e: React.FormEvent) {
    e.preventDefault();
    await api.createPlan(planName, planNotes);
    setPlanName("");
    setPlanNotes("");
    await load();
  }

  async function addExercise(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlanId) return;
    await api.addPlanExercise(selectedPlanId, exercise);
    setExercise({ equipment: "", exerciseName: "", sets: 3, reps: 10, targetWeight: 0, notes: "" });
  }

  return (
    <Shell>
      <section className="panel grid-two">
        <div>
          <h2>Plan erstellen</h2>
          <form onSubmit={createPlan} className="stack">
            <input placeholder="Planname" value={planName} onChange={(e) => setPlanName(e.target.value)} required />
            <textarea placeholder="Notizen" value={planNotes} onChange={(e) => setPlanNotes(e.target.value)} />
            <button type="submit">Plan speichern</button>
          </form>
          <h3>Deine Plaene</h3>
          <ul className="list">
            {plans.map((plan) => (
              <li key={plan.id}>
                <button className={selectedPlanId === plan.id ? "selected" : ""} onClick={() => setSelectedPlanId(plan.id)}>
                  {plan.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Uebung zu Plan hinzufuegen</h2>
          <form onSubmit={addExercise} className="stack">
            <input placeholder="Geraet" value={exercise.equipment} onChange={(e) => setExercise({ ...exercise, equipment: e.target.value })} required />
            <input placeholder="Uebung" value={exercise.exerciseName} onChange={(e) => setExercise({ ...exercise, exerciseName: e.target.value })} required />
            <input type="number" min={1} max={20} value={exercise.sets} onChange={(e) => setExercise({ ...exercise, sets: Number(e.target.value) })} required />
            <input type="number" min={1} max={100} value={exercise.reps} onChange={(e) => setExercise({ ...exercise, reps: Number(e.target.value) })} />
            <input type="number" min={0} step={0.5} value={exercise.targetWeight} onChange={(e) => setExercise({ ...exercise, targetWeight: Number(e.target.value) })} />
            <textarea placeholder="Hinweise zur Ausfuehrung" value={exercise.notes} onChange={(e) => setExercise({ ...exercise, notes: e.target.value })} />
            <button type="submit" disabled={!selectedPlanId}>Uebung speichern</button>
          </form>
        </div>
      </section>
    </Shell>
  );
}

function SessionPage() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [setData, setSetData] = useState({ equipment: "", exerciseName: "", setNumber: 1, reps: 10, weight: 20, notes: "" });

  async function startSession() {
    const result = await api.startSession();
    setSessionId(result.id);
  }

  async function addSet(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId) return;
    await api.addSet(sessionId, { ...setData, completed: true });
    setSetData({ ...setData, setNumber: setData.setNumber + 1 });
  }

  async function complete() {
    if (!sessionId) return;
    await api.completeSession(sessionId);
    setSessionId(null);
  }

  return (
    <Shell>
      <section className="panel">
        <h2>Training begleiten</h2>
        {!sessionId ? (
          <button onClick={startSession}>Training starten</button>
        ) : (
          <>
            <p>Aktive Session: #{sessionId}</p>
            <form onSubmit={addSet} className="stack">
              <input placeholder="Geraet" value={setData.equipment} onChange={(e) => setSetData({ ...setData, equipment: e.target.value })} required />
              <input placeholder="Uebung" value={setData.exerciseName} onChange={(e) => setSetData({ ...setData, exerciseName: e.target.value })} required />
              <input type="number" min={1} value={setData.setNumber} onChange={(e) => setSetData({ ...setData, setNumber: Number(e.target.value) })} required />
              <input type="number" min={1} value={setData.reps} onChange={(e) => setSetData({ ...setData, reps: Number(e.target.value) })} />
              <input type="number" min={0} step={0.5} value={setData.weight} onChange={(e) => setSetData({ ...setData, weight: Number(e.target.value) })} />
              <textarea placeholder="Notiz" value={setData.notes} onChange={(e) => setSetData({ ...setData, notes: e.target.value })} />
              <button type="submit">Satz speichern</button>
            </form>
            <button className="complete" onClick={complete}>Training abschliessen</button>
          </>
        )}
      </section>
    </Shell>
  );
}

function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    api.history().then((res) => setHistory(res.history)).catch(() => null);
  }, []);

  return (
    <Shell>
      <section className="panel">
        <h2>Trainingshistorie</h2>
        <ul className="list history">
          {history.map((entry) => (
            <li key={entry.id}>
              <strong>Session #{entry.id}</strong>
              <div>{entry.completed_at || "-"}</div>
              <div>{entry.sets?.length || 0} Saetze</div>
            </li>
          ))}
          {history.length === 0 ? <li>Noch keine abgeschlossenen Trainings.</li> : null}
        </ul>
      </section>
    </Shell>
  );
}

function ProtectedRoute({ authenticated, children }: { authenticated: boolean; children: React.ReactNode }) {
  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .me()
      .then(() => setAuthenticated(true))
      .catch(() => {
        setAuthenticated(false);
        clearToken();
      });
  }, []);

  const logout = useMemo(
    () => () => {
      clearToken();
      setAuthenticated(false);
      navigate("/login");
    },
    [navigate]
  );

  return (
    <>
      {authenticated ? <button className="logout" onClick={logout}>Logout</button> : null}
      <Routes>
        <Route path="/login" element={<LoginPage onAuth={() => setAuthenticated(true)} />} />
        <Route path="/dashboard" element={<ProtectedRoute authenticated={authenticated}><DashboardPage /></ProtectedRoute>} />
        <Route path="/plans" element={<ProtectedRoute authenticated={authenticated}><PlansPage /></ProtectedRoute>} />
        <Route path="/session" element={<ProtectedRoute authenticated={authenticated}><SessionPage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute authenticated={authenticated}><HistoryPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={authenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </>
  );
}
