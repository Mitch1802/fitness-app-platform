import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TrainingSessionService } from '../_service/training-session.service';
import { TrainingsplanService } from '../_service/trainingsplan.service';
import { TrainingSession, SatzErgebnis } from '../_interface/training-session';
import { Trainingsplan, Uebung } from '../_interface/trainingsplan';
import { finalize } from 'rxjs';

const DEFAULT_WEIGHT_INCREMENT = 2.5;

@Component({
  selector: 'app-training-session',
  templateUrl: './training-session.component.html',
  styleUrls: ['./training-session.component.sass'],
  imports: [
    CommonModule, ReactiveFormsModule, DecimalPipe,
    MatCardModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule,
    MatChipsModule, MatSelectModule,
  ],
})
export class TrainingSessionComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(TrainingSessionService);
  private planService = inject(TrainingsplanService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  session: TrainingSession | null = null;
  plan: Trainingsplan | null = null;
  uebungen: Uebung[] = [];
  loading = true;
  abschliessen_saving = false;
  abbrechen_saving = false;
  warmupSaving = false;
  deletingCompletedSession = false;
  pausiert_saving = false;
  showDateEditor = false;
  datumSaving = false;

  satzForm!: FormGroup;
  warmupForm!: FormGroup;
  datumForm!: FormGroup;
  selectedUebungId: number | null = null;
  showSatzForm = false;

  extraForm!: FormGroup;
  showExtraForm = false;
  showManualPicker = false;

  ngOnInit(): void {
    this.initForms();
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.loadSession(Number(idParam));
    } else {
      this.service.getAktiv().subscribe({
        next: (s) => {
          if (s) {
            this.router.navigate(['/session', s.id], { replaceUrl: true });
          } else {
            this.router.navigate(['/dashboard'], { replaceUrl: true });
          }
        },
      });
    }
  }

  get currentExerciseSaetze(): SatzErgebnis[] {
    if (!this.session || !this.selectedUebung) return [];
    return this.session.satz_ergebnisse.filter(
      (s) => s.uebung === this.selectedUebung!.id || s.uebung_name === this.selectedUebung!.name
    );
  }

  get sortedUebungen(): Uebung[] {
    return [...this.uebungen].sort((a, b) => {
      const orderA = typeof a.reihenfolge === 'number' ? a.reihenfolge : Number.MAX_SAFE_INTEGER;
      const orderB = typeof b.reihenfolge === 'number' ? b.reihenfolge : Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.id - b.id;
    });
  }

  get canGoNextExercise(): boolean {
    return !!this.getNextUnlockedExercise(this.selectedUebungId);
  }

  get warmupDisplayText(): string {
    const text = this.plan?.aufwaermen?.trim();
    return text && text.length > 0
      ? text
      : 'Kein fester Plantext hinterlegt. Trage trotzdem dein Aufwaermen fuer das Tracking ein.';
  }

  get ergebnisseByUebung(): { uebung_name: string; uebung_id: number | null; saetze: SatzErgebnis[] }[] {
    if (!this.session) return [];

    const map = new Map<string, { uebung_name: string; uebung_id: number | null; saetze: SatzErgebnis[] }>();
    for (const s of this.session.satz_ergebnisse) {
      const key = s.uebung_name || `id:${s.uebung}`;
      if (!map.has(key)) {
        map.set(key, { uebung_name: s.uebung_name, uebung_id: s.uebung, saetze: [] });
      }
      map.get(key)!.saetze.push(s);
    }

    const orderMap = new Map<number, number>();
    this.sortedUebungen.forEach((exercise, index) => orderMap.set(exercise.id, index));

    return Array.from(map.values()).sort((a, b) => {
      const orderA = a.uebung_id !== null ? (orderMap.get(a.uebung_id) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
      const orderB = b.uebung_id !== null ? (orderMap.get(b.uebung_id) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.uebung_name.localeCompare(b.uebung_name, 'de');
    });
  }

  get selectedUebung(): Uebung | null {
    return this.uebungen.find((uebung) => uebung.id === this.selectedUebungId) ?? null;
  }

  loadSession(id: number): void {
    this.loading = true;
    this.service.get(id).subscribe({
      next: (session) => {
        this.session = this.normalizeSession(session);
        this.patchWarmupForm();

        if (session.trainingsplan) {
          this.planService.get(session.trainingsplan).subscribe({
            next: (plan) => {
              this.plan = this.normalizePlan(plan);
              this.uebungen = this.plan.uebungen;
              this.loading = false;
            },
            error: () => {
              this.plan = null;
              this.uebungen = [];
              this.loading = false;
            },
          });
        } else {
          this.plan = null;
          this.uebungen = [];
          this.loading = false;
        }
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Training konnte nicht geladen werden.', 'OK', { duration: 2500 });
      },
    });
  }

  initForms(): void {
    this.satzForm = this.fb.group({
      uebung_id: [null],
      uebung_name: [''],
      satz_nummer: [1],
      wiederholungen: [10, [Validators.required, Validators.min(1)]],
      gewicht: [0, [Validators.required, Validators.min(0)]],
      gewicht_erhoehen: [false],
    });

    this.warmupForm = this.fb.group({
      warmup_dauer_minuten: [null, [Validators.min(0)]],
      warmup_notiz: [''],
    });

    this.datumForm = this.fb.group({
      datum: ['', Validators.required],
    });

    this.extraForm = this.fb.group({
      name: ['', Validators.required],
      typ: [''],
      dauer_minuten: [null],
      distanz_km: [null],
      notiz: [''],
    });
  }

  hasExerciseResult(uebungId: number): boolean {
    if (!this.session) {
      return false;
    }
    return this.session.satz_ergebnisse.some((satz) => satz.uebung === uebungId);
  }

  isExerciseLocked(uebung: Uebung): boolean {
    if (!uebung.vorgaenger) {
      return false;
    }
    return !this.hasExerciseResult(uebung.vorgaenger);
  }

  getExerciseLockReason(uebung: Uebung): string {
    if (!uebung.vorgaenger) {
      return '';
    }
    return `${uebung.vorgaenger_name ?? 'Vorgaengeruebung'} zuerst erledigen`;
  }

  pickExercise(uebung: Uebung): void {
    if (this.isExerciseLocked(uebung)) {
      this.snackBar.open(this.getExerciseLockReason(uebung), 'OK', { duration: 2500 });
      return;
    }
    this.showManualPicker = false;
    this.selectUebung(uebung);
  }

  closeManualPicker(): void {
    this.showManualPicker = false;
  }

  selectUebung(uebung: Uebung): void {
    if (this.isExerciseLocked(uebung)) {
      this.snackBar.open(this.getExerciseLockReason(uebung), 'OK', { duration: 2500 });
      return;
    }

    this.selectedUebungId = uebung.id;
    const nextSatzNr = this.getNextSatzNr(uebung.id, uebung.name);
    const plannedSatz = uebung.saetze[nextSatzNr - 1] ?? uebung.saetze[0];
    this.satzForm.patchValue({
      uebung_id: uebung.id,
      uebung_name: uebung.name,
      satz_nummer: nextSatzNr,
      wiederholungen: this.parseWdh(plannedSatz?.wdh),
      gewicht: plannedSatz?.gewicht ?? uebung.gewicht ?? 0,
      gewicht_erhoehen: false,
    });
    this.showSatzForm = true;
    this.showExtraForm = false;
  }

  saveWarmup(continueWithExercise = false): void {
    if (this.warmupForm.invalid || !this.session || this.warmupSaving || this.session.abgeschlossen) {
      return;
    }

    this.warmupSaving = true;
    const value = this.warmupForm.value;
    const dauer = value.warmup_dauer_minuten === '' || value.warmup_dauer_minuten === undefined || value.warmup_dauer_minuten === null
      ? null
      : Number(value.warmup_dauer_minuten);
    const payload: Partial<TrainingSession> = {
      warmup_abgeschlossen: dauer !== null && dauer > 0,
      warmup_dauer_minuten: dauer,
      warmup_notiz: String(value.warmup_notiz ?? ''),
    };

    this.service.update(this.session.id, payload)
      .pipe(finalize(() => { this.warmupSaving = false; }))
      .subscribe({
        next: (updated) => {
          this.session = this.normalizeSession(updated);
          this.patchWarmupForm();
          this.snackBar.open('Aufwaermen gespeichert.', '', { duration: 1500 });

          if (continueWithExercise) {
            this.openFirstUnlockedExercise();
          }
        },
        error: (error: unknown) => {
          this.snackBar.open(this.extractErrorMessage(error, 'Aufwaermen konnte nicht gespeichert werden.'), 'OK', { duration: 2800 });
        },
      });
  }

  openFirstUnlockedExercise(): void {
    const firstUnlocked = this.getNextUnlockedExercise(null);
    if (!firstUnlocked) {
      this.snackBar.open('Keine freigeschaltete Uebung verfuegbar.', 'OK', { duration: 2200 });
      return;
    }
    this.selectUebung(firstUnlocked);
  }

  selectNextExercise(): void {
    const next = this.getNextUnlockedExercise(this.selectedUebungId);
    if (!next) {
      this.snackBar.open('Keine weitere freigeschaltete Uebung verfuegbar.', 'OK', { duration: 2200 });
      return;
    }
    this.selectUebung(next);
  }

  private getNextUnlockedExercise(fromExerciseId: number | null): Uebung | null {
    const sorted = this.sortedUebungen;
    if (sorted.length === 0) {
      return null;
    }

    if (fromExerciseId === null) {
      return sorted.find((exercise) => !this.isExerciseLocked(exercise)) ?? null;
    }

    const startIndex = sorted.findIndex((exercise) => exercise.id === fromExerciseId);
    const candidates = startIndex >= 0 ? sorted.slice(startIndex + 1) : sorted;
    return candidates.find((exercise) => !this.isExerciseLocked(exercise)) ?? null;
  }

  private parseWdh(wdh: string | undefined): number {
    if (!wdh) return 10;
    const first = String(wdh).split(/[-\/,]/)[0].trim();
    const parsed = parseInt(first, 10);
    return isNaN(parsed) ? 10 : parsed;
  }

  getNextSatzNr(uebungId: number | null, uebungName: string): number {
    if (!this.session) return 1;
    const vorhandene = this.session.satz_ergebnisse.filter(
      (s) => s.uebung === uebungId || s.uebung_name === uebungName
    );
    return vorhandene.length + 1;
  }

  onSatzNrChange(satzNr: number): void {
    if (!this.selectedUebung) return;
    const planned = this.selectedUebung.saetze.find(s => s.nr === satzNr);
    if (planned) {
      this.satzForm.patchValue({
        wiederholungen: this.parseWdh(planned.wdh),
        gewicht: planned.gewicht ?? this.selectedUebung.gewicht ?? 0,
      });
    }
  }

  saveSatz(): void {
    if (this.satzForm.invalid || !this.session) return;
    const v = this.satzForm.value;
    const data: Partial<SatzErgebnis> = {
      uebung: v.uebung_id,
      uebung_name: v.uebung_name,
      satz_nummer: v.satz_nummer,
      wiederholungen: v.wiederholungen,
      gewicht: v.gewicht,
      gewicht_erhoehen: v.gewicht_erhoehen,
    };
    this.service.createSatz(this.session.id, data).subscribe({
      next: (satz) => {
        this.session!.satz_ergebnisse.push(satz);
        this.snackBar.open(`Satz ${satz.satz_nummer} gespeichert!`, '', { duration: 1500 });
        this.satzForm.patchValue({ satz_nummer: satz.satz_nummer + 1, gewicht_erhoehen: false });
      },
      error: (error: unknown) => {
        this.snackBar.open(this.extractErrorMessage(error, 'Satz konnte nicht gespeichert werden.'), 'OK', { duration: 3000 });
      },
    });
  }

  toggleGewichtErhoehen(satz: SatzErgebnis): void {
    const newVal = !satz.gewicht_erhoehen;
    this.service.updateSatz(satz.id, { gewicht_erhoehen: newVal }).subscribe({
      next: (updated) => {
        const idx = this.session!.satz_ergebnisse.findIndex((s) => s.id === updated.id);
        if (idx >= 0) this.session!.satz_ergebnisse[idx] = updated;
      },
    });
  }

  deleteSatz(id: number): void {
    this.service.deleteSatz(id).subscribe({
      next: () => {
        this.session!.satz_ergebnisse = this.session!.satz_ergebnisse.filter((s) => s.id !== id);
      },
    });
  }

  saveExtra(): void {
    if (this.extraForm.invalid || !this.session) return;
    const data = this.extraForm.value;
    this.service.createExtra(this.session.id, data).subscribe({
      next: (extra) => {
        this.session!.extra_uebungen.push(extra);
        this.extraForm.reset();
        this.showExtraForm = false;
        this.snackBar.open('Extra-Uebung hinzugefuegt', '', { duration: 1500 });
      },
      error: (error: unknown) => {
        this.snackBar.open(this.extractErrorMessage(error, 'Extra-Uebung konnte nicht gespeichert werden.'), 'OK', { duration: 2800 });
      },
    });
  }

  deleteExtra(id: number): void {
    this.service.deleteExtra(id).subscribe({
      next: () => {
        this.session!.extra_uebungen = this.session!.extra_uebungen.filter((e) => e.id !== id);
      },
    });
  }

  trainingAbbrechen(): void {
    if (!this.session || this.session.abgeschlossen || this.abbrechen_saving) return;
    if (!confirm('Training abbrechen? Die Session wird gelöscht und nicht gespeichert.')) return;
    this.abbrechen_saving = true;
    this.service.delete(this.session.id)
      .pipe(finalize(() => { this.abbrechen_saving = false; }))
      .subscribe({
        next: () => {
          this.snackBar.open('Training abgebrochen.', '', { duration: 2000 });
          this.router.navigate(['/dashboard']);
        },
        error: (error: unknown) => {
          this.snackBar.open(this.extractErrorMessage(error, 'Abbrechen fehlgeschlagen.'), 'OK', { duration: 3000 });
        },
      });
  }

  trainingAbschliessen(): void {
    if (!this.session || this.abschliessen_saving) return;
    if (!confirm('Training abschliessen? Gewichtssteigerungen werden angewendet.')) return;
    this.abschliessen_saving = true;
    this.service.abschliessen(this.session.id).pipe(finalize(() => (this.abschliessen_saving = false))).subscribe({
      next: () => {
        this.snackBar.open('Training abgeschlossen! 💪', 'OK', { duration: 3000 });
        this.router.navigate(['/dashboard']);
      },
    });
  }

  deleteCompletedTraining(): void {
    if (!this.session || !this.session.abgeschlossen || this.deletingCompletedSession) {
      return;
    }

    if (!confirm('Abgeschlossenes Training wirklich loeschen?')) {
      return;
    }

    this.deletingCompletedSession = true;
    this.service.delete(this.session.id)
      .pipe(finalize(() => {
        this.deletingCompletedSession = false;
      }))
      .subscribe({
        next: () => {
          this.snackBar.open('Training geloescht.', 'OK', { duration: 2000 });
          this.router.navigate(['/dashboard']);
        },
        error: (error: unknown) => {
          this.snackBar.open(this.extractErrorMessage(error, 'Training konnte nicht geloescht werden.'), 'OK', { duration: 3000 });
        },
      });
  }

  trainingPausieren(): void {
    if (!this.session || this.session.abgeschlossen || this.pausiert_saving) return;
    this.pausiert_saving = true;
    this.service.update(this.session.id, { pausiert: true })
      .pipe(finalize(() => { this.pausiert_saving = false; }))
      .subscribe({
        next: () => {
          this.snackBar.open('Training pausiert. Du kannst es jederzeit fortsetzen.', 'OK', { duration: 3000 });
          this.router.navigate(['/dashboard']);
        },
        error: (error: unknown) => {
          this.snackBar.open(this.extractErrorMessage(error, 'Pausieren fehlgeschlagen.'), 'OK', { duration: 3000 });
        },
      });
  }

  trainingFortsetzen(): void {
    if (!this.session || this.session.abgeschlossen || this.pausiert_saving) return;
    this.pausiert_saving = true;
    this.service.update(this.session.id, { pausiert: false })
      .pipe(finalize(() => { this.pausiert_saving = false; }))
      .subscribe({
        next: (updated) => {
          this.session = this.normalizeSession(updated);
          this.snackBar.open('Training fortgesetzt.', '', { duration: 1500 });
        },
        error: (error: unknown) => {
          this.snackBar.open(this.extractErrorMessage(error, 'Fortsetzen fehlgeschlagen.'), 'OK', { duration: 3000 });
        },
      });
  }

  openDateEditor(): void {
    if (!this.session) return;
    this.datumForm.patchValue({ datum: this.toDatetimeLocal(this.session.datum) });
    this.showDateEditor = true;
  }

  cancelDateEditor(): void {
    this.showDateEditor = false;
  }

  saveDatum(): void {
    if (this.datumForm.invalid || !this.session || this.datumSaving) return;
    const localValue: string = this.datumForm.value.datum;
    const isoDate = new Date(localValue).toISOString();
    this.datumSaving = true;
    this.service.update(this.session.id, { datum: isoDate } as Partial<TrainingSession>)
      .pipe(finalize(() => { this.datumSaving = false; }))
      .subscribe({
        next: (updated) => {
          this.session = this.normalizeSession(updated);
          this.showDateEditor = false;
          this.snackBar.open('Datum gespeichert.', '', { duration: 1500 });
        },
        error: (error: unknown) => {
          this.snackBar.open(this.extractErrorMessage(error, 'Datum konnte nicht gespeichert werden.'), 'OK', { duration: 3000 });
        },
      });
  }

  private toDatetimeLocal(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private patchWarmupForm(): void {
    if (!this.session || !this.warmupForm) {
      return;
    }

    this.warmupForm.patchValue({
      warmup_dauer_minuten: this.session.warmup_dauer_minuten,
      warmup_notiz: this.session.warmup_notiz,
    });
  }

  private normalizeSession(session: TrainingSession): TrainingSession {
    return {
      ...session,
      warmup_abgeschlossen: Boolean(session.warmup_abgeschlossen),
      warmup_dauer_minuten: session.warmup_dauer_minuten ?? null,
      warmup_notiz: typeof session.warmup_notiz === 'string' ? session.warmup_notiz : '',
      pausiert: Boolean(session.pausiert),
      satz_ergebnisse: Array.isArray(session.satz_ergebnisse) ? session.satz_ergebnisse : [],
      extra_uebungen: Array.isArray(session.extra_uebungen) ? session.extra_uebungen : [],
    };
  }

  private normalizePlan(plan: Trainingsplan): Trainingsplan {
    const planIncrement = plan.gewicht_steigerung ?? DEFAULT_WEIGHT_INCREMENT;

    return {
      ...plan,
      aufwaermen: typeof plan.aufwaermen === 'string' ? plan.aufwaermen : '',
      gewicht_steigerung: planIncrement,
      uebungen: Array.isArray(plan.uebungen)
        ? plan.uebungen.map((uebung) => ({
            ...uebung,
            saetze: Array.isArray(uebung.saetze) ? uebung.saetze : [],
            gewicht_steigerung: uebung.gewicht_steigerung ?? null,
          }))
        : [],
    };
  }

  private extractErrorMessage(error: unknown, fallback: string): string {
    const errorObj = error as { error?: unknown; message?: string };
    const payload = errorObj?.error;

    if (typeof payload === 'string' && payload.trim().length > 0) {
      return payload;
    }

    if (payload && typeof payload === 'object') {
      const detail = (payload as { detail?: unknown }).detail;
      if (typeof detail === 'string' && detail.trim().length > 0) {
        return detail;
      }

      const firstEntry = Object.entries(payload as Record<string, unknown>)[0];
      if (firstEntry) {
        const [, value] = firstEntry;
        if (Array.isArray(value) && value.length > 0) {
          return String(value[0]);
        }
        if (typeof value === 'string') {
          return value;
        }
      }
    }

    if (typeof errorObj?.message === 'string' && errorObj.message.trim().length > 0) {
      return errorObj.message;
    }

    return fallback;
  }
}
